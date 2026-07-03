# Ruby — Charte Graphique (forme)

> Document maître du **système visuel**. Ici on ne parle que de **forme** :
> couleur, typo, espace, matière, mouvement, composants.
>
> Le **fond** (copy, CTA, titres, narratif, chiffres) vit ailleurs :
> `content.md` (copy) · `structure.md` (blueprint) · `design.md` (concept visuel).
> Règle : **aucune décision de contenu dans ce fichier.**

---

## 1. Principe de forme

Un seul mot gouverne toute la forme : **révéler**.

- On passe de l'**obscurité** (`night`) à la **clarté** (`surface`) — jamais l'inverse.
- Le **rouge** est un accent ponctuel, jamais une surface.
- Tout est **aéré, lisse, premium** : peu d'éléments, beaucoup de vide, des matières (verre, gemme) plutôt que des aplats plats.

> Sensation visée : un **outil de précision** qui s'éclaire progressivement — pas un dashboard chargé.

---

## 2. Palette

Tokens définis dans `landing/src/index.css` (`@theme`). **Source de vérité unique.**

| Token | Valeur | Rôle |
|---|---|---|
| `night` | `#0B0B0D` | Fond principal (obscurité) |
| `elevated` | `#131316` | Fond secondaire / surfaces intermédiaires |
| `surface` | `#F8F8F6` | Fond clair quand la **clarté** s'installe (contraste fort) |
| `ink` | `#FAFAF7` | Texte principal |
| `muted` | `#8A8A92` | Texte secondaire |
| `ruby` | `#FF4D5A` | **L'accent.** Le signal. Jamais massif. |
| `--ruby-glow` | `rgba(255,77,90,0.35)` | Halos, glows, ombres rouges |

### Dégradés autorisés (transition obscurité → clarté)

La page descend en **un seul dégradé continu** `night → clair`. Stops de liaison admis :
`#0B0B0D → #17171C → #232330 → #CFCFCE → #F8F8F6`.
Ces stops intermédiaires **n'existent que dans le dégradé** — ils ne sont jamais des couleurs de composant.

### Teintes de la gemme (réservées au rubis)

Le rubis (objet de marque + curseur 3D) utilise sa propre rampe, **exclusivement pour la gemme** :
`#FF8A93` (highlight) → `#FF4D5A` → `#C41230` → `#6E0A1C` (ombre profonde).

### Loi du rouge

Le rouge représente **toujours** : un signal · une découverte · une opportunité · la présence de Ruby.
Le rouge ne représente **jamais** : un danger · une erreur · une alerte.

---

## 3. Typographie

- **Police** : **Geist** (300–700), fallback **Inter**, puis system-ui. Chargée dans `index.html`.
- **Poids par défaut : 500 (medium).** On n'utilise quasiment jamais le bold lourd.
- **Tracking serré** sur les grands titres (`tracking-tight`), **lâche** sur les eyebrows (`0.2em`).
- Le texte est un **élément graphique** : peu de mots, très aéré, `text-balance` sur les titres.

### Échelle type (fluide, `clamp`)

| Rôle | Taille | Poids | Détails |
|---|---|---|---|
| H1 (hero) | `clamp(2.5rem, 6.5vw, 4.75rem)` | 500 | `leading-1.05`, `tracking-tight` |
| H2 (section) | `clamp(2rem, 4.5vw, 3rem)` | 500 | `leading-1.1` |
| Titre CTA | `clamp(2rem, 5vw, 3.5rem)` | 500 | `tracking-tight` |
| Eyebrow | `0.75rem` | 500 | `UPPERCASE`, `tracking-0.2em` |
| Corps | `1rem`–`1.125rem` | 400 | `leading-relaxed`, couleur `muted` |
| Phrase d'ambiance | `clamp(1.5rem, 3.2vw, 2.25rem)` | 500 | `leading-snug` |

---

## 4. Layout & espacement

- **Largeur max : 1400 px** (`max-w-[1400px]`). Colonnes de texte plus étroites : `max-w-2xl` / `max-w-3xl`.
- **Beaucoup de vide** — bien plus que la moyenne des SaaS. Sections en `py-32` → `py-52`.
- **Centré** par défaut, lecture au calme.
- Peu de cartes, peu de bordures, peu de composants à l'écran en même temps.

### Rayons & bordures

