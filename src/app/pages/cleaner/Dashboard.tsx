import { useState } from 'react';
import { Clock, CheckCircle2, Play, X, Calendar } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useUpcomingTasks } from '../../hooks/useTasks';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { tasksService } from '../../services/tasks.service';
import { notificationsService } from '../../services/notifications.service';
import { messagesService } from '../../services/messages.service';
import { toast } from 'sonner';
import { TaskDetailModal } from '../../components/shared/TaskDetailModal';
import type { CleaningTask } from '../../types';

export function CleanerDashboard() {
  const { profile } = useAuth();
  const { t, lang } = useTranslation();
  const { tasks, loading, refetch } = useUpcomingTasks(profile?.id);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);

  useRealtimeSubscription({
    table: 'cleaning_tasks',
    filter: profile?.id ? `cleaner_id=eq.${profile.id}` : undefined,
    enabled: !!profile?.id,
    onChange: () => refetch(),
  });

  const today = new Date().toISOString().split('T')[0];
  const activeTasks = tasks.filter(t => t.status === 'in_progress');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  // Deduplicate declined: for same location+date+time, keep only the latest
  const declinedTasks = (() => {
    const all = tasks.filter(t => t.status === 'declined');
    const dedupMap = new Map<string, typeof all[0]>();
    for (const d of all) {
      const key = `${d.location_id}-${d.date}-${d.start_time}-${d.end_time}`;
      const existing = dedupMap.get(key);
      if (!existing || d.updated_at > existing.updated_at) {
        dedupMap.set(key, d);
      }
    }
    return Array.from(dedupMap.values());
  })();
  const todayTasks = tasks.filter(t => t.date === today && !['in_progress', 'pending', 'declined'].includes(t.status));
  const upcomingTasks = tasks.filter(t => t.date > today && !['declined'].includes(t.status));

  const handleConfirm = async (task: CleaningTask) => {
    try {
      await tasksService.updateStatus(task.id, 'confirmed');
    } catch (err: any) {
      toast.error(err.message);
      return;
    }

    toast.success(lang === 'et' ? 'Pakkumine nõustuti' : 'Offer accepted');

    refetch();

    if (profile?.tenant_id) {
      notificationsService.create({
        tenant_id: profile.tenant_id,
        user_id: task.assigned_by,
        type: 'task_confirmed',
        title: lang === 'et'
          ? `${profile.full_name} kinnitas koristuse`
          : `${profile.full_name} confirmed the cleaning task`,
        body: `${task.location?.name || ''} — ${task.date} ${task.start_time}–${task.end_time}`,
        reference_id: task.id,
      }).catch(() => {});
    }
  };

  const handleDecline = async (task: CleaningTask) => {
    try {
      await tasksService.updateStatus(task.id, 'declined');
    } catch (err: any) {
      toast.error(err.message);
      return;
    }

    toast.success(lang === 'et' ? 'Pakkumisest keelduti' : 'Offer declined');
    refetch();

    // Send notification + message to admin (non-blocking, don't fail the decline)
    if (profile?.tenant_id) {
      // Notification to admin
      notificationsService.create({
        tenant_id: profile.tenant_id,
        user_id: task.assigned_by,
        type: 'task_declined',
        title: lang === 'et'
          ? `${profile.full_name} keeldus koristusest`
          : `${profile.full_name} declined the cleaning task`,
        body: `${task.location?.name || ''} — ${task.date} ${task.start_time}–${task.end_time}`,
        reference_id: task.id,
      }).catch(() => {});

      // Chat message to admin
      messagesService.send(
        task.assigned_by,
        lang === 'et'
          ? `Ma ei saa tulla koristama kohta ${task.location?.name || 'asukoht'} kuupäeval ${task.date} kell ${task.start_time}–${task.end_time}. Palun leidke asendaja.`
          : `I cannot make it to the cleaning at ${task.location?.name || 'location'} on ${task.date} ${task.start_time}–${task.end_time}. Please find a replacement.`,
        profile.tenant_id,
      ).catch(() => {});
    }
  };

  const handleClockIn = async (task: CleaningTask) => {
    try {
      await tasksService.updateStatus(task.id, 'in_progress');
      refetch();
      toast.success(t('cd_work_started'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Finish work modal
  const [finishTask, setFinishTask] = useState<CleaningTask | null>(null);
  const [finishDuration, setFinishDuration] = useState('');
  const [finishNotes, setFinishNotes] = useState('');
  const [finishing, setFinishing] = useState(false);

  const openFinishModal = (task: CleaningTask) => {
    // Pre-fill duration from clock_in if available
    if (task.clock_in) {
      const diffMs = Date.now() - new Date(task.clock_in).getTime();
      const hours = Math.round((diffMs / 3600000) * 10) / 10;
      setFinishDuration(String(hours));
    } else {
      setFinishDuration('');
    }
    setFinishNotes('');
    setFinishTask(task);
  };

  const handleClockOut = async () => {
    if (!finishTask) return;
    setFinishing(true);
    try {
      const duration = finishDuration ? parseFloat(finishDuration) : undefined;
      await tasksService.clockOut(finishTask.id, duration, finishNotes || undefined);
      if (profile?.tenant_id) {
        notificationsService.create({
          tenant_id: profile.tenant_id,
          user_id: finishTask.assigned_by,
          type: 'task_completed',
          title: lang === 'et'
            ? `${profile.full_name} lõpetas koristuse`
            : `${profile.full_name} finished cleaning`,
          body: `${finishTask.location?.name || ''} — ${finishTask.date}${duration ? ` (${duration}h)` : ''}`,
          reference_id: finishTask.id,
        }).catch(() => {});
      }
      setFinishTask(null);
      refetch();
      toast.success(t('cd_work_finished'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const TaskCard = ({ task, actions }: { task: CleaningTask; actions?: React.ReactNode }) => (
    <Card className="bg-card border-border cursor-pointer" onClick={() => setSelectedTask(task)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {task.location?.name || 'Asukoht'}
            </div>
            {task.location?.address && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{task.location.address}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {task.date} &middot; {task.start_time}–{task.end_time}
            </div>
            {task.notes && <p className="text-xs text-muted-foreground/60 mt-1">{task.notes}</p>}
          </div>
          <StatusBadge status={task.status} />
        </div>
        {actions && <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title={`${t('hello')}, ${profile?.full_name}!`}
        actions={
          <Link to="/k/ajakava">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              {t('cd_calendar')}
            </Button>
          </Link>
        }
      />

      {/* Active tasks (clock-in done) */}
      {activeTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-2">{t('cd_in_progress')}</h2>
          <div className="space-y-2">
            {activeTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                actions={
                  <Button size="sm" onClick={() => openFinishModal(task)} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('cd_finish_work')}
                  </Button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending confirmation */}
      {pendingTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">{t('cd_pending')}</h2>
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                actions={
                  <>
                    <Button size="sm" onClick={() => handleConfirm(task)} className="bg-blue-600 hover:bg-blue-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('cd_confirm')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDecline(task)} className="text-red-400 border-red-400/30 hover:bg-red-400/10">
                      <X className="w-4 h-4 mr-2" />
                      {t('cd_decline')}
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Today's confirmed tasks */}
      {todayTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('cd_today')}</h2>
          <div className="space-y-2">
            {todayTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                actions={
                  task.status === 'confirmed' ? (
                    <Button size="sm" onClick={() => handleClockIn(task)}>
                      <Play className="w-4 h-4 mr-2" />
                      {t('cd_start_work')}
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('cd_upcoming')}</h2>
          <div className="space-y-2">
            {upcomingTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Declined — at the bottom */}
      {declinedTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">{t('cd_declined_section')}</h2>
          <div className="space-y-2">
            {declinedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <EmptyState icon={Calendar} title={t('cd_no_tasks')} description={t('cd_no_tasks_desc')} />
      )}

      {/* Finish work modal */}
      <Dialog open={!!finishTask} onOpenChange={(open) => { if (!open) setFinishTask(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t('cd_finish_title')}</DialogTitle>
          </DialogHeader>
          {finishTask && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {finishTask.location?.name} — {finishTask.date} {finishTask.start_time}–{finishTask.end_time}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('cd_duration')}</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={finishDuration}
                  onChange={e => setFinishDuration(e.target.value)}
                  placeholder="2.5"
                  className="mt-1 bg-input-background border-input"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('cd_completion_notes')}</Label>
                <Textarea
                  value={finishNotes}
                  onChange={e => setFinishNotes(e.target.value)}
                  placeholder={t('cd_completion_notes_hint')}
                  rows={3}
                  className="mt-1 bg-input-background border-input"
                />
              </div>
              <Button onClick={handleClockOut} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={finishing}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {finishing ? '...' : t('cd_submit_finish')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      />
    </div>
  );
}
