import { ClipboardCheck, Home, SlidersHorizontal } from "lucide-react";
import { RoleShell } from "@/components/layout/RoleShell";

const nav = [
  { to: "/developer", label: "My cases", icon: Home, end: true as const },
  { to: "/developer/check", label: "Check a plot", icon: ClipboardCheck },
  {
    to: "/developer/simulator",
    label: "Impact simulator",
    icon: SlidersHorizontal,
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
