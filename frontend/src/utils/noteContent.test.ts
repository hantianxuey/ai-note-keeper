import { describe, expect, it } from 'vitest';
import { getEditableMarkdown, getNotePreview } from './noteContent';
import type { Note } from '../types';

const makeNote = (overrides: Partial<Note>): Note => ({
  id: 1,
  user_id: 1,
  title: 'Index',
  content: '',
  markdown_content: null,
  tags: null,
  category: null,
  created_at: '2026-06-08T00:00:00.000Z',
  updated_at: '2026-06-08T00:00:00.000Z',
  ...overrides,
});

describe('note content helpers', () => {
  it('uses stored markdown as the editable source when both html and markdown exist', () => {
    const markdown = '# Index\n\n## 工作内容\n\n- 接入 RAG\n- 优化检索日志';
    const note = makeNote({
      content: '<h1>Index</h1><p>stale html content</p>',
      markdown_content: markdown,
    });

    expect(getEditableMarkdown(note)).toBe(markdown);
  });

  it('builds clean note previews from html, markdown, and escaped newlines', () => {
    const note = makeNote({
      content: '<p><h2>工作内容</h2></p>\\n- **RAG** 评测\\n```ts\\nconst x = 1\\n```',
    });

    expect(getNotePreview(note)).toBe('工作内容 RAG 评测 const x = 1');
  });

  it('prefers markdown content for previews and truncates to the requested length', () => {
    const note = makeNote({
      content: '<p>old html</p>',
      markdown_content: '# 工作内容\n\n这是一个很长的 Markdown 笔记内容，用于验证列表只展示简洁摘要。',
    });

    expect(getNotePreview(note, 18)).toBe('工作内容 这是一个很长的 Markdown...');
  });
});
