import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface Props {
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { session, profile, loading } = useAuth();

  if (loading || (!loading && session && !profile)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' ? '/' : '/k'} replace />;
  }

  return <Outlet />;
}
