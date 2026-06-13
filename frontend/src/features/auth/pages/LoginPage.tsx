import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/slices/auth/authSelectors';
import { startDevLogin, startLogin } from '@/features/auth/api/auth.api';

const LoginPage = () => {
  const authUser = useAppSelector(selectAuthUser);

  useEffect(() => {
    // Only kick off dev-login if we're NOT already authenticated.
    if (import.meta.env.DEV && !authUser) {
      startDevLogin();
    }
  }, [authUser]);

  // Already logged in → go to the app instead of looping back to dev-login.
  if (authUser) {
    return <Navigate to="/dashboard" replace />;
  }

  if (import.meta.env.DEV) return null; // redirecting to dev-login

  return <button onClick={startLogin}>Sign in with Soliton</button>;
};

export default LoginPage;