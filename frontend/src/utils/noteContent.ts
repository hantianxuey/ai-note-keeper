import type { Note } from '../types';

const normalizeNewlines = (value: string): string =>
  value.replace(/\\r\\n|\\n|\\r/g, '\n');

const decodeEntities = (value: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

export const htmlToMarkdown = (html: string): string => {
  const normalized = normalizeNewlines(html);
  const markdown = normalized
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, content) =>
      content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    )
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, content) => {
      let index = 1;
      return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li: string, item: string) => `${index++}. ${item}\n`);
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<hr\s*\/?>/gi, '---\n')
    .replace(/<[^>]+>/g, '');

  return decodeEntities(markdown).trim();
};

export const markdownToHtml = (markdown: string): string => {
  const normalized = normalizeNewlines(markdown);
  const html = normalized
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/^\[x\] (.*)$/gm, '<li><input type="checkbox" checked disabled> $1</li>')
    .replace(/^\[ \] (.*)$/gm, '<li><input type="checkbox" disabled> $1</li>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
};

export const getEditableMarkdown = (note: Pick<Note, 'markdown_content'> & { content?: string }): string => {
  if (note.markdown_content?.trim()) {
    return normalizeNewlines(note.markdown_content);
  }

  const content = normalizeNewlines(note.content || '');
  return content.includes('<') ? htmlToMarkdown(content) : content;
};

export const getNotePreview = (
  note: Pick<Note, 'markdown_content'> & { content?: string },
  maxLength = 150
): string => {
  const source = getEditableMarkdown(note);
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
