import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const { t } = useTranslation('auth');
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeMessage, setCodeMessage] = useState('');
  const [devCode, setDevCode] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSendResetCode = async () => {
    setError('');
    setCodeMessage('');
    setDevCode('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (cooldownSeconds > 0) {
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await authAPI.sendPasswordResetCode(email.trim());
      setCodeMessage('Reset code sent. Please check your inbox and spam folder.');
      setCooldownSeconds(60);
      if (response.data.devCode) {
        setDevCode(response.data.devCode);
        setVerificationCode(response.data.devCode);
      }
    } catch (err: any) {
      const message = err.response?.status === 404
        ? 'No account was found for this email.'
        : err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message || 'Failed to send reset code';
      setError(message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isResetMode && !verificationCode.trim()) {
        setError('Verification code is required');
        return;
      }

      if (password.length < 6) {
        setError(t('passwordTooShort'));
        return;
      }

      const response = isResetMode
        ? await authAPI.resetPassword({ email, password, verificationCode: verificationCode.trim() })
        : await authAPI.login({ email, password });
      setAuth(response.data.user);
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message || (isResetMode ? 'Password reset failed.' : t('loginFailed'));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  return (
    <div className="app-shell grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-primary text-primary-foreground lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.35),transparent_26rem)]" />
        <div className="relative flex min-h-screen flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/20">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="text-lg font-bold">AI Note Keeper</div>
              <div className="text-sm text-white/60">Personal knowledge workspace</div>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/75">
              RAG notes, semantic search, AI answers
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-balance">
              Turn scattered notes into a searchable thinking system.
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Capture structured notes, import Markdown, and ask your private knowledge base with source-backed answers.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { icon: BookOpen, title: 'Write', desc: 'Rich text and Markdown' },
              { icon: BrainCircuit, title: 'Ask', desc: 'RAG over your notes' },
              { icon: ShieldCheck, title: 'Control', desc: 'Local-first dev setup' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-lg border border-white/15 bg-white/10 p-4">
                <Icon className="mb-3 text-white/80" size={20} />
                <div className="font-semibold">{title}</div>
                <div className="mt-1 text-xs leading-5 text-white/55">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles size={23} />
            </div>
            <h1 className="text-3xl font-bold">AI Note Keeper</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your private AI knowledge workspace.</p>
          </div>

          <div className="surface p-6 sm:p-8">
            <div className="mb-6">
              <p className="section-label mb-2">Welcome back</p>
              <h2 className="text-2xl font-bold">{isResetMode ? 'Reset password' : t('loginTitle')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isResetMode ? 'Verify your email and choose a new password.' : 'Continue writing, searching, and asking your notes.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
                  {t('email', { ns: 'common' })}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder={t('emailPlaceholder')}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                  {t('password', { ns: 'common' })}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder={isResetMode ? 'New password' : t('passwordPlaceholder')}
                  required
                />
              </div>

              {isResetMode && (
                <div>
                  <label htmlFor="verificationCode" className="mb-1.5 block text-sm font-semibold">
                    Verification Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="verificationCode"
                      type="text"
                      inputMode="numeric"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="input-field flex-1"
                      placeholder="123456"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      disabled={isSendingCode || cooldownSeconds > 0 || !email.trim()}
                      className="btn-secondary whitespace-nowrap px-3"
                    >
                      {isSendingCode ? 'Sending...' : cooldownSeconds > 0 ? `${cooldownSeconds}s` : 'Send Code'}
                    </button>
                  </div>
                  {codeMessage && (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                      {codeMessage}
                    </p>
                  )}
                  {devCode && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dev reset code: {devCode}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="btn-accent w-full py-2.5">
                {isLoading ? (isResetMode ? 'Resetting...' : t('loggingIn')) : (isResetMode ? 'Reset password' : t('loginButton'))}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsResetMode((value) => !value);
                setError('');
                setCodeMessage('');
                setVerificationCode('');
              }}
              className="mt-4 w-full text-center text-sm font-semibold text-accent hover:underline"
            >
              {isResetMode ? 'Back to login' : 'Forgot password?'}
            </button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('noAccount')}{' '}
              <Link to="/register" className="font-semibold text-accent hover:underline">
                {t('registerHere')}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
