import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, getSystemTheme } from './theme';

describe('theme utilities', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  it('applies the dark class when dark mode is enabled', () => {
    applyTheme(true);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes the dark class when dark mode is disabled', () => {
    document.documentElement.classList.add('dark');

    applyTheme(false);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads the system color preference', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    expect(getSystemTheme()).toBe(true);
  });
});
