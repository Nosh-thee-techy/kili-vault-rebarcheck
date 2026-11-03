export interface RoleCardProps {
  label: string;
  subtitle: string;
  persona: string;
  description: string;
  icon: string;
  onSelect: () => void;
  imageSrc: string;
  imageAlt: string;
}

export function RoleCard({
  label,
  subtitle,
  persona,
  description,
  icon,
  onSelect,
  imageSrc,
  imageAlt,
}: RoleCardProps) {
  return (
    <calcite-card className="login-portal-card h-full">
      <img
        slot="thumbnail"
        src={imageSrc}
        alt={imageAlt}
        loading="lazy"
        className="h-10 w-full object-cover sm:h-14 lg:h-20"
      />
      <span slot="title" className="flex items-center gap-2">
        <calcite-icon icon={icon} scale="s" />
        {label}
      </span>
      <span slot="subtitle">{subtitle}</span>

      <p className="line-clamp-2 text-xs leading-relaxed text-[var(--calcite-color-text-2)] sm:text-sm">
        {description}
      </p>

      <div slot="footer-start" className="min-w-0">
        <p className="hidden text-[11px] text-[var(--calcite-color-text-3)] sm:block">Demo identity</p>
        <p className="max-w-24 truncate text-[11px] font-medium text-[var(--calcite-color-text-1)] sm:max-w-32 sm:text-xs">{persona}</p>
      </div>
      <calcite-button
        slot="footer-end"
        appearance="outline"
        scale="s"
        className="max-w-full"
        icon-end="chevron-right"
        onClick={onSelect}
        aria-label={`Open ${label} portal`}
      >
        <span className="hidden sm:inline">Open portal</span>
        <span className="sm:hidden">Open</span>
      </calcite-button>
    </calcite-card>
  );
}
