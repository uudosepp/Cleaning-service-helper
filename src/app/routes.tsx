import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthLayout } from './components/layouts/AuthLayout';
import { AdminLayout } from './components/layouts/AdminLayout';
import { CleanerLayout } from './components/layouts/CleanerLayout';

// Auth pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ResetPassword } from './pages/auth/ResetPassword';

// Admin pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminEmployees } from './pages/admin/Employees';
import { AdminLocations } from './pages/admin/Locations';
import { AdminSchedule } from './pages/admin/Schedule';
import { AdminAIChat } from './pages/admin/AIChat';
import { AdminChat } from './pages/admin/Chat';
import { AdminNotifications } from './pages/admin/Notifications';
import { AdminSettings } from './pages/admin/Settings';

// Cleaner pages
import { CleanerDashboard } from './pages/cleaner/Dashboard';
import { CleanerMySchedule } from './pages/cleaner/MySchedule';
import { CleanerChat } from './pages/cleaner/Chat';
import { CleanerNotifications } from './pages/cleaner/Notifications';
import { CleanerProfile } from './pages/cleaner/Profile';
import { CleanerUnavailability } from './pages/cleaner/Unavailability';

export const router = createBrowserRouter([
  // Public routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/reset-password', element: <ResetPassword /> },
    ],
  },

  // Admin routes
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: <AdminDashboard /> },
          { path: '/tootajad', element: <AdminEmployees /> },
          { path: '/asukohad', element: <AdminLocations /> },
          { path: '/ajakavad', element: <AdminSchedule /> },
          { path: '/ai-abi', element: <AdminAIChat /> },
          { path: '/vestlused', element: <AdminChat /> },
          { path: '/vestlused/:cleanerId', element: <AdminChat /> },
          { path: '/teavitused', element: <AdminNotifications /> },
          { path: '/seaded', element: <AdminSettings /> },
        ],
      },
    ],
  },

  // Cleaner routes
  {
    element: <ProtectedRoute allowedRoles={['cleaner']} />,
    children: [
      {
        element: <CleanerLayout />,
        children: [
          { path: '/k', element: <CleanerDashboard /> },
          { path: '/k/ajakava', element: <CleanerMySchedule /> },
          { path: '/k/vestlus', element: <CleanerChat /> },
          { path: '/k/puudumised', element: <CleanerUnavailability /> },
          { path: '/k/teavitused', element: <CleanerNotifications /> },
          { path: '/k/profiil', element: <CleanerProfile /> },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/login" replace /> },
]);
