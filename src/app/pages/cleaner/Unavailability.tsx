import { useState } from 'react';
import { Plus, Trash2, CalendarOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useMyUnavailability } from '../../hooks/useUnavailability';
import { unavailabilityService } from '../../services/unavailability.service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { toast } from 'sonner';

export function CleanerUnavailability() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { entries, loading, refetch } = useMyUnavailability();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allDay, setAllDay] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    start_time: '09:00',
    end_time: '17:00',
    reason: '',
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setCreating(true);
    try {
      await unavailabilityService.create({
        tenant_id: profile.tenant_id,
        date: form.date,
        start_time: allDay ? undefined : form.start_time,
        end_time: allDay ? undefined : form.end_time,
        reason: form.reason || undefined,
      });
      setOpen(false);
      setForm({ date: today, start_time: '09:00', end_time: '17:00', reason: '' });
      setAllDay(true);
      refetch();
      toast.success(t('unavail_added'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title={t('unavail_title')}
        description={t('unavail_desc')}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('unavail_add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>{t('unavail_add')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('date')}</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    min={today}
                    required
                    className="mt-1 bg-input-background border-input"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('all_day')}</Label>
                  <Switch checked={allDay} onCheckedChange={setAllDay} />
                </div>

                {!allDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('start_time')}</Label>
                      <Input
                        type="time"
                        value={form.start_time}
                        onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                        className="mt-1 bg-input-background border-input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('end_time')}</Label>
                      <Input
                        type="time"
                        value={form.end_time}
                        onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                        className="mt-1 bg-input-background border-input"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">{t('reason')}</Label>
                  <Input
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder={t('unavail_reason_hint')}
                    className="mt-1 bg-input-background border-input"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? t('creating') : t('unavail_add')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title={t('unavail_none')}
          description={t('unavail_none_desc')}
        />
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <Card key={e.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.date}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.start_time && e.end_time
                        ? `${e.start_time}–${e.end_time}`
                        : t('all_day')}
                    </div>
                    {e.reason && <div className="text-xs text-muted-foreground/60 mt-0.5">{e.reason}</div>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-400 shrink-0"
                    onClick={() => handleDelete(e.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('unavail_delete_title')}
        description={t('unavail_delete_desc')}
        onConfirm={async () => {
          try {
            await unavailabilityService.remove(deleteId);
            refetch();
            toast.success(t('unavail_removed'));
          } catch (err: any) { toast.error(err.message); }
        }}
      />
    </div>
  );
}
