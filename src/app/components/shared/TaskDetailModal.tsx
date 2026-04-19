import { useState } from 'react';
import { MapPin, Clock, User, Building2, FileText, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { useTranslation } from '../../i18n/LanguageContext';
import type { CleaningTask, Room } from '../../types';

interface Props {
  task: CleaningTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskDetailModal({ task, open, onOpenChange, onDelete }: Props) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!task) return null;

  const rooms = (task.property as any)?.rooms as Room[] | undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{t('task_detail')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('task_status')}</span>
              <StatusBadge status={task.status} />
            </div>

            {/* Date & time */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">{task.date}</div>
                <div className="text-sm text-muted-foreground">{task.start_time} – {task.end_time}</div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">{task.location?.name || '—'}</div>
                {task.location?.address && (
                  <div className="text-sm text-muted-foreground">{task.location.address}</div>
                )}
                {(task.location as any)?.floor && (
                  <div className="text-xs text-muted-foreground">{(task.location as any).floor}</div>
                )}
              </div>
            </div>

            {/* Property */}
            {task.property && (
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {(task.property as any).name}
                    {(task.property as any).size_m2 && (
                      <span className="text-muted-foreground font-normal ml-1.5">{(task.property as any).size_m2} m²</span>
                    )}
                  </div>
                  {rooms && rooms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rooms.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 bg-muted border border-input rounded text-[11px] text-muted-foreground">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cleaner */}
            {task.cleaner && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">{task.cleaner.full_name}</div>
                  {task.cleaner.phone && <div className="text-xs text-muted-foreground">{task.cleaner.phone}</div>}
                  {task.cleaner.email && <div className="text-xs text-muted-foreground">{task.cleaner.email}</div>}
                </div>
              </div>
            )}

            {/* Assigned by */}
            {task.assigner && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">{t('task_assigned_by')}</div>
                  <div className="text-sm text-foreground">{task.assigner.full_name}</div>
                </div>
              </div>
            )}

            {/* Notes */}
            {task.notes && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">{t('notes')}</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{task.notes}</div>
                </div>
              </div>
            )}

            {/* Location notes */}
            {task.location?.notes && (
              <div className="bg-muted border border-input rounded p-3">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{t('notes')} — {task.location.name}</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{task.location.notes}</div>
              </div>
            )}

            {/* Duration & completion notes */}
            {task.duration_hours != null && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">{t('cd_duration')}</div>
                  <div className="text-sm font-medium text-foreground">{task.duration_hours}h</div>
                </div>
              </div>
            )}

            {task.completion_notes && (
              <div className="bg-muted border border-input rounded p-3">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{t('cd_completion_notes')}</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{task.completion_notes}</div>
              </div>
            )}

            {/* Clock in/out */}
            {task.clock_in && (
              <div className="text-xs text-muted-foreground border-t border-border pt-3">
                {t('task_clock_in')}: {new Date(task.clock_in).toLocaleString('et-EE')}
                {task.clock_out && <> · {t('task_clock_out')}: {new Date(task.clock_out).toLocaleString('et-EE')}</>}
              </div>
            )}

            {/* Delete button */}
            {onDelete && (
              <div className="border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('delete')}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {onDelete && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t('sched_delete_title')}
          description={t('sched_delete_desc')}
          onConfirm={() => {
            onDelete(task.id);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
