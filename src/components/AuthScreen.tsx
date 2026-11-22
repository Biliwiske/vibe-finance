import { FormEvent, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthScreenProps {
  language: 'en' | 'ru';
  isLoading: boolean;
  authError: string | null;
  onGuest: () => void;
}

export function AuthScreen({ language, isLoading, authError, onGuest }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isRussian = language === 'ru';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setMessage(null);

    if (!supabase) {
      setFormError(isRussian ? 'Сначала настройте подключение к Supabase.' : 'Configure Supabase before signing in.');
      return;
    }

    setIsSubmitting(true);
    const authRequestUrl = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')}/auth/v1/${
      isRegistering ? 'signup' : 'token?grant_type=password'
    }`;
    try {
      const result = isRegistering
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        console.error('[Supabase Auth] Authentication request returned an error', {
          url: authRequestUrl,
          operation: isRegistering ? 'signUp' : 'signInWithPassword',
          error: result.error,
          name: result.error.name,
          message: result.error.message,
          status: result.error.status,
          code: result.error.code,
        });
        setFormError(result.error.message);
        return;
      }

      if (isRegistering && !result.data.session) {
        setMessage(isRussian
          ? 'Аккаунт создан. Проверьте почту и подтвердите адрес для входа.'
          : 'Account created. Check your email and confirm your address to sign in.');
      }
    } catch (error) {
      console.error('[Supabase Auth] Authentication request threw an error', {
        url: authRequestUrl,
        operation: isRegistering ? 'signUp' : 'signInWithPassword',
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="safe-area-page flex items-center justify-center bg-[#0d1117] text-neutral-200">
      <section className="w-full max-w-md rounded-2xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Vibe Finance</h1>
          <p className="mt-2 text-sm text-neutral-400">
            {isRussian
              ? 'Войдите, чтобы синхронизировать финансы между устройствами.'
              : 'Sign in to sync your finances across devices.'}
          </p>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            {isRussian ? 'Проверяем сессию…' : 'Checking your session…'}
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm text-neutral-300">
                {isRussian ? 'Электронная почта' : 'Email'}
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-neutral-300">
                {isRussian ? 'Пароль' : 'Password'}
                <input
                  type="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-white outline-none focus:border-emerald-500"
                />
              </label>

              {(formError || authError) && (
                <p role="alert" className="text-sm text-rose-400">{formError || authError}</p>
              )}
              {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}

              <button
                type="submit"
                disabled={!isSupabaseConfigured || isSubmitting}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? (isRussian ? 'Подождите…' : 'Please wait…')
                  : isRegistering
                  ? (isRussian ? 'Создать аккаунт' : 'Create account')
                  : (isRussian ? 'Войти' : 'Sign in')}
              </button>
            </form>

            {!isSupabaseConfigured && (
              <p className="mt-3 text-xs leading-relaxed text-amber-400">
                {isRussian
                  ? 'Для синхронизации добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local.'
                  : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to enable sync.'}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setFormError(null);
                setMessage(null);
              }}
              className="mt-4 w-full text-sm text-neutral-400 transition-colors hover:text-white"
            >
              {isRegistering
                ? (isRussian ? 'Уже есть аккаунт? Войти' : 'Already have an account? Sign in')
                : (isRussian ? 'Нет аккаунта? Зарегистрироваться' : 'No account? Create one')}
            </button>

            <div className="my-5 border-t border-[#30363d]" />

            <button
              type="button"
              onClick={onGuest}
              className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              {isRussian ? 'Продолжить как гость (только на этом устройстве)' : 'Continue as guest (this device only)'}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
