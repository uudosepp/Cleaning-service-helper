import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { TaskDetailModal } from '../../components/shared/TaskDetailModal';
import { useNotifications } from '../../hooks/useNotifications';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { notificationsService } from '../../services/notifications.service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { supabase } from '@/lib/supabase';
import { cn } from '../../components/ui/utils';
import type { Notification, CleaningTask } from '../../types';

export function CleanerNotifications() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { notifications, loading, refetch, addNotification } = useNotifications();
  // Track notification IDs that should visually appear as "new" during this page visit
  const [visuallyNewIds, setVisuallyNewIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const initialMarkDone = useRef(false);

  useRealtimeSubscription({
    table: 'notifications',
    filter: profile?.id ? `user_id=eq.${profile.id}` : undefined,
    enabled: !!profile?.id,
    onInsert: (payload) => {
      const newNotif = payload.new as Notification;
      addNotification(newNotif);
      // New realtime notifications also get the visual indicator
      if (!newNotif.read) {
        setVisuallyNewIds(prev => new Set(prev).add(newNotif.id));
      }
    },
  });

  // On first load: capture unread IDs for visual display, then mark all read in DB
  useEffect(() => {
    if (!loading && !initialMarkDone.current) {
      initialMarkDone.current = true;
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        setVisuallyNewIds(new Set(unreadIds));
        notificationsService.markAllRead().then(() => refetch());
      }
    }
  }, [loading]);

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title={t('nav_notifications')}
        description={`${visuallyNewIds.size} ${t('notif_unread')}`}
      />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title={t('notif_none')} />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const isNew = visuallyNewIds.has(n.id);
            return (
              <Card
                key={n.id}
                className={cn(
                  'bg-card border-border cursor-pointer',
                  isNew && 'border-l-2 border-l-blue-500'
                )}
                onClick={async () => {
                  if (isNew) {
                    setVisuallyNewIds(prev => { const next = new Set(prev); next.delete(n.id); return next; });
                    notificationsService.markRead(n.id).then(() => refetch());
                  }
                  if (n.reference_id) {
                    const { data } = await supabase
                      .from('cleaning_tasks')
                      .select(`
                        *,
                        location:locations(id, name, address, floor, notes),
                        cleaner:profiles!cleaner_id(id, full_name, phone, email),
                        assigner:profiles!assigned_by(id, full_name)
                      `)
                      .eq('id', n.reference_id)
                      .maybeSingle();
                    if (data) setSelectedTask(data as CleaningTask);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={cn('text-sm', isNew ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                        {n.title}
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleString('et-EE')}
                      </p>
                      {n.reference_id && (
                        <p className="text-xs text-blue-500 mt-1.5">{t('notif_view_details')} →</p>
                      )}
                    </div>
                    {isNew && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      />
    </div>
  );
}
