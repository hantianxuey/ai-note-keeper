import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore, Theme } from '../store/useThemeStore';

interface ThemeToggleProps {
  variant?: 'icon' | 'full';
}

export default function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, isDark } = useThemeStore();

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun size={18} />, label: 'Light' },
    { value: 'dark', icon: <Moon size={18} />, label: 'Dark' },
    { value: 'system', icon: <Monitor size={18} />, label: 'System' },
  ];

  const currentIcon = isDark ? <Moon size={20} /> : <Sun size={20} />;

  if (variant === 'icon') {
    return (
      <button
        onClick={() => {
          const nextTheme = theme === 'system'
            ? (isDark ? 'light' : 'dark')
            : (theme === 'light' ? 'dark' : 'light');
          setTheme(nextTheme);
        }}
        className="p-2 hover:bg-muted rounded-md transition-colors"
        title="Toggle theme"
      >
        {currentIcon}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
            theme === value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'hover:bg-muted'
          }`}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
