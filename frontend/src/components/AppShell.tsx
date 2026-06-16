import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, LogOut, MessageSquare, Plus, Search, Settings, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '../store/useAuthStore';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function AppShell({ children, title, eyebrow, description, actions }: AppShellProps) {
  const { t } = useTranslation(['common', 'notes']);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: FileText, label: t('notes') },
    { to: '/chat', icon: MessageSquare, label: t('chat') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <div className="app-shell pb-20 md:pb-0">
      <header className="app-header">
        <div className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-base font-bold leading-tight">AI Note Keeper</div>
              <div className="hidden text-xs text-muted-foreground sm:block">Personal knowledge workspace</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-[220px] truncate text-sm text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-ghost px-2" title={t('logout')}>
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>

      <div className="page-container grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-24 space-y-4">
            <nav className="surface-subtle p-2">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <Link to="/notes/new" className="btn-accent w-full">
              <Plus size={18} />
              {t('newNote', { ns: 'notes' })}
            </Link>

            <div className="surface-subtle p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Search size={16} className="text-accent" />
                RAG Ready
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Search, write, and ask your notes from one focused workspace.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {(title || description || actions) && (
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {eyebrow && <div className="section-label mb-2">{eyebrow}</div>}
                {title && <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>}
                {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 items-center gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <Link to="/notes/new" className="flex flex-col items-center gap-1 rounded-md bg-accent px-2 py-2 text-xs font-semibold text-accent-foreground">
            <Plus size={18} />
            <span>{t('newNote', { ns: 'notes' })}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
