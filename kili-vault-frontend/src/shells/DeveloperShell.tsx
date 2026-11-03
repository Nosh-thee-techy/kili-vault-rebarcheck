import { RoleShell } from "@/components/layout/RoleShell";

const nav = [
  {
    to: "/developer",
    label: "Development Cases",
    calciteIcon: "clipboard",
    end: true as const,
  },
  {
    to: "/developer/check",
    label: "Check a plot",
    calciteIcon: "search",
  },
  {
    to: "/developer/simulator",
    label: "Impact simulator",
    calciteIcon: "analysis",
  },
];

export function DeveloperShell() {
  return (
    <RoleShell
      navItems={nav}
      mobileNavItems={nav}
      subtitle="Developer · Check & comply"
    />
  );
}
