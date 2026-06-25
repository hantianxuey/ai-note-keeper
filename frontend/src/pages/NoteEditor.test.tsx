import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NoteEditor from './NoteEditor';
import { notesAPI } from '../services/api';
import { useNoteStore } from '../store/useNoteStore';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const editor = {
  commands: {
    setContent: vi.fn(),
  },
  getHTML: vi.fn(() => ''),
  getText: vi.fn(() => ''),
  isActive: vi.fn(() => false),
};

vi.mock('@tiptap/react', async () => {
  const React = await import('react');

  return {
    useEditor: vi.fn(() => editor),
    EditorContent: ({ className }: { className?: string }) => React.createElement(
      'div',
      { className },
      React.createElement('div', {
        className: 'ProseMirror prose prose-sm sm:prose lg:prose-lg h-full min-h-full max-w-none cursor-text p-4 focus:outline-none',
        contentEditable: true,
      }),
    ),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../services/api', () => ({
  notesAPI: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  aiAPI: {
    summary: vi.fn(),
  },
  attachmentsAPI: {
    uploadNoteImage: vi.fn(),
  },
}));

describe('NoteEditor layout', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useNoteStore.setState({ currentNote: null });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('fills the rich text pane and keeps a long AI summary internally scrollable', async () => {
    vi.mocked(notesAPI.get).mockResolvedValue({
      data: {
        note: {
          id: 11,
          user_id: 1,
          title: 'Layout note',
          content: '<p>Short body.</p>',
          markdown_content: 'Short body.',
          tags: [],
          category: '',
          ai_summary: 'Long summary',
          created_at: '2026-06-16T00:00:00.000Z',
          updated_at: '2026-06-16T00:00:00.000Z',
        },
      },
    } as never);

    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={['/notes/11']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/notes/:id" element={<NoteEditor />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const pane = container.querySelector('[data-testid="richtext-editor-pane"]');
    const editorContent = pane?.firstElementChild;
    const proseMirror = pane?.querySelector('.ProseMirror');
    const summaryCard = container.querySelector('[data-testid="ai-summary-card"]');
    const summaryContent = container.querySelector('[data-testid="ai-summary-content"]');

    expect(pane).not.toBeNull();
    expect(editorContent?.classList.contains('h-full')).toBe(true);
    expect(proseMirror?.classList.contains('h-full')).toBe(true);
    expect(proseMirror?.classList.contains('cursor-text')).toBe(true);
    expect(summaryCard).not.toBeNull();
    expect(summaryContent?.classList.contains('max-h-80')).toBe(true);
    expect(summaryContent?.classList.contains('overflow-y-auto')).toBe(true);
    expect(summaryContent?.textContent).toBe('Long summary');
  });
});
