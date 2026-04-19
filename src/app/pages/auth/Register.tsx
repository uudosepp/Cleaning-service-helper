import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '../../i18n/LanguageContext';
import { Logo } from '../../components/shared/Logo';
import { Globe } from 'lucide-react';

export function Register() {
  const { t, lang, setLang } = useTranslation();
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.registerOrg(orgName, fullName, email, password);
      // signUp already creates a session if email_confirm is disabled in Supabase
      // Try to sign in explicitly to be safe
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // If email confirmation is enabled, user needs to verify first
        setError(t('auth_account_created'));
        setLoading(false);
        return;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || t('auth_register_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm relative">
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
      <div className="mb-8 text-center">
        <Logo size={48} className="mx-auto mb-4 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t('auth_register_org')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('auth_create_account')}</p>
      </div>

      <div className="bg-card border border-border rounded-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t('auth_company_name')}</Label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="OÜ Puhas Maja"
              required
              className="mt-1 bg-input-background border-input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('auth_your_name')}</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mari Mets"
              required
              className="mt-1 bg-input-background border-input"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mari@puhasmaja.ee"
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
              placeholder={t('auth_min_6_chars')}
              required
              minLength={6}
              className="mt-1 bg-input-background border-input"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth_registering') : t('auth_register')}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-4">
        {t('auth_have_account')}{' '}
        <Link to="/login" className="text-muted-foreground hover:text-foreground underline">
          {t('auth_login')}
        </Link>
      </p>
    </div>
  );
}
