export default function Header() {
  // Saut vers une section SOUS le hero (≈1900vh piloté par l'aimant de scroll).
  // Un scroll FLUIDE traverserait la cinématique et l'aimant nous y rebloquerait →
  // on saute donc INSTANTANÉMENT au-delà du hero (p≈1, plus aucun palier armé).
  const skipTo = (e, id) => {
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto' // force l'instantané malgré scroll-behavior: smooth
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY)
    html.style.scrollBehavior = prev
  }

  // Logo = « accueil ». Site mono-page → on remonte en HAUT (début de la cinématique)
  // au lieu de naviguer vers « / » (qui rechargeait toute la page + le bundle 3D).
  const toTop = (e) => {
    e.preventDefault()
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    html.style.scrollBehavior = prev
  }

  return (
    // wrapper plein écran SANS interaction (pointer-events-none) → ne bloque jamais
    // les clics du hero ; seule l'île au centre est cliquable. Fixe + détachée du
    // haut (pt-*) = elle flotte et le décor se floute derrière (liquid glass).
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 md:pt-4">
      <nav className="glass-nav pointer-events-auto flex items-center gap-0.5 rounded-full py-1 pl-4 pr-1">
        <a href="/" onClick={toTop} className="flex items-center gap-2 pr-2 text-[13px] font-semibold tracking-tight text-ink">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-ruby"
            style={{ boxShadow: '0 0 9px 2px var(--ruby-glow)' }}
          />
          Ruby
        </a>
        <a
          href="#integrations"
          onClick={(e) => skipTo(e, 'integrations')}
          className="hidden rounded-full px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:text-ink sm:inline-block"
        >
          Integrations
        </a>
        {/* Blog : page séparée (site Eleventy en /blog/) → vraie navigation, pas un
            saut d'ancre. Toujours visible (destination clé du site). */}
        <a
          href="/blog/"
          className="rounded-full px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          Blog
        </a>
        <a
          href="https://app.rubysignal.com"
          className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-night transition-opacity hover:opacity-90"
        >
          Try it for free
        </a>
      </nav>
    </header>
  )
}
