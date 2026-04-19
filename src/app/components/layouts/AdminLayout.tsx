import { Link, Outlet, useLocation } from 'react-router';
import {
  LayoutDashboard, Sparkles, Users, MapPin, Calendar,
  MessageSquare, Bell, Settings, LogOut
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger, useSidebar,
} from '../ui/sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import { Logo } from '../shared/Logo';
import { cn } from '../ui/utils';

function AdminSidebarContent() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const { t } = useTranslation();
  const unread = useUnreadCounts();

  const navItems = [
    { path: '/', label: t('nav_home'), icon: LayoutDashboard },
    { path: '/ai-abi', label: t('nav_ai'), icon: Sparkles, accent: true },
    { path: '/tootajad', label: t('nav_employees'), icon: Users },
    { path: '/asukohad', label: t('nav_locations'), icon: MapPin },
    { path: '/ajakavad', label: t('nav_schedule'), icon: Calendar },
    { path: '/vestlused', label: t('nav_chat'), icon: MessageSquare, badge: unread.messages },
    { path: '/teavitused', label: t('nav_notifications'), icon: Bell, badge: unread.notifications },
    { path: '/seaded', label: t('nav_settings'), icon: Settings },
  ] as const;

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border px-5 py-6">
        <div className="flex items-center gap-3 mb-1">
          <Logo size={28} />
          <div className="text-base font-semibold text-foreground truncate tracking-tight">
            {profile?.tenants?.name || t('cleaning_management')}
          </div>
        </div>
        <div className="text-sm text-muted-foreground truncate">{profile?.full_name}</div>
        <div className="text-[11px] text-muted-foreground/60 mt-0.5 uppercase tracking-wider">{t('role_admin')}</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map(({ path, label, icon: Icon, accent, badge }: any) => {
              const isActive = path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(path);
              return (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={label}
                    className={cn(
                      'h-10 text-[0.9375rem]',
                      accent && !isActive && 'text-violet-400 hover:text-violet-300 dark:text-violet-400 dark:hover:text-violet-300',
                      accent && isActive && 'bg-violet-500/15 text-violet-300 dark:bg-violet-500/15 dark:text-violet-300',
                    )}
                  >
                    <Link to={path} onClick={handleNavClick} className="relative">
                      <Icon className={cn('w-[18px] h-[18px]', accent && 'text-violet-400')} />
                      <span className="flex-1">{label}</span>
                      {badge != null && badge > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { handleNavClick(); signOut(); }} tooltip={t('nav_sign_out')} className="h-10 text-[0.9375rem]">
              <LogOut className="w-[18px] h-[18px]" />
              <span>{t('nav_sign_out')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

export function AdminLayout() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-sidebar-border">
        <AdminSidebarContent />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger />
          <span className="text-base font-medium text-foreground">
            {profile?.tenants?.name || t('cleaning_management')}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
