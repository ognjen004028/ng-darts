import {
  CricketGameState,
  CricketPlayerState,
  CricketTarget,
  createCricketGame,
  dartMarks,
  endTurn,
  getWinner,
  isFinished,
  throwDart,
  undoLastThrow,
} from './cricket-engine';
import { d, doubleBull, miss, players, s, singleBull, t } from '../../../testing/darts';
import { DartThrow } from '../models/dart-throw';

function game(count = 2): CricketGameState {
  return createCricketGame(players(count));
}

function tap(state: CricketGameState, dart: DartThrow, playerId = 'p1'): CricketGameState {
  return throwDart(state, dart, playerId).state;
}

function marks(state: CricketGameState, playerId: string, target: CricketTarget): number {
  return state.players[playerId].marks[String(target)] ?? 0;
}

function points(state: CricketGameState, playerId: string): number {
  return state.players[playerId].points;
}

function withPlayer(
  state: CricketGameState,
  playerId: string,
  patch: Partial<CricketPlayerState>,
): CricketGameState {
  const current = state.players[playerId];
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        marks: patch.marks ?? { ...current.marks },
        points: patch.points ?? current.points,
      },
    },
  };
}

function closedAll(state: CricketGameState, playerId: string): CricketGameState {
  const closed: Record<string, number> = {};
  for (const target of state.settings.targets) {
    closed[String(target)] = 3;
  }
  return withPlayer(state, playerId, { marks: closed });
}

function closedExcept(
  state: CricketGameState,
  playerId: string,
  open: CricketTarget,
): CricketGameState {
  const closed: Record<string, number> = {};
  for (const target of state.settings.targets) {
    closed[String(target)] = target === open ? 0 : 3;
  }
  return withPlayer(state, playerId, { marks: closed });
}

describe('createCricketGame', () => {
  it('initializes all players with 0 marks on every target and 0 points', () => {
    const state = game();
    expect(state.status).toBe('in_progress');
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
    state = tap(state, s(20));
    expect(marks(state, 'p1', 20)).toBe(1);

    state = tap(state, d(20));
    expect(marks(state, 'p1', 20)).toBe(3);

    state = tap(state, t(19));
    expect(marks(state, 'p1', 19)).toBe(3);
  });

  it('splits the bull marks (outer = 1, inner = 2)', () => {
    let state = game();
    state = tap(state, singleBull());
    expect(marks(state, 'p1', 'bull')).toBe(1);

    state = tap(state, doubleBull());
    expect(marks(state, 'p1', 'bull')).toBe(3);
  });

  it('ignores misses and non-target segments', () => {
    let state = game();
    state = tap(state, miss());
    state = tap(state, s(14));
    state = tap(state, t(1));
    expect(marks(state, 'p1', 20)).toBe(0);
    expect(marks(state, 'p1', 14)).toBe(0);
  });
});

describe('throwDart — scoring (RULES.md)', () => {
  it('scores no points while a target is still open', () => {
    const { state: next } = throwDart(game(), s(20), 'p1');
    expect(marks(next, 'p1', 20)).toBe(1);
    expect(points(next, 'p1')).toBe(0);
  });

  it('scores the dart value on a closed target while an opponent is open', () => {
    let state = tap(game(), t(20));
    expect(points(state, 'p1')).toBe(0);

    const { state: next, result } = throwDart(state, s(20), 'p1');
    expect(result.type).toBe('success');
    expect(points(next, 'p1')).toBe(20);
  });

  it('does not score the closing dart itself (points only on already-closed targets)', () => {
    let state = tap(game(), s(20));
    state = tap(state, s(20));

    const next = tap(state, t(20));
    expect(marks(next, 'p1', 20)).toBe(5);
    expect(points(next, 'p1')).toBe(0);
  });

  it('scores bull points with dart values 25 and 50', () => {
    let state = tap(game(), doubleBull());
    state = tap(state, singleBull());

    const s1 = tap(state, singleBull());
    expect(points(s1, 'p1')).toBe(25);
    const s2 = tap(s1, doubleBull());
    expect(points(s2, 'p1')).toBe(75);
  });

  it('stops scoring once every player has closed the target', () => {
    let state = tap(game(), t(20));
    state = tap(state, t(20), 'p2');

    const { state: next, result } = throwDart(state, t(20), 'p1');
    expect(result.type).toBe('success');
    expect(points(next, 'p1')).toBe(0);
  });
});

describe('throwDart — no turns (RULES.md)', () => {
  it('commits each tap immediately', () => {
    const { state, result } = throwDart(game(), s(20), 'p1');
    expect(result.type).toBe('success');
    expect(state.currentTurn).toBeNull();
    expect(state.history.length).toBe(1);
    expect(marks(state, 'p1', 20)).toBe(1);
  });

  it('accepts a tap for any player', () => {
    let state = tap(game(), s(20), 'p1');
    state = tap(state, s(19), 'p2');
    expect(marks(state, 'p1', 20)).toBe(1);
    expect(marks(state, 'p2', 19)).toBe(1);
  });

  it('allows more than 3 taps for the same player', () => {
    let state = game();
    for (let i = 0; i < 4; i++) {
      state = tap(state, s(20));
    }
    expect(marks(state, 'p1', 20)).toBe(4);
    expect(state.history.length).toBe(4);
  });

  it('rejects an unknown player', () => {
    const { result } = throwDart(game(), s(20), 'nope');
    expect(result.type).toBe('invalid');
  });
});

