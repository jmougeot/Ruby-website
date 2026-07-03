// ─────────────────────────────────────────────────────────────────────────────
// TÉMOIGNAGES CLIENTS — source unique. Lus à DEUX endroits :
//   • Hero (citation courte `short` qui défile en tête, sous le CTA),
//   • section <Testimonials> (citation complète `quote` + carte auteur).
//
//  • short    : extrait punchy (mots réels condensés) pour le défilé du hero.
//  • quote    : verbatim, les mots réels de la personne (on ne traduit pas une
//               citation réelle). Garde les guillemets/apostrophes typographiques.
//  • role     : chaîne simple OU { en, fr } (ex. « SDR chez Sunday »).
//  • photo    : fichier dans /public/team/ (ex. "/team/benjamin.webp"). "" → initiales.
// ─────────────────────────────────────────────────────────────────────────────
export const TESTIMONIALS = [
  {
    name: 'Benjamin Mulumba',
    role: { en: 'SDR at Sunday', fr: 'SDR chez Sunday' },
    short: 'Just following Ruby’s coaching has been a game changer.',
    quote:
      'Being able to just follow Ruby’s coaching without having to do anything from my side (e.g. analysing my own calls) has been a game changer for me. The future of learning is clearly in those kinds of tools that change behaviour directly without producing useless reports.',
    photo: '/team/benjamin.webp',
  },
  {
    name: 'Dimitri Lefort',
    role: 'Business Developer',
    short: 'I changed the way I sell way faster than before.',
    quote:
      'I can already see the evolution. I changed the way I sell way faster than I was changing before, when I was just listening to different advice from my manager and podcasts.',
    photo: '/team/dimitri.webp',
  },
]

// Champ localisé : accepte une chaîne simple OU { en, fr }. La citation reste
// verbatim ; seuls les libellés (ex. rôle) basculent FR/EN.
export const loc = (val, locale) =>
  val && typeof val === 'object' ? val[locale] ?? val.en : val
