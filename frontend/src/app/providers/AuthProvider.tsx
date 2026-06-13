import { useEffect, useState, type PropsWithChildren } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { clearUser, setUser } from '@/store/slices/auth/authSlice';
import { fetchMe } from '@/features/auth/api/auth.api';

const AuthProvider = ({ children }: PropsWithChildren) => {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const user = await fetchMe();
      if (!active) return;
      dispatch(user ? setUser(user) : clearUser());
      setReady(true);
    })();
    return () => { active = false; };
  }, [dispatch]);

  if (!ready) return null;
  return <>{children}</>;
};

export default AuthProvider;