import { useEffect, useRef, useState } from 'react'

/**
 * Orbe « Ruby » fixe en haut au centre : tourne sur elle-même en continu (CSS). À
 * certains moments une notification s'ouvre — l'orbe glisse vers la gauche et une
 * pastille « liquid glass » apparaît à sa droite (largeur animée via max-width).
 *
 * `ready` = la page est visible (loader 3D fermé) → on déclenche le salut PILE à ce
 * moment (pas sous le loader). Pour ajouter d'autres notifs (au scroll, à un event…),
 * appeler setNotif({ message }) au bon moment puis setNotif(null) pour refermer.
 */
export default function RubyOrb({ ready = false }) {
  const [notif, setNotif] = useState(null)
  const [hidden, setHidden] = useState(false)
  const greeted = useRef(false)

  useEffect(() => {
    // salut d'arrivée : une seule fois, juste après que le loader se ferme. Puis on
    // referme la notif et on fait DISPARAÎTRE tout l'orbe (une fois la pastille repliée).
    if (!ready || greeted.current) return
    greeted.current = true
    const open = setTimeout(() => setNotif({ message: 'Bonjour, je suis Ruby' }), 600)
    const close = setTimeout(() => setNotif(null), 5600)
    const hide = setTimeout(() => setHidden(true), 6400) // après le repli (~0.6s)
    return () => {
      clearTimeout(open)
      clearTimeout(close)
      clearTimeout(hide)
    }
  }, [ready])

  return (
    <div className={`ruby-dock${hidden ? ' is-hidden' : ''}`}>
      <div className={`ruby-pill${notif ? ' is-open' : ''}`}>
        <div className="ruby-orb" aria-hidden="true">
          <div className="ruby-orb-spin" />
        </div>
        <div className="ruby-notif" role="status" aria-live="polite">
          <div className="ruby-notif-inner">
            <span className="ruby-notif-msg">{notif?.message ?? ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
