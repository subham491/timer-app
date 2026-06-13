import { type PropsWithChildren } from 'react';

import { Navigate } from 'react-router-dom';

import { useAppSelector } from '@/store/hooks';

const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
