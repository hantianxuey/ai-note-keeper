import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Plus, Trash2, MessageSquare, Sparkles, BookOpen } from 'lucide-react';
import { ragAPI } from '../services/api';
import { Conversation, ConversationMessage, Citation } from '../types';
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

  const renderMessageWithCitations = (content: string, citations?: Citation[]) => {
    if (!citations || citations.length === 0) {
      return <span>{content}</span>;
    }

    const parts: React.ReactNode[] = [];
    const regex = /\[Source (\d+):\s*"([^"]+)"\]/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
      }

      const sourceIndex = parseInt(match[1], 10);
      const noteTitle = match[2];
      const citation = citations.find((c) => c.sourceIndex === sourceIndex) ||
        citations.find((c) => c.noteTitle === noteTitle);

      if (citation) {
        parts.push(
          <Link
            key={key++}
            to={`/notes/${citation.noteId}`}
            className="mx-0.5 inline-flex items-center rounded border border-border/70 bg-muted px-1.5 py-0.5 text-xs no-underline transition hover:bg-muted/80"
            title={noteTitle}
          >
            <span className="max-w-[120px] truncate">{noteTitle}</span>
          </Link>
        );
      } else {
        parts.push(<span key={key++} className="text-xs text-muted-foreground">{match[0]}</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

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
  }, [id, isLoadingConversations, conversations, loadConversation]);

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

  const starterPrompts = [
    t('tryAsking'),
    'Summarize the notes tagged project',
    'Find decisions from my latest meeting',
    'What should I review today?',
  ];

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <header className="app-header shrink-0">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="btn-ghost px-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="section-label">RAG assistant</p>
            <h1 className="text-xl font-bold">{t('pageTitle')}</h1>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <aside className="hidden w-80 shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm md:flex md:flex-col">
          <button onClick={handleNewChat} className="btn-accent m-4 mb-3">
            <Plus size={18} />
            <span>{t('newChat')}</span>
          </button>

          {isLoadingConversations ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <MessageSquare size={24} />
              </div>
              <p className="text-sm font-semibold">{t('noConversations')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('startNewChat')}</p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 pt-0">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex cursor-pointer items-center justify-between rounded-md border p-3 transition ${
                    currentConversation?.id === conv.id
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-transparent hover:border-border hover:bg-muted/60'
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="truncate text-sm font-semibold">{conv.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: getLocale() })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conv.id);
                    }}
                    className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="surface flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/25 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {currentConversation?.title || t('askYourNotes')}
              </div>
              <div className="text-xs text-muted-foreground">
                Using {llmConfig.provider} / {embeddingConfig.provider}
              </div>
            </div>
            <button onClick={handleNewChat} className="btn-secondary md:hidden">
              <Plus size={16} />
              {t('newChat')}
            </button>
          </div>

          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="max-w-xl p-6 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Sparkles size={30} />
                </div>
                <h2 className="mb-2 text-3xl font-bold">{t('askYourNotes')}</h2>
                <p className="mb-5 leading-7 text-muted-foreground">{t('aiWillSearch')}</p>
                <div className="grid gap-2 text-left sm:grid-cols-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setQuestion(prompt)}
                      className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground transition hover:border-accent/40 hover:text-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto bg-background/40 p-4 sm:p-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-7">
                      {renderMessageWithCitations(message.content, message.citations)}
                    </div>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 border-t pt-3 text-xs">
                        <p className="mb-2 flex items-center gap-1 font-medium text-muted-foreground">
                          <BookOpen size={13} />
                          {t('sources')}
                        </p>
                        <div className="space-y-1">
                          {message.citations.map((citation, i) => (
                            <Link key={i} to={`/notes/${citation.noteId}`} className="block hover:underline">
                              <span className="font-medium">
                                [{citation.sourceIndex || i + 1}] {citation.noteTitle}
                              </span>
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
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex gap-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent delay-100" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-accent delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="shrink-0 border-t border-border bg-card p-4">
            <div className="mx-auto flex max-w-5xl gap-2">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('askPlaceholder')}
                className="input-field min-h-[44px] flex-1 resize-none"
                rows={1}
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading || !question.trim()} className="btn-accent px-4">
                <Send size={20} />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t('aiDisclaimer')}</p>
          </div>
        </main>
      </div>
    </div>
  );
}
