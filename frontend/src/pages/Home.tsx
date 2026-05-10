import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, MessageSquare, Search, Settings, LogOut, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { notesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ThemeToggle from '../components/ThemeToggle';

export default function Home() {
  const { t, i18n } = useTranslation('notes');
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { notes, setNotes, deleteNote, setLoading, isLoading } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await notesAPI.list();
      setNotes(response.data.notes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('deleteNoteConfirm'))) return;
    try {
      await notesAPI.delete(noteId);
      deleteNote(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLocale = () => {
    return i18n.language === 'zh-CN' ? zhCN : undefined;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('appTitle')}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title={t('logout', { ns: 'common' })}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <aside className="w-64 shrink-0 hidden md:block">
          <nav className="space-y-1">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary text-secondary-foreground"
            >
              <FileText size={20} />
              <span>{t('myNotes')}</span>
            </Link>
            <Link
              to="/chat"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            >
              <MessageSquare size={20} />
              <span>{t('chat', { ns: 'common' })}</span>
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            >
              <Settings size={20} />
              <span>{t('settings', { ns: 'common' })}</span>
            </Link>
          </nav>

          <div className="mt-6">
            <Link
              to="/notes/new"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              <span>{t('newNote')}</span>
            </Link>
          </div>
        </aside>

        <main className="flex-1">
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder={t('searchNotes')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">{t('loading', { ns: 'common' })}</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium mb-2">{t('noNotesYet')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('createFirstNote')}
              </p>
              <Link
                to="/notes/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={18} />
                {t('createFirstNoteButton')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="group block p-4 border rounded-lg hover:shadow-md transition-shadow bg-card relative"
                >
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {note.title || t('untitled', { ns: 'common' })}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {note.content.replace(/#|```|\*\*/g, '').slice(0, 150)}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: getLocale() })}
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-opacity"
                    title={t('delete', { ns: 'common' })}
                  >
                    <Trash2 size={16} />
                  </button>
                </Link>
              ))}
            </div>
          )}

          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t py-3 px-4 flex justify-around">
            <Link to="/" className="flex flex-col items-center gap-1">
              <FileText size={20} />
              <span className="text-xs">{t('notes', { ns: 'common' })}</span>
            </Link>
            <Link to="/chat" className="flex flex-col items-center gap-1">
              <MessageSquare size={20} />
              <span className="text-xs">{t('chat', { ns: 'common' })}</span>
            </Link>
            <Link to="/notes/new" className="flex flex-col items-center gap-1">
              <div className="p-2 bg-primary text-primary-foreground rounded-full">
                <Plus size={20} />
              </div>
            </Link>
            <Link to="/settings" className="flex flex-col items-center gap-1">
              <Settings size={20} />
              <span className="text-xs">{t('settings', { ns: 'common' })}</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
