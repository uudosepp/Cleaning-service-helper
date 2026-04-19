import { cn } from '../ui/utils';
import { TASK_STATUS_COLORS, type TaskStatus } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

const statusKeys: Record<TaskStatus, TranslationKey> = {
  pending: 'status_pending',
  confirmed: 'status_confirmed',
  declined: 'status_declined',
  in_progress: 'status_in_progress',
  completed: 'status_completed',
  cancelled: 'status_cancelled',
};

interface Props {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border',
        TASK_STATUS_COLORS[status],
        className
      )}
    >
      {t(statusKeys[status])}
    </span>
  );
}
