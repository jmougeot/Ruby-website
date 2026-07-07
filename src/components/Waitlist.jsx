// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST — capture d'email à la place de l'ancienne redirection app.rubysignal.com.
//
// Le site est statique (GitHub Pages) → aucun backend : les inscriptions partent
// vers Formspree (POST JSON). Trois pièces :
//   1. WaitlistProvider / useWaitlist — état d'ouverture de la modale, partagé par
//      tous les CTA (header, hero, loader). Le contexte traverse les portails React
//      (loader + modale sont portés sur <body>), donc useWaitlist() marche partout.
//   2. WaitlistForm — champ email + envoi (idle → sending → success / error).
//      Réutilisé tel quel dans la modale ET dans le CTA final inline (variant).
//   3. WaitlistModal — la modale (portail + AnimatePresence), montée une fois dans App.
//
// Ce module ne doit JAMAIS importer three : il est tiré dans le bundle eager
// (header, hero, footer…) → cf. mémoire « keep eager bundle three-free ».
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../i18n'

// Endpoint Formspree (gratuit) qui reçoit les inscriptions de la waitlist.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xaqgorjg'

const ease = [0.22, 1, 0.36, 1]

const WaitlistContext = createContext({ isOpen: false, open: () => {}, close: () => {} })

export function WaitlistProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  return (
    <WaitlistContext.Provider value={{ isOpen, open, close }}>{children}</WaitlistContext.Provider>
  )
}

export function useWaitlist() {
  return useContext(WaitlistContext)
}

/**
 * Formulaire email réutilisable.
 *  - variant="modal"  → empilé (label visible au-dessus), pour la carte claire.
 *  - variant="inline" → ligne (champ + bouton côte à côte), pour le CTA final.
 *  - onDark → champ « verre sombre » + textes de statut clairs (fond sombre,
 *    ex. hero téléphone) au lieu du champ blanc pensé pour les surfaces claires.
 */
export function WaitlistForm({ variant = 'modal', autoFocus = false, onDark = false }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error(`Formspree a répondu ${res.status}`)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className={`text-[15px] font-medium ${onDark ? 'text-ink' : 'text-night'}`} role="status" aria-live="polite">
        {t('waitlist.success')}
      </p>
    )
  }

  const sending = status === 'sending'
  const inline = variant === 'inline'

  return (
    <form
      onSubmit={handleSubmit}
      className={inline ? 'mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row' : 'flex flex-col gap-3'}
      noValidate
    >
      <input
        type="email"
        name="email"
        required
        autoFocus={autoFocus}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('waitlist.placeholder')}
        aria-label={t('waitlist.placeholder')}
        className={`flex-1 rounded-full border outline-none transition-colors focus:border-ruby ${
          onDark
            ? 'border-white/15 bg-white/10 px-4 py-2.5 text-[14px] text-ink backdrop-blur-md placeholder:text-ink/40'
            : 'border-night/15 bg-white px-5 py-3.5 text-[15px] text-night placeholder:text-night/40'
        }`}
      />
      <button
        type="submit"
        disabled={sending}
        className={`rounded-full bg-ruby font-medium text-white shadow-[0_0_40px_-6px_var(--ruby-glow)] transition-shadow hover:shadow-[0_0_52px_-4px_var(--ruby-glow)] disabled:opacity-60 ${
          onDark ? 'self-center px-5 py-2 text-[13px]' : 'px-7 py-3.5 text-[15px]'
        }`}
      >
        {sending ? t('waitlist.sending') : t('waitlist.submit')}
      </button>
      {status === 'error' && (
        <p className="text-sm text-ruby sm:basis-full" role="alert">
          {t('waitlist.error')}
        </p>
      )}
    </form>
  )
}

/** Modale globale — montée une seule fois (dans App). Ouverte par n'importe quel CTA. */
export function WaitlistModal() {
  const { isOpen, close } = useWaitlist()

  // verrou du scroll + fermeture à Échap quand la modale est ouverte.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, close])

  // SSR / pré-rendu : pas de document → on ne porte rien (la modale est purement client).
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* fond cliquable → ferme */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <ModalCard close={close} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ModalCard({ close }) {
  const { t } = useI18n()
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t('waitlist.title')}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ duration: 0.35, ease }}
      className="relative z-10 w-full max-w-md rounded-3xl bg-[#f8f8f6] p-8 text-center shadow-2xl"
    >
      <button
        type="button"
        onClick={close}
        aria-label={t('waitlist.close')}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-night/40 transition-colors hover:bg-night/5 hover:text-night"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <h2 className="text-[clamp(1.4rem,4vw,1.9rem)] font-medium tracking-tight text-night">
        {t('waitlist.title')}
      </h2>
      <p className="mx-auto mt-2 mb-6 max-w-xs text-sm text-night/55">{t('waitlist.subtitle')}</p>
      <WaitlistForm variant="modal" autoFocus />
    </motion.div>
  )
}
