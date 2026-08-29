# Pallanguzhi

A single-player, browser-based implementation of **Pallanguzhi** (பல்லாங்குழி) — the traditional South Indian mancala-style board game — played against a computer AI opponent.

## About the game

Pallanguzhi is played on a wooden board with 14 pits (7 per side) and a store of small seeds/shells (cowries, tamarind seeds, or similar counters, traditionally). Two players take turns sowing seeds from a pit, one at a time, into subsequent pits around the board. Seeds are captured under specific conditions as the sowing lands in certain pits, and the player who collects the most seeds by the end of the game wins.

This project brings that game to the browser as a single-player experience: you play against an AI, with the traditional rules encoded as the game engine.

## Tech stack

- **React** — UI
- **TypeScript** — game logic and components
- **Vite** — dev server and build tooling
- No backend — runs entirely client-side, locally or as a static deploy

## Project structure

```
src/
  game/          # pure game logic (rules, engine, AI) — framework-agnostic
  components/    # React UI components (board, pits, scoreboard)
  App.tsx        # top-level composition and game state
```

Game logic is kept fully separate from the UI so it can be tested independently and reused later (e.g. mobile or multiplayer) without rewriting the rules.

## Getting started

```bash
npm install
npm run dev
```

## Status

🚧 Early scaffold — game rules and UI are being built incrementally.
