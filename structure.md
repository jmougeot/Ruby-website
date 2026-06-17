# Ruby — Structure de la landing (blueprint)

> Le blueprint buildable : ordre des sections, ce que contient chacune, et la stack.
> Synthèse de `charte_graphique.md` (DA) · `design.md` (visuel) · `motion.md` (mouvement) · `content.md` (copy).
> Périmètre : **landing page uniquement** (pas le blog).

---

## Ordre des sections

```
0. Header (sticky, minimal)
1. Hero ...................... Incertitude   — vidéo + Book a demo
2. Ruby finds what you're missing ... Révélation  — transcript réel + insight rouge
3. The right signal, at the right moment ... Clarté — carte de coaching ancrée
4. Until great calls become second nature ... Maîtrise — courbe de progression
5. Proof .................... chiffres + verbatim
6. How it works ............. 3 étapes compactes
7. Final CTA ................ écho du hero + Book a demo
8. Footer
```

Le **fil rouge** (cf. `design.md` / `motion.md`) traverse 1 → 7 sans interruption.

---

## Détail par section

### 0. Header
Logo · un lien (Product / How it works) · **Book a demo**. Transparent sur le hero, fond `#0B0B0D` au scroll.

### 1. Hero — Incertitude
- H1 « Become an AI-augmented sales rep. » + sous-titre (cf. `content.md`).
- **Book a demo** (primaire) + « See how it works ↓ » (repère de scroll).
- **Vidéo démo** ~60–70% hauteur → **placeholder** pour l'instant (cf. ci-dessous).
- Ligne intégrations + logos clients.
- Fond : signaux qui dérivent, fil rouge naissant.

### 2. Révélation — *Ruby finds what you're missing*
Chaos de signaux → un point s'allume → le reste s'efface → **atterrit sur un transcript réel** avec insight surligné rouge.

### 3. Clarté — *The right signal, at the right moment*
Le temps ralentit sur un instant critique → **atterrit sur une carte de coaching** ancrée à un timecode.

### 4. Maîtrise — *Until great calls become second nature*
Signaux dispersés → connectés (constellation) → **atterrit sur une courbe de progression** (avant/après).

### 5. Proof
2–3 chiffres + 1 verbatim, dans le langage de lumière. *(Données = placeholders.)*

### 6. How it works
3 étapes : Connect → See what you're missing → Get better every day.

### 7. Final CTA
« Become an AI-augmented sales rep. » + **Book a demo**.

### 8. Footer
Logo · Privacy · Terms · Contact. Sobre.

---

## Le placeholder vidéo (« le trou »)

Tant que la vidéo n'est pas livrée, le trou doit paraître **intentionnel**, pas cassé :

- Panneau sombre encadré (`#0B0B0D` → `#131316`), ratio 16:9, coins arrondis.
- Le **fil rouge** le traverse, léger glow `rgba(255,77,90,0.35)`.
- Respiration très lente (ou statique si `prefers-reduced-motion`).
- Pas de bouton play factice, pas de « video coming soon ». Juste un cadre premium qui respire.

---

## Stack cible

> Pivot depuis l'Eleventy actuel. **Non échafaudé pour l'instant** — à lancer quand on passe au build.

| Couche | Choix |
|---|---|
| Build | Vite + React |
| Styles | Tailwind (tokens = palette de `charte_graphique.md`) |
| Reveals | Framer Motion (`whileInView`, `useReducedMotion`) |
| Plan-séquence / fil rouge | GSAP + ScrollTrigger (pin + scrub) |
| Smooth scroll | Lenis (léger, jamais de scroll-jacking) |
| Fond signaux | canvas/WebGL **desktop only** |

**Tokens Tailwind à définir** : `ruby` `#FF4D5A`, `rubyGlow` `rgba(255,77,90,.35)`, `bg` `#0B0B0D`, `bg2` `#131316`, `surface` `#F8F8F6`, `ink` `#FAFAF7`, `muted` `#8A8A92`. Font : Geist (fallback Inter).

---

## Responsive & accessibilité

- **Mobile = version simplifiée** : pas de canvas lourd, ambiance en dégradés CSS, reveals légers. Fluide avant tout.
- `prefers-reduced-motion` : statique, zéro scrub.
- Contraste AA min sur fond sombre.

---

## Ordre de construction recommandé

> « Le temps n'est pas un problème » → mais on dérisque quand même.

1. **Hero parfait** (copy + placeholder vidéo + fil rouge naissant + intégrations). C'est 80% de la valeur.
2. **Section 2** (la révélation) avec son payoff transcript réel.
3. Sections 3 → 4, puis Proof / How it works / CTA.
4. Polissage motion (plan-séquence, scrub) en dernier, une fois le contenu figé.

Raison : on valide que le hero porte avant d'investir dans la chorégraphie complète.

---

## Reste à fournir (cf. `content.md`)

- [ ] Vidéo démo (en prod).
- [ ] Vrais chiffres + 1 verbatim client.
- [ ] Logos clients (sinon on retire la ligne).
- [ ] Confirmer la langue (hypothèse : site EN, briefs FR).
