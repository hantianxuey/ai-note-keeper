import { Response, NextFunction } from 'express';
import { embeddingService } from '../services/embeddingService';
import { EmbeddingConfigModel } from '../models/EmbeddingConfig';
import { EMBEDDING_PROVIDERS } from '../types/llm';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { readSensitiveField } from '../config/requestEncryption';

export const getEmbeddingProviders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const dbConfigs = await EmbeddingConfigModel.listMasked();
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.provider_key, c]));

    const allProviders = Object.entries(EMBEDDING_PROVIDERS).map(([key, provider]) => {
      const dbConfig = dbConfigMap.get(key);
      const envKey = process.env[provider.apiKeyEnv];
      const hasKey = !!(envKey || (dbConfig && dbConfig.has_key));
      return {
        key,
        name: provider.name,
        models: provider.models,
        baseURL: provider.baseURL,
        apiKeyEnv: provider.apiKeyEnv,
        hasKey,
        isActive: dbConfig ? dbConfig.is_active : !!envKey,
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
  req: AuthRequest,
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
  next: NextFunction
) => {
  try {
    const { provider, model } = req.body;
    const result = await embeddingService.testConnection(provider, model);
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

    if (!provider || !apiKey) {
      return next(new AppError('Provider and apiKey are required', 400));
    }

    if (!EMBEDDING_PROVIDERS[provider]) {
      return next(new AppError('Unknown embedding provider: ' + provider, 400));
    }

    await EmbeddingConfigModel.upsert(provider, apiKey);
    await embeddingService.reloadProvider(provider, apiKey);

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

    if (!EMBEDDING_PROVIDERS[provider]) {
      return next(new AppError('Unknown embedding provider: ' + provider, 400));
    }

    await EmbeddingConfigModel.delete(provider);
    embeddingService.removeProvider(provider);

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
    const dbConfigs = await EmbeddingConfigModel.listMasked();
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.provider_key, c]));

    const keys = Object.entries(EMBEDDING_PROVIDERS).map(([key, provider]) => {
      const dbConfig = dbConfigMap.get(key);
      const envKey = process.env[provider.apiKeyEnv];
      return {
        provider: key,
        name: provider.name,
        hasKey: !!(envKey || (dbConfig && dbConfig.has_key)),
        source: envKey ? 'env' : (dbConfig && dbConfig.has_key) ? 'database' : 'none',
        isActive: dbConfig ? dbConfig.is_active : !!envKey,
      };
    });

    res.json({ keys });
  } catch (error) {
    next(error);
  }
};
