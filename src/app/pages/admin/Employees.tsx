import { useState } from 'react';
import { UserPlus, Trash2, Copy, Check, Users, KeyRound, Pencil } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useCleaners } from '../../hooks/useProfiles';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { toast } from 'sonner';

export function AdminEmployees() {
  const { cleaners, loading, refetch } = useCleaners();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDesc, setConfirmDesc] = useState('');
  const [confirmLabel, setConfirmLabel] = useState(t('confirm'));
  const [confirmDestructive, setConfirmDestructive] = useState(true);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const showConfirm = (title: string, desc: string, action: () => void, label = t('delete'), destructive = true) => {
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setConfirmLabel(label);
    setConfirmDestructive(destructive);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (!profile?.tenant_id) throw new Error('Tenant puudub');
      if (cleaners.some(c => c.full_name.toLowerCase() === newName.toLowerCase())) {
        throw new Error(t('emp_name_exists', { name: newName }));
      }
      if (cleaners.some(c => c.email.toLowerCase() === newEmail.toLowerCase())) {
        throw new Error(t('emp_email_exists', { email: newEmail }));
      }
      const result = await authService.createEmployee(newName, newEmail, profile.tenant_id, newPhone || undefined);
      setGeneratedPassword(result.password);
      setGeneratedEmail(newEmail);
      setOpen(false);
      setCredentialsOpen(true);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      refetch();
      toast.success(t('emp_created'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (userId: string, name: string) => {
    showConfirm(
      t('emp_delete_title'),
      t('emp_delete_desc', { name }),
      async () => {
        try {
          await authService.deleteEmployee(userId);
          refetch();
          toast.success(t('emp_deleted'));
        } catch (err: any) { toast.error(err.message); }
      },
    );
  };

  const handleResetPassword = (userId: string, name: string, email: string) => {
    showConfirm(
      t('emp_reset_title'),
      t('emp_reset_desc', { name }),
      async () => {
        try {
          const result = await authService.resetPassword(userId);
          setGeneratedPassword(result.password);
          setGeneratedEmail(email);
          setCredentialsOpen(true);
          toast.success(t('emp_new_password'));
        } catch (err: any) { toast.error(err.message); }
      },
      t('emp_generate'),
      false,
    );
  };

  const openEdit = (c: typeof cleaners[0]) => {
    setEditId(c.id);
    setEditName(c.full_name);
    setEditPhone(c.phone || '');
    setEditEmail(c.email);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authService.updateEmployee(editId, { full_name: editName, phone: editPhone });
      setEditOpen(false);
      refetch();
      toast.success(t('emp_updated'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyField = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title={t('nav_employees')}
        description={`${cleaners.length} ${t('emp_count')}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                {t('emp_add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">{t('emp_add_new')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('name')}</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Mari Mets" required className="mt-1 bg-input-background border-input" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('auth_email')}</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="mari@example.com" required className="mt-1 bg-input-background border-input" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('phone_optional')}</Label>
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+372 555 1234" className="mt-1 bg-input-background border-input" />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? t('creating') : t('emp_create_account')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Credentials dialog */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('emp_credentials')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('emp_credentials_desc')}</p>
          <div className="bg-muted border border-input rounded p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</div>
                <div className="text-sm text-foreground font-mono truncate">{generatedEmail}</div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0 h-8 px-2" onClick={() => copyField(generatedEmail, 'email')}>
                {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Parool</div>
                <div className="text-sm text-foreground font-mono truncate">{generatedPassword}</div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0 h-8 px-2" onClick={() => copyField(generatedPassword, 'password')}>
                {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel={confirmLabel}
        destructive={confirmDestructive}
        onConfirm={confirmAction}
      />

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('emp_edit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('auth_email')}</Label>
              <Input value={editEmail} disabled className="mt-1 bg-input-background border-input opacity-50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('name')}</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required className="mt-1 bg-input-background border-input" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('phone')}</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+372 555 1234" className="mt-1 bg-input-background border-input" />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? t('saving') : t('emp_save_changes')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {cleaners.length === 0 ? (
        <EmptyState icon={Users} title={t('emp_none')} description={t('emp_none_desc')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cleaners.map((c) => (
            <Card key={c.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{c.email}</div>
                    {c.phone && <div className="text-xs text-muted-foreground/60 mt-0.5">{c.phone}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />{t('edit')}
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-amber-400 h-7 px-2"
                    onClick={() => handleResetPassword(c.id, c.full_name, c.email)}
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1" />{t('emp_reset_password')}
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-red-400 h-7 px-2 ml-auto"
                    onClick={() => handleDelete(c.id, c.full_name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
