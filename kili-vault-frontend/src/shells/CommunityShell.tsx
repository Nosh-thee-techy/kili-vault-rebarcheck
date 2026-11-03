import { MapPin, MessageSquarePlus } from 'lucide-react';
import { RoleShell } from '@/components/layout/RoleShell';

const nav = [
  { to: '/community', label: 'Public map', icon: MapPin, end: true },
  { to: '/community/observe', label: 'Submit observation', icon: MessageSquarePlus },
];

export function CommunityShell() {
  return <RoleShell navItems={nav} subtitle="Community · Kilimani observations" />;
}
