import { FolderKanban, LayoutDashboard, Map } from 'lucide-react';
import { RoleShell } from '@/components/layout/RoleShell';

const nav = [
  { to: '/planner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/planner/map', label: 'Kilimani Map', icon: Map },
  { to: '/planner/cases', label: 'Development Cases', icon: FolderKanban },
];

export function PlannerShell() {
  return <RoleShell navItems={nav} subtitle="Planner · Spatial accountability" />;
}
