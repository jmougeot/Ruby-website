import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

/** m:ss */
function fmt(s) {
  s = Math.max(0, Math.floor(s || 0))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** Barre de lecture (style « liquid glass ») pour la vidéo démo de la grotte.
 *  La vidéo vit dans une texture 3D (DemoScreen) ; son élément <video> est partagé
 *  ici via `videoRef`. Affichée seulement quand l'écran est plein cadre (`visible`).
 *  - play/pause
 *  - barre de progression cliquable / draggable (seek)
 *  - temps écoulé / durée
 *  On écrit la progression DIRECTEMENT dans le DOM (refs) → pas de re-render/frame. */
export default function VideoControls({ videoRef, visible }) {
  const { t } = useI18n()
  const trackRef = useRef(null)
  const fillRef = useRef(null)
  const knobRef = useRef(null)
  const timeRef = useRef(null)
  const draggingRef = useRef(false)
  const [playing, setPlaying] = useState(false)

  // icône play/pause synchronisée avec l'état RÉEL de l'élément vidéo
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    setPlaying(!v.paused)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [videoRef, visible])

  // boucle de progression (uniquement quand la barre est visible)
  useEffect(() => {
    if (!visible) return
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v && v.duration && !draggingRef.current) {
        const frac = Math.min(1, v.currentTime / v.duration)
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${frac})`
        if (knobRef.current) knobRef.current.style.left = `${frac * 100}%`
        if (timeRef.current) timeRef.current.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, videoRef])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play?.().catch(() => {})
    else v.pause?.()
  }

  const seekFromEvent = (clientX) => {
    const v = videoRef.current
    const track = trackRef.current
    if (!v || !track || !v.duration) return
    const rect = track.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    v.currentTime = frac * v.duration
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${frac})`
    if (knobRef.current) knobRef.current.style.left = `${frac * 100}%`
    if (timeRef.current) timeRef.current.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    draggingRef.current = true
    seekFromEvent(e.clientX)
    const move = (ev) => seekFromEvent(ev.clientX)
    const up = () => {
      draggingRef.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="pointer-events-auto flex w-64 max-w-full items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)] backdrop-blur-md">
        {/* play / pause */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? t('video.pause') : t('video.play')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-night transition-transform hover:scale-105"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>

        {/* barre de progression (clic / drag = seek) */}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          className="relative flex-1 cursor-pointer py-2"
          style={{ touchAction: 'none' }}
        >
          <div className="relative h-[3px] w-full rounded-full bg-white/25">
            <div
              ref={fillRef}
              className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-white"
              style={{ transform: 'scaleX(0)' }}
            />
            <div
              ref={knobRef}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
              style={{ left: '0%' }}
            />
          </div>
        </div>

        {/* temps */}
        <span ref={timeRef} className="w-[4.5rem] shrink-0 text-right text-[11px] tabular-nums text-white/85">
          0:00 / 0:00
        </span>
    </div>
  )
}
