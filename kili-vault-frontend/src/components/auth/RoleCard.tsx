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
        className="h-20 w-full object-cover sm:h-24"
      />
      <span slot="title" className="flex items-center gap-2">
        <calcite-icon icon={icon} scale="s" />
        {label}
      </span>
      <span slot="subtitle">{subtitle}</span>

      <p className="min-h-10 text-sm leading-relaxed text-[var(--calcite-color-text-2)]">
        {description}
      </p>

      <div slot="footer-start" className="min-w-0">
        <p className="text-[11px] text-[var(--calcite-color-text-3)]">Demo identity</p>
        <p className="truncate text-xs font-medium text-[var(--calcite-color-text-1)]">{persona}</p>
      </div>
      <calcite-button
        slot="footer-end"
        appearance="outline"
        scale="s"
        icon-end="chevron-right"
        onClick={onSelect}
        aria-label={`Open ${label} portal`}
      >
        Open portal
      </calcite-button>
    </calcite-card>
  );
}
