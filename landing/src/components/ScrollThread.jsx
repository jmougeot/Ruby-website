import { useEffect, useRef } from 'react'
import { S_EXIT_HOLD } from './cave/config'

/**
 * Le fil rouge — barre de progression du VOYAGE (la cinématique du hero), en bas de
 * l'écran. Elle se remplit pendant la traversée et est PLEINE pile au moment de
 * l'émergence sur le lac / la montagne (S_EXIT_HOLD), puis DISPARAÎT : le voyage est
 * fini, le reste de la page est du scroll normal. Rassure sur « combien il reste ».
 *
 * Lit la progression directement sur la section #hero (même formule que Hero), et
 * met à jour en IMPÉRATIF (transform) → aucun re-render React au scroll.
 */
export default function ScrollThread() {
  const wrapRef = useRef(null)
  const fillRef = useRef(null)
  const dotRef = useRef(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const hero = document.getElementById('hero')
      const wrap = wrapRef.current
      const fill = fillRef.current
      const dot = dotRef.current
      if (!hero || !wrap || !fill || !dot) return
      const total = hero.offsetHeight - window.innerHeight
      // pas de cinématique (mobile / reduced-motion → hero d'un seul écran) : on masque
      if (total < window.innerHeight) {
        wrap.style.opacity = '0'
        return
      }
      const p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / total))
      // remplissage : PLEIN pile à l'émergence (la montagne / le lac)
      const fillP = Math.min(1, p / S_EXIT_HOLD)
      fill.style.transform = `scaleX(${fillP})`
      dot.style.left = `${fillP * 100}%`
      // une fois émergé, le voyage est terminé → la barre s'efface
      wrap.style.opacity = p >= S_EXIT_HOLD ? '0' : '1'
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[2px] transition-opacity duration-700"
    >
      {/* rail faible = la longueur totale du voyage */}
      <div className="absolute inset-0 bg-ruby/10" />
      {/* remplissage = la progression */}
      <div
        ref={fillRef}
        className="absolute inset-0 origin-left bg-ruby"
        style={{ transform: 'scaleX(0)', boxShadow: '0 0 8px var(--ruby-glow)' }}
      />
      {/* tête lumineuse à la position courante (présence de Ruby) */}
      <div
        ref={dotRef}
        className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ruby"
        style={{ left: '0%', boxShadow: '0 0 12px 3px var(--ruby-glow)' }}
      />
    </div>
  )
}
