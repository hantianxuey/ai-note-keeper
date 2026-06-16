import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, MessageSquare, Search, Trash2, Tags, Clock, Sparkles } from 'lucide-react';
import { useNoteStore } from '../store/useNoteStore';
import { notesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import AppShell from '../components/AppShell';
import { getNotePreview } from '../utils/noteContent';

export default function Home() {
  const { t, i18n } = useTranslation('notes');
  const { notes, setNotes, deleteNote, setLoading, isLoading } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');

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
    (note.preview || getNotePreview(note)).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLocale = () => {
    return i18n.language === 'zh-CN' ? zhCN : undefined;
  };

  const notesWithTags = notes.filter((note) => note.tags && note.tags.length > 0).length;
  const latestNote = notes[0];

  return (
    <AppShell
      eyebrow="Knowledge base"
      title={t('myNotes')}
      description="Capture ideas, keep context, and ask your own notes when memory gets noisy."
      actions={
        <>
          <Link to="/chat" className="btn-secondary">
            <MessageSquare size={18} />
            {t('chat', { ns: 'common' })}
          </Link>
          <Link to="/notes/new" className="btn-accent">
            <Plus size={18} />
            {t('newNote')}
          </Link>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t('notes', { ns: 'common' })}</span>
            <FileText size={18} className="text-accent" />
          </div>
          <div className="mt-3 text-3xl font-bold">{notes.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">Total notes in your workspace</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Tagged</span>
            <Tags size={18} className="text-accent" />
          </div>
          <div className="mt-3 text-3xl font-bold">{notesWithTags}</div>
          <p className="mt-1 text-xs text-muted-foreground">Notes with structured metadata</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Latest update</span>
            <Clock size={18} className="text-accent" />
          </div>
          <div className="mt-3 truncate text-lg font-bold">
            {latestNote ? formatDistanceToNow(new Date(latestNote.updated_at), { addSuffix: true, locale: getLocale() }) : 'No notes yet'}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Recent knowledge activity</p>
        </div>
      </div>

      <div className="mt-6 surface-subtle p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder={t('searchNotes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

          {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="surface h-48 animate-pulse bg-muted/40" />
          ))}
        </div>
          ) : filteredNotes.length === 0 ? (
        <div className="mt-6 surface flex min-h-[360px] items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Sparkles size={30} />
            </div>
              <h3 className="text-2xl font-bold mb-2">{t('noNotesYet')}</h3>
              <p className="text-muted-foreground mb-6 leading-6">
                {t('createFirstNote')}
              </p>
              <Link
                to="/notes/new"
              className="btn-accent"
              >
                <Plus size={18} />
                {t('createFirstNoteButton')}
              </Link>
            </div>
        </div>
          ) : (
        <div data-testid="notes-grid" className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
              className="group surface relative block overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="chip">
                  {note.category || 'General'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: getLocale() })}
                </span>
              </div>
                  <h3 className="font-semibold text-xl mb-2 line-clamp-2">
                    {note.title || t('untitled', { ns: 'common' })}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-4 leading-6">
                    {note.preview || getNotePreview(note)}
                  </p>
              <div className="flex flex-wrap gap-2">
                {(note.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="chip">{tag}</span>
                ))}
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                className="absolute bottom-4 right-4 rounded-md p-2 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title={t('delete', { ns: 'common' })}
                  >
                    <Trash2 size={16} />
                  </button>
                </Link>
              ))}
            </div>
          )}
    </AppShell>
  );
}
