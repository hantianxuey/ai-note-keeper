import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, FileUp, Sparkles } from 'lucide-react';
import { useNoteStore } from '../store/useNoteStore';
import { notesAPI, aiAPI } from '../services/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export default function NoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNote, updateNote, deleteNote, setCurrentNote, currentNote } = useNoteStore();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px]',
      },
    },
  });

  useEffect(() => {
    if (id && id !== 'new') {
      loadNote(parseInt(id));
    } else {
      setCurrentNote(null);
      setTitle('');
      setTags('');
      setCategory('');
      if (editor) {
        editor.commands.setContent('');
      }
    }
  }, [id, editor, setCurrentNote]);

  const loadNote = async (noteId: number) => {
    try {
      const response = await notesAPI.get(noteId);
      setCurrentNote(response.data.note);
      setTitle(response.data.note.title);
      setTags(response.data.note.tags?.join(', ') || '');
      setCategory(response.data.note.category || '');
      if (editor) {
        editor.commands.setContent(response.data.note.content);
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      navigate('/');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const content = editor?.getHTML() || '';
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const data = {
        title,
        content,
        tags: tagArray.length > 0 ? tagArray : undefined,
        category: category.trim() || undefined,
      };

      if (currentNote) {
        const response = await notesAPI.update(currentNote.id, data);
        updateNote(currentNote.id, response.data.note);
      } else {
        const response = await notesAPI.create(data);
        addNote(response.data.note);
        navigate(`/notes/${response.data.note.id}`);
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentNote || !confirm('Are you sure you want to delete this note?')) return;

    setIsDeleting(true);
    try {
      await notesAPI.delete(currentNote.id);
      deleteNote(currentNote.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note');
      setIsDeleting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!currentNote) return;

    setIsGeneratingSummary(true);
    try {
      const response = await aiAPI.summary(currentNote.id);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-muted rounded-md transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold">
              {currentNote ? 'Edit Note' : 'New Note'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {currentNote && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-2 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="w-full px-4 py-2 text-2xl font-bold border-none bg-transparent focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
          />

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="javascript, AI, project ideas"
                className="w-full px-3 py-2 border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Work, Personal, Learning..."
                className="w-full px-3 py-2 border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="border rounded-md bg-card overflow-hidden">
            <EditorContent editor={editor} className="p-4" />
          </div>

          {currentNote && (
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Sparkles size={18} />
                {isGeneratingSummary ? 'Generating...' : 'Generate AI Summary'}
              </button>
              <label className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors cursor-pointer">
                <FileUp size={18} />
                <span>Upload Document</span>
                <input type="file" className="hidden" accept=".pdf,.docx,.doc" />
              </label>
            </div>
          )}

          {summary && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                AI Summary
              </h3>
              <p className="text-sm">{summary}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
