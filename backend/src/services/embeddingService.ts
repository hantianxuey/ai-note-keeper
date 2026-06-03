import { ChromaClient, Collection, EmbeddingFunction } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import OpenAI from 'openai';
import { EMBEDDING_PROVIDERS } from '../types/llm';
import { EmbeddingConfigModel } from '../models/EmbeddingConfig';
import pool from '../config/database';

const PLACEHOLDER_PATTERNS = ['your_', '_here', 'xxx', 'placeholder', 'changeme', 'change_me', 'example', 'sk-placeholder'];
const DEFAULT_CHROMA_URL = 'http://localhost:8000';

export function resolveChromaUrl(env: Partial<Record<'CHROMA_URL', string>> = process.env): string {
  return (env.CHROMA_URL || DEFAULT_CHROMA_URL).replace(/\/+$/, '');
}

export function resolveChromaClientArgs(chromaUrl: string): { host: string; port: number; ssl: boolean } {
  const url = new URL(chromaUrl);
  return {
    host: url.hostname,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    ssl: url.protocol === 'https:',
  };
}

function isPlaceholderApiKey(apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length < 10) return true;
  const lower = apiKey.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: string;
}

class EmbeddingService {
  private client: ChromaClient | null = null;
  private collection: Collection | null = null;
  private openaiClients: Map<string, OpenAI> = new Map();
  private embeddingModels: Map<string, string> = new Map();
  private embeddingFunction: DefaultEmbeddingFunction | EmbeddingFunction | null = null;
  private initialized = false;
  private currentEmbeddingProvider: string = 'qwen';
  private chromaUrl = resolveChromaUrl();

  constructor() {
    this.initChroma();
    this.initOpenAI().catch((error) => {
      console.warn('Embedding provider initialization failed:', error);
      this.initialized = true;
    });
  }

  private async initChroma() {
    try {
      this.client = new ChromaClient(resolveChromaClientArgs(this.chromaUrl));
      console.log(`ChromaDB client initialized at ${this.chromaUrl}`);
    } catch (error) {
      console.warn('ChromaDB initialization failed, using fallback:', error);
      this.client = null;
    }
  }

  private getEmbeddingBaseURL(provider: string): string {
    return EMBEDDING_PROVIDERS[provider]?.baseURL || 'https://api.openai.com/v1';
  }

  private getEmbeddingModel(provider: string): string {
    const providerInfo = EMBEDDING_PROVIDERS[provider];
    if (providerInfo && providerInfo.models.length > 0) {
      return this.embeddingModels.get(provider) || providerInfo.models[0];
    }
    return this.embeddingModels.get(provider) || 'text-embedding-ada-002';
  }

  private getFallbackModels(provider: string): string[] {
    const providerInfo = EMBEDDING_PROVIDERS[provider];
    if (providerInfo) {
      const defaultModel = this.embeddingModels.get(provider) || providerInfo.models[0];
      return providerInfo.models.filter((m) => m !== defaultModel);
    }
    return ['text-embedding-ada-002'];
  }

