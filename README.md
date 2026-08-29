# Pallanguzhi

A single-player, browser-based implementation of **Pallanguzhi** (பல்லாங்குழி) — the traditional South Indian mancala-style board game — played against a computer AI opponent.

## About the game

Pallanguzhi is played on a wooden board with 14 pits (7 per side) and a store of small seeds/shells (cowries, tamarind seeds, or similar counters, traditionally). Two players take turns sowing seeds from a pit, one at a time, into subsequent pits around the board. Seeds are captured under specific conditions as the sowing lands in certain pits, and the player who collects the most seeds by the end of the game wins.

This project brings that game to the browser as a single-player experience: you play against an AI, with the traditional rules encoded as the game engine. See [RULES.md](RULES.md) for the exact ruleset implemented.

## Tech stack

- **React** — UI
- **TypeScript** — game logic and components
- **Vite** — dev server and build tooling
- **Vitest** + **React Testing Library** — unit/integration tests
- No backend — runs entirely client-side, locally or as a static deploy

## Project structure

```
src/
  game/            # pure game logic — framework-agnostic, no React
    gameState.ts   # data model + read-only queries (pits, valid moves)
    engine.ts       # makeMove() — the one place rules are decided
    ai/
      AIController.ts   # random legal-move AI, via getValidMoves()
  animation/
    timeline.ts    # replays a move's steps into visual frames for the UI
  audio/
    soundManager.ts    # Web Audio SFX, on/off preference
    haptics.ts         # Vibration API feedback
  components/      # presentational React components (Board, Pit, GameOverOverlay)
  App.tsx          # orchestration: owns game state, wires engine + animation + audio
```

Game logic is kept fully separate from the UI so it can be tested independently and reused later (e.g. mobile or multiplayer) without rewriting the rules.

## Getting started

Requires Node.js (18+ recommended) and npm.

```bash
npm install       # install dependencies
npm run dev       # start the dev server (prints a local URL to open)
```

Open the printed URL (typically `http://localhost:5173`) in your browser.

### Other scripts

```bash
npm run test       # run the unit/integration test suite once
npm run build      # type-check and build a production bundle into dist/
npm run preview    # serve the production build locally, to sanity-check it
npm run lint       # run oxlint
```

## Status

The game is fully playable: a complete board, seed-sowing/capture rules, an AI opponent, animation, win/lose/draw detection with a Play Again flow, mobile-responsive layout, and optional sound/haptic feedback.
