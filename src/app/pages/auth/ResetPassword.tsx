import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useTranslation } from '../../i18n/LanguageContext';

export function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles the token from the URL automatically
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
      }
      setChecking(false);
    });

    // Also check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError(t('auth_min_6_chars')); return; }
    if (password !== confirmPassword) { setError(t('auth_passwords_dont_match')); return; }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (checking) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm mt-3">{t('loading')}</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-foreground mb-2">{t('auth_link_expired')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('auth_link_expired_desc')}</p>
        <Link to="/login">
          <Button variant="outline">{t('auth_back_to_login')}</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-400 text-lg">✓</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">{t('auth_password_changed')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('auth_password_changed_desc')}</p>
        <Button onClick={() => navigate('/login')}>{t('auth_login')}</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">{t('auth_new_password')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('auth_enter_email')}</p>
      </div>

      <div className="bg-card border border-border rounded-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t('auth_new_password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth_min_6_chars')}
              required
              minLength={6}
              className="mt-1 bg-input-background border-input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('auth_confirm_password')}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth_enter_again')}
              required
              className="mt-1 bg-input-background border-input"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth_changing') : t('auth_change_password')}
          </Button>
        </form>
      </div>
    </div>
  );
}
