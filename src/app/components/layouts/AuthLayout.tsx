import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Outlet />
    </div>
  );
}
