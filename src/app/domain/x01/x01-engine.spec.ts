import {
  createX01Game,
  endTurn,
  getWinner,
  isFinished,
  throwDart,
  undoLastThrow,
  X01GameState,
} from './x01-engine';
import { d, doubleBull, miss, players, s, singleBull, t } from '../../../testing/darts';

function withScores(state: X01GameState, scores: Record<string, number>): X01GameState {
  return { ...state, scores: { ...state.scores, ...scores } };
}

function gameWithScore(score: number, count = 2): X01GameState {
  const list = players(count);
  const scores: Record<string, number> = {};
  for (const player of list) {
    scores[player.id] = score;
  }
  return withScores(createX01Game(list), scores);
}

function score(state: X01GameState, playerId: string): number {
  return state.scores[playerId];
}

function currentPlayer(state: X01GameState): string {
  return state.playerIds[state.currentPlayerIndex];
}

describe('createX01Game', () => {
  it('initializes players with the default starting score of 501', () => {
    const state = createX01Game(players(2));
    expect(score(state, 'p1')).toBe(501);
    expect(score(state, 'p2')).toBe(501);
    expect(state.status).toBe('in_progress');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.history).toEqual([]);
    expect(state.winnerId).toBeNull();
  });

  it('honors custom settings', () => {
    const state = createX01Game(players(2), { startingScore: 301, doubleIn: true });
    expect(score(state, 'p1')).toBe(301);
    expect(state.settings.doubleIn).toBeTrue();
    expect(state.settings.doubleOut).toBeTrue();
  });
});

describe('throwDart — scoring', () => {
  it('subtracts a single', () => {
    const state = createX01Game(players(2));
    const { state: next } = throwDart(state, s(20));
    expect(score(next, 'p1')).toBe(481);
    expect(next.currentTurn?.throws.length).toBe(1);
  });

  it('subtracts a triple (60)', () => {
    const state = createX01Game(players(2));
    const { state: next } = throwDart(state, t(20));
    expect(score(next, 'p1')).toBe(441);
  });

  it('subtracts a double', () => {
    const state = createX01Game(players(2));
    const { state: next } = throwDart(state, d(10));
    expect(score(next, 'p1')).toBe(481);
  });

  it('misses score nothing', () => {
    const state = createX01Game(players(2));
    const { state: next } = throwDart(state, miss());
    expect(score(next, 'p1')).toBe(501);
    expect(next.currentTurn?.throws.length).toBe(1);
  });

  it('auto-ends the turn after 3 darts and passes play', () => {
    const state = createX01Game(players(2));
    let s1 = throwDart(state, s(20)).state;
    s1 = throwDart(s1, s(20)).state;
    expect(s1.currentTurn?.throws.length).toBe(2);
    const { state: s2, result } = throwDart(s1, s(20));
    expect(result.type).toBe('success');
    expect(s2.currentTurn).toBeNull();
    expect(s2.currentPlayerIndex).toBe(1);
    expect(s2.history.length).toBe(1);
  });

  it('wraps turn order back to the first player', () => {
    const state = createX01Game(players(3));
    const s1 = throwDart(throwDart(throwDart(state, s(1)).state, s(1)).state, s(1)).state;
    expect(currentPlayer(s1)).toBe('p2');
    const s2 = throwDart(throwDart(throwDart(s1, s(1)).state, s(1)).state, s(1)).state;
    expect(currentPlayer(s2)).toBe('p3');
    const s3 = throwDart(throwDart(throwDart(s2, s(1)).state, s(1)).state, s(1)).state;
    expect(currentPlayer(s3)).toBe('p1');
  });
});

