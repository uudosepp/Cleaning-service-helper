import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useTasks } from '../../hooks/useTasks';
import { cn } from '../../components/ui/utils';

export function CleanerMySchedule() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { tasks, loading } = useTasks(profile?.id ? { cleaner_id: profile.id } : undefined);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d.toISOString().split('T')[0], day: i, isCurrentMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: d.toISOString().split('T')[0], day: i, isCurrentMonth: false });
      }
    }
    return days;
  }, [year, month]);

  // Only show confirmed/in_progress/completed tasks in calendar
  const confirmedTasks = useMemo(() =>
    tasks.filter(t => ['confirmed', 'in_progress', 'completed'].includes(t.status)),
  [tasks]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    confirmedTasks.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [confirmedTasks]);

  const selectedTasks = (tasksByDate[selectedDate] || []).filter(t =>
    ['confirmed', 'in_progress', 'completed'].includes(t.status)
  );

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [t('month_1'),t('month_2'),t('month_3'),t('month_4'),t('month_5'),t('month_6'),t('month_7'),t('month_8'),t('month_9'),t('month_10'),t('month_11'),t('month_12')];
  const dayNames = [t('day_mon'),t('day_tue'),t('day_wed'),t('day_thu'),t('day_fri'),t('day_sat'),t('day_sun')];

  const statusDotColor: Record<string, string> = {
    pending: 'bg-amber-400',
    confirmed: 'bg-blue-400',
    in_progress: 'bg-purple-400',
    completed: 'bg-emerald-400',
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader title={t('nav_my_schedule')} />

      <Card className="bg-card border-border mb-4">
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
              const dayTasks = tasksByDate[date] || [];
              const isSelected = date === selectedDate;
              const isToday = date === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'relative p-2 text-center text-xs rounded-sm transition-colors min-h-[44px]',
                    !isCurrentMonth && 'text-zinc-700',
                    isCurrentMonth && 'text-foreground',
                    isSelected && 'bg-accent text-foreground',
                    isToday && !isSelected && 'ring-1 ring-zinc-600',
                    'hover:bg-accent/50'
                  )}
                >
                  {day}
                  {dayTasks.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {dayTasks.slice(0, 3).map((t, i) => (
                        <span key={i} className={cn('w-1 h-1 rounded-full', statusDotColor[t.status] || 'bg-zinc-500')} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{selectedDate}</h2>
        {selectedTasks.length === 0 ? (
          <EmptyState icon={Calendar} title={t('cd_no_tasks')} description={t('cd_no_tasks_date')} />
        ) : (
          selectedTasks.map(task => (
            <Card key={task.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{task.location?.name || 'Asukoht'}</div>
                    {task.location?.address && (
                      <div className="text-xs text-muted-foreground mt-0.5">{task.location.address}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{task.start_time}–{task.end_time}</div>
                    {task.notes && <p className="text-xs text-muted-foreground/60 mt-1">{task.notes}</p>}
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
