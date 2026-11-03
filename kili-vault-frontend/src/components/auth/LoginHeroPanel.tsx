export function LoginHeroPanel() {
  return (
    <aside className="login-portal-image relative isolate min-h-0 overflow-hidden border-b border-[var(--calcite-color-border-1)] lg:border-b-0 lg:border-r">
      <img
        src="/images/login/footer_image-1.jpg.webp"
        alt="Nairobi city skyline at dusk"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[24%_center]"
      />
      <div className="absolute inset-0 bg-slate-950/25" aria-hidden="true" />

      <div className="relative flex h-full min-h-0 flex-col items-center justify-center px-5 py-4 text-center text-white sm:px-8 lg:px-10 xl:px-14">
        <calcite-chip scale="s" appearance="outline" icon="map">
          Kilimani Ward · Nairobi
        </calcite-chip>
        <h2 className="mt-3 max-w-xl text-lg font-semibold leading-snug sm:mt-4 sm:text-2xl xl:text-3xl">
          Development oversight across a shared map workspace
        </h2>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/90 sm:text-sm">
          Review locations, coordinate evidence, and follow planning cases through their workflow.
        </p>
        <p className="mt-4 text-[11px] text-white/85 sm:mt-6 sm:text-xs">
          Spatial accountability · Kili-Vault
        </p>
      </div>
    </aside>
  );
}
