import { FolderKanban, LayoutDashboard, Map } from "lucide-react";
import { RoleShell } from "@/components/layout/RoleShell";

const nav = [
  {
    to: "/planner",
    label: "Dashboard",
    icon: LayoutDashboard,
    calciteIcon: "dashboard",
    end: true,
  },
  { to: "/planner/map", label: "Kilimani Map", icon: Map, calciteIcon: "map" },
  {
    to: "/planner/cases",
    label: "Development Cases",
    icon: FolderKanban,
    calciteIcon: "clipboard",
  },
];

export function PlannerShell() {
  return (
    <RoleShell navItems={nav} subtitle="Planner · Spatial accountability" />
  );
}
