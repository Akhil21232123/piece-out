# Aurum Atelier

Luxury puzzle brand scrollytelling site — React Three Fiber + GSAP ScrollTrigger + Lenis.

## Stack

- **Next.js** (App Router) + TypeScript
- **@react-three/fiber**, **drei**, **postprocessing**
- **GSAP** + **ScrollTrigger** + **@gsap/react**
- **Lenis** smooth scroll
- **Zustand** scroll progress store

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and scroll through the six-stage sequence.

## Narrative stages

| Progress | Stage | Scene |
|----------|-------|--------|
| 0–20% | Float | Levitating cans + DoF |
| 20–40% | Hero | Central can advances |
| 40–55% | Peel | Lid opens |
| 55–75% | Erupt | Instanced pieces spiral out |
| 75–90% | Assemble | Pieces snap to gallery wall |
| 90–100% | Reveal | Specular sweep + CTA |

## Swapping assets

| Placeholder | Replace with |
|-------------|--------------|
| `createCanLabelTexture()` in `src/lib/textures.ts` | `/public/textures/can-label.jpg` |
| `createPuzzleMasterTexture()` | `/public/textures/puzzle-master.jpg` (4K) |
| `createEnvMapTexture()` / `<Environment map={…}>` | `/public/textures/env.hdr` |
| Procedural can in `CanContainer.tsx` | `useGLTF('/models/can.glb')` |

## Architecture

```
src/
  components/
    canvas/   Scene, CanContainer, PuzzlePieces, GalleryWall
    dom/      ScrollOverlay, HeroContent, ProductCTA
  hooks/      useLenisScroll
  lib/        textures, puzzleMath
  store/      scrollStore
  types/      scroll
```