describe('win conditions (RULES.md)', () => {
  it('wins immediately on closing all targets while at least tied for points', () => {
    let state = closedExcept(game(), 'p1', 15);
    state = withPlayer(state, 'p1', { points: 100 });
    state = withPlayer(state, 'p2', { points: 100 });

    const { state: next, result } = throwDart(state, t(15), 'p1');
    expect(result.type).toBe('game_won');
    expect((result as { winnerId: string }).winnerId).toBe('p1');
    expect(next.status).toBe('finished');
    expect(isFinished(next)).toBeTrue();
    expect(getWinner(next)).toBe('p1');
  });

  it('does not win on closing all targets while trailing in points', () => {
    let state = closedAll(game(), 'p1');
    state = withPlayer(state, 'p1', { points: 50 });
    state = withPlayer(state, 'p2', { points: 80 });

    const { state: next, result } = throwDart(state, s(20), 'p1');
    expect(result.type).toBe('success');
    expect(isFinished(next)).toBeFalse();
  });

  it('wins the instant a trailing closer ties or passes the leader', () => {
    let state = closedAll(game(), 'p1');
    state = withPlayer(state, 'p1', { points: 50 });
    state = withPlayer(state, 'p2', { points: 80 });

    state = tap(state, s(20));
    const { state: next, result } = throwDart(state, s(20), 'p1');
    expect(result.type).toBe('game_won');
    expect(getWinner(next)).toBe('p1');
  });

  it('resolves a deadlock (all players closed) to the point leader', () => {
    let state = closedAll(game(), 'p1');
    state = closedAll(state, 'p2');
    state = withPlayer(state, 'p1', { points: 50 });
    state = withPlayer(state, 'p2', { points: 80 });

    const { state: next, result } = throwDart(state, miss(), 'p1');
    expect(result.type).toBe('game_won');
    expect(getWinner(next)).toBe('p2');
    expect(next.status).toBe('finished');
  });

  it('declares a draw when a deadlock ends with equal points', () => {
    let state = closedAll(game(), 'p1');
    state = closedAll(state, 'p2');
    state = withPlayer(state, 'p1', { points: 80 });
    state = withPlayer(state, 'p2', { points: 80 });

    const { state: next, result } = throwDart(state, miss(), 'p1');
    expect(result.type).toBe('draw');
    expect(next.status).toBe('finished');
    expect(next.winnerId).toBeNull();
    expect(getWinner(next)).toBeNull();
  });
});

describe('endTurn', () => {
  it('is always invalid because Cricket has no turns', () => {
    expect(endTurn(game()).result.type).toBe('invalid');

    const afterTap = tap(game(), s(20));
    expect(endTurn(afterTap).result.type).toBe('invalid');
  });
});

describe('undoLastThrow', () => {
  it('reverts the last tap and restores marks and points', () => {
    const state = tap(game(), t(20));
    expect(marks(state, 'p1', 20)).toBe(3);

    const { state: next } = undoLastThrow(state);
    expect(marks(next, 'p1', 20)).toBe(0);
    expect(points(next, 'p1')).toBe(0);
    expect(next.currentTurn).toBeNull();
    expect(next.history.length).toBe(0);
  });

  it('reverts only the last tap when two players have scored', () => {
    let state = tap(game(), s(20), 'p1');
    state = tap(state, s(19), 'p2');

    const { state: next } = undoLastThrow(state);
    expect(marks(next, 'p2', 19)).toBe(0);
    expect(marks(next, 'p1', 20)).toBe(1);
  });

  it('rewinds a finished game back to in_progress', () => {
    let state = closedExcept(game(), 'p1', 15);
    state = withPlayer(state, 'p1', { points: 100 });
    const won = throwDart(state, t(15), 'p1').state;
    expect(isFinished(won)).toBeTrue();

    const { state: next } = undoLastThrow(won);
    expect(next.status).toBe('in_progress');
    expect(next.winnerId).toBeNull();
    expect(next.currentTurn).toBeNull();
    expect(marks(next, 'p1', 15)).toBe(0);
  });

  it('rewinds a draw back to in_progress', () => {
    let state = closedAll(game(), 'p1');
    state = closedAll(state, 'p2');
    state = withPlayer(state, 'p1', { points: 80 });
    state = withPlayer(state, 'p2', { points: 80 });
    const drawn = throwDart(state, miss(), 'p1').state;
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
    let state = closedExcept(game(), 'p1', 15);
    state = withPlayer(state, 'p1', { points: 100 });
    const won = throwDart(state, t(15), 'p1').state;

    const { result } = throwDart(won, s(20), 'p1');
    expect(result.type).toBe('invalid');
  });
});
