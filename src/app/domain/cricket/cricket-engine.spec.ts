import {
  CricketGameState,
  CricketTarget,
  createCricketGame,
  currentPlayerId,
  dartMarks,
  endTurn,
  getWinner,
  isFinished,
  throwDart,
  undoLastThrow,
} from './cricket-engine';
import { DartThrow, NumberSegment } from '../models/dart-throw';
import { Player } from '../models/player';

// --- throw builders -------------------------------------------------------

const s = (target: NumberSegment): DartThrow => ({ kind: 'single', target });
const d = (target: NumberSegment): DartThrow => ({ kind: 'double', target });
const t = (target: NumberSegment): DartThrow => ({ kind: 'triple', target });
const singleBull = (): DartThrow => ({ kind: 'single', target: 'bull' });
const doubleBull = (): DartThrow => ({ kind: 'double', target: 'bull' });
const miss = (): DartThrow => ({ kind: 'miss' });

// --- helpers --------------------------------------------------------------

function players(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
  }));
}

function game(count = 2): CricketGameState {
  return createCricketGame(players(count));
}

function marks(state: CricketGameState, playerId: string, target: CricketTarget): number {
  return state.players[playerId].marks[String(target)] ?? 0;
}

function points(state: CricketGameState, playerId: string): number {
  return state.players[playerId].points;
}

function setMarks(
  state: CricketGameState,
  playerId: string,
  target: CricketTarget,
  value: number,
): void {
  state.players[playerId].marks[String(target)] = value;
}

function closeAll(state: CricketGameState, playerId: string): void {
  for (const target of state.settings.targets) {
    setMarks(state, playerId, target, 3);
  }
}

/** Close every target except `open`, leaving that one at 0 marks. */
function closeAllExcept(state: CricketGameState, playerId: string, open: CricketTarget): void {
  for (const target of state.settings.targets) {
    setMarks(state, playerId, target, target === open ? 0 : 3);
  }
}

function currentPlayer(state: CricketGameState): string {
  return state.playerIds[state.currentPlayerIndex];
}

/** Throw misses until the current turn auto-completes (3 darts) and play passes. */
function finishTurn(state: CricketGameState): CricketGameState {
  let next = state;
  while (next.currentTurn && next.currentTurn.throws.length < 3) {
    next = throwDart(next, miss()).state;
  }
  return next;
}

// --- tests ----------------------------------------------------------------

describe('createCricketGame', () => {
  it('initializes all players with 0 marks on every target and 0 points', () => {
    const state = game();
    expect(state.status).toBe('in_progress');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.history).toEqual([]);
    expect(state.winnerId).toBeNull();

    for (const player of ['p1', 'p2']) {
      expect(points(state, player)).toBe(0);
      for (const target of state.settings.targets) {
        expect(marks(state, player, target)).toBe(0);
      }
    }
  });

  it('uses the fixed 15–20 + bull targets in display order', () => {
    const state = game();
    expect(state.settings.targets).toEqual([20, 19, 18, 17, 16, 15, 'bull']);
  });

  it('requires at least one player', () => {
    expect(() => createCricketGame([])).toThrowError(/at least one player/);
  });
});

describe('dartMarks', () => {
  it('maps S/D/T and bull split to marks (RULES.md)', () => {
    expect(dartMarks(s(20))).toBe(1);
    expect(dartMarks(d(20))).toBe(2);
    expect(dartMarks(t(20))).toBe(3);
    expect(dartMarks(singleBull())).toBe(1);
    expect(dartMarks(doubleBull())).toBe(2);
    expect(dartMarks(miss())).toBe(0);
  });
});

describe('throwDart — marks', () => {
  it('adds marks for singles, doubles and triples', () => {
    let state = game();
    state = throwDart(state, s(20)).state;
    expect(marks(state, 'p1', 20)).toBe(1);

    state = throwDart(state, d(20)).state;
    expect(marks(state, 'p1', 20)).toBe(3);

    state = throwDart(state, t(19)).state;
    expect(marks(state, 'p1', 19)).toBe(3);
  });

  it('splits the bull marks (outer = 1, inner = 2)', () => {
    let state = game();
    state = throwDart(state, singleBull()).state;
    expect(marks(state, 'p1', 'bull')).toBe(1);

    state = throwDart(state, doubleBull()).state;
    expect(marks(state, 'p1', 'bull')).toBe(3);
  });

  it('ignores misses and non-target segments', () => {
    let state = game();
    state = throwDart(state, miss()).state;
    state = throwDart(state, s(14)).state;
    state = throwDart(state, t(1)).state;
    expect(marks(state, 'p1', 20)).toBe(0);
    expect(marks(state, 'p1', 14)).toBe(0);
  });
});

