import { useEffect, useState } from 'react';
import { Users, MapPin, Calendar, Clock, CheckCircle2, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { supabase } from '@/lib/supabase';
import { tasksService } from '../../services/tasks.service';
import { TaskDetailModal } from '../../components/shared/TaskDetailModal';
import { toast } from 'sonner';
import type { CleaningTask } from '../../types';

interface Stats {
  employees: number;
  locations: number;
  todayTasks: number;
  pendingTasks: number;
  completedToday: number;
}

const INITIAL_LIMIT = 20;

export function AdminDashboard() {
  const { profile } = useAuth();
  const { t, lang } = useTranslation();
  const [stats, setStats] = useState<Stats>({ employees: 0, locations: 0, todayTasks: 0, pendingTasks: 0, completedToday: 0 });
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [declinedTasks, setDeclinedTasks] = useState<CleaningTask[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksService.remove(taskId);
      setSelectedTask(null);
      setRefreshKey(k => k + 1);
      toast.success(t('loc_deleted'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0];

      const [employees, locations, todayTasks, pendingTasks, completedToday] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'cleaner'),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
        supabase.from('cleaning_tasks').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('cleaning_tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'confirmed']),
        supabase.from('cleaning_tasks').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'completed'),
      ]);

      setStats({
        employees: employees.count || 0,
        locations: locations.count || 0,
        todayTasks: todayTasks.count || 0,
        pendingTasks: pendingTasks.count || 0,
        completedToday: completedToday.count || 0,
      });

      // Load recent pending + confirmed tasks
      const { data: taskData, count } = await supabase
        .from('cleaning_tasks')
        .select(`
          *,
          location:locations(id, name, address),
          cleaner:profiles!cleaner_id(id, full_name)
        `, { count: 'exact' })
        .in('status', ['pending', 'confirmed'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(INITIAL_LIMIT);

      setTasks((taskData || []) as CleaningTask[]);
      setTotalCount(count || 0);

      // Load declined tasks (need replacement)
      const { data: declinedData } = await supabase
        .from('cleaning_tasks')
        .select(`
          *,
          location:locations(id, name, address),
          cleaner:profiles!cleaner_id(id, full_name)
        `)
        .eq('status', 'declined')
        .order('date', { ascending: true });

      // Auto-cleanup: if a task is confirmed, cancel other pending/declined tasks for same slot
      const confirmed = (taskData || []).filter((t: any) => t.status === 'confirmed');
      const toCancel = (declinedData || []).filter((d: any) =>
        confirmed.some((c: any) =>
          c.location_id === d.location_id && c.date === d.date &&
          c.start_time === d.start_time && c.end_time === d.end_time
        )
      );
      for (const t of toCancel) {
        supabase.from('cleaning_tasks').update({ status: 'cancelled' }).eq('id', t.id).then(() => {});
      }

      // Show only declined that don't have a confirmed replacement
      const remainingDeclined = (declinedData || []).filter((d: any) =>
        !confirmed.some((c: any) =>
          c.location_id === d.location_id && c.date === d.date &&
          c.start_time === d.start_time && c.end_time === d.end_time
        )
      );

      // Deduplicate: for same location+date+time, keep only the latest declined
      const dedupMap = new Map<string, any>();
      for (const d of remainingDeclined) {
        const key = `${d.location_id}-${d.date}-${d.start_time}-${d.end_time}`;
        const existing = dedupMap.get(key);
        if (!existing || d.updated_at > existing.updated_at) {
          dedupMap.set(key, d);
        }
      }
      setDeclinedTasks(Array.from(dedupMap.values()) as CleaningTask[]);

      setLoading(false);
    }
    load();
  }, [refreshKey]);

  const loadAll = async () => {
    const { data } = await supabase
      .from('cleaning_tasks')
      .select(`
        *,
        location:locations(id, name, address),
        cleaner:profiles!cleaner_id(id, full_name)
      `)
      .in('status', ['pending', 'confirmed'])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    setTasks((data || []) as CleaningTask[]);
    setShowAll(true);
  };

  const cards = [
    { label: t('stat_employees'), value: stats.employees, icon: Users, color: 'text-blue-400' },
    { label: t('stat_locations'), value: stats.locations, icon: MapPin, color: 'text-emerald-400' },
    { label: t('stat_today_tasks'), value: stats.todayTasks, icon: Calendar, color: 'text-purple-400' },
    { label: t('stat_pending'), value: stats.pendingTasks, icon: Clock, color: 'text-amber-400' },
    { label: t('stat_completed_today'), value: stats.completedToday, icon: CheckCircle2, color: 'text-emerald-400' },
  ];

  return (
    <div>
      <PageHeader
        title={`${t('hello')}, ${profile?.full_name || 'Admin'}!`}
        description={profile?.tenants?.name || t('cleaning_management')}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-semibold text-foreground">
                {loading ? '-' : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Declined tasks — need replacement */}
      {declinedTasks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-base font-semibold text-red-400">
              {lang === 'et' ? 'Keeldutud — vaja asendajat' : 'Declined — replacement needed'}
            </h2>
          </div>
          <div className="space-y-2">
            {declinedTasks.map(task => (
              <Card key={task.id} className="bg-card border-border border-l-2 border-l-red-400 cursor-pointer" onClick={() => setSelectedTask(task)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {task.cleaner?.full_name || '—'} <span className="text-muted-foreground/60">→</span> {task.location?.name || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.date} · {task.start_time}–{task.end_time}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link to={`/ai-abi`} onClick={(e) => { e.stopPropagation();
                        sessionStorage.setItem('ai_prefill', lang === 'et'
                          ? `${task.cleaner?.full_name || 'Koristaja'} keeldus koristusest kohas ${task.location?.name || 'asukoht'} kuupäeval ${task.date} kell ${task.start_time}-${task.end_time}. Kes on sel ajal vaba?`
                          : `${task.cleaner?.full_name || 'Cleaner'} declined cleaning at ${task.location?.name || 'location'} on ${task.date} ${task.start_time}-${task.end_time}. Who is available at that time?`
                        );
                      }}>
                        <Button size="sm" variant="outline" className="text-violet-400 border-violet-400/30 hover:bg-violet-400/10">
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          {lang === 'et' ? 'Otsi asendajat' : 'Find replacement'}
                        </Button>
                      </Link>
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent pending & confirmed tasks */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">{t('dash_pending_confirmed')}</h2>
          <Link to="/ajakavad">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              {t('nav_schedule')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={Calendar} title={t('dash_no_recent')} />
        ) : (
          <>
            <div className="space-y-2">
              {tasks.map(task => (
                <Card key={task.id} className="bg-card border-border cursor-pointer" onClick={() => setSelectedTask(task)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {task.cleaner?.full_name || '—'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {task.location?.name || '—'}{task.location?.address ? ` · ${task.location.address}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-foreground">{task.date}</div>
                          <div className="text-[11px] text-muted-foreground">{task.start_time}–{task.end_time}</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!showAll && totalCount > INITIAL_LIMIT && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" onClick={loadAll}>
                  {t('dash_view_all')} ({totalCount})
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
