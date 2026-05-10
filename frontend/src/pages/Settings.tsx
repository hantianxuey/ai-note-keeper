import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Cpu, RefreshCw, CheckCircle, XCircle, Key, Trash2, Save, Globe, Sun, Moon, Monitor, Database } from 'lucide-react';
import { llmAPI, embeddingAPI, ApiKeyInfo } from '../services/api';
import { useLLMStore } from '../store/useLLMStore';
import { useEmbeddingStore } from '../store/useEmbeddingStore';
import { useThemeStore, Theme } from '../store/useThemeStore';

export default function Settings() {
  const { t, i18n } = useTranslation('settings');
  const { theme, setTheme } = useThemeStore();
  const {
    allSupportedProviders: llmProviders,
    models: llmModels,
    config: llmConfig,
    isTesting: isLlmTesting,
    testResult: llmTestResult,
    loadProviders: loadLlmProviders,
    loadModels: loadLlmModels,
    setConfig: setLlmConfig,
    testConnection: testLlmConnection,
  } = useLLMStore();

  const {
    allSupportedProviders: embeddingProviders,
    models: embeddingModels,
    config: embeddingConfig,
    isTesting: isEmbeddingTesting,
    testResult: embeddingTestResult,
    loadProviders: loadEmbeddingProviders,
    loadModels: loadEmbeddingModels,
    setConfig: setEmbeddingConfig,
    testConnection: testEmbeddingConnection,
  } = useEmbeddingStore();

  const [llmApiKeys, setLlmApiKeys] = useState<ApiKeyInfo[]>([]);
  const [embeddingApiKeys, setEmbeddingApiKeys] = useState<ApiKeyInfo[]>([]);
  const [editingLlmProvider, setEditingLlmProvider] = useState<string | null>(null);
  const [editingEmbeddingProvider, setEditingEmbeddingProvider] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLlmProviders();
    loadLlmModels();
    loadEmbeddingProviders();
    loadEmbeddingModels();
    loadLlmApiKeys();
    loadEmbeddingApiKeys();
  }, [loadLlmProviders, loadLlmModels, loadEmbeddingProviders, loadEmbeddingModels]);

  const loadLlmApiKeys = async () => {
    try {
      const response = await llmAPI.getApiKeys();
      setLlmApiKeys(response.data.keys);
    } catch (error) {
      console.error('Failed to load LLM API keys:', error);
    }
  };

  const loadEmbeddingApiKeys = async () => {
    try {
      const response = await embeddingAPI.getApiKeys();
      setEmbeddingApiKeys(response.data.keys);
    } catch (error) {
      console.error('Failed to load Embedding API keys:', error);
    }
  };

  const filteredLlmModels = llmModels.filter(
    (m) => m.provider === llmConfig.provider
  );

  const filteredEmbeddingModels = embeddingModels.filter(
    (m) => m.provider === embeddingConfig.provider
  );

  const handleLlmTest = async () => {
    await testLlmConnection(llmConfig.provider, llmConfig.model);
  };

  const handleEmbeddingTest = async () => {
    await testEmbeddingConnection(embeddingConfig.provider, embeddingConfig.model);
  };

  const handleSaveLlmApiKey = async (provider: string) => {
    if (!newApiKey.trim()) return;
    setSavingKey(provider);
    try {
      const response = await llmAPI.saveApiKey(provider, newApiKey.trim());
      if (response.data.success) {
        setMessage({ type: 'success', text: t('apiKeySaved') });
        setEditingLlmProvider(null);
        setNewApiKey('');
        await loadLlmApiKeys();
        await loadLlmProviders();
        await loadLlmModels();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('connectionFailed') });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveEmbeddingApiKey = async (provider: string) => {
    if (!newApiKey.trim()) return;
    setSavingKey(provider);
    try {
      const response = await embeddingAPI.saveApiKey(provider, newApiKey.trim());
      if (response.data.success) {
        setMessage({ type: 'success', text: t('embeddingApiKeySaved') });
        setEditingEmbeddingProvider(null);
        setNewApiKey('');
        await loadEmbeddingApiKeys();
        await loadEmbeddingProviders();
        await loadEmbeddingModels();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('connectionFailed') });
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteLlmApiKey = async (provider: string) => {
    if (!confirm(t('deleteKeyConfirm'))) return;
    try {
      const response = await llmAPI.deleteApiKey(provider);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('apiKeyDeleted') });
        await loadLlmApiKeys();
        await loadLlmProviders();
        await loadLlmModels();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to delete API key' });
    }
  };

  const handleDeleteEmbeddingApiKey = async (provider: string) => {
    if (!confirm(t('deleteKeyConfirm'))) return;
    try {
      const response = await embeddingAPI.deleteApiKey(provider);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('embeddingApiKeyDeleted') });
        await loadEmbeddingApiKeys();
        await loadEmbeddingProviders();
        await loadEmbeddingModels();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to delete embedding API key' });
    }
  };

  const handleChangeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getLlmKeyInfo = (providerKey: string): ApiKeyInfo | undefined => {
    return llmApiKeys.find((k) => k.provider === providerKey);
  };

  const getEmbeddingKeyInfo = (providerKey: string): ApiKeyInfo | undefined => {
    return embeddingApiKeys.find((k) => k.provider === providerKey);
  };

  const isLlmProviderConfigured = (providerKey: string) => {
    return getLlmKeyInfo(providerKey)?.hasKey || false;
  };

  const isEmbeddingProviderConfigured = (providerKey: string) => {
    return getEmbeddingKeyInfo(providerKey)?.hasKey || false;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-muted rounded-md transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">{t('pageTitle')}</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {message && (
          <div
            className={`p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-4 text-sm underline">
                {t('dismiss', { ns: 'common' })}
              </button>
            </div>
          </div>
        )}

        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <Globe size={24} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('language')}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleChangeLanguage('en')}
              className={`px-4 py-2 rounded-md border transition-colors ${
                i18n.language === 'en'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleChangeLanguage('zh-CN')}
              className={`px-4 py-2 rounded-md border transition-colors ${
                i18n.language === 'zh-CN'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted'
              }`}
            >
              简体中文
            </button>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <Sun size={24} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('theme')}</h2>
          </div>
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
              <button
                key={themeOption}
                onClick={() => setTheme(themeOption)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  theme === themeOption
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {themeOption === 'light' && <Sun size={18} />}
                {themeOption === 'dark' && <Moon size={18} />}
                {themeOption === 'system' && <Monitor size={18} />}
                <span>{t(`theme.${themeOption}`)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <Cpu size={24} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('llmModelConfig')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('llmModelConfigDesc')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('aiProvider')}</label>
              <select
                value={llmConfig.provider}
                onChange={(e) => setLlmConfig({ provider: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {llmProviders.map((provider) => (
                  <option
                    key={provider.key}
                    value={provider.key}
                    disabled={!isLlmProviderConfigured(provider.key)}
                    className="bg-background text-foreground"
                  >
                    {provider.name}
                    {!isLlmProviderConfigured(provider.key) ? ` (${t('notConfigured')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('model')}</label>
              <select
                value={llmConfig.model}
                onChange={(e) => setLlmConfig({ model: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={filteredLlmModels.length === 0}
              >
                {filteredLlmModels.map((model) => (
                  <option key={model.model} value={model.model} className="bg-background text-foreground">
                    {model.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button
                onClick={handleLlmTest}
                disabled={isLlmTesting || filteredLlmModels.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLlmTesting ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <CheckCircle size={18} />
                )}
                {isLlmTesting ? t('testing') : t('testConnection')}
              </button>

              {llmTestResult && (
                <div
                  className={`mt-4 p-4 rounded-md ${
                    llmTestResult.success ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {llmTestResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    <span className="font-medium">{llmTestResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <Database size={24} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('embeddingModelConfig')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('embeddingModelConfigDesc')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('embeddingProvider')}</label>
              <select
                value={embeddingConfig.provider}
                onChange={(e) => setEmbeddingConfig({ provider: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {embeddingProviders.map((provider) => (
                  <option
                    key={provider.key}
                    value={provider.key}
                    disabled={!isEmbeddingProviderConfigured(provider.key)}
                    className="bg-background text-foreground"
                  >
                    {provider.name}
                    {!isEmbeddingProviderConfigured(provider.key) ? ` (${t('notConfigured')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('embeddingModel')}</label>
              <select
                value={embeddingConfig.model}
                onChange={(e) => setEmbeddingConfig({ model: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={filteredEmbeddingModels.length === 0}
              >
                {filteredEmbeddingModels.map((model) => (
                  <option key={model.model} value={model.model} className="bg-background text-foreground">
                    {model.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <button
                onClick={handleEmbeddingTest}
                disabled={isEmbeddingTesting || filteredEmbeddingModels.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEmbeddingTesting ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <CheckCircle size={18} />
                )}
                {isEmbeddingTesting ? t('testing') : t('testEmbeddingConnection')}
              </button>

              {embeddingTestResult && (
                <div
                  className={`mt-4 p-4 rounded-md ${
                    embeddingTestResult.success ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {embeddingTestResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    <span className="font-medium">{embeddingTestResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <Key size={24} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('llmApiKeyManagement')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('configureLlmApiKeys')}
          </p>

          <div className="space-y-4">
            {llmProviders.map((provider) => {
              const keyInfo = getLlmKeyInfo(provider.key);
              const isConfigured = keyInfo?.hasKey || false;
              const isEditing = editingLlmProvider === provider.key;

              return (
                <div
                  key={provider.key}
                  className={`p-4 rounded-md border ${
                    isConfigured ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{provider.name}</span>
                      {isConfigured ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                          <CheckCircle size={14} />
                          {t('configured')}
                          {keyInfo?.source === 'env' && (
                            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">ENV</span>
                          )}
                          {keyInfo?.source === 'database' && (
                            <span className="ml-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs">DB</span>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                          <XCircle size={14} />
                          {t('notConfigured')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isConfigured && keyInfo?.source !== 'env' && (
                        <button
                          onClick={() => handleDeleteLlmApiKey(provider.key)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete API Key"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingLlmProvider(isEditing ? null : provider.key);
                          setNewApiKey('');
                        }}
                        className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                      >
                        {isEditing ? t('cancel') : isConfigured ? t('update') : t('addKey')}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-1">
                    {t('model')}: {provider.models.slice(0, 3).join(', ')}
                    {provider.models.length > 3 && ' ...'}
                  </p>

                  {isEditing && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="password"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder={t('enterApiKey', { provider: provider.name })}
                        className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      />
                      <button
                        onClick={() => handleSaveLlmApiKey(provider.key)}
                        disabled={savingKey === provider.key || !newApiKey.trim()}
                        className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                      >
                        {savingKey === provider.key ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        {t('save', { ns: 'common' })}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-center gap-3 mb-6">
            <Database size={24} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('embeddingApiKeyManagement')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('configureEmbeddingApiKeys')}
          </p>

          <div className="space-y-4">
            {embeddingProviders.map((provider) => {
              const keyInfo = getEmbeddingKeyInfo(provider.key);
              const isConfigured = keyInfo?.hasKey || false;
              const isEditing = editingEmbeddingProvider === provider.key;

              return (
                <div
                  key={provider.key}
                  className={`p-4 rounded-md border ${
                    isConfigured ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{provider.name}</span>
                      {isConfigured ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                          <CheckCircle size={14} />
                          {t('configured')}
                          {keyInfo?.source === 'env' && (
                            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">ENV</span>
                          )}
                          {keyInfo?.source === 'database' && (
                            <span className="ml-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs">DB</span>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                          <XCircle size={14} />
                          {t('notConfigured')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isConfigured && keyInfo?.source !== 'env' && (
                        <button
                          onClick={() => handleDeleteEmbeddingApiKey(provider.key)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete Embedding API Key"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingEmbeddingProvider(isEditing ? null : provider.key);
                          setNewApiKey('');
                        }}
                        className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                      >
                        {isEditing ? t('cancel') : isConfigured ? t('update') : t('addKey')}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-1">
                    {t('embeddingModel')}: {provider.models.slice(0, 3).join(', ')}
                    {provider.models.length > 3 && ' ...'}
                  </p>

                  {isEditing && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="password"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder={t('enterApiKey', { provider: provider.name })}
                        className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      />
                      <button
                        onClick={() => handleSaveEmbeddingApiKey(provider.key)}
                        disabled={savingKey === provider.key || !newApiKey.trim()}
                        className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                      >
                        {savingKey === provider.key ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        {t('save', { ns: 'common' })}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">{t('about')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('aboutDescription')}
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t('version')}: 1.3.0</p>
            <p>{t('supportedLlmProviders')}: {llmProviders.map(p => p.name).join(', ')}</p>
            <p>{t('supportedEmbeddingProviders')}: {embeddingProviders.map(p => p.name).join(', ')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
