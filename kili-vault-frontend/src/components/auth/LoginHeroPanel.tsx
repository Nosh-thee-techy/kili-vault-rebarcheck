export function LoginHeroPanel() {
  return (
    <aside className="login-portal-image relative isolate min-h-[220px] overflow-hidden border-b border-[var(--calcite-color-border-1)] lg:min-h-0 lg:border-b-0 lg:border-r">
      <img
        src="/images/login/footer_image-1.jpg.webp"
        alt="Nairobi city skyline at dusk"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[24%_center]"
      />
      <div className="absolute inset-0 bg-slate-950/25" aria-hidden="true" />

      <div className="relative flex h-full min-h-[220px] flex-col justify-end p-5 text-white sm:p-7 lg:min-h-screen lg:p-8 xl:p-10">
        <calcite-chip scale="s" appearance="outline" icon="map">
          Kilimani Ward · Nairobi
        </calcite-chip>
        <h2 className="mt-4 max-w-md text-xl font-semibold leading-snug sm:text-2xl">
          Development oversight across a shared map workspace
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">
          Review locations, coordinate evidence, and follow planning cases through their workflow.
        </p>
        <p className="mt-8 hidden text-xs text-white/75 lg:block">
          Spatial accountability · Kili-Vault
        </p>
      </div>
    </aside>
  );
}
