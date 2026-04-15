import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Plus, Trash2 } from 'lucide-react';
import { ragAPI } from '../services/api';
import { Conversation, ConversationMessage } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function Chat() {
  const { id } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (id) {
      loadConversation(parseInt(id));
    } else if (conversations.length > 0) {
      loadConversation(conversations[0].id);
    }
  }, [id, conversations]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await ragAPI.listConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId: number) => {
    try {
      const response = await ragAPI.getConversation(conversationId);
      setCurrentConversation(response.data.conversation);
      setMessages(response.data.conversation.messages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: question.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      // TODO: Implement streaming response
      const response = await ragAPI.ask({
        question: userMessage.content,
        conversationId: currentConversation?.id,
      });

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: response.data.answer,
        citations: response.data.citations,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      loadConversations();
    } catch (error) {
      console.error('Failed to get answer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (conversationId: number) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await ragAPI.deleteConversation(conversationId);
      loadConversations();
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-muted rounded-md transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">AI Chat</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <aside className="w-64 shrink-0 border-r p-4 overflow-y-auto">
          <div className="mb-4">
            <button
              onClick={() => {
                setCurrentConversation(null);
                setMessages([]);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              <span>New Chat</span>
            </button>
          </div>

          {isLoadingConversations ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-sm text-muted-foreground">No conversations yet</div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer ${
                    currentConversation?.id === conv.id
                      ? 'bg-secondary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium truncate">{conv.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md p-6">
                <h2 className="text-2xl font-bold mb-2">Ask your notes</h2>
                <p className="text-muted-foreground mb-4">
                  AI will search through all your notes and answer questions based on your knowledge.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try asking: "What did I write about X?" or "Summarize my notes on Y"
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
                        <p className="font-medium mb-1 text-muted-foreground">Sources:</p>
                        <div className="space-y-1">
                          {message.citations.map((citation, i) => (
                            <a
                              key={i}
                              href={`/notes/${citation.noteId}`}
                              className="block hover:underline"
                            >
                              {citation.noteTitle}
                            </a>
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
            </div>
          )}

          {/* Input area */}
          <div className="border-t p-4">
            <div className="flex gap-2 max-w-5xl mx-auto">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your notes..."
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
              AI answers based on your existing notes. Responses may be incorrect, always verify important information.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
