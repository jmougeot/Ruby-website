// Copy réelle des sections narratives (cf. content.md).
// `background` = segment du dégradé continu noir → clair qui traverse toute
// la page. Chaque segment reprend la couleur de fin du précédent (continuité).
// `tone` = schéma de texte (dark = texte clair sur fond sombre, light = l'inverse).
export const sections = [
  {
    id: 'reveal',
    eyebrow: 'Revelation',
    title: "Ruby finds what you're missing.",
    copy: "Every call is full of signals you'll never catch on your own — a hesitation, an objection you skipped, a buying signal that slipped by. Ruby catches them all.",
    payoff: 'real transcript + highlighted insight',
    tone: 'dark',
    background: 'linear-gradient(to bottom, #0b0b0d, #17171c)',
  },
  {
    id: 'signal',
    eyebrow: 'Clarity',
    title: 'The right signal, at the right moment.',
    copy: "Ruby doesn't drown you in data. It surfaces the one thing that matters, exactly when it matters — so you always know your next move.",
    payoff: 'coaching card anchored to a timecode',
    tone: 'dark',
    background: 'linear-gradient(to bottom, #17171c, #232330)',
  },
  {
    id: 'mastery',
    eyebrow: 'Mastery',
    title: 'Until excellence becomes a habit',
    copy: "Ruby turns scattered feedback into a daily habit.",
    payoff: 'progress curve (before / after)',
    tone: 'light',
    // la grande bascule vers la clarté se joue ici, sur une bande de hauteur
    // FIXE (px) pour rester identique quelle que soit la taille d'écran.
    background:
      'linear-gradient(to bottom, #232330 0px, #cfcfce 100px, #f8f8f6 190px)',
  },
]