describe('throwDart — scoring (RULES.md)', () => {
  it('scores no points while a target is still open', () => {
    const state = game();
    const { state: next } = throwDart(state, s(20));
    expect(marks(next, 'p1', 20)).toBe(1);
    expect(points(next, 'p1')).toBe(0);
  });

  it('scores the dart value on a closed target while an opponent is open', () => {
    let state = game();
    state = throwDart(state, t(20)).state; // p1 closes 20 (no score)
    state = finishTurn(state); // p1's turn completes → p2
    expect(points(state, 'p1')).toBe(0);

    state = throwDart(state, s(20)).state; // p2 leaves 20 open with 1 mark
    state = finishTurn(state); // p2's turn completes → p1

    // p1's second turn: scoring dart on the now-closed 20.
    const { state: next, result } = throwDart(state, s(20));
    expect(result.type).toBe('success');
    expect(points(next, 'p1')).toBe(20);
  });

  it('does not score the closing dart itself (points only on already-closed targets)', () => {
    // Interpretation locked from RULES.md: "extra marks beyond 3 are recorded
    // and used for scoring" — the dart that reaches 3 marks closes the target
    // and scores nothing; scoring starts on the next dart.
    let state = game();
    state = throwDart(state, s(20)).state; // 1 mark
    state = throwDart(state, s(20)).state; // 2 marks

    const { state: next } = throwDart(state, t(20)); // 2 + 3 = 5 marks, closes
    expect(marks(next, 'p1', 20)).toBe(5);
    expect(points(next, 'p1')).toBe(0);
  });

  it('scores bull points with dart values 25 and 50', () => {
    let state = game();
    state = throwDart(state, doubleBull()).state; // 2 marks
    state = throwDart(state, singleBull()).state; // 3 marks → closed
    state = finishTurn(state); // p1's turn completes → p2

    state = throwDart(state, singleBull()).state; // p2: 1 mark, open
    state = finishTurn(state); // p2's turn completes → p1

    const { state: s1 } = throwDart(state, singleBull()); // p1: 25
    expect(points(s1, 'p1')).toBe(25);
    const { state: s2 } = throwDart(s1, doubleBull()); // p1: 50
    expect(points(s2, 'p1')).toBe(75);
  });

  it('stops scoring once every player has closed the target', () => {
    let state = game();
    state = throwDart(state, t(20)).state; // p1 closes 20
    state = throwDart(state, miss()).state;
    state = throwDart(state, miss()).state; // p1 turn complete

    state = throwDart(state, t(20)).state; // p2 closes 20 → dead
    state = throwDart(state, miss()).state;
    state = throwDart(state, miss()).state; // p2 turn complete

    const { state: next, result } = throwDart(state, t(20)); // p1: dead target
    expect(result.type).toBe('success');
    expect(points(next, 'p1')).toBe(0);
  });
});

describe('throwDart — turn flow', () => {
  it('auto-ends the turn after 3 darts and passes play', () => {
    const state = game();
    let next = throwDart(state, s(20)).state;
    next = throwDart(next, s(20)).state;
    expect(next.currentTurn?.throws.length).toBe(2);

    const { state: s3, result } = throwDart(next, s(20));
    expect(result.type).toBe('success');
    expect(s3.currentTurn).toBeNull();
    expect(currentPlayer(s3)).toBe('p2');
    expect(s3.history.length).toBe(1);
  });

  it('wraps turn order back to the first player', () => {
    const state = game(3);
    const s1 = throwDart(throwDart(throwDart(state, s(1)).state, s(1)).state, s(1)).state;
    expect(currentPlayer(s1)).toBe('p2');
    const s2 = throwDart(throwDart(throwDart(s1, s(1)).state, s(1)).state, s(1)).state;
    expect(currentPlayer(s2)).toBe('p3');
    const s3 = throwDart(throwDart(throwDart(s2, s(1)).state, s(1)).state, s(1)).state;
    expect(currentPlayer(s3)).toBe('p1');
  });
});

