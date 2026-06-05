import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Trash2, FileUp, Sparkles, Eye, Edit, Columns, FileText, Image as ImageIcon } from 'lucide-react';
import { useNoteStore } from '../store/useNoteStore';
import { notesAPI, aiAPI, attachmentsAPI } from '../services/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
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
  const [summarySourceContent, setSummarySourceContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: false,
      }),
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
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n')
      .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)\n')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n')
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
      .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
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
      setSummarySourceContent('');
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
      setSummary(response.data.note.ai_summary || '');
      setSummarySourceContent('');
      if (response.data.note.content) {
        const isHtml = response.data.note.content.includes('<');
        if (isHtml) {
          const loadedMarkdown = htmlToMarkdown(response.data.note.content);
          if (editor) {
            editor.commands.setContent(response.data.note.content);
          }
          setMarkdownContent(loadedMarkdown);
          setSummarySourceContent(response.data.note.ai_summary ? loadedMarkdown : '');
        } else {
          setMarkdownContent(response.data.note.content);
          setSummarySourceContent(response.data.note.ai_summary ? response.data.note.content : '');
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
      setSummarySourceContent(contentToSummarize);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert(t('summaryFailed'));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (summary && summarySourceContent && markdownContent !== summarySourceContent) {
      setSummary('');
      setSummarySourceContent('');
    }
  }, [markdownContent, summary, summarySourceContent]);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!currentNote) {
      alert(t('saveBeforeImageUpload'));
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    try {
      const response = await attachmentsAPI.uploadNoteImage(currentNote.id, file);
      const alt = file.name.replace(/\.[^.]+$/, '');
      const imageUrl = response.data.url;

      if (editorMode === 'richtext') {
        editor?.chain().focus().setImage({ src: imageUrl, alt }).run();
        setMarkdownContent(htmlToMarkdown(editor?.getHTML() || ''));
      } else {
        const markdownImage = `![${alt}](${imageUrl})`;
        setMarkdownContent((content) => content ? `${content}\n\n${markdownImage}` : markdownImage);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert(t('imageUploadFailed'));
    } finally {
      setIsUploadingImage(false);
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

  const modeButtons: { mode: EditorMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'richtext', icon: <Edit size={14} />, label: t('richText') },
    { mode: 'markdown', icon: <FileText size={14} />, label: t('markdown') },
    { mode: 'preview', icon: <Eye size={14} />, label: t('preview') },
    { mode: 'split', icon: <Columns size={14} />, label: t('split') },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-ghost px-2">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="section-label">Editor</p>
              <h1 className="text-xl font-bold">
                {currentNote ? t('editorTitle.edit') : t('editorTitle.new')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentNote && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-secondary border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">{t('delete', { ns: 'common' })}</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-accent"
            >
              <Save size={18} />
              <span className="hidden sm:inline">{isSaving ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page-container">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-4">
            <div className="surface p-4 sm:p-6">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('noteTitlePlaceholder')}
                className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground focus:ring-0"
              />
            </div>

            <div className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/35 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="section-label mr-1">{t('editorMode')}</span>
                  {modeButtons.map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => handleModeChange(mode)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        editorMode === mode
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-card hover:text-foreground'
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
                <span className="chip">{markdownContent.length} chars</span>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="btn-secondary"
                  title={t('uploadImage')}
                >
                  <ImageIcon size={18} />
                  <span className="hidden sm:inline">{isUploadingImage ? t('uploadingImage') : t('uploadImage')}</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
              </div>

              <div className={`${editorMode === 'split' ? 'grid grid-cols-1 gap-0 lg:grid-cols-2' : ''}`}>
                {editorMode === 'richtext' && (
                  <div className="min-h-[560px] bg-card">
                    <EditorContent editor={editor} />
                  </div>
                )}

                {editorMode === 'markdown' && (
                  <textarea
                    value={markdownContent}
                    onChange={(e) => setMarkdownContent(e.target.value)}
                    placeholder={t('writeMarkdownHere')}
                    className="min-h-[560px] w-full resize-none border-0 bg-card p-6 font-mono text-sm leading-6 outline-none"
                    spellCheck={false}
                  />
                )}

                {editorMode === 'preview' && (
                  <div className="min-h-[560px] bg-card p-6">
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
                      className="min-h-[560px] w-full resize-none border-0 border-b border-border bg-card p-6 font-mono text-sm leading-6 outline-none lg:border-b-0 lg:border-r"
                      spellCheck={false}
                    />
                    <div className="min-h-[560px] overflow-auto bg-card p-6">
                      <article className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {markdownContent || t('nothingToPreview')}
                        </ReactMarkdown>
                      </article>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="surface p-5">
              <h2 className="mb-4 text-lg font-semibold">Metadata</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                {t('tags')}
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('tagsPlaceholder')}
                    className="input-field"
              />
            </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                {t('category')}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t('categoryPlaceholder')}
                    className="input-field"
              />
            </div>
          </div>
            </div>

            <div className="surface p-5">
              <h2 className="mb-4 text-lg font-semibold">AI tools</h2>
              <div className="space-y-3">
            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
                  className="btn-secondary w-full justify-start"
            >
              <Sparkles size={18} />
              {isGeneratingSummary ? t('generating') : t('generateSummary')}
            </button>
                <label className={`btn-secondary w-full justify-start ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{t('supportedFormats')}</span>
                  <code className="chip">.md</code>
                  <code className="chip">.txt</code>
                </div>
            </div>
          </div>

          {summary && (
              <div className="surface border-accent/30 bg-accent/5 p-5">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                {t('aiSummary')}
              </h3>
                <p className="text-sm leading-6 text-muted-foreground">{summary}</p>
            </div>
          )}
          </aside>
        </div>
      </main>
    </div>
  );
}
