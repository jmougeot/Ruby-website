// ─────────────────────────────────────────────────────────────────────────────
// i18n CÔTÉ CLIENT (sans dépendance, sans three) — FR si le visiteur est en France,
// EN sinon. Le site est statique (GitHub Pages) → AUCUNE détection serveur possible,
// tout se décide dans le navigateur :
//   1. choix explicite mémorisé (bouton EN/FR) → localStorage,
//   2. sinon préférence du navigateur : FR si navigator.languages contient « fr »,
//      sinon EN — une langue de navigateur explicite prime sur le fuseau,
//   3. fuseau Europe/Paris UNIQUEMENT si le navigateur n'annonce aucune langue
//      (cas rare ; proxy « physiquement en France »).
//
// SSR / pré-rendu : pas de `window` → detectLocale() renvoie 'en'. Le pré-rendu SEO
// reste donc anglais (cf. scripts/prerender-home.mjs), et au montage createRoot()
// REMPLACE #root (pas d'hydratation) → la bascule FR se fait sans risque de mismatch.
//
// Ce module ne doit JAMAIS importer three : il est tiré dans le bundle eager (header,
// hero, footer…) → cf. mémoire « keep eager bundle three-free ».
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { strings } from './strings'

export const SUPPORTED = ['en', 'fr']
const STORAGE_KEY = 'ruby-locale'

/** Locale à appliquer au 1er rendu. 'en' côté serveur / pré-rendu (pas de window). */
export function detectLocale() {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    /* localStorage indisponible (mode privé strict…) → on continue sur l'heuristique */
  }
  // La préférence de langue du navigateur est un signal explicite → elle prime.
  // FR si l'une des langues commence par « fr », sinon EN (navigateur en anglais).
  const navLangs = (navigator.languages?.length ? navigator.languages : [navigator.language]).filter(Boolean)
  if (navLangs.length) {
    return navLangs.some((l) => l.toLowerCase().startsWith('fr')) ? 'fr' : 'en'
  }
  // Aucune langue exploitable (rare) → fuseau Europe/Paris comme proxy « en France ».
  try {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Paris') return 'fr'
  } catch {
    /* Intl/timeZone indisponible → on retombe sur l'anglais */
  }
  return 'en'
}

/** Traduction pure (hors React) — utilisée dans le canvas 3D (cartes de la grotte)
 *  où l'on passe la locale en prop plutôt que par le contexte. Repli EN puis clé. */
export function translate(locale, key) {
  return strings[locale]?.[key] ?? strings.en[key] ?? key
}

const LocaleContext = createContext({ locale: 'en', setLocale: () => {}, t: (k) => k })

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLocale)

  const setLocale = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* persistance impossible → on garde le choix le temps de la session */
    }
  }, [])

  // synchronise <html lang>, <title> et la meta description avec la locale courante
  // (le pré-rendu sert l'anglais ; côté client on reflète la langue réelle affichée).
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = locale
    const title = translate(locale, 'meta.title')
    if (typeof title === 'string') document.title = title
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', translate(locale, 'meta.description'))
  }, [locale])

  const t = useCallback((key) => translate(locale, key), [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  )
}

export function useI18n() {
  return useContext(LocaleContext)
}