| Élément | Rayon | Bordure |
|---|---|---|
| Pills / boutons / nav / orbe | `rounded-full` | verre : `1px rgba(255,255,255,.14–.22)` |
| Cartes / cadres produit | `rounded-2xl` | `1px` sur fond sombre `white/10`, sur fond clair `night/10` |

---

## 5. Matières signature

Trois matières définissent la marque. Elles priment sur les aplats plats.

### a. Liquid glass

Le langage de surface des éléments flottants (header, bulles, orbe). Recette (cf. `.glass-nav`, `.ruby-pill`, `.speech-pill`) :

```
background : dégradé blanc translucide 135° (≈ .10 → .03)
backdrop-filter : blur(16–20px) saturate(1.6)
border : 1px rgba(255,255,255,.14–.22)
box-shadow : ombre portée douce + inset top (arête de verre) + inset bottom
```

> Le verre n'a de sens que **posé/fixe** : le décor défile derrière et se floute à travers. Jamais de verre sur un fond uni statique.

### b. La gemme (rubis)

Disque glossy construit en `radial-gradient` (highlight blanc décentré + rampe rubis), avec inset shadows (relief) et glow rouge externe. Décliné en 3 tailles : objet de marque (`.gem`), curseur de grotte (`.cave-gem`), micro-orbe dans les pills (`.pill-orb`). **Respire** en continu (cf. §6).

### c. L'orbe

Variante animée de la gemme : une texture rubis (`ruby-orb.webp`) qui **tourne** sous un masque circulaire, surmontée d'un reflet spéculaire **fixe**. C'est la présence vivante de Ruby dans l'UI.

### Le fil rouge

Fine ligne `ruby` (1px) avec glow, qui matérialise la présence de Ruby de haut en bas (`.thread`, variante douce `.thread-soft`). **Dispositif signature** : il doit se lire comme **continu**, jamais comme un ornement isolé.

### Texture

- **Grain** : bruit fractal très subtil (`opacity ~0.05`, `mix-blend overlay`) pour casser les aplats — effet « rendu », jamais visible au premier regard.
- **Glows** : halos `blur-[110px]` en `ruby-glow` ou blanc très faible, posés derrière le contenu.

---

## 6. Mouvement

> Après la matière, le motion est l'élément le plus important. Ruby **révèle**, ne **poppe** jamais.

### Verbes
**Autorisés** : révéler · découvrir · faire émerger · guider · illuminer · respirer · connecter.
**Interdits** : sauter · exploser · rebondir · tourner brusquement · fly-in · scale-up agressif.

### Constantes globales

| Réglage | Valeur | Usage |
|---|---|---|
| **Easing maître** | `cubic-bezier(0.22, 1, 0.36, 1)` | **Toutes** les transitions/reveals |
| Reveal | `opacity 0→1` + `translateY 18–24px → 0` | apparition au scroll (`whileInView`) |
| Durée reveal | `0.85–0.9 s` | — |
| Stagger | `0.12 s` | enchaînement des items d'un bloc |
| Respiration | `5–7 s`, `ease-in-out`, boucle | gemme/orbe/glow (scale ≤ 1.05, opacité douce) |

### Règles

- **Subtilité** : on ressent le mouvement **avant** de le remarquer. Pas de néon, pas de particules partout, pas d'« effet IA 2023 ».
- **Rythme** : lent et mystérieux au début → plus vivant au milieu → calme et maîtrisé à la fin.
- **Pas de scroll-jacking** qui bloque l'utilisateur ; le smooth scroll reste discret.

---

## 7. Accessibilité & responsive (non négociable)

- **`prefers-reduced-motion: reduce`** → version statique : gradients fixes, animations/transitions coupées, zéro canvas 3D, `scroll-behavior: auto`.
- **Mobile = version simplifiée** : on **coupe le canvas/3D lourd**, on garde l'ambiance via dégradés CSS + quelques reveals légers. **Fluide d'abord, beau ensuite.**
- **Contraste texte AA minimum** sur fond sombre comme sur fond clair.
- `color-scheme: dark` déclaré.

---

## 8. À ne pas faire

- Rouge en aplat de surface (fond de section, grande zone).
- Verre posé sur un fond uni immobile (l'effet n'existe que sur décor qui défile).
- Bold lourd, titres serrés sans `text-balance`, murs de texte.
- Halos géants, néons, particules, animations qui « font le show ».
- Couleurs de composant prises hors des tokens du §2.

> Référence d'implémentation : tous les tokens et matières vivent dans
> `landing/src/index.css`. Ce fichier-ci en est la **spécification de forme**.
