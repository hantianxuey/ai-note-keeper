import { useThemeStore, Theme } from '../store/useThemeStore';

export const getSystemTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const applyTheme = (isDark: boolean): void => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const initTheme = (): void => {
  const storedTheme = localStorage.getItem('theme-storage');
  
  if (storedTheme) {
    try {
      const { state } = JSON.parse(storedTheme);
      const theme = state.theme as Theme;
      
      let isDark = false;
      if (theme === 'system') {
        isDark = getSystemTheme();
      } else {
        isDark = theme === 'dark';
      }
      
      applyTheme(isDark);
      
      useThemeStore.setState({ theme, isDark });
    } catch {
      const isDark = getSystemTheme();
      applyTheme(isDark);
      useThemeStore.setState({ theme: 'system', isDark });
    }
  } else {
    const isDark = getSystemTheme();
    applyTheme(isDark);
    useThemeStore.setState({ theme: 'system', isDark });
  }
};

export const setupSystemThemeListener = (): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    const currentTheme = useThemeStore.getState().theme;
    if (currentTheme === 'system') {
      applyTheme(e.matches);
      useThemeStore.setState({ isDark: e.matches });
    }
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  return () => mediaQuery.removeEventListener('change', handleChange);
};
