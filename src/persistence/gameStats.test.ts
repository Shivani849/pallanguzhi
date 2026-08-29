import { describe, expect, it } from 'vitest';
import type { GameHistoryEntry } from './gameHistory';
import { computeTwoPlayerStats, computeVsAiStats } from './gameStats';

function entry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    date: '2026-01-01T00:00:00.000Z',
    mode: 'vs-ai',
    winner: 'player',
    playerScore: 50,
    aiScore: 34,
    moveCount: 12,
    ...overrides,
  };
}

describe('computeVsAiStats', () => {
  it('returns all zeros when there is no vs-ai history', () => {
    expect(computeVsAiStats([])).toEqual({
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winPercentage: 0,
      bestScore: 0,
    });
  });

  it('ignores two-players entries entirely', () => {
    const history = [entry({ mode: 'two-players', winner: 'player' })];
    expect(computeVsAiStats(history)).toEqual({
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winPercentage: 0,
      bestScore: 0,
    });
  });

  it('counts wins, losses, games played, and win percentage', () => {
    const history = [
      entry({ winner: 'player', playerScore: 50 }),
      entry({ winner: 'player', playerScore: 60 }),
      entry({ winner: 'ai', playerScore: 30 }),
      entry({ winner: 'draw', playerScore: 42 }),
    ];

    const stats = computeVsAiStats(history);
    expect(stats.gamesPlayed).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    // 2 wins / 4 games = 50%
    expect(stats.winPercentage).toBe(50);
  });

  it('rounds win percentage to the nearest whole percent', () => {
    const history = [
      entry({ winner: 'player' }),
      entry({ winner: 'ai' }),
      entry({ winner: 'ai' }),
    ];
    // 1/3 = 33.33...% -> rounds to 33
    expect(computeVsAiStats(history).winPercentage).toBe(33);
  });

  it('tracks the best (highest) player score across vs-ai games', () => {
    const history = [
      entry({ playerScore: 20 }),
      entry({ playerScore: 84 }),
      entry({ playerScore: 55 }),
    ];
    expect(computeVsAiStats(history).bestScore).toBe(84);
  });
});

describe('computeTwoPlayerStats', () => {
  it('returns all zeros when there is no two-players history', () => {
    expect(computeTwoPlayerStats([])).toEqual({
      gamesPlayed: 0,
      player1Wins: 0,
      player2Wins: 0,
      draws: 0,
    });
  });

  it('ignores vs-ai entries entirely', () => {
    const history = [entry({ mode: 'vs-ai', winner: 'player' })];
    expect(computeTwoPlayerStats(history).gamesPlayed).toBe(0);
  });

  it('counts player 1 wins, player 2 wins, and draws', () => {
    const history = [
      entry({ mode: 'two-players', winner: 'player' }),
      entry({ mode: 'two-players', winner: 'player' }),
      entry({ mode: 'two-players', winner: 'ai' }),
      entry({ mode: 'two-players', winner: 'draw' }),
    ];

    expect(computeTwoPlayerStats(history)).toEqual({
      gamesPlayed: 4,
      player1Wins: 2,
      player2Wins: 1,
      draws: 1,
    });
  });
});