  private async initOpenAI() {
    await EmbeddingConfigModel.ensureTable();

    for (const [provider, providerInfo] of Object.entries(EMBEDDING_PROVIDERS)) {
      const apiKey = process.env[providerInfo.apiKeyEnv];
      if (apiKey && !isPlaceholderApiKey(apiKey)) {
        const client = new OpenAI({ apiKey, baseURL: providerInfo.baseURL });
        this.openaiClients.set(provider, client);
        this.embeddingModels.set(provider, providerInfo.models[0]);
        console.log(`✅ ${provider} Embedding loaded from env (${providerInfo.apiKeyEnv})`);
      }
    }

    const LLM_FALLBACK_ENV_KEYS: Record<string, string> = {
      'openai': 'OPENAI_API_KEY',
      'kimi': 'KIMI_API_KEY',
      'qwen': 'QWEN_API_KEY',
      'zhipu': 'ZHIPU_API_KEY',
      'doubao': 'DOUBAO_API_KEY',
      'openrouter': 'OPENROUTER_API_KEY',
    };

    for (const [provider, envKey] of Object.entries(LLM_FALLBACK_ENV_KEYS)) {
      if (this.openaiClients.has(provider)) continue;
      if (!EMBEDDING_PROVIDERS[provider]) continue;
      const apiKey = process.env[envKey];
      if (apiKey && !isPlaceholderApiKey(apiKey)) {
        const baseURL = EMBEDDING_PROVIDERS[provider].baseURL;
        const client = new OpenAI({ apiKey, baseURL });
        this.openaiClients.set(provider, client);
        this.embeddingModels.set(provider, EMBEDDING_PROVIDERS[provider].models[0]);
        console.log(`✅ ${provider} Embedding loaded from LLM env fallback (${envKey})`);
      }
    }

    try {
      const dbConfigs = await EmbeddingConfigModel.findAll();
      for (const config of dbConfigs) {
        if (config.provider_key && config.api_key && !isPlaceholderApiKey(config.api_key)) {
          if (EMBEDDING_PROVIDERS[config.provider_key]) {
            const providerInfo = EMBEDDING_PROVIDERS[config.provider_key];
            const client = new OpenAI({
              apiKey: config.api_key,
              baseURL: providerInfo.baseURL,
            });
            this.openaiClients.set(config.provider_key, client);
            this.embeddingModels.set(config.provider_key, providerInfo.models[0]);
            console.log(`✅ ${config.provider_key} Embedding loaded from DB`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load embedding providers from DB:', error);
    }

    try {
      const { LLMConfigModel } = await import('../models/LLMConfig');
      const llmConfigs = await LLMConfigModel.findAll();
      for (const config of llmConfigs) {
        if (this.openaiClients.has(config.provider_key)) continue;
        if (config.provider_key && config.api_key && !isPlaceholderApiKey(config.api_key)) {
          if (EMBEDDING_PROVIDERS[config.provider_key]) {
            const providerInfo = EMBEDDING_PROVIDERS[config.provider_key];
            const client = new OpenAI({
              apiKey: config.api_key,
              baseURL: providerInfo.baseURL,
            });
            this.openaiClients.set(config.provider_key, client);
            this.embeddingModels.set(config.provider_key, providerInfo.models[0]);
            console.log(`✅ ${config.provider_key} Embedding loaded from LLM DB fallback`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load embedding providers from LLM DB fallback:', error);
    }

    this.initialized = true;
    console.log('✅ Embedding providers initialized:', Array.from(this.openaiClients.keys()));
  }

  async reloadProvider(provider: string, apiKey: string, model?: string): Promise<boolean> {
    try {
      if (isPlaceholderApiKey(apiKey)) {
        console.warn(`Invalid API key for embedding provider: ${provider}`);
        return false;
      }

      if (!EMBEDDING_PROVIDERS[provider]) {
        console.warn(`Unknown embedding provider: ${provider}`);
        return false;
      }

      const providerInfo = EMBEDDING_PROVIDERS[provider];
      const effectiveModel = model || providerInfo.models[0];
      const client = new OpenAI({ apiKey, baseURL: providerInfo.baseURL });
      this.openaiClients.set(provider, client);
      this.embeddingModels.set(provider, effectiveModel);

      console.log(`✅ ${provider} Embedding provider reloaded (baseURL: ${providerInfo.baseURL}, model: ${effectiveModel})`);

      this.collection = null;
      await this.initializeEmbeddingFunction(provider);

      return true;
    } catch (error) {
      console.error(`Failed to reload embedding provider ${provider}:`, error);
      return false;
    }
  }

  removeProvider(provider: string): void {
    this.openaiClients.delete(provider);
    this.embeddingModels.delete(provider);
    console.log(`Embedding provider removed: ${provider}`);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.openaiClients.keys());
  }

  getProviderModels(provider: string): string[] {
    const providerInfo = EMBEDDING_PROVIDERS[provider];
    return providerInfo ? providerInfo.models : [];
  }

  getAllProviderModels(): Array<{ provider: string; model: string; providerName: string }> {
    const models: Array<{ provider: string; model: string; providerName: string }> = [];
    for (const [key, providerInfo] of Object.entries(EMBEDDING_PROVIDERS)) {
      providerInfo.models.forEach((model) => {
        models.push({
          provider: key,
          model,
          providerName: providerInfo.name,
        });
      });
    }
    return models;
  }

  private async initializeEmbeddingFunction(provider: string): Promise<void> {
    try {
      const client = this.openaiClients.get(provider);
      if (!client) {
        console.warn(`No client for provider ${provider}, using DefaultEmbeddingFunction`);
        this.embeddingFunction = new DefaultEmbeddingFunction();
        return;
      }

      const apiKey = (client as OpenAI).apiKey;
      if (!apiKey || isPlaceholderApiKey(apiKey)) {
        console.warn(`Invalid API key for provider ${provider}, using DefaultEmbeddingFunction`);
        this.embeddingFunction = new DefaultEmbeddingFunction();
        return;
      }

      this.embeddingFunction = new DefaultEmbeddingFunction();
      this.currentEmbeddingProvider = provider;
      console.log(`✅ Embedding function initialized for ${provider}`);
    } catch (error) {
      console.error(`Failed to initialize embedding function for ${provider}:`, error);
      this.embeddingFunction = new DefaultEmbeddingFunction();
    }
  }

  async getCollection(): Promise<Collection | null> {
    if (!this.client) {
      console.warn('ChromaDB client not available');
      return null;
    }

    if (this.collection) {
      return this.collection;
    }

    try {
      this.collection = await this.client.getOrCreateCollection({
        name: 'note_embeddings',
        metadata: { description: 'Note embeddings for RAG search' },
        embeddingFunction: this.embeddingFunction || undefined,
      });
      console.log('ChromaDB collection ready');
      return this.collection;
    } catch (error) {
      console.error('Failed to get/create ChromaDB collection:', error);
      return null;
    }
  }

  async getVectorStoreStatus(): Promise<{ status: 'ok' | 'down'; message: string; url: string }> {
    if (!this.client) {
      return {
        status: 'down',
        message: 'ChromaDB client is not initialized',
        url: this.chromaUrl,
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(`${this.chromaUrl}/api/v2/heartbeat`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return {
            status: 'down',
            message: `ChromaDB heartbeat returned HTTP ${response.status}`,
            url: this.chromaUrl,
          };
        }

        return {
          status: 'ok',
          message: 'ChromaDB heartbeat responded',
          url: this.chromaUrl,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      return {
        status: 'down',
        message: error?.name === 'AbortError' ? 'ChromaDB heartbeat timed out' : 'ChromaDB heartbeat failed',
        url: this.chromaUrl,
      };
    }
  }

  async ensureCollectionReady(provider: string = 'qwen'): Promise<void> {
    if (!this.collection) {
      await this.initializeEmbeddingFunction(provider);
      await this.getCollection();
    }
  }

  async createEmbedding(text: string, provider: string = 'qwen'): Promise<EmbeddingResult | null> {
    try {
      const client = this.openaiClients.get(provider);

      if (!client) {
        return this.createDemoEmbedding(text, provider);
      }

      const model = this.embeddingModels.get(provider) || this.getEmbeddingModel(provider);
      const baseURL = this.getEmbeddingBaseURL(provider);

      console.log(`🔄 Creating embedding with ${provider}, model: ${model}, baseURL: ${baseURL}`);

      const response = await (client as OpenAI).embeddings.create({
        model,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        model,
        provider,
      };
    } catch (error: any) {
      console.error(`❌ Embedding creation failed for provider ${provider}:`, error.message);
      if (error.response?.status === 404) {
        const fallbackModels = this.getFallbackModels(provider);
        for (const fallbackModel of fallbackModels) {
          try {
            console.error(`   尝试备用模型: ${fallbackModel}...`);
            const client = this.openaiClients.get(provider) as OpenAI;
            const response = await client.embeddings.create({
              model: fallbackModel,
              input: text,
            });
            console.error(`   ✅ 备用模型 ${fallbackModel} 成功!`);
            this.embeddingModels.set(provider, fallbackModel);
            return {
              embedding: response.data[0].embedding,
              model: fallbackModel,
              provider,
            };
          } catch (e: any) {
            console.error(`   ❌ 备用模型 ${fallbackModel} 也失败:`, e.message);
          }
        }
      }
      console.warn(`   ⚠️ ${provider} 所有模型都失败，回退到 demo embedding`);
      return this.createDemoEmbedding(text, provider);
    }
  }

  private createDemoEmbedding(text: string, provider: string): EmbeddingResult {
    const embedding = this.generateSimulatedEmbedding(text);
    return {
      embedding,
      model: 'demo-embedding',
      provider,
    };
  }

  private generateSimulatedEmbedding(text: string): number[] {
    const dimensions = 1536;
    const seed = this.hashString(text);
    const embedding = new Array(dimensions).fill(0);
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = Math.sin(seed * (i + 1)) * 0.1;
    }
    return embedding;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  async indexNote(noteId: number, userId: number, title: string, content: string, provider: string = 'qwen'): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      if (!collection) {
        console.warn('ChromaDB not available, skipping indexing');
        return false;
      }

      const textToEmbed = `${title}\n\n${content}`;
      const result = await this.createEmbedding(textToEmbed, provider);

      if (!result) {
        console.error('Failed to create embedding for note', noteId);
        return false;
      }

      await collection.upsert({
        ids: [`note_${userId}_${noteId}`],
        embeddings: [result.embedding],
        documents: [textToEmbed],
        metadatas: [{ noteId, userId, title }],
      });

      console.log(`✅ Indexed note ${noteId} for user ${userId} with ${result.provider}/${result.model}`);
      return true;
    } catch (error) {
      console.error('Failed to index note:', error);
      return false;
    }
  }

  async search(query: string, limit: number = 5, provider: string = 'qwen', userId?: number): Promise<Array<{ noteId: number; userId: number; title: string; content: string; distance: number }>> {
    try {
      const collection = await this.getCollection();
      if (!collection) {
        console.warn('ChromaDB not available, returning empty results');
        return [];
      }

      const queryEmbedding = await this.createEmbedding(query, provider);
      if (!queryEmbedding) {
        return [];
      }

      const whereFilter = userId !== undefined ? { userId } : undefined;

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding.embedding],
        nResults: limit,
        where: whereFilter,
        include: ['documents', 'metadatas', 'distances'],
      });

      const searchResults: Array<{ noteId: number; userId: number; title: string; content: string; distance: number }> = [];

      if (results.documents && results.documents[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          const metadata = results.metadatas?.[0]?.[i] as { noteId: number; userId: number; title: string } | undefined;
          const distance = results.distances?.[0]?.[i] ?? 1;

          if (metadata) {
            searchResults.push({
              noteId: metadata.noteId,
              userId: metadata.userId,
              title: metadata.title,
              content: String(results.documents[0][i]),
              distance,
            });
          }
        }
      }

      console.log(`✅ Vector search for user ${userId} returned ${searchResults.length} results`);
      return searchResults;
    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  async removeNote(noteId: number, userId: number): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      if (!collection) return false;

      await collection.delete({ ids: [`note_${userId}_${noteId}`] });
      console.log(`Removed note ${noteId} for user ${userId} from vector index`);
      return true;
    } catch (error) {
      console.error('Failed to remove note from index:', error);
      return false;
    }
  }

  async reindexAll(userId: number, provider?: string): Promise<number> {
    try {
      const effectiveProvider = provider || this.getDefaultProvider();
      const result = await pool.query(
        'SELECT id, user_id, title, content FROM notes WHERE user_id = $1',
        [userId]
      );

      let count = 0;
      for (const note of result.rows) {
        const success = await this.indexNote(note.id, note.user_id, note.title, note.content, effectiveProvider);
        if (success) count++;
      }

      console.log(`Reindexed ${count} notes for user ${userId} with ${effectiveProvider}`);
      return count;
    } catch (error) {
      console.error('Failed to reindex notes:', error);
      return 0;
    }
  }

  getDefaultProvider(): string {
    const available = this.getAvailableProviders();
    const preferred = ['qwen', 'openai', 'zhipu', 'kimi', 'doubao', 'openrouter'];
    for (const p of preferred) {
      if (available.includes(p)) return p;
    }
    return available[0] || 'demo';
  }

  getEmbeddingModels(): Map<string, string> {
    return this.embeddingModels;
  }

  async testConnection(provider: string, model: string): Promise<{ success: boolean; message: string; model?: string }> {
    try {
      const client = this.openaiClients.get(provider);
      if (!client) {
        return { success: false, message: `No API key configured for embedding provider: ${provider}` };
      }

      const effectiveModel = model || this.getEmbeddingModel(provider);
      const response = await (client as OpenAI).embeddings.create({
        model: effectiveModel,
        input: 'test',
      });

      const dim = response.data[0].embedding.length;
      return {
        success: true,
        message: `OK - ${provider}:${effectiveModel} (dimensions: ${dim})`,
        model: effectiveModel,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Embedding test failed: ${error.message}`,
      };
    }
  }
}

export const embeddingService = new EmbeddingService();
