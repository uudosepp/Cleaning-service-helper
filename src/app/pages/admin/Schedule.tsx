import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { useTasks } from '../../hooks/useTasks';
import { useCleaners } from '../../hooks/useProfiles';
import { useLocations } from '../../hooks/useLocations';
import { tasksService } from '../../services/tasks.service';
import { notificationsService } from '../../services/notifications.service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { TaskDetailModal } from '../../components/shared/TaskDetailModal';
import type { CleaningTask } from '../../types';

export function AdminSchedule() {
  const { profile } = useAuth();
  const { t, lang } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { tasks, loading, refetch } = useTasks();
  const { cleaners } = useCleaners();
  const { locations } = useLocations();

  const [form, setForm] = useState({
    cleaner_id: '', location_id: '', date: selectedDate,
    start_time: '09:00', end_time: '17:00', notes: '',
  });

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday-based
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d.toISOString().split('T')[0], day: i, isCurrentMonth: true });
    }
    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: d.toISOString().split('T')[0], day: i, isCurrentMonth: false });
      }
    }
    return days;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => { map[t.date] = (map[t.date] || 0) + 1; });
    return map;
  }, [tasks]);

  // Deduplicate declined: for same location+time, keep only the latest
  const selectedTasks = (() => {
    const dayTasks = tasks.filter(t => t.date === selectedDate);
    const nonDeclined = dayTasks.filter(t => t.status !== 'declined');
    const declined = dayTasks.filter(t => t.status === 'declined');
    const dedupMap = new Map<string, typeof declined[0]>();
    for (const d of declined) {
      const key = `${d.location_id}-${d.start_time}-${d.end_time}`;
      const existing = dedupMap.get(key);
      if (!existing || d.updated_at > existing.updated_at) {
        dedupMap.set(key, d);
      }
    }
    return [...nonDeclined, ...dedupMap.values()];
  })();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !profile?.id) return;
    setCreating(true);
    try {
      const task = await tasksService.create({
        tenant_id: profile.tenant_id,
        location_id: form.location_id,
        cleaner_id: form.cleaner_id,
        assigned_by: profile.id,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        notes: form.notes || undefined,
      });

      // Send notification to cleaner
      const location = locations.find(l => l.id === form.location_id);
      const cleaner = cleaners.find(c => c.id === form.cleaner_id);
      await notificationsService.create({
        tenant_id: profile.tenant_id,
        user_id: form.cleaner_id,
        type: 'task_assigned',
        title: lang === 'et'
          ? `Uus koristusülesanne: ${location?.name || 'Asukoht'}`
          : `New cleaning task: ${location?.name || 'Location'}`,
        body: `${form.date} ${form.start_time}–${form.end_time}`,
        reference_id: task?.id,
      });

      setOpen(false);
      refetch();
      toast.success(t('sched_created'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const handleDelete = (id: string) => {
    setConfirmAction(() => async () => {
      try {
        await tasksService.remove(id);
        refetch();
        toast.success(t('loc_deleted'));
      } catch (err: any) { toast.error(err.message); }
    });
    setConfirmOpen(true);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [t('month_1'),t('month_2'),t('month_3'),t('month_4'),t('month_5'),t('month_6'),t('month_7'),t('month_8'),t('month_9'),t('month_10'),t('month_11'),t('month_12')];
  const dayNames = [t('day_mon'),t('day_tue'),t('day_wed'),t('day_thu'),t('day_fri'),t('day_sat'),t('day_sun')];

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title={t('nav_schedule')}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('sched_add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">{t('sched_new')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('sched_cleaner')}</Label>
                  <Select value={form.cleaner_id} onValueChange={v => setForm(f => ({ ...f, cleaner_id: v }))}>
                    <SelectTrigger className="mt-1 bg-input-background border-input">
                      <SelectValue placeholder={t('sched_select_cleaner')} />
                    </SelectTrigger>
                    <SelectContent>
                      {cleaners.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('sched_location')}</Label>
                  <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                    <SelectTrigger className="mt-1 bg-input-background border-input">
                      <SelectValue placeholder={t('sched_select_location')} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('date')}</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                    className="mt-1 bg-input-background border-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('start_time')}</Label>
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))}
                      required
                      className="mt-1 bg-input-background border-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('end_time')}</Label>
                    <Input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))}
                      required
                      className="mt-1 bg-input-background border-input"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('notes')}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={t('sched_special_instructions')}
                    rows={2}
                    className="mt-1 bg-input-background border-input"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={creating || !form.cleaner_id || !form.location_id}>
                  {creating ? t('creating') : t('create')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-foreground">{monthNames[month]} {year}</span>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-px">
                {dayNames.map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-muted-foreground/60 py-1">{d}</div>
                ))}
                {calendarDays.map(({ date, day, isCurrentMonth }) => {
                  const count = tasksByDate[date] || 0;
                  const isSelected = date === selectedDate;
                  const isToday = date === new Date().toISOString().split('T')[0];
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        'relative p-2 text-center text-xs rounded-sm transition-colors min-h-[40px]',
                        !isCurrentMonth && 'text-zinc-700',
                        isCurrentMonth && 'text-foreground',
                        isSelected && 'bg-accent text-foreground',
                        isToday && !isSelected && 'ring-1 ring-zinc-600',
                        'hover:bg-accent/50'
                      )}
                    >
                      {day}
                      {count > 0 && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day detail */}
        <div>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-foreground mb-3">{selectedDate}</div>
              {selectedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">{t('sched_no_tasks')}</p>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map(task => (
                    <div key={task.id} className="bg-muted border border-input rounded p-3 cursor-pointer" onClick={() => setSelectedTask(task)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">
                            {task.location?.name || 'Asukoht'}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {task.cleaner?.full_name || 'Koristaja'}
                          </div>
                          <div className="text-[11px] text-muted-foreground/60 mt-0.5">
                            {task.start_time}–{task.end_time}
                          </div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-400 hover:text-red-300 h-6 px-2"
                          onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                        >
                          {t('delete')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('sched_delete_title')}
        description={t('sched_delete_desc')}
        onConfirm={confirmAction}
      />

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        onDelete={async (taskId) => {
          try {
            await tasksService.remove(taskId);
            setSelectedTask(null);
            refetch();
            toast.success(t('loc_deleted'));
          } catch (err: any) { toast.error(err.message); }
        }}
      />
    </div>
  );
}
