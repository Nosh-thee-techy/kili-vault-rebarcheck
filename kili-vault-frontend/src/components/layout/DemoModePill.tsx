import { FlaskConical } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';

export function DemoModePill() {
  const { isDemoMode, user } = useAuth();
  if (!isDemoMode || !user) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-clay/30 bg-clay/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-clay-dark">
      <FlaskConical className="h-3 w-3" />
      Demo · {user.role}
    </span>
  );
}
