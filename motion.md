# Ruby — Motion Design

> Après la vidéo, le motion est l'élément le plus important.
> La plupart des sites font « design statique + quelques animations ». Ruby fait **une histoire racontée par le mouvement**.

---

## Philosophie

Ruby ne doit jamais **popper, rebondir, surgir**.
Ruby doit **révéler**.

Tout le motion est construit autour de cette idée.

### Verbes autorisés
Révéler · Découvrir · Mettre au point · Faire émerger · Guider · Illuminer · Connecter.

### Verbes interdits
Sauter · Exploser · Rebondir · Tourner · Fly-in · Scale-up agressif.

---

## Le fil rouge = la colonne vertébrale du scroll

Le dispositif central (cf. `design.md`). Une ligne rouge continue suit le scroll de haut en bas. Techniquement, c'est elle qui pilote le « plan-séquence » :

- elle **épaissit / pulse** aux moments d'insight (sections 1 et 2),
- elle **s'apaise et se stabilise** dans la maîtrise (section 3),
- elle ne s'interrompt **jamais** entre les sections → sensation d'un seul univers traversé.

> Règle : on ne pense pas « section 1 → section 2 → section 3 ». On pense « on suit le fil ».

---

## Motion par section

### Hero — Incertitude
Très léger mouvement permanent, comme si l'univers respirait. Les signaux dérivent lentement, la lumière pulse à peine. **Pas plus.**

### Section 1 — *Ruby finds what you're missing* (la plus importante)
Le mouvement raconte le **focus** :
```
1. Chaos (beaucoup de signaux)
2. Ruby regarde
3. Un signal émerge
4. Tout le reste s'efface
```
Puis ça atterrit (cf. `design.md`) sur le transcript réel.

### Section 2 — *The right signal, at the right moment*
Motion très **précis**. Le temps ralentit autour de l'instant critique, le signal apparaît, le monde redevient normal. Cinématographique, jamais gadget.

### Section 3 — *Until great calls become second nature*
Le motion **change de nature** : plus de révélation, de la **fluidité**. Les signaux circulent, les connexions se créent, on ressent l'habitude et le contrôle.

---

## Rythme global

```
Début   → lent, mystérieux
Milieu  → plus dynamique, plus de découvertes
Fin     → très calme, maîtrisé, serein
```

---

## Inspirations

| Référence | Pour |
|---|---|
| Apple (Vision Pro) | la précision |
| Promethee | le rythme |
| Arc Browser | la fluidité |
| Linear | la sobriété |

---

## Technique (stack cible : React + Tailwind)

> Recommandation d'implémentation — à valider au moment du build.

- **Base** : Vite + React + Tailwind.
- **Reveals composant** : **Framer Motion** (`whileInView`, variants, `useReducedMotion`).
- **Plan-séquence / fil rouge / sections épinglées** : **GSAP + ScrollTrigger** (pin + scrub pour piloter le fil et les transitions au scroll).
- **Scroll fluide** : **Lenis** (smooth scroll) — avec parcimonie, jamais de scroll-jacking qui bloque l'utilisateur.
- **Fond de signaux** : canvas / WebGL léger **desktop uniquement**.

### Garde-fous (non négociables)
- `prefers-reduced-motion: reduce` → on coupe tout le motion non essentiel, gradients statiques.
- **Mobile** : pas de canvas lourd. Ambiance via dégradés CSS + quelques reveals légers. Fluide d'abord.
- **Budget perf** : viser 60 fps, lazy-load des sections hors écran, le canvas ne tourne pas quand il n'est pas visible.

---

## Règle absolue

Quand quelqu'un regarde le site, il ne doit **pas** penser :

> « Quelle belle animation. »

Il doit penser :

> « Je comprends progressivement quelque chose que je ne voyais pas avant. »

C'est cette sensation de **révélation continue** qui guide tout le motion.
