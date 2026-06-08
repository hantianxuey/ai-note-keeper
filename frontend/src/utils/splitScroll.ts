type SyncedScrollTopInput = {
  sourceScrollTop: number;
  sourceScrollHeight: number;
  sourceClientHeight: number;
  targetScrollHeight: number;
  targetClientHeight: number;
};

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function getCursorLineScrollRatio(content: string, cursorIndex: number) {
  const clampedCursorIndex = Math.min(content.length, Math.max(0, cursorIndex));
  const beforeCursor = content.slice(0, clampedCursorIndex);
  const currentLineIndex = beforeCursor.split('\n').length - 1;
  const totalLineCount = Math.max(1, content.split('\n').length);

  if (totalLineCount === 1) return 0;
  return clampRatio(currentLineIndex / (totalLineCount - 1));
}

export function getSyncedScrollTop({
  sourceScrollTop,
  sourceScrollHeight,
  sourceClientHeight,
  targetScrollHeight,
  targetClientHeight,
}: SyncedScrollTopInput) {
  const sourceMaxScrollTop = Math.max(0, sourceScrollHeight - sourceClientHeight);
  const targetMaxScrollTop = Math.max(0, targetScrollHeight - targetClientHeight);

  if (sourceMaxScrollTop === 0 || targetMaxScrollTop === 0) return 0;
  return clampRatio(sourceScrollTop / sourceMaxScrollTop) * targetMaxScrollTop;
}

export function getScrollTopForRatio(scrollHeight: number, clientHeight: number, ratio: number) {
  return clampRatio(ratio) * Math.max(0, scrollHeight - clientHeight);
}
