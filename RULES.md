# Pallanguzhi — Classic Ruleset (used in this project)

This document is the single source of truth for the move engine implemented in
[`src/game/engine.ts`](src/game/engine.ts). If the rules need to change, update
this file first, then the code.

1. **Board.** 14 pits total — 7 belong to the player, 7 belong to the AI.
   There are no separate "store" pits on the board; captured seeds are added
   directly to a player's collected-seed total.

2. **Sowing order.** The pits form a single continuous loop. From any pit,
   "the next pit" is found by travelling counter-clockwise around the whole
   board: across the mover's own row in increasing index order, then
   continuing into the opponent's row in decreasing index order, then
   wrapping back to the start of the mover's own row.

3. **A move.** The current player chooses one of their own non-empty pits.
   All seeds in it are picked up and sown one at a time into each
   subsequent pit (per rule 2 above), one seed per pit.

4. **Relay sowing.** If the last seed of a sowing pass lands in a pit that
   already had at least one seed in it (i.e. it was non-empty *before* this
   seed was added), the player immediately picks up all seeds now in that
   pit and continues sowing from there. This repeats until a sowing pass's
   last seed lands in a pit that was empty before the seed was added.

5. **Capture.** When a sowing pass ends because its last seed landed in a
   pit that was empty, the mover captures:
   - the single seed that just landed there, and
   - all seeds in the very next pit in sowing order (if any).

   Both pits become empty, and the total captured seeds are added to the
   mover's collected-seed total. If the next pit was also empty, nothing is
   captured — the landing pit's seed simply stays there.

6. **Turn switching.** After a move fully resolves (including any relay
   chain and capture), the turn always passes to the other player.

7. **Game over.** The game ends when the player about to move has no seeds
   in any of their own pits (no valid moves). Whoever has the higher
   collected-seed total wins; equal totals is a draw.

   Known simplification: seeds still sitting on the board when the game
   ends this way are not swept into either player's total in this phase.
   That's a separate concern to revisit later if needed.

Do not add capture/sowing variants beyond what's written here without
updating this document first.
