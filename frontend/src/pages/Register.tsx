import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function Register() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [codeMessage, setCodeMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSendCode = async () => {
    setError('');
    setDevCode('');
    setCodeMessage('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (cooldownSeconds > 0) {
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await authAPI.sendVerificationCode(email.trim());
      setCodeMessage('Verification code sent. Please check your inbox and spam folder.');
      setCooldownSeconds(60);
      if (response.data.devCode) {
        setDevCode(response.data.devCode);
        setVerificationCode(response.data.devCode);
      }
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message || 'Failed to send verification code';
      setError(message);
    } finally {
      setIsSendingCode(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }

    if (!verificationCode.trim()) {
      setError('Verification code is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.register({ email, password, verificationCode: verificationCode.trim() });
      setAuth(response.data.user, response.data.token);
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message || t('registrationFailed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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
              Private notes, AI retrieval, source citations
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-balance">
              Build a knowledge base that answers back.
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Start with Markdown or rich text, then use semantic search and RAG chat to keep your thinking connected.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { icon: BookOpen, title: 'Collect', desc: 'Notes, tags, categories' },
              { icon: BrainCircuit, title: 'Reason', desc: 'Ask with citations' },
              { icon: ShieldCheck, title: 'Configure', desc: 'Choose your AI provider' },
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
            <p className="mt-2 text-sm text-muted-foreground">Create your private AI knowledge workspace.</p>
          </div>

          <div className="surface p-6 sm:p-8">
            <div className="mb-6">
              <p className="section-label mb-2">Get started</p>
              <h2 className="text-2xl font-bold">{t('registerTitle')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Set up your workspace and start collecting knowledge.</p>
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
                  placeholder={t('passwordPlaceholder')}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold">
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder={t('passwordPlaceholder')}
                  required
                />
              </div>

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
                    onClick={handleSendCode}
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
                    Dev verification code: {devCode}
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="btn-accent w-full py-2.5">
                {isLoading ? t('creatingAccount') : t('registerButton')}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('haveAccount')}{' '}
              <Link to="/login" className="font-semibold text-accent hover:underline">
                {t('loginHere')}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
