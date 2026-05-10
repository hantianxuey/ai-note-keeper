export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export const EMBEDDING_PROVIDERS: Record<
  string,
  {
    name: string;
    models: string[];
    baseURL: string;
    apiKeyEnv: string;
  }
> = {
  openai: {
    name: 'OpenAI',
    models: [
      'text-embedding-3-small',
      'text-embedding-3-large',
      'text-embedding-ada-002',
    ],
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'EMBEDDING_OPENAI_API_KEY',
  },
  kimi: {
    name: 'Kimi',
    models: [
      'text-embedding-ada-002',
    ],
    baseURL: 'https://api.moonshot.cn/v1',
    apiKeyEnv: 'EMBEDDING_KIMI_API_KEY',
  },
  zhipu: {
    name: 'Zhipu AI',
    models: [
      'embedding-2',
      'embedding-3',
    ],
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyEnv: 'EMBEDDING_ZHIPU_API_KEY',
  },
  qwen: {
    name: 'Qwen',
    models: [
      'text-embedding-v4',
      'text-embedding-v2',
      'text-embedding-v1',
    ],
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'EMBEDDING_QWEN_API_KEY',
  },
  doubao: {
    name: 'Doubao',
    models: [
      'text-embedding-v2',
    ],
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyEnv: 'EMBEDDING_DOUBAO_API_KEY',
  },
  openrouter: {
    name: 'OpenRouter',
    models: [
      'text-embedding-3-small',
      'text-embedding-3-large',
      'text-embedding-ada-002',
    ],
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'EMBEDDING_OPENROUTER_API_KEY',
  },
};

export const LLM_PROVIDERS: Record<
  string,
  {
    name: string;
    models: string[];
    baseURL?: string;
    apiKeyEnv: string;
    apiKey?: string;
    isDemo?: boolean;
  }
> = {
  demo: {
    name: 'Demo (Free)',
    models: [
      'demo-chat',
      'demo-summary',
      'demo-keywords',
    ],
    apiKeyEnv: 'DEMO_API_KEY',
    isDemo: true,
  },
  openai: {
    name: 'OpenAI',
    models: [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ],
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  kimi: {
    name: 'Kimi',
    models: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ],
    baseURL: 'https://api.moonshot.cn/v1',
    apiKeyEnv: 'KIMI_API_KEY',
  },
  deepseek: {
    name: 'DeepSeek',
    models: [
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'deepseek-chat',
      'deepseek-coder',
    ],
    baseURL: 'https://api.deepseek.com',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
  zhipu: {
    name: 'Zhipu AI',
    models: [
      'glm-4',
      'glm-4v',
      'glm-3-turbo',
    ],
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyEnv: 'ZHIPU_API_KEY',
  },
  qwen: {
    name: 'Qwen',
    models: [
      'qwen-max',
      'qwen-plus',
      'qwen-turbo',
    ],
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'QWEN_API_KEY',
  },
  doubao: {
    name: 'Doubao',
    models: [
      'doubao-pro-32k',
      'doubao-pro-128k',
      'doubao-lite-32k',
      'doubao-lite-128k',
    ],
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyEnv: 'DOUBAO_API_KEY',
  },
  openrouter: {
    name: 'OpenRouter',
    models: [
      'openai/gpt-4o',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
    ],
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
  },
};
