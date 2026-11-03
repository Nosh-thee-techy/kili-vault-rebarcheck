import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { setApiAuthUser } from '@/lib/api';

export function ApiAuthSync() {
  const { user } = useAuth();

  useEffect(() => {
    setApiAuthUser(user);
  }, [user]);

  return null;
}