describe('win conditions (RULES.md)', () => {
  it('wins immediately on closing all targets while at least tied for points', () => {
    const state = game();
    closeAllExcept(state, 'p1', 15);
    state.players['p1'].points = 100;
    state.players['p2'].points = 100;

    const { state: next, result } = throwDart(state, t(15)); // closes 15
    expect(result.type).toBe('game_won');
    expect((result as { winnerId: string }).winnerId).toBe('p1');
    expect(next.status).toBe('finished');
    expect(isFinished(next)).toBeTrue();
    expect(getWinner(next)).toBe('p1');
  });

  it('does not win on closing all targets while trailing in points', () => {
    const state = game();
    closeAll(state, 'p1');
    state.players['p1'].points = 50;
    state.players['p2'].points = 80;

    const { state: next, result } = throwDart(state, s(20)); // 50 + 20 = 70
    expect(result.type).toBe('success');
    expect(isFinished(next)).toBeFalse();
  });

  it('wins the instant a trailing closer ties or passes the leader', () => {
    let state = game();
    closeAll(state, 'p1');
    state.players['p1'].points = 50;
    state.players['p2'].points = 80;

    state = throwDart(state, s(20)).state; // 70 — still behind
    const { state: next, result } = throwDart(state, s(20)); // 90 — passes
    expect(result.type).toBe('game_won');
    expect(getWinner(next)).toBe('p1');
  });

  it('resolves a deadlock (all players closed) to the point leader', () => {
    const state = game();
    closeAll(state, 'p1');
    closeAll(state, 'p2');
    state.players['p1'].points = 50;
    state.players['p2'].points = 80;

    const { state: next, result } = throwDart(state, miss());
    expect(result.type).toBe('game_won');
    expect(getWinner(next)).toBe('p2');
    expect(next.status).toBe('finished');
  });

  it('declares a draw when a deadlock ends with equal points', () => {
    const state = game();
    closeAll(state, 'p1');
    closeAll(state, 'p2');
    state.players['p1'].points = 80;
    state.players['p2'].points = 80;

    const { state: next, result } = throwDart(state, miss());
    expect(result.type).toBe('draw');
    expect(next.status).toBe('finished');
    expect(next.winnerId).toBeNull();
    expect(getWinner(next)).toBeNull();
  });
});

describe('endTurn', () => {
  it('completes the turn and passes play', () => {
    let state = game();
    state = throwDart(state, s(20)).state;
    const { state: next, result } = endTurn(state);
    expect(result.type).toBe('success');
    expect(next.currentTurn).toBeNull();
    expect(currentPlayer(next)).toBe('p2');
    expect(next.history.length).toBe(1);
  });

  it('is invalid with no darts thrown', () => {
    const { result } = endTurn(game());
    expect(result.type).toBe('invalid');
  });
});

describe('undoLastThrow', () => {
  it('removes the last dart mid-turn and restores marks and points', () => {
    let state = game();
    state = throwDart(state, t(20)).state; // p1: 3 marks, closed (no score)
    expect(marks(state, 'p1', 20)).toBe(3);
    expect(points(state, 'p1')).toBe(0);

    const { state: next } = undoLastThrow(state);
    expect(marks(next, 'p1', 20)).toBe(0);
    expect(points(next, 'p1')).toBe(0);
    expect(next.currentTurn).toBeNull();
  });

  it('clears the turn when the last dart is removed', () => {
    let state = game();
    state = throwDart(state, s(20)).state;
    const { state: next } = undoLastThrow(state);
    expect(next.currentTurn).toBeNull();
    expect(marks(next, 'p1', 20)).toBe(0);
  });

  it('restores a completed turn across turns', () => {
    let state = game();
    state = throwDart(state, s(20)).state;
    state = throwDart(state, s(20)).state;
    state = throwDart(state, s(20)).state; // turn auto-completes
    expect(currentPlayer(state)).toBe('p2');

    const { state: next } = undoLastThrow(state);
    expect(currentPlayer(next)).toBe('p1');
    expect(next.currentTurn?.throws.length).toBe(3);
    expect(marks(next, 'p1', 20)).toBe(0);
    expect(next.history.length).toBe(0);
  });

  it('rewinds a finished game back to its final turn', () => {
    const state = game();
    closeAllExcept(state, 'p1', 15);
    state.players['p1'].points = 100;
    const won = throwDart(state, t(15)).state;
    expect(isFinished(won)).toBeTrue();

    const { state: next } = undoLastThrow(won);
    expect(next.status).toBe('in_progress');
    expect(next.winnerId).toBeNull();
    expect(currentPlayer(next)).toBe('p1');
    expect(next.currentTurn?.throws).toEqual([t(15)]);
  });

  it('rewinds a draw back to in_progress', () => {
    const state = game();
    closeAll(state, 'p1');
    closeAll(state, 'p2');
    state.players['p1'].points = 80;
    state.players['p2'].points = 80;
    const drawn = throwDart(state, miss()).state;
    expect(isFinished(drawn)).toBeTrue();
    expect(drawn.winnerId).toBeNull();

    const { state: next } = undoLastThrow(drawn);
    expect(next.status).toBe('in_progress');
    expect(next.winnerId).toBeNull();
  });

  it('is invalid when there is nothing to undo', () => {
    const { result } = undoLastThrow(game());
    expect(result.type).toBe('invalid');
  });
});

describe('invalid inputs', () => {
  it('rejects a throw after the game is finished', () => {
    const state = game();
    closeAllExcept(state, 'p1', 15);
    state.players['p1'].points = 100;
    const won = throwDart(state, t(15)).state;

    const { result } = throwDart(won, s(20));
    expect(result.type).toBe('invalid');
  });

  it('rejects endTurn after the game is finished', () => {
    const state = game();
    closeAllExcept(state, 'p1', 15);
    state.players['p1'].points = 100;
    const won = throwDart(state, t(15)).state;

    const { result } = endTurn(won);
    expect(result.type).toBe('invalid');
  });
});
