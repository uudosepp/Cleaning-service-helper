import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useTranslation } from '../../i18n/LanguageContext';
import { Logo } from '../../components/shared/Logo';
import { Globe } from 'lucide-react';

export function Login() {
  const { t, lang, setLang } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(t('auth_wrong_credentials'));
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    navigate(profile?.role === 'cleaner' ? '/k' : '/');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError(t('auth_enter_email')); return; }
    setResetLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  };

  const languageSwitcher = (
    <div className="absolute top-4 right-4 flex items-center gap-1.5">
      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
      <select
        value={lang}
        onChange={e => setLang(e.target.value as 'en' | 'et')}
        className="bg-transparent border-none text-xs text-muted-foreground cursor-pointer focus:outline-none"
      >
        <option value="en">EN</option>
        <option value="et">ET</option>
      </select>
    </div>
  );

  // Forgot password mode
  if (forgotMode) {
    return (
      <div className="w-full max-w-sm relative">
        {languageSwitcher}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">{t('auth_reset_title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('auth_reset_subtitle')}</p>
        </div>

        <div className="bg-card border border-border rounded-sm p-6">
          {resetSent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-emerald-400 text-lg">✓</span>
              </div>
              <p className="text-sm text-foreground">{t('auth_reset_sent')}</p>
              <p className="text-xs text-muted-foreground">{t('auth_check_email')}</p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t('auth_email')}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="mt-1 bg-input-background border-input"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? t('auth_sending') : t('auth_send_reset')}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          <button onClick={() => { setForgotMode(false); setResetSent(false); setError(''); }} className="text-muted-foreground hover:text-foreground underline">
            {t('auth_back_to_login')}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm relative">
      {languageSwitcher}
      <div className="mb-8 text-center">
        <Logo size={48} className="mx-auto mb-4 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t('auth_login')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('auth_login_subtitle')}</p>
      </div>

      <div className="bg-card border border-border rounded-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t('auth_email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="mt-1 bg-input-background border-input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('auth_password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1 bg-input-background border-input"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth_logging_in') : t('auth_login')}
          </Button>
        </form>
        <div className="mt-3 text-center">
          <button onClick={() => { setForgotMode(true); setError(''); }} className="text-xs text-muted-foreground hover:text-foreground underline">
            {t('auth_forgot_password')}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-4">
        {t('auth_no_account')}{' '}
        <Link to="/register" className="text-muted-foreground hover:text-foreground underline">
          {t('auth_register_org')}
        </Link>
      </p>
    </div>
  );
}
