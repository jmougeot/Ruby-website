// ─────────────────────────────────────────────────────────────────────────────
// DICTIONNAIRE i18n DE LA LANDING — EN (défaut + pré-rendu SEO) / FR.
//
// Source unique de tout le texte visible de la home : header, hero, narration,
// intégrations, CTA, footer, loader, contrôles vidéo et cartes 3D de la grotte.
// Le blog est un site à part (déjà en français) → hors périmètre.
//
// Les valeurs tableaux (hero.analyze, cards.*.title) sont rendues telles quelles :
//  - hero.analyze : statuts qui défilent en boucle devant le 1er panneau,
//  - cards.N.title : 1-2 lignes dessinées au canvas sur la carte 3D (pas de retour
//    à la ligne auto → on découpe nous-mêmes, en gardant les lignes courtes).
// ─────────────────────────────────────────────────────────────────────────────
export const strings = {
  en: {
    // <title> + meta description (mis à jour côté client quand on bascule en FR ;
    // le pré-rendu/les crawlers gardent l'anglais d'index.html).
    'meta.title': 'Ruby — Become the sales rep you know you can be',
    'meta.description':
      "Ruby analyzes your calls, identifies what's holding you back, and helps you improve one habit at a time.",

    // Header
    'nav.integrations': 'Integrations',
    'nav.team': 'Team',
    'nav.blog': 'Blog',
    'nav.cta': 'Try it for free',
    'nav.langSwitch': 'Passer en français',

    // Hero
    'hero.title': 'Become the sales rep you know you can be.',
    'hero.subtitle': 'Automatic feedback. Continuous improvement. More deals.',
    'hero.cta': 'Try it for free',
    'hero.skip': 'Skip intro →',
    'hero.greetHello': 'Hi — I’m Ruby',
    'hero.greetFollow': 'Lost in the dark? Follow me ↓',
    'hero.break': 'Break through ↓',
    'hero.lakeCta': 'Try it for free →',
    'hero.analyze': [
      'Listening to your calls…',
      'Finding what’s holding you back…',
      'Coaching your next improvement…',
    ],

    // Pont narratif (App)
    'overview.0': 'You know you can improve',
    'overview.1': 'The hard part is knowing where to focus',
    'overview.2': 'And finding the time to do something about it.',
    'overview.3': 'Ruby shows you the way forward.',
    'overview.4': 'Turn improvements into habits, and habits into deals.',

    // CTA final
    'cta.title': 'Become the sales rep you know you can be.',
    'cta.button': 'Try it for free',
    'cta.note': 'Free to get started — no credit card.',

    // Intégrations
    'integrations.kicker': 'Integrations',
    'integrations.title': 'Works with the tools you already use.',
    'integrations.subtitle':
      'Ruby plugs into your calls and your stack — no new workflow to learn.',

    // Équipe ({name} est remplacé par le nom du membre)
    'team.kicker': 'Team',
    'team.title': 'The people behind Ruby.',
    'team.subtitle':
      'Two Centrale engineers putting tech to work for sales reps. We built Ruby to close the gap between knowing what to improve and actually making it stick — the problem we lived from the inside.',
    'team.linkedinAria': '{name} on LinkedIn',
    'team.emailAria': 'Email {name}',

    // Footer
    'footer.blog': 'Blog',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.contact': 'Contact',

    // Loader
    'loader.tagline': 'Continuous Sales Coaching',
    'loader.cta': 'Try it for free →',

    // Contrôles vidéo (aria-label)
    'video.play': 'Play',
    'video.pause': 'Pause',

    // Cartes 3D de la grotte (kicker = étape, title = accroche, body = paragraphe)
    'cards.1.kicker': 'Step 1',
    'cards.1.title': ['We target'],
    'cards.1.body':
      'Ruby pinpoints the #1 thing to improve — the one with the most impact on your deals.',
    'cards.2.kicker': 'Step 2',
    'cards.2.title': ['We’ve got your back'],
    'cards.2.body':
      'Fully hands-off: Ruby nudges you at the right moment to help you work on it, call after call.',
    'cards.3.kicker': 'Step 3',
    'cards.3.title': ['We make it stick'],
    'cards.3.body': 'Once the habit is locked in, we move on to the next thing.',
  },

  fr: {
    'meta.title': 'Ruby — Deviens le commercial que tu peux être',
    'meta.description':
      'Ruby analyse tes appels, repère ce qui te freine et t’aide à progresser, une habitude à la fois.',

    'nav.integrations': 'Intégrations',
    'nav.team': 'Équipe',
    'nav.blog': 'Blog',
    'nav.cta': 'Essayer gratuitement',
    'nav.langSwitch': 'Switch to English',

    'hero.title': 'Deviens le commercial que tu peux être.',
    'hero.subtitle': 'Feedback automatique. Progression continue. Plus de ventes.',
    'hero.cta': 'Essayer gratuitement',
    'hero.skip': 'Passer l’intro →',
    'hero.greetHello': 'Salut, moi c’est Ruby',
    'hero.greetFollow': 'Perdu dans le noir ? Suis-moi ↓',
    'hero.break': 'Brise l’écran ↓',
    'hero.lakeCta': 'Essayer gratuitement →',
    'hero.analyze': [
      'On écoute tes appels…',
      'On repère ce qui te freine…',
      'On prépare ta prochaine progression…',
    ],

    'overview.0': 'Tu sais que tu peux progresser',
    'overview.1': 'Le plus dur, c’est de savoir où concentrer tes efforts',
    'overview.2': 'Et de trouver le temps d’agir.',
    'overview.3': 'Ruby te montre la voie.',
    'overview.4': 'Transforme tes progrès en habitudes, et tes habitudes en ventes.',

    'cta.title': 'Deviens le commercial que tu peux être.',
    'cta.button': 'Essayer gratuitement',
    'cta.note': 'Gratuit pour commencer — sans carte bancaire.',

    'integrations.kicker': 'Intégrations',
    'integrations.title': 'Compatible avec les outils que tu utilises déjà.',
    'integrations.subtitle':
      'Ruby se connecte à tes appels et à tes outils — rien de nouveau à apprendre.',

    'team.kicker': 'Équipe',
    'team.title': 'L’équipe derrière Ruby.',
    'team.subtitle':
      'Deux ingénieurs Centrale qui mettent la tech au service des commerciaux. On a construit Ruby pour combler le trou entre savoir quoi améliorer et réussir à l’ancrer — le problème qu’on a vécu de l’intérieur.',
    'team.linkedinAria': '{name} sur LinkedIn',
    'team.emailAria': 'Écrire à {name}',

    'footer.blog': 'Blog',
    'footer.privacy': 'Confidentialité',
    'footer.terms': 'Conditions',
    'footer.contact': 'Contact',

    'loader.tagline': 'Coaching commercial continu',
    'loader.cta': 'Essayer gratuitement →',

    'video.play': 'Lecture',
    'video.pause': 'Pause',

    'cards.1.kicker': 'Étape 1',
    'cards.1.title': ['On cible'],
    'cards.1.body':
      'Ruby repère le point n°1 à travailler — celui qui pèse le plus sur tes deals.',
    'cards.2.kicker': 'Étape 2',
    'cards.2.title': ['On t’accompagne'],
    'cards.2.body':
      'Rien à gérer : Ruby te relance au bon moment pour t’aider à progresser, appel après appel.',
    'cards.3.kicker': 'Étape 3',
    'cards.3.title': ['On ancre'],
    'cards.3.body': 'Une fois l’habitude installée, on passe au point suivant.',
  },
}