describe('throwDart — busts (RULES.md)', () => {
  it('busts when the score would go below 0, reverting the turn', () => {
    const state = gameWithScore(20);
    const { state: next, result } = throwDart(state, t(10));
    expect(result.type).toBe('bust');
    expect(score(next, 'p1')).toBe(20);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.history[0].busted).toBeTrue();
  });

  it('busts when the remaining score would become exactly 1', () => {
    const state = gameWithScore(4);
    const s1 = throwDart(state, s(1)).state;
    const s2 = throwDart(s1, s(1)).state;
    expect(score(s2, 'p1')).toBe(2);
    const { state: s3, result } = throwDart(s2, s(1));
    expect(result.type).toBe('bust');
    expect(score(s3, 'p1')).toBe(4);
  });

  it('busts on a non-double checkout when double-out is on', () => {
    const state = gameWithScore(20);
    const { state: next, result } = throwDart(state, s(20));
    expect(result.type).toBe('bust');
    expect(score(next, 'p1')).toBe(20);
    expect(isFinished(next)).toBeFalse();
  });

  it('does not bust on an outer-bull checkout when double-out is on (25 is single)', () => {
    const state = gameWithScore(25);
    const { state: next, result } = throwDart(state, singleBull());
    expect(result.type).toBe('bust');
    expect(score(next, 'p1')).toBe(25);
  });
});

describe('throwDart — checkout / win (RULES.md)', () => {
  it('wins with a double checkout', () => {
    const state = gameWithScore(40);
    const { state: next, result } = throwDart(state, d(20));
    expect(result.type).toBe('game_won');
    expect((result as { winnerId: string }).winnerId).toBe('p1');
    expect(next.status).toBe('finished');
    expect(score(next, 'p1')).toBe(0);
    expect(isFinished(next)).toBeTrue();
    expect(getWinner(next)).toBe('p1');
  });

  it('wins with the inner bull as D25', () => {
    const state = gameWithScore(50);
    const { result } = throwDart(state, doubleBull());
    expect(result.type).toBe('game_won');
  });

  it('wins on any exact 0 when double-out is off', () => {
    const state = withScores(createX01Game(players(2), { doubleOut: false }), { p1: 20 });
    const { state: next, result } = throwDart(state, s(20));
    expect(result.type).toBe('game_won');
    expect(next.status).toBe('finished');
  });
});

describe('double-in (RULES.md)', () => {
  it('does not score darts until a double is hit on the first turn', () => {
    const state = createX01Game(players(2), { doubleIn: true });
    const s1 = throwDart(state, s(20)).state;
    expect(score(s1, 'p1')).toBe(501);
    const { state: s2, result } = throwDart(s1, d(20));
    expect(result.type).toBe('success');
    expect(score(s2, 'p1')).toBe(461);
  });

  it('ends the first turn with no score after 3 non-doubles; next turn scores freely', () => {
    const state = createX01Game(players(2), { doubleIn: true });
    const s1 = throwDart(throwDart(throwDart(state, s(20)).state, s(20)).state, s(20)).state;
    expect(score(s1, 'p1')).toBe(501);
    expect(currentPlayer(s1)).toBe('p2');

    const s2 = throwDart(s1, d(10)).state;
    expect(score(s2, 'p2')).toBe(481);
    const s3 = throwDart(throwDart(s2, s(1)).state, s(1)).state;
    expect(currentPlayer(s3)).toBe('p1');

    const { state: s4 } = throwDart(s3, s(20));
    expect(score(s4, 'p1')).toBe(481);
  });

  it('allows a first-dart double to check out immediately', () => {
    const state = withScores(createX01Game(players(2), { doubleIn: true }), { p1: 40 });
    const { state: next, result } = throwDart(state, d(20));
    expect(result.type).toBe('game_won');
    expect(next.status).toBe('finished');
  });
});

describe('endTurn', () => {
  it('completes the turn and passes play', () => {
    const state = createX01Game(players(2));
    const s1 = throwDart(state, s(20)).state;
    const { state: s2, result } = endTurn(s1);
    expect(result.type).toBe('success');
    expect(s2.currentTurn).toBeNull();
    expect(s2.currentPlayerIndex).toBe(1);
    expect(score(s2, 'p1')).toBe(481);
    expect(s2.history.length).toBe(1);
  });

  it('is invalid with no darts thrown', () => {
    const state = createX01Game(players(2));
    const { result } = endTurn(state);
    expect(result.type).toBe('invalid');
  });
});

