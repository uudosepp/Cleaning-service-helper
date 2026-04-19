import { Link, Outlet, useLocation } from 'react-router';
import {
  LayoutDashboard, Calendar, CalendarOff, MessageSquare, Bell, User, LogOut,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '../ui/sidebar';
import { MobileBottomNav } from '../shared/MobileBottomNav';
import { Logo } from '../shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';

export function CleanerLayout() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();
  const unread = useUnreadCounts();

  const navItems = [
    { path: '/k', label: t('nav_home'), icon: LayoutDashboard },
    { path: '/k/ajakava', label: t('nav_my_schedule'), icon: Calendar },
    { path: '/k/puudumised', label: t('nav_unavailability'), icon: CalendarOff },
    { path: '/k/vestlus', label: t('nav_chat'), icon: MessageSquare, badge: unread.messages },
    { path: '/k/teavitused', label: t('nav_notifications'), icon: Bell, badge: unread.notifications },
    { path: '/k/profiil', label: t('nav_profile'), icon: User },
  ];

  return (
    <SidebarProvider>
      {/* Desktop sidebar */}
      <Sidebar className="border-r border-border hidden md:flex">
        <SidebarHeader className="border-b border-border px-5 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Logo size={28} />
            <div className="text-base font-semibold text-foreground truncate tracking-tight">
              {profile?.full_name}
            </div>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {profile?.tenants?.name}
          </div>
          <div className="text-[11px] text-muted-foreground/60 mt-1 uppercase tracking-wider">
            {t('role_cleaner')}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map(({ path, label, icon: Icon, badge }) => {
                const isActive = path === '/k'
                  ? location.pathname === '/k'
                  : location.pathname.startsWith(path);
                return (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link to={path} className="relative">
                        <Icon className="w-4 h-4" />
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
        <SidebarFooter className="border-t border-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip={t('nav_sign_out')}>
                <LogOut className="w-4 h-4" />
                <span>{t('nav_sign_out')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {/* Mobile header */}
        <header className="flex h-12 items-center justify-between border-b border-border px-4 md:hidden">
          <span className="text-sm font-medium text-foreground">{profile?.full_name}</span>
          <button
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
          <Outlet />
        </main>
        {/* Mobile bottom nav with badges */}
        <MobileBottomNav items={navItems} />
      </SidebarInset>
    </SidebarProvider>
  );
}
