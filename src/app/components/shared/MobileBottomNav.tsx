import { Link, useLocation } from 'react-router';
import { LucideIcon } from 'lucide-react';
import { cn } from '../ui/utils';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface Props {
  items: NavItem[];
}

export function MobileBottomNav({ items }: Props) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border flex md:hidden z-50 safe-area-bottom">
      {items.map(({ path, label, icon: Icon, badge }) => {
        const isActive = path === location.pathname ||
          (path !== '/k' && path !== '/' && location.pathname.startsWith(path));
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] relative transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground/60'
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
