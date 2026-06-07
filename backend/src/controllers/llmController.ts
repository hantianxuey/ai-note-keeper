import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { llmService } from '../services/llmService';
import { LLMConfigModel } from '../models/LLMConfig';
import { NoteModel } from '../models/Note';
import { LLM_PROVIDERS } from '../types/llm';
import type { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { readSensitiveField } from '../config/requestEncryption';
import { recordAuditEvent } from '../services/auditService';
import { requireUserId } from './controllerUtils';

const summaryContentHash = (content: string) =>
  crypto.createHash('sha256').update(content).digest('hex');

export const getProviders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const dbConfigs = await LLMConfigModel.listMasked(userId);
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.provider_key, c]));

    const allProviders = Object.keys(LLM_PROVIDERS).map((key) => {
      const provider = LLM_PROVIDERS[key];
      const dbConfig = dbConfigMap.get(key);
      const hasKey = !!(provider.isDemo || (dbConfig && dbConfig.has_key));
      return {
        key,
        name: provider.name,
        models: provider.models,
        baseURL: provider.baseURL,
        apiKeyEnv: provider.apiKeyEnv,
        hasKey,
        isActive: provider.isDemo ? true : dbConfig ? dbConfig.is_active : false,
      };
    });

    const availableProviders = allProviders.filter((p) => p.hasKey);

    res.json({
      providers: availableProviders,
      allSupportedProviders: allProviders,
    });
  } catch (error) {
    next(error);
  }
};

export const getModels = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { provider } = req.params;
    const providerInfo = LLM_PROVIDERS[provider];
    if (!providerInfo) {
      return next(new AppError('Provider not found', 404));
    }
    const models = llmService.getAvailableModels(provider);
    res.json({ provider, models: providerInfo.models, available: models });
  } catch (error) {
    next(error);
  }
};

export const getAllModels = (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const models = llmService.getAllAvailableModels();
    res.json({ models });
  } catch (error) {
    next(error);
  }
};

export const testConnection = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { provider, model } = req.body;
    const userId = requireUserId(req);

    const result = await llmService.chatCompletion(
      [{ role: 'user', content: 'Hello, please reply with "OK" in one word.' }],
      { provider, model, temperature: 0 },
      userId
    );

    res.json({
      success: true,
      message: 'LLM connection test successful',
      response: result.content,
      model: result.model,
      provider: result.provider,
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: 'Connection failed: ' + (error.message || 'Unknown error'),
    });
  }
};

export const generateSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content, provider, model, noteId } = req.body;
    const userId = requireUserId(req);

    if (!content) {
      return next(new AppError('Content is required', 400));
    }

    const noteIdNumber = Number(noteId);
    const canCache = Number.isInteger(noteIdNumber) && noteIdNumber > 0;
    const contentHash = summaryContentHash(content);

    if (canCache) {
      const note = await NoteModel.findById(noteIdNumber, userId);
      if (!note) {
        return next(new AppError('Note not found', 404));
      }

      const cachedSummary = await NoteModel.findCachedSummary(noteIdNumber, userId, contentHash);
      if (cachedSummary) {
        res.json({ summary: cachedSummary, cached: true });
        return;
      }
    }

    const summary = await llmService.generateSummary(content, {
      provider: provider || 'demo',
      model: model || 'demo-chat',
      temperature: 0.5,
    }, userId);

    if (canCache) {
      await NoteModel.updateSummary(noteIdNumber, userId, summary, contentHash);
    }

    res.json({ summary, cached: false });
  } catch (error) {
    next(error);
  }
};

export const extractKeywords = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content, provider, model } = req.body;
    const userId = requireUserId(req);

    if (!content) {
      return next(new AppError('Content is required', 400));
    }

    const keywords = await llmService.extractKeywords(content, {
      provider: provider || 'demo',
      model: model || 'demo-chat',
      temperature: 0.3,
    }, userId);

    res.json({ keywords });
  } catch (error) {
    next(error);
  }
};

export const rewriteNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content, instruction, provider, model } = req.body;
    const userId = requireUserId(req);

    if (!content) {
      return next(new AppError('Content is required', 400));
    }

    const rewritten = await llmService.rewriteNote(content, instruction, {
      provider: provider || 'demo',
      model: model || 'demo-chat',
      temperature: 0.7,
    }, userId);

    res.json({ rewritten });
  } catch (error) {
    next(error);
  }
};

export const chatCompletion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messages, provider, model, temperature, maxTokens } = req.body;
    const userId = requireUserId(req);

    if (!messages || !Array.isArray(messages)) {
      return next(new AppError('Messages array is required', 400));
    }

    const result = await llmService.chatCompletion(messages, {
      provider: provider || 'demo',
      model: model || 'demo-chat',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2000,
    }, userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const saveApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { provider } = req.body;
    const apiKey = readSensitiveField(req.body, 'apiKey');
    const userId = requireUserId(req);

    if (!provider || !apiKey) {
      return next(new AppError('Provider and apiKey are required', 400));
    }

    if (!LLM_PROVIDERS[provider]) {
      return next(new AppError('Unknown provider: ' + provider, 400));
    }

    await LLMConfigModel.upsert(userId, provider, apiKey);
    llmService.removeUserProvider(userId, provider);
    recordAuditEvent({
      event: 'provider_key.llm.save',
      outcome: 'success',
      userId,
      metadata: { provider },
    });

    res.json({
      success: true,
      message: `API Key for ${LLM_PROVIDERS[provider].name} saved`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { provider } = req.params;
    const userId = requireUserId(req);

    if (!LLM_PROVIDERS[provider]) {
      return next(new AppError('Unknown provider: ' + provider, 400));
    }

    await LLMConfigModel.delete(userId, provider);
    llmService.removeUserProvider(userId, provider);
    recordAuditEvent({
      event: 'provider_key.llm.delete',
      outcome: 'success',
      userId,
      metadata: { provider },
    });

    res.json({
      success: true,
      message: `API Key for ${LLM_PROVIDERS[provider].name} deleted`,
    });
  } catch (error) {
    next(error);
  }
};

export const getApiKeys = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const dbConfigs = await LLMConfigModel.listMasked(userId);
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.provider_key, c]));

    const keys = Object.keys(LLM_PROVIDERS).map((key) => {
      const provider = LLM_PROVIDERS[key];
      const dbConfig = dbConfigMap.get(key);
      return {
        provider: key,
        name: provider.name,
        hasKey: !!(provider.isDemo || (dbConfig && dbConfig.has_key)),
        source: (dbConfig && dbConfig.has_key) ? 'database' : 'none',
        isActive: provider.isDemo ? true : dbConfig ? dbConfig.is_active : false,
      };
    });

    res.json({ keys });
  } catch (error) {
    next(error);
  }
};
