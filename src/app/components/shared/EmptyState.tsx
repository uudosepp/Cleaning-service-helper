import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-medium text-muted-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-sm">{description}</p>}
    </div>
  );
}
