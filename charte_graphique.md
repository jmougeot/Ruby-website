# Ruby — Charte Graphique v2

> Document maître de la direction artistique.
> Les 4 autres docs (`design.md`, `motion.md`, `content.md`, `structure.md`) en découlent.

---

## Décisions actées

| Sujet | Décision |
|---|---|
| CTA primaire | **Book a demo** (unique — pas de waitlist) |
| Langue du site | **Anglais** (les briefs restent en français) |
| Vidéo démo | **En production.** Placeholder propre en attendant (cf. `structure.md`) |
| Stack cible | **React + Tailwind + Framer Motion / GSAP** (cf. `motion.md`) |

---

## Principe fondateur

> **Toute abstraction doit retomber sur du concret.**

C'est la règle qui résout la tension du projet. La lumière, le motion, le récit en 4 actes sont l'**enrobage**. Mais chaque moment abstrait doit *atterrir* sur une preuve réelle : un vrai bout d'interface, un vrai chiffre, une vraie phrase d'appel.

```
lumière abstraite  →  PAYOFF concret
```

C'est ce que font Apple et Linear : l'ambiance se résout toujours sur un écran produit net. Une DA qui ne retombe jamais sur du réel est jolie et ne vend pas.

---

## Positionnement

Ruby n'est pas un logiciel. Ruby est une **présence** — l'intelligence qui révèle ce qui était invisible.

Le site doit donner la sensation de :

> voir davantage, comprendre davantage, devenir meilleur.

Et le visiteur, lui, reste **le héros**. Ruby est l'allié, pas la vedette.

---

## Univers visuel

**Mots-clés** — Premium · Futuriste · Intelligent · Élégant · Minimaliste · Ambitieux · Humain

**Mots interdits (en DA)** — Corporate · Cyberpunk · Gaming · Néon · « startup IA générique »

> ⚠️ Nuance : *CRM / Dashboard / Analytics* sont interdits **comme esthétique**, mais ce sont les mots que tes acheteurs tapent sur Google. On les garde dans le SEO et le `<head>` — on les bannit seulement du visuel.

---

## Narratif visuel — les 4 états

Le visiteur traverse un arc émotionnel continu (un seul univers, pas 4 pages) :

```
1. Incertitude  →  2. Révélation  →  3. Clarté  →  4. Maîtrise
```

| État | Section | Émotion | Couleur dominante |
|---|---|---|---|
| Incertitude | Hero | « il y a tant de signaux autour de moi » | Sombre + rouge ténu |
| Révélation | *Ruby finds what you're missing* | « ah, c'est **ça** qu'il fallait voir » | Ruby Red |
| Clarté | *The right signal, at the right moment* | « je sais quoi faire » | Rouge + blanc |
| Maîtrise | *Until great calls become second nature* | sérénité, contrôle | Blanc (rouge intégré au paysage) |

---

## Palette

| Rôle | Valeur | Usage |
|---|---|---|
| Background principal | `#0B0B0D` | Fond du site |
| Background secondaire | `#131316` | Sections intermédiaires |
| Surface produit | `#F8F8F6` | Quand une vraie UI apparaît (contraste fort = clarté) |
| Blanc principal | `#FAFAF7` | Texte |
| Gris secondaire | `#8A8A92` | Texte secondaire |
| **Ruby Red** | `#FF4D5A` | Le signal. Jamais massif. |
| Ruby Glow | `rgba(255,77,90,0.35)` | Halos, le fil rouge |

> **On réduit le langage de lumière à 2 teintes** (au lieu de 4) : le **rouge** (le signal) et le **blanc** (la révélation/clarté). On supprime la « lumière chaude » `#FFF4E6` — un de moins, plus lisible.

### Loi du rouge

Le rouge Ruby représente **toujours** : un insight · une découverte · un signal · une opportunité · une intervention de Ruby.
Le rouge ne représente **jamais** : un danger · une erreur · une alerte.

---

## Typographie

- **Font principale : Geist** (alternative : Inter).
- **Hero** : 64–96 px desktop, poids 500–600.
- **Sous-titres** : 18–22 px, très peu de texte.
- **Règle** : le texte est un élément graphique, pas seulement du contenu — mais il doit quand même être **écrit** (cf. `content.md`).

---

## Layout

- Max-width **1400 px**, très aéré.
- Beaucoup de vide — bien plus que la moyenne des SaaS.
- Peu de cartes, peu de bordures, peu de composants.

---

## Le produit, quand il apparaît

- Fond quasi-blanc `#F8F8F6`, **fort contraste** avec le site sombre → le produit *est* la clarté.
- Sensation visée : **un outil de précision**, pas un dashboard de management.
- Il apparaît à chaque section comme **payoff concret** de l'abstraction (cf. Principe fondateur).

---

## Preuve & confiance

Une page premium n'est pas une page sans preuve. On garde, rendus dans le langage de lumière :

- **2–3 chiffres** clés (à remplir avec des données réelles — placeholders pour l'instant).
- **1 verbatim** client court.
- Une ligne d'**intégrations** (« Works with Zoom · Meet · Teams · Gong · Modjo »).

---

## Accessibilité & mobile (non négociable)

- `prefers-reduced-motion` : version statique (gradients fixes, zéro canvas).
- **Mobile = version simplifiée** : on coupe le canvas lourd, on garde l'ambiance via des dégradés CSS. Le hero doit être fluide sur iPhone avant d'être beau sur 5K.
- Contraste texte AA minimum sur fond sombre.

---

## Règle absolue

Chaque élément du site répond à une seule question :

> **Est-ce que cela renforce l'idée que Ruby permet de voir ce qui était invisible ?**

Si non, l'élément n'a pas sa place.
