import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Trash2, FileUp, Sparkles, Eye, Edit, Columns, FileText } from 'lucide-react';
import { useNoteStore } from '../store/useNoteStore';
import { notesAPI, aiAPI } from '../services/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type EditorMode = 'richtext' | 'markdown' | 'preview' | 'split';

export default function NoteEditor() {
  const { t } = useTranslation('notes');
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNote, updateNote, deleteNote, setCurrentNote, currentNote } = useNoteStore();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('richtext');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: t('startWriting'),
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (editorMode === 'richtext') {
        const markdown = htmlToMarkdown(editor.getHTML());
        setMarkdownContent(markdown);
      }
    },
  });

  const htmlToMarkdown = (html: string): string => {
    let markdown = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (_match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (_match, content) => {
        let i = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${i++}. $1\n`);
      })
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
      .replace(/<hr\s*\/?>/gi, '---\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    return markdown.trim();
  };

  const markdownToHtml = (markdown: string): string => {
    let html = markdown
      .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^\[x\] (.*)$/gm, '<li><input type="checkbox" checked disabled> $1</li>')
      .replace(/^\[ \] (.*)$/gm, '<li><input type="checkbox" disabled> $1</li>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  };

  useEffect(() => {
    if (id && id !== 'new') {
      loadNote(parseInt(id));
    } else {
      setCurrentNote(null);
      setTitle('');
      setTags('');
      setCategory('');
      setMarkdownContent('');
      setSummary('');
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
      setSummary('');
      if (response.data.note.content) {
        const isHtml = response.data.note.content.includes('<');
        if (isHtml) {
          if (editor) {
            editor.commands.setContent(response.data.note.content);
          }
          setMarkdownContent(htmlToMarkdown(response.data.note.content));
        } else {
          setMarkdownContent(response.data.note.content);
          if (editor) {
            editor.commands.setContent(markdownToHtml(response.data.note.content));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      navigate('/');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert(t('pleaseEnterTitle'));
      return;
    }

    setIsSaving(true);
    try {
      const content = editorMode === 'richtext' 
        ? (editor?.getHTML() || '') 
        : markdownToHtml(markdownContent);
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const data = {
        title,
        content,
        markdownContent,
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
      alert(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentNote || !confirm(t('deleteNoteConfirm'))) return;

    setIsDeleting(true);
    try {
      await notesAPI.delete(currentNote.id);
      deleteNote(currentNote.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert(t('deleteFailed'));
      setIsDeleting(false);
    }
  };

  const handleGenerateSummary = async () => {
    const contentToSummarize = markdownContent || editor?.getText() || '';
    if (!contentToSummarize.trim()) {
      alert(t('pleaseWriteContent'));
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await aiAPI.summary(currentNote?.id || 0, contentToSummarize);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert(t('summaryFailed'));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'md' || extension === 'txt') {
        const text = await file.text();
        setMarkdownContent(text);
        if (editor) {
          editor.commands.setContent(markdownToHtml(text));
        }
        if (!title.trim()) {
          const firstLine = text.split('\n').find(line => line.trim());
          if (firstLine) {
            setTitle(firstLine.replace(/^#+\s*/, '').trim());
          }
        }
      } else {
        alert(t('unsupportedFormat', { format: extension }));
      }
    } catch (error) {
      console.error('Failed to import file:', error);
      alert(t('importFailed'));
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleModeChange = (mode: EditorMode) => {
    if (mode === 'richtext' && editorMode !== 'richtext') {
      if (editor) {
        editor.commands.setContent(markdownToHtml(markdownContent));
      }
    }
    setEditorMode(mode);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-muted rounded-md transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold">
              {currentNote ? t('editorTitle.edit') : t('editorTitle.new')}
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
                <span className="hidden sm:inline">{t('delete', { ns: 'common' })}</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              <span className="hidden sm:inline">{isSaving ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('noteTitlePlaceholder')}
            className="w-full px-4 py-2 text-2xl font-bold border-none bg-transparent focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
          />

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                {t('tags')}
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('tagsPlaceholder')}
                className="w-full px-3 py-2 border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                {t('category')}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t('categoryPlaceholder')}
                className="w-full px-3 py-2 border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-sm font-medium text-muted-foreground mr-2">{t('editorMode')}</span>
            <button
              onClick={() => handleModeChange('richtext')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                editorMode === 'richtext' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-background'
              }`}
            >
              <Edit size={14} />
              {t('richText')}
            </button>
            <button
              onClick={() => handleModeChange('markdown')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                editorMode === 'markdown' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-background'
              }`}
            >
              <FileText size={14} />
              {t('markdown')}
            </button>
            <button
              onClick={() => handleModeChange('preview')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                editorMode === 'preview' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-background'
              }`}
            >
              <Eye size={14} />
              {t('preview')}
            </button>
            <button
              onClick={() => handleModeChange('split')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                editorMode === 'split' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-background'
              }`}
            >
              <Columns size={14} />
              {t('split')}
            </button>
          </div>

          <div className={`border rounded-md bg-card overflow-hidden ${editorMode === 'split' ? 'grid grid-cols-2 gap-0' : ''}`}>
            {editorMode === 'richtext' && (
              <EditorContent editor={editor} />
            )}

            {editorMode === 'markdown' && (
              <textarea
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                placeholder={t('writeMarkdownHere')}
                className="w-full min-h-[500px] p-4 font-mono text-sm resize-none focus:outline-none bg-background border-0"
                spellCheck={false}
              />
            )}

            {editorMode === 'preview' && (
              <div className="p-6 min-h-[500px]">
                <article className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownContent || t('nothingToPreview')}
                  </ReactMarkdown>
                </article>
              </div>
            )}

            {editorMode === 'split' && (
              <>
                <textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder={t('writeMarkdownHere')}
                  className="w-full min-h-[500px] p-4 font-mono text-sm resize-none focus:outline-none bg-background border-0 border-r"
                  spellCheck={false}
                />
                <div className="p-6 min-h-[500px] overflow-auto">
                  <article className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdownContent || t('nothingToPreview')}
                    </ReactMarkdown>
                  </article>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              {isGeneratingSummary ? t('generating') : t('generateSummary')}
            </button>
            <label className={`flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <FileUp size={18} />
              <span>{isImporting ? t('importing') : t('importFile')}</span>
              <input
                type="file"
                className="hidden"
                accept=".md,.txt"
                onChange={handleFileImport}
                disabled={isImporting}
              />
            </label>
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <span>{t('supportedFormats')}</span>
              <code className="px-2 py-0.5 bg-muted rounded text-xs">.md</code>
              <code className="px-2 py-0.5 bg-muted rounded text-xs">.txt</code>
            </div>
          </div>

          {summary && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                {t('aiSummary')}
              </h3>
              <p className="text-sm">{summary}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
