import { RoleShell } from "@/components/layout/RoleShell";

const nav = [
  {
    to: "/planner",
    label: "Dashboard",
    calciteIcon: "dashboard",
    end: true,
  },
  { to: "/planner/map", label: "Kilimani Map", calciteIcon: "map" },
  {
    to: "/planner/cases",
    label: "Development Cases",
    calciteIcon: "clipboard",
  },
];

export function PlannerShell() {
  return (
    <RoleShell navItems={nav} subtitle="Planner · Spatial accountability" />
  );
}
