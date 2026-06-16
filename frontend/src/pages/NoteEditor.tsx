import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Save,
  Trash2,
  FileUp,
  Sparkles,
  Eye,
  Edit,
  Columns,
  FileText,
  Image as ImageIcon,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code2,
  Table,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useNoteStore } from '../store/useNoteStore';
import { notesAPI, aiAPI, attachmentsAPI } from '../services/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getEditableMarkdown, htmlToMarkdown, markdownToHtml, normalizeMarkdownForPreview } from '../utils/noteContent';
import { applyMarkdownToolbarAction, type MarkdownToolbarAction } from '../utils/markdownToolbar';
import { getCursorLineScrollRatio, getScrollTopForRatio, getSyncedScrollTop } from '../utils/splitScroll';

type EditorMode = 'richtext' | 'markdown' | 'preview' | 'split';
type RichTextToolbarAction = MarkdownToolbarAction | 'undo' | 'redo';

const editorPaneHeightClass = 'h-[calc(100vh-21.5rem)] min-h-[320px] max-h-[560px]';

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
  const markdownTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const splitPreviewRef = useRef<HTMLDivElement | null>(null);
  const isSyncingSplitScrollRef = useRef(false);

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
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-full p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (editorMode === 'richtext') {
        const markdown = htmlToMarkdown(editor.getHTML());
        setMarkdownContent(markdown);
      }
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
      if (response.data.note.content || response.data.note.markdown_content) {
        const loadedMarkdown = getEditableMarkdown(response.data.note);
        setMarkdownContent(loadedMarkdown);
        setSummarySourceContent(response.data.note.ai_summary ? loadedMarkdown : '');
        if (editor) {
          editor.commands.setContent(markdownToHtml(loadedMarkdown));
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

  const syncSplitScroll = (
    source: HTMLTextAreaElement | HTMLDivElement | null,
    target: HTMLTextAreaElement | HTMLDivElement | null,
  ) => {
    if (!source || !target || editorMode !== 'split' || isSyncingSplitScrollRef.current) return;

    isSyncingSplitScrollRef.current = true;
    target.scrollTop = getSyncedScrollTop({
      sourceScrollTop: source.scrollTop,
      sourceScrollHeight: source.scrollHeight,
      sourceClientHeight: source.clientHeight,
      targetScrollHeight: target.scrollHeight,
      targetClientHeight: target.clientHeight,
    });

    requestAnimationFrame(() => {
      isSyncingSplitScrollRef.current = false;
    });
  };

  const syncSplitPreviewToCursor = (content: string, cursorIndex: number) => {
    const preview = splitPreviewRef.current;
    if (!preview || editorMode !== 'split') return;

    const ratio = getCursorLineScrollRatio(content, cursorIndex);
    preview.scrollTop = getScrollTopForRatio(preview.scrollHeight, preview.clientHeight, ratio);
  };

  const handleMarkdownChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = event.target.value;
    setMarkdownContent(nextContent);
    syncSplitPreviewToCursor(nextContent, event.target.selectionStart);
  };

  const handleMarkdownCursorChange = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textArea = event.currentTarget;
    syncSplitPreviewToCursor(textArea.value, textArea.selectionStart);
  };

  const handleMarkdownToolbarAction = (action: MarkdownToolbarAction) => {
    const textArea = markdownTextAreaRef.current;
    const result = applyMarkdownToolbarAction({
      action,
      content: markdownContent,
      selectionStart: textArea?.selectionStart ?? markdownContent.length,
      selectionEnd: textArea?.selectionEnd ?? markdownContent.length,
    });

    setMarkdownContent(result.content);
    requestAnimationFrame(() => {
      markdownTextAreaRef.current?.focus();
      markdownTextAreaRef.current?.setSelectionRange(result.selectionStart, result.selectionEnd);
      syncSplitPreviewToCursor(result.content, result.selectionStart);
    });
  };

  const handleRichTextToolbarAction = (action: RichTextToolbarAction) => {
    if (!editor) return;

    const chain = editor.chain().focus();
    switch (action) {
      case 'heading1':
        chain.toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'blockquote':
        chain.toggleBlockquote().run();
        break;
      case 'codeBlock':
        chain.toggleCodeBlock().run();
        break;
      case 'undo':
        chain.undo().run();
        break;
      case 'redo':
        chain.redo().run();
        break;
      case 'table':
        break;
    }

    setMarkdownContent(htmlToMarkdown(editor.getHTML()));
  };

  const handleToolbarAction = (action: RichTextToolbarAction) => {
    if (editorMode === 'preview') return;
    if (editorMode === 'richtext') {
      handleRichTextToolbarAction(action);
      return;
    }
    if (action !== 'undo' && action !== 'redo') {
      handleMarkdownToolbarAction(action);
    }
  };

  const isRichTextActionActive = (action: RichTextToolbarAction) => {
    if (!editor || editorMode !== 'richtext') return false;
    switch (action) {
      case 'heading1':
        return editor.isActive('heading', { level: 1 });
      case 'heading2':
        return editor.isActive('heading', { level: 2 });
      case 'bold':
        return editor.isActive('bold');
      case 'italic':
        return editor.isActive('italic');
      case 'bulletList':
        return editor.isActive('bulletList');
      case 'orderedList':
        return editor.isActive('orderedList');
      case 'blockquote':
        return editor.isActive('blockquote');
      case 'codeBlock':
        return editor.isActive('codeBlock');
      default:
        return false;
    }
  };

  const modeButtons: { mode: EditorMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'richtext', icon: <Edit size={14} />, label: t('richText') },
    { mode: 'markdown', icon: <FileText size={14} />, label: t('markdown') },
    { mode: 'preview', icon: <Eye size={14} />, label: t('preview') },
    { mode: 'split', icon: <Columns size={14} />, label: t('split') },
  ];
  const toolbarButtons: {
    action: RichTextToolbarAction;
    icon: React.ReactNode;
    label: string;
    markdownOnly?: boolean;
    richTextOnly?: boolean;
  }[] = [
    { action: 'heading1', icon: <Heading1 size={17} />, label: t('toolbar.heading1') },
    { action: 'heading2', icon: <Heading2 size={17} />, label: t('toolbar.heading2') },
    { action: 'bold', icon: <Bold size={17} />, label: t('toolbar.bold') },
    { action: 'italic', icon: <Italic size={17} />, label: t('toolbar.italic') },
    { action: 'bulletList', icon: <List size={17} />, label: t('toolbar.bulletList') },
    { action: 'orderedList', icon: <ListOrdered size={17} />, label: t('toolbar.orderedList') },
    { action: 'blockquote', icon: <Quote size={17} />, label: t('toolbar.blockquote') },
    { action: 'codeBlock', icon: <Code2 size={17} />, label: t('toolbar.codeBlock') },
    { action: 'table', icon: <Table size={17} />, label: t('toolbar.table'), markdownOnly: true },
    { action: 'undo', icon: <Undo2 size={17} />, label: t('toolbar.undo'), richTextOnly: true },
    { action: 'redo', icon: <Redo2 size={17} />, label: t('toolbar.redo'), richTextOnly: true },
  ];
  const previewMarkdown = normalizeMarkdownForPreview(markdownContent);

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

      <main className="page-container py-3">
        <div className={`grid gap-4 ${editorMode === 'split' ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_280px]'}`}>
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
              <div className="flex min-h-12 flex-wrap items-center gap-1 border-b border-border bg-card px-3 py-2">
                {toolbarButtons
                  .filter(({ markdownOnly, richTextOnly }) => {
                    if (markdownOnly) return editorMode !== 'richtext';
                    if (richTextOnly) return editorMode === 'richtext';
                    return true;
                  })
                  .map(({ action, icon, label }) => {
                    const active = isRichTextActionActive(action);
                    const disabled = editorMode === 'preview' || (editorMode === 'richtext' && !editor);

                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleToolbarAction(action)}
                        disabled={disabled}
                        title={label}
                        aria-label={label}
                        aria-pressed={active}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {icon}
                      </button>
                    );
                  })}
              </div>

              <div className={`${editorMode === 'split' ? 'grid grid-cols-1 gap-0 lg:grid-cols-2' : ''}`}>
                {editorMode === 'richtext' && (
                  <div
                    data-testid="richtext-editor-pane"
                    className={`${editorPaneHeightClass} overflow-auto bg-card`}
                  >
                    <EditorContent editor={editor} className="min-h-full" />
                  </div>
                )}

                {editorMode === 'markdown' && (
                  <textarea
                    data-testid="markdown-editor-pane"
                    ref={markdownTextAreaRef}
                    value={markdownContent}
                    onChange={handleMarkdownChange}
                    placeholder={t('writeMarkdownHere')}
                    className={`${editorPaneHeightClass} w-full resize-none overflow-auto border-0 bg-card p-6 font-mono text-sm leading-6 outline-none`}
                    spellCheck={false}
                  />
                )}

                {editorMode === 'preview' && (
                  <div
                    data-testid="preview-editor-pane"
                    className={`${editorPaneHeightClass} overflow-auto bg-card p-6`}
                  >
                    <article className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {previewMarkdown || t('nothingToPreview')}
                      </ReactMarkdown>
                    </article>
                  </div>
                )}

                {editorMode === 'split' && (
                  <>
                    <textarea
                      data-testid="split-markdown-pane"
                      ref={markdownTextAreaRef}
                      value={markdownContent}
                      onChange={handleMarkdownChange}
                      onScroll={() => syncSplitScroll(markdownTextAreaRef.current, splitPreviewRef.current)}
                      onKeyUp={handleMarkdownCursorChange}
                      placeholder={t('writeMarkdownHere')}
                      className={`${editorPaneHeightClass} w-full resize-none overflow-auto border-0 border-b border-border bg-card p-6 font-mono text-sm leading-6 outline-none lg:border-b-0 lg:border-r`}
                      spellCheck={false}
                    />
                    <div
                      data-testid="split-preview-pane"
                      ref={splitPreviewRef}
                      onScroll={() => syncSplitScroll(splitPreviewRef.current, markdownTextAreaRef.current)}
                      className={`${editorPaneHeightClass} overflow-auto bg-card p-6`}
                    >
                      <article className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {previewMarkdown || t('nothingToPreview')}
                        </ReactMarkdown>
                      </article>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <aside className={editorMode === 'split' ? 'grid gap-3 md:grid-cols-2' : 'space-y-4'}>
            <div className={`surface ${editorMode === 'split' ? 'p-3' : 'p-5'}`}>
              <h2 className={`${editorMode === 'split' ? 'mb-2 text-sm' : 'mb-4 text-lg'} font-semibold`}>Metadata</h2>
              <div className={editorMode === 'split' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-4'}>
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

            <div className={`surface ${editorMode === 'split' ? 'p-3' : 'p-5'}`}>
              <h2 className={`${editorMode === 'split' ? 'mb-2 text-sm' : 'mb-4 text-lg'} font-semibold`}>AI tools</h2>
              <div className={editorMode === 'split' ? 'flex flex-wrap gap-2' : 'space-y-3'}>
            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
                  className={`btn-secondary justify-start ${editorMode === 'split' ? 'flex-1 px-3 py-2' : 'w-full'}`}
            >
              <Sparkles size={18} />
              {isGeneratingSummary ? t('generating') : t('generateSummary')}
            </button>
                <label className={`btn-secondary justify-start ${editorMode === 'split' ? 'flex-1 px-3 py-2' : 'w-full'} ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                <div className={`flex flex-wrap items-center gap-2 text-sm text-muted-foreground ${editorMode === 'split' ? 'w-full' : ''}`}>
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
