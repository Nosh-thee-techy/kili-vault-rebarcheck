import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Logo } from "@/components/brand/Logo";
import { GuidedDemoButton } from "@/components/layout/GuidedDemoButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  calciteIcon?: string;
  end?: boolean;
}

interface RoleShellProps {
  navItems: NavItem[];
  subtitle: string;
  mobileNavItems?: NavItem[];
  fullBleed?: boolean;
  children?: ReactNode;
}

export function RoleShell({
  navItems,
  subtitle,
  mobileNavItems,
  fullBleed = false,
}: RoleShellProps) {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMapView =
    /\/map(\/|$|\?)/.test(location.pathname) ||
    /^\/community\/?$/.test(location.pathname);
  const isPlannerDashboard = location.pathname === "/planner";
  const isPlannerWorkspace =
    isPlannerDashboard || location.pathname.startsWith("/planner/map");
  const isCaseDetail = /\/cases\/[^/]+$/.test(location.pathname);
  const contentBleed = fullBleed || isMapView || isPlannerDashboard || isCaseDetail;
  const bottomNav = mobileNavItems ?? navItems.slice(0, 3);

  const renderNavLink = (item: NavItem, compact: boolean) => {
    const { to, label, icon: Icon, end } = item;
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        title={compact ? label : undefined}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          cn(
            "group relative flex items-center rounded-xl text-sm font-medium transition-all",
            compact ? "justify-center px-2 py-3" : "gap-3 px-3 py-3",
            isActive
              ? "bg-[#f1f2f3] text-charcoal shadow-sm ring-1 ring-inset ring-[#d8dade]"
              : "text-charcoal-muted hover:bg-[#f6f7f8] hover:text-charcoal",
          )
        }
      >
        {item.calciteIcon ? (
          <calcite-icon icon={item.calciteIcon} scale="s" />
        ) : (
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        )}
        {!compact && <span className="truncate">{label}</span>}
        {compact && (
          <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-lg bg-charcoal px-2.5 py-1.5 text-xs font-semibold text-off-white opacity-0 shadow-lift transition-opacity group-hover:opacity-100 lg:group-focus-within:opacity-100 xl:block">
            {label}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebar = (compact: boolean) => (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {!compact && (
        <p
          className={cn(
            "mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal-muted",
          )}
        >
          {user?.title}
        </p>
      )}
      {compact && user?.title && (
        <p
          className={cn(
            "mb-2 truncate px-1 text-center text-[9px] font-bold uppercase tracking-wider text-charcoal-muted",
          )}
          title={user.title}
        >
          {user.role}
        </p>
      )}

      <div className="flex flex-col gap-1">
        {navItems.map((item) => renderNavLink(item, compact))}
      </div>

      <div
        className={cn(
          "mt-auto space-y-2 pt-4",
          compact && "flex flex-col items-center",
        )}
      >
        <GuidedDemoButton
          compact={compact}
          className="border-[var(--calcite-color-border-1)] bg-[var(--calcite-color-background)] text-charcoal hover:border-[var(--calcite-color-border-2)] hover:bg-[var(--calcite-color-foreground-2)]"
        />
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={cn(
            !compact && "w-full justify-start gap-2",
            "text-charcoal-muted hover:bg-[#f6f7f8] hover:text-charcoal",
          )}
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          {!compact && "Sign out"}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="shell-root flex h-full min-h-screen flex-col bg-[var(--calcite-color-background)] text-[var(--calcite-color-text-1)]">
      <header className="sticky top-0 z-40 border-b border-sand bg-[var(--calcite-color-background)]">
        <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-charcoal-muted hover:bg-[#f6f7f8] hover:text-charcoal lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden text-charcoal hover:bg-sand lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
            {isPlannerWorkspace ? (
              <calcite-icon icon="map" scale="l" className="text-charcoal" />
            ) : (
              <Logo size={36} className="rounded-xl shadow-soft" />
            )}
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-base font-semibold leading-tight text-charcoal md:text-lg">
                Kili-Vault
              </h1>
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-charcoal md:text-[11px]">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-xl border border-sand px-2 py-1.5 md:px-3 md:py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand text-xs font-bold text-charcoal">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-charcoal">
                  {user?.name}
                </p>
                <p className="text-xs capitalize text-charcoal-muted">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "shell-sidebar hidden shrink-0 border-r border-sand bg-[var(--calcite-color-background)] transition-[width] duration-300 ease-out lg:flex lg:flex-col",
            sidebarCollapsed ? "w-[4.25rem]" : "w-60",
          )}
        >
          {sidebar(sidebarCollapsed)}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
            <aside className="relative flex h-full w-72 flex-col bg-[var(--calcite-color-background)] shadow-lift">
              <div className="flex items-center justify-between border-b border-sand p-4">
                <span className="font-display font-bold text-charcoal">
                  Menu
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-charcoal-muted hover:bg-[#f6f7f8] hover:text-charcoal"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {sidebar(false)}
            </aside>
          </div>
        )}

        <main
          className={cn(
            "min-h-0 min-w-0 flex-1 pb-20 lg:pb-0",
            contentBleed ? "overflow-hidden" : "overflow-y-auto",
            !contentBleed &&
              "mx-auto w-full max-w-[100rem] px-3 py-5 md:px-5 md:py-6 lg:px-6 lg:py-7",
            contentBleed && "p-0 lg:p-0",
          )}
        >
          <Outlet />
        </main>
      </div>

      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-[var(--calcite-color-background)] lg:hidden",
        )}
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${bottomNav.length}, 1fr)` }}
        >
          {bottomNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold",
                    isActive ? "text-charcoal" : "text-charcoal-muted",
                  )
                }
              >
                {item.calciteIcon ? (
                  <calcite-icon icon={item.calciteIcon} scale="s" />
                ) : (
                  <item.icon className="h-5 w-5" />
                )}
                <span className="truncate px-1">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