describe('undoLastThrow', () => {
  it('removes the last dart mid-turn and restores the score', () => {
    const state = createX01Game(players(2));
    const s1 = throwDart(state, s(20)).state;
    const s2 = throwDart(s1, d(10)).state;
    expect(score(s2, 'p1')).toBe(461);
    const { state: s3 } = undoLastThrow(s2);
    expect(score(s3, 'p1')).toBe(481);
    expect(s3.currentTurn?.throws.length).toBe(1);
  });

  it('clears the turn when the last dart is removed', () => {
    const state = createX01Game(players(2));
    const s1 = throwDart(state, s(20)).state;
    const { state: s2 } = undoLastThrow(s1);
    expect(s2.currentTurn).toBeNull();
    expect(score(s2, 'p1')).toBe(501);
  });

  it('restores a busted turn so the busting dart can be undone', () => {
    const state = gameWithScore(20);
    const busted = throwDart(state, t(10)).state;
    expect(currentPlayer(busted)).toBe('p2');

    const { state: s1 } = undoLastThrow(busted);
    expect(currentPlayer(s1)).toBe('p1');
    expect(score(s1, 'p1')).toBe(20);
    expect(s1.currentTurn?.throws.length).toBe(1);
    expect(s1.currentTurn?.busted).toBeTrue();

    const { state: s2 } = undoLastThrow(s1);
    expect(s2.currentTurn).toBeNull();
    expect(score(s2, 'p1')).toBe(20);
  });

  it('restores a completed turn across turns', () => {
    const state = createX01Game(players(2));
    const s1 = throwDart(state, s(20)).state;
    const completed = endTurn(s1).state;
    expect(currentPlayer(completed)).toBe('p2');

    const { state: s2 } = undoLastThrow(completed);
    expect(currentPlayer(s2)).toBe('p1');
    expect(s2.currentTurn?.throws).toEqual([s(20)]);
    expect(score(s2, 'p1')).toBe(481);
    expect(s2.history.length).toBe(0);
  });

  it('keeps the remaining score when undoing a completed 3-dart visit', () => {
    const state = createX01Game(players(2));
    const completed = throwDart(throwDart(throwDart(state, s(20)).state, s(20)).state, s(20)).state;
    expect(currentPlayer(completed)).toBe('p2');
    expect(score(completed, 'p1')).toBe(441);

    const { state: s1 } = undoLastThrow(completed);
    expect(currentPlayer(s1)).toBe('p1');
    expect(s1.currentTurn?.throws).toEqual([s(20), s(20), s(20)]);
    expect(score(s1, 'p1')).toBe(441);

    const { state: s2 } = undoLastThrow(s1);
    expect(s2.currentTurn?.throws).toEqual([s(20), s(20)]);
    expect(score(s2, 'p1')).toBe(461);

    const { state: s3 } = undoLastThrow(s2);
    expect(s3.currentTurn?.throws).toEqual([s(20)]);
    expect(score(s3, 'p1')).toBe(481);
  });

  it('rewinds a finished game back to the checkout turn', () => {
    const state = gameWithScore(40);
    const won = throwDart(state, d(20)).state;
    expect(isFinished(won)).toBeTrue();

    const { state: s1 } = undoLastThrow(won);
    expect(s1.status).toBe('in_progress');
    expect(s1.winnerId).toBeNull();
    expect(currentPlayer(s1)).toBe('p1');
    expect(s1.currentTurn?.throws).toEqual([d(20)]);
    expect(score(s1, 'p1')).toBe(0);

    const { state: s2 } = undoLastThrow(s1);
    expect(s2.currentTurn).toBeNull();
    expect(score(s2, 'p1')).toBe(40);
  });

  it('is invalid when there is nothing to undo', () => {
    const state = createX01Game(players(2));
    const { result } = undoLastThrow(state);
    expect(result.type).toBe('invalid');
  });
});

describe('invalid inputs', () => {
  it('rejects a throw after the game is finished', () => {
    const state = gameWithScore(40);
    const won = throwDart(state, d(20)).state;
    const { result } = throwDart(won, s(20));
    expect(result.type).toBe('invalid');
  });
});
