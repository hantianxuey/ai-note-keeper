import type { Note } from '../types';

const normalizeNewlines = (value: string): string =>
  value.replace(/\\r\\n|\\n|\\r/g, '\n');

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export const buildNotePreview = (
  note: Pick<Note, 'content' | 'markdown_content'>,
  maxLength = 150
): string => {
  const source = normalizeNewlines(note.markdown_content?.trim() || note.content || '');
  const plain = decodeEntities(source)
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/```([\s\S]*?)```/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  let end = maxLength;
  while (end < plain.length && /[A-Za-z0-9]/.test(plain[end - 1]) && /[A-Za-z0-9]/.test(plain[end])) {
    end += 1;
  }

  return `${plain.slice(0, end).trim()}...`;
};
