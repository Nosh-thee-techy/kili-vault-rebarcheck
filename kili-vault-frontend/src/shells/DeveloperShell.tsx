import { ClipboardCheck, FolderKanban, SlidersHorizontal } from "lucide-react";
import { RoleShell } from "@/components/layout/RoleShell";

const nav = [
  {
    to: "/developer",
    label: "Development Cases",
    icon: FolderKanban,
    calciteIcon: "clipboard",
    end: true as const,
  },
  {
    to: "/developer/check",
    label: "Check a plot",
    icon: ClipboardCheck,
    calciteIcon: "search",
  },
  {
    to: "/developer/simulator",
    label: "Impact simulator",
    icon: SlidersHorizontal,
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
