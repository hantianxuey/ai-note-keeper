import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const getSystemTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system' as Theme,
      isDark: getSystemTheme(),
      setTheme: (theme: Theme) => {
        let isDark = false;
        if (theme === 'system') {
          isDark = getSystemTheme();
        } else {
          isDark = theme === 'dark';
        }
        
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        set({ theme, isDark });
      },
      toggleTheme: () => {
        const { theme, isDark } = get();
        if (theme === 'system') {
          const newTheme = isDark ? 'light' : 'dark';
          get().setTheme(newTheme);
        } else {
          const newTheme = theme === 'dark' ? 'light' : 'dark';
          get().setTheme(newTheme);
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
