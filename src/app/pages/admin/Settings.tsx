import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PageHeader } from '../../components/shared/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { profilesService } from '../../services/profiles.service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function AdminSettings() {
  const { profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useTranslation();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profilesService.updateSelf({ full_name: fullName, phone });
      await refreshProfile();
      toast.success(t('settings_saved'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === profile?.email) return;
    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success(t('settings_email_confirm_sent'));
      setNewEmail('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error(t('auth_min_6_chars')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('auth_passwords_dont_match')); return; }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('auth_password_changed'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('nav_settings')} />

      <div className="max-w-lg space-y-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">{t('organisation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{profile?.tenants?.name || '-'}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">{t('settings_appearance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{theme === 'dark' ? t('settings_dark_theme') : t('settings_light_theme')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('settings_toggle_theme')}</p>
              </div>
              <button
                onClick={toggleTheme}
                className="w-12 h-7 rounded-full relative transition-colors duration-200"
                style={{ backgroundColor: theme === 'dark' ? '#7c3aed' : '#d4d4d8' }}
              >
                <div
                  className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-all duration-200"
                  style={{ left: theme === 'dark' ? '22px' : '2px' }}
                >
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-violet-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">{t('settings_language')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{lang === 'en' ? 'English' : 'Eesti'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('settings_language_desc')}</p>
              </div>
              <select
                value={lang}
                onChange={e => setLang(e.target.value as 'en' | 'et')}
                className="bg-input-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground"
              >
                <option value="en">English</option>
                <option value="et">Eesti</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">{t('settings_profile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-400">{t('auth_email')}</Label>
                <Input value={profile?.email || ''} disabled className="mt-1 bg-input-background border-input opacity-50" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">{t('name')}</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 bg-input-background border-input" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">{t('phone')}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 bg-input-background border-input" />
              </div>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t('saving') : t('save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">{t('settings_change_email')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-400">{t('settings_current_email')}</Label>
                <Input value={profile?.email || ''} disabled className="mt-1 bg-input-background border-input opacity-50" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">{t('settings_new_email')}</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="uus@email.com" required className="mt-1 bg-input-background border-input" />
              </div>
              <p className="text-[11px] text-zinc-600">{t('settings_email_confirm_note')}</p>
              <Button type="submit" size="sm" disabled={changingEmail || !newEmail || newEmail === profile?.email}>
                {changingEmail ? t('auth_sending') : t('settings_change_email')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">{t('settings_change_password')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-400">{t('auth_new_password')}</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('auth_min_6_chars')} required minLength={6} className="mt-1 bg-input-background border-input" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">{t('auth_confirm_password')}</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('auth_enter_again')} required className="mt-1 bg-input-background border-input" />
              </div>
              <Button type="submit" size="sm" disabled={changingPw}>
                {changingPw ? t('auth_changing') : t('settings_change_password')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
