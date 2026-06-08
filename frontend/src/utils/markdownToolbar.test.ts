import { describe, expect, it } from 'vitest';
import { applyMarkdownToolbarAction } from './markdownToolbar';

describe('markdown toolbar helpers', () => {
  it('wraps selected text with bold markers and keeps the text selected', () => {
    const result = applyMarkdownToolbarAction({
      action: 'bold',
      content: 'hello world',
      selectionStart: 6,
      selectionEnd: 11,
    });

    expect(result.content).toBe('hello **world**');
    expect(result.selectionStart).toBe(8);
    expect(result.selectionEnd).toBe(13);
  });

  it('adds a heading prefix to the current line', () => {
    const result = applyMarkdownToolbarAction({
      action: 'heading2',
      content: 'intro\ncurrent line\nnext',
      selectionStart: 8,
      selectionEnd: 8,
    });

    expect(result.content).toBe('intro\n## current line\nnext');
    expect(result.selectionStart).toBe(11);
    expect(result.selectionEnd).toBe(11);
  });

  it('inserts a table template at the cursor', () => {
    const result = applyMarkdownToolbarAction({
      action: 'table',
      content: 'before',
      selectionStart: 6,
      selectionEnd: 6,
    });

    expect(result.content).toContain('| Column 1 | Column 2 |');
    expect(result.content).toContain('| --- | --- |');
    expect(result.content.startsWith('before\n\n')).toBe(true);
  });
});
