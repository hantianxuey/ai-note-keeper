import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Plus, Trash2, MessageSquare } from 'lucide-react';
import { ragAPI } from '../services/api';
import { Conversation, ConversationMessage } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useLLMStore } from '../store/useLLMStore';
import { useEmbeddingStore } from '../store/useEmbeddingStore';

export default function Chat() {
  const { t, i18n } = useTranslation('chat');
  const { id } = useParams();
  const navigate = useNavigate();
  const { config: llmConfig } = useLLMStore();
  const { config: embeddingConfig } = useEmbeddingStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  const loadConversations = useCallback(async () => {
    try {
      const response = await ragAPI.listConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: number) => {
    try {
      const response = await ragAPI.getConversation(conversationId);
      setCurrentConversation(response.data.conversation);
      setMessages(response.data.conversation.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (isLoadingConversations) return;

    if (id) {
      loadConversation(parseInt(id));
    } else if (!initialLoadDone.current && conversations.length > 0) {
      loadConversation(conversations[0].id);
      initialLoadDone.current = true;
    } else if (!initialLoadDone.current && conversations.length === 0) {
      setCurrentConversation(null);
      setMessages([]);
      initialLoadDone.current = true;
    }
  }, [id, isLoadingConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: question.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await ragAPI.ask({
        question: currentQuestion,
        conversationId: currentConversation?.id,
        provider: llmConfig.provider,
        model: llmConfig.model,
        embeddingProvider: embeddingConfig.provider,
      });

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: response.data.answer,
        citations: response.data.citations,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const newConversationId = response.data.conversationId;

      if (!currentConversation && newConversationId) {
        const newConv: Conversation = {
          id: newConversationId,
          user_id: 0,
          title: currentQuestion.length > 50 ? currentQuestion.substring(0, 50) + '...' : currentQuestion,
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCurrentConversation(newConv);
        navigate(`/chat/${newConversationId}`, { replace: true });
      }

      await loadConversations();

      if (newConversationId) {
        await loadConversation(newConversationId);
      }
    } catch (error) {
      console.error('Failed to get answer:', error);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    navigate('/chat', { replace: true });
  };

  const handleSelectConversation = async (conversationId: number) => {
    if (currentConversation?.id === conversationId) return;
    navigate(`/chat/${conversationId}`);
  };

  const handleDelete = async (conversationId: number) => {
    if (!confirm(t('deleteConversationConfirm'))) return;

    try {
      await ragAPI.deleteConversation(conversationId);
      await loadConversations();

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
        navigate('/chat', { replace: true });
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getLocale = () => {
    return i18n.language === 'zh-CN' ? zhCN : undefined;
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="shrink-0 border-b">
        <div className="px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-muted rounded-md transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">{t('pageTitle')}</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <aside className="w-64 shrink-0 border-r p-4 overflow-y-auto bg-card">
          <div className="mb-4">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              <span>{t('newChat')}</span>
            </button>
          </div>

          {isLoadingConversations ? (
            <div className="text-sm text-muted-foreground text-center py-4">{t('loading', { ns: 'common' })}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={32} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('noConversations')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('startNewChat')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    currentConversation?.id === conv.id
                      ? 'bg-secondary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="overflow-hidden flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{conv.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: getLocale() })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-opacity shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col">
          {messages.length === 0 && !isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md p-6">
                <h2 className="text-2xl font-bold mb-2">{t('askYourNotes')}</h2>
                <p className="text-muted-foreground mb-4">
                  {t('aiWillSearch')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('tryAsking')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t text-xs">
                        <p className="font-medium mb-1 text-muted-foreground">{t('sources')}</p>
                        <div className="space-y-1">
                          {message.citations.map((citation, i) => (
                            <Link
                              key={i}
                              to={`/notes/${citation.noteId}`}
                              className="block hover:underline"
                            >
                              {citation.noteTitle}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-lg bg-card border">
                    <div className="flex gap-2">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce delay-100">●</span>
                      <span className="animate-bounce delay-200">●</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="shrink-0 border-t p-4 bg-background">
            <div className="flex gap-2 max-w-5xl mx-auto">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('askPlaceholder')}
                className="flex-1 px-3 py-2 border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !question.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('aiDisclaimer')}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
