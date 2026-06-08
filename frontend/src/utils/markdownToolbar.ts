export type MarkdownToolbarAction =
  | 'heading1'
  | 'heading2'
  | 'bold'
  | 'italic'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'table';

type ApplyMarkdownToolbarActionInput = {
  action: MarkdownToolbarAction;
  content: string;
  selectionStart: number;
  selectionEnd: number;
};

type ApplyMarkdownToolbarActionResult = {
  content: string;
  selectionStart: number;
  selectionEnd: number;
};

const TABLE_TEMPLATE = [
  '| Column 1 | Column 2 |',
  '| --- | --- |',
  '| Value 1 | Value 2 |',
].join('\n');

function wrapSelection(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  marker: string,
  placeholder: string,
): ApplyMarkdownToolbarActionResult {
  const selectedText = content.slice(selectionStart, selectionEnd) || placeholder;
  const replacement = `${marker}${selectedText}${marker}`;

  return {
    content: `${content.slice(0, selectionStart)}${replacement}${content.slice(selectionEnd)}`,
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionStart + marker.length + selectedText.length,
  };
}

function prefixSelectedLines(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): ApplyMarkdownToolbarActionResult {
  const lineStart = content.lastIndexOf('\n', Math.max(selectionStart - 1, 0)) + 1;
  const nextLineBreak = content.indexOf('\n', selectionEnd);
  const lineEnd = nextLineBreak === -1 ? content.length : nextLineBreak;
  const selectedLines = content.slice(lineStart, lineEnd);
  const prefixedLines = selectedLines
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  const insertedPrefixCount = prefixedLines.split('\n').length;
  const contentBeforeSelection = content.slice(lineStart, selectionStart);
  const prefixesBeforeSelection = contentBeforeSelection.split('\n').length;

  return {
    content: `${content.slice(0, lineStart)}${prefixedLines}${content.slice(lineEnd)}`,
    selectionStart: selectionStart + prefix.length * prefixesBeforeSelection,
    selectionEnd: selectionEnd + prefix.length * insertedPrefixCount,
  };
}

function insertBlock(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  block: string,
): ApplyMarkdownToolbarActionResult {
  const needsLeadingBreak = selectionStart > 0 && !content.slice(0, selectionStart).endsWith('\n\n');
  const needsTrailingBreak = selectionEnd < content.length && !content.slice(selectionEnd).startsWith('\n');
  const replacement = `${needsLeadingBreak ? '\n\n' : ''}${block}${needsTrailingBreak ? '\n\n' : ''}`;
  const insertedAt = selectionStart + (needsLeadingBreak ? 2 : 0);

  return {
    content: `${content.slice(0, selectionStart)}${replacement}${content.slice(selectionEnd)}`,
    selectionStart: insertedAt,
    selectionEnd: insertedAt + block.length,
  };
}

export function applyMarkdownToolbarAction({
  action,
  content,
  selectionStart,
  selectionEnd,
}: ApplyMarkdownToolbarActionInput): ApplyMarkdownToolbarActionResult {
  switch (action) {
    case 'heading1':
      return prefixSelectedLines(content, selectionStart, selectionEnd, '# ');
    case 'heading2':
      return prefixSelectedLines(content, selectionStart, selectionEnd, '## ');
    case 'bold':
      return wrapSelection(content, selectionStart, selectionEnd, '**', 'text');
    case 'italic':
      return wrapSelection(content, selectionStart, selectionEnd, '*', 'text');
    case 'bulletList':
      return prefixSelectedLines(content, selectionStart, selectionEnd, '- ');
    case 'orderedList':
      return prefixSelectedLines(content, selectionStart, selectionEnd, '1. ');
    case 'blockquote':
      return prefixSelectedLines(content, selectionStart, selectionEnd, '> ');
    case 'codeBlock':
      return insertBlock(content, selectionStart, selectionEnd, '```\ncode\n```');
    case 'table':
      return insertBlock(content, selectionStart, selectionEnd, TABLE_TEMPLATE);
  }
}
