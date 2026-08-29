// Purely presentational. The text here must match RULES.md / src/game/
// engine.ts exactly — do not describe a rule the engine doesn't implement
// (e.g. there is no "extra turn" for landing in your own empty pit; the
// turn always switches after a move resolves).

interface HowToPlayScreenProps {
  onStartTutorial: () => void;
  onBackToHome: () => void;
}

function HowToPlayScreen({
  onStartTutorial,
  onBackToHome,
}: HowToPlayScreenProps) {
  return (
    <div className="how-to-play">
      <h1 className="app-title">How to Play</h1>

      <div className="how-to-play-content">
        <section className="how-to-play-section">
          <h2>1. The board</h2>
          <p>
            The board has 14 pits — 7 belong to you, 7 belong to your
            opponent. There are no separate store pits; captured seeds are
            simply added to a player&apos;s collected-seed total.
          </p>
        </section>

        <section className="how-to-play-section">
          <h2>2. Your turn</h2>
          <p>
            On your turn, choose one of your own pits that still has seeds
            in it, and pick up every seed from that pit.
          </p>
        </section>

        <section className="how-to-play-section">
          <h2>3. Seed movement</h2>
          <p>
            Seeds are sown one at a time into the pits that follow: across
            your own row in increasing order, then the opponent&apos;s row
            in decreasing order, then wrapping back to the start of your own
            row. If your last seed lands in a pit that already had seeds in
            it, you immediately pick up everything now in that pit and keep
            sowing from there — this can chain through several pits in a
            single turn.
          </p>
        </section>

        <section className="how-to-play-section">
          <h2>4. Capturing</h2>
          <p>
            If your last seed instead lands in a pit that was empty, your
            turn&apos;s sowing ends there. If the very next pit in the
            sowing order has any seeds in it, you capture both: the single
            seed that just landed, and everything in that next pit — all of
            it goes straight to your collected-seed total. If that next pit
            is also empty, nothing is captured and the seed simply stays
            where it landed.
          </p>
        </section>

        <section className="how-to-play-section">
          <h2>5. Winning</h2>
          <p>
            The game ends once the player about to move has no seeds left
            in any of their own pits. Whoever has collected the most seeds
            overall wins — equal totals end in a draw.
          </p>
        </section>
      </div>

      <div className="mode-select-buttons">
        <button
          type="button"
          className="mode-button"
          onClick={onStartTutorial}
        >
          Start Interactive Tutorial
        </button>
        <button type="button" className="mode-button" onClick={onBackToHome}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default HowToPlayScreen;
