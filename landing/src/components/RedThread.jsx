/**
 * Le fil rouge — colonne vertébrale du scroll.
 * Pour l'instant cantonné au hero ; il sera étendu à toute la page
 * via GSAP ScrollTrigger au moment du plan-séquence (cf. motion.md).
 */
export default function RedThread() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 z-0 -translate-x-1/2"
    >
      <div className="thread h-full" />
    </div>
  )
}
