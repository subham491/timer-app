import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '@/features/auth/pages/LoginPage';
import TimerPage from '@/features/timer/pages/TimerPage';
import ProjectsPage from '@/features/projects/pages/ProjectsPage';
import UsersPage from '@/features/users/pages/UsersPage';

import DashboardLayout from '@/app/layouts/DashboardLayout/DashboardLayout';

import ProtectedRoute from './ProtectedRoute';

import ReportsPage from '@/features/reports/pages/ReportsPage';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TimerPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="users" element={<UsersPage />} />
         <Route path="reports" element={<ReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;
