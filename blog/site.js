// Métadonnées du site + helpers — équivalents des filtres Eleventy (.eleventy.js),
// réimplémentés en JS pour la génération statique du blog (cf. scripts/build-blog.mjs).

export const site = {
  name: 'Ruby',
  title: 'Ruby — Le journal de la vente',
  url: 'https://www.rubysignal.com',
  journalName: 'Le journal de Ruby',
  tagline: 'Analyses, méthodes et terrain pour les équipes commerciales.',
  author: "L'équipe Ruby",
  lang: 'fr',
}

// « 12 mai 2026 » (UTC, comme l'ancien filtre dateFr)
export const dateFr = (value) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))

// ISO / RFC 3339 (machine-readable) pour <time> et le flux Atom
export const dateIso = (value) => new Date(value).toISOString()

// Temps de lecture estimé à partir du HTML rendu (≈200 mots/min, min 1)
export const readingTime = (html) => {
  const text = String(html).replace(/<[^>]+>/g, ' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

// « Discovery » → « discovery » (accent-insensible) — identique à l'ancien slugify
export const slugify = (str) =>
  String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// URL absolue (SEO / flux)
export const absoluteUrl = (path, base = site.url) => {
  try {
    return new URL(path, base).toString()
  } catch {
    return path
  }
}

// Échappement XML (flux Atom / sitemap)
export const xmlEscape = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
