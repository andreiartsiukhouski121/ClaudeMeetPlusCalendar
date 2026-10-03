/**
 * The hero banner at the top of the dashboard. A **server** component: fixed text, no state.
 *
 * No control. `patterns.md` gives the banner the page's single primary action, but that action
 * already exists — `<Button type="submit">Create meeting</Button>`, addressed by name by
 * `HD-FN-06`, `HD-FN-07`, `HD-FN-09` and `HD-FN-14`. A second prominent control would be a second
 * primary action (`ADR-0026` §6.6), so the banner is eyebrow + heading only.
 *
 * No `opacity-80` on the eyebrow, unlike `patterns.md:87`: every ratio in `ADR-0026` is computed
 * from the OKLCH values, and an opacity would make the rendered ratio depend on a number nobody
 * computed.
 */
export function HeroBanner() {
  return (
    <section className="bg-accent text-accent-foreground flex flex-col items-start gap-4 rounded-3xl p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-wide uppercase">Your schedule</p>
      <h2 className="max-w-[28ch] text-2xl font-bold tracking-tight">
        Everything you have planned, in one place.
      </h2>
    </section>
  );
}
