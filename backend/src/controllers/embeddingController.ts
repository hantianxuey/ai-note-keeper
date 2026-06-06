import { Response, NextFunction } from 'express';
import { embeddingService } from '../services/embeddingService';
import { EmbeddingConfigModel } from '../models/EmbeddingConfig';
import { EMBEDDING_PROVIDERS } from '../types/llm';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { readSensitiveField } from '../config/requestEncryption';
import { recordAuditEvent } from '../services/auditService';
import { requireUserId } from './controllerUtils';

export const getEmbeddingProviders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const dbConfigs = await EmbeddingConfigModel.listMasked(userId);
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.provider_key, c]));

    const allProviders = Object.entries(EMBEDDING_PROVIDERS).map(([key, provider]) => {
      const dbConfig = dbConfigMap.get(key);
      const hasKey = !!(dbConfig && dbConfig.has_key);
      return {
        key,
        name: provider.name,
        models: provider.models,
        baseURL: provider.baseURL,
        apiKeyEnv: provider.apiKeyEnv,
        hasKey,
        isActive: dbConfig ? dbConfig.is_active : false,
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

export const getEmbeddingModels = (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const models = embeddingService.getAllProviderModels();
    res.json({ models });
  } catch (error) {
    next(error);
  }
};

export const testEmbeddingConnection = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { provider, model } = req.body;
    const result = await embeddingService.testConnection(provider, model, requireUserId(req));
    res.json(result);
  } catch (error: any) {
    res.json({
      success: false,
      message: 'Embedding connection test failed: ' + (error.message || 'Unknown error'),
    });
  }
};

export const saveEmbeddingApiKey = async (
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

    if (!EMBEDDING_PROVIDERS[provider]) {
      return next(new AppError('Unknown embedding provider: ' + provider, 400));
    }

    await EmbeddingConfigModel.upsert(userId, provider, apiKey);
    embeddingService.removeUserProvider(userId, provider);
    recordAuditEvent({
      event: 'provider_key.embedding.save',
      outcome: 'success',
      userId,
      metadata: { provider },
    });

    res.json({
      success: true,
      message: `Embedding API Key for ${EMBEDDING_PROVIDERS[provider].name} saved and provider reloaded`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmbeddingApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { provider } = req.params;
    const userId = requireUserId(req);

    if (!EMBEDDING_PROVIDERS[provider]) {
      return next(new AppError('Unknown embedding provider: ' + provider, 400));
    }

    await EmbeddingConfigModel.delete(userId, provider);
    embeddingService.removeUserProvider(userId, provider);
    recordAuditEvent({
      event: 'provider_key.embedding.delete',
      outcome: 'success',
      userId,
      metadata: { provider },
    });

    res.json({
      success: true,
      message: `Embedding API Key for ${EMBEDDING_PROVIDERS[provider].name} deleted`,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmbeddingApiKeys = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const dbConfigs = await EmbeddingConfigModel.listMasked(userId);
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.provider_key, c]));

    const keys = Object.entries(EMBEDDING_PROVIDERS).map(([key, provider]) => {
      const dbConfig = dbConfigMap.get(key);
      return {
        provider: key,
        name: provider.name,
        hasKey: !!(dbConfig && dbConfig.has_key),
        source: (dbConfig && dbConfig.has_key) ? 'database' : 'none',
        isActive: dbConfig ? dbConfig.is_active : false,
      };
    });

    res.json({ keys });
  } catch (error) {
    next(error);
  }
};
