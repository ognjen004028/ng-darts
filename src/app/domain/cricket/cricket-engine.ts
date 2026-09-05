/**
 * Cricket game engine — pure domain logic, no Angular.
 * Implements exactly the rules locked in RULES.md.
 *
 * All functions are pure: they return a new state plus a structured
 * result; the UI never re-implements rules.
 */
import { DartThrow, NumberSegment, dartValue } from '../models/dart-throw';
import { DARTS_PER_TURN, Turn } from '../models/turn';
import { Player } from '../models/player';

export type CricketTarget = NumberSegment | 'bull';

export interface CricketSettings {
  /** Targets in scoreboard display order. Fixed for v1 (RULES.md). */
  targets: CricketTarget[];
}

export const DEFAULT_CRICKET_SETTINGS: CricketSettings = {
  targets: [20, 19, 18, 17, 16, 15, 'bull'],
};

/** Per-player cricket bookkeeping: marks per target + cumulative points. */
export interface CricketPlayerState {
  /** Marks per target key (`String(target)`); can exceed 3 (RULES.md). */
  marks: Record<string, number>;
  points: number;
}

/** A single Cricket turn, extended with the state at its start (for undo). */
export interface CricketTurn extends Turn {
  startMarks: Record<string, number>;
  startPoints: number;
}

export interface CricketGameState {
  settings: CricketSettings;
  /** Player ids in turn order (fixed rotation). */
  playerIds: string[];
  players: Record<string, CricketPlayerState>;
  currentPlayerIndex: number;
  /** The in-progress turn, or null between turns. */
  currentTurn: CricketTurn | null;
  /** Completed turns (scored or game-ending) — supports undo. */
  history: CricketTurn[];
  status: 'in_progress' | 'finished';
  /** Null when finished by deadlock-draw (RULES.md). */
  winnerId: string | null;
}

export type CricketEvent =
  | { type: 'turn_completed' }
  | { type: 'target_closed'; target: CricketTarget; playerId: string }
  | { type: 'points_scored'; playerId: string; points: number };

export type CricketResult =
  | { type: 'success'; events: CricketEvent[] }
  | { type: 'invalid'; reason: string }
  | { type: 'game_won'; winnerId: string; events: CricketEvent[] }
  | { type: 'draw'; events: CricketEvent[] };

export interface CricketOutcome {
  state: CricketGameState;
  result: CricketResult;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createCricketGame(
  players: Player[],
  settings: Partial<CricketSettings> = {},
): CricketGameState {
  if (players.length === 0) {
    throw new Error('createCricketGame requires at least one player');
  }
  const fullSettings: CricketSettings = { ...DEFAULT_CRICKET_SETTINGS, ...settings };
  const playerStates: Record<string, CricketPlayerState> = {};
  for (const player of players) {
    const marks: Record<string, number> = {};
    for (const target of fullSettings.targets) {
      marks[String(target)] = 0;
    }
    playerStates[player.id] = { marks, points: 0 };
  }
  return {
    settings: fullSettings,
    playerIds: players.map((player) => player.id),
    players: playerStates,
    currentPlayerIndex: 0,
    currentTurn: null,
    history: [],
    status: 'in_progress',
    winnerId: null,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function currentPlayerId(state: CricketGameState): string {
  return state.playerIds[state.currentPlayerIndex];
}

export function isFinished(state: CricketGameState): boolean {
  return state.status === 'finished';
}

export function getWinner(state: CricketGameState): string | null {
  return state.winnerId;
}

/** Marks contributed by a dart (RULES.md: S=1, D=2, T=3, inner bull=2, outer=1). */
export function dartMarks(dart: DartThrow): number {
  switch (dart.kind) {
    case 'miss':
      return 0;
    case 'single':
      return 1;
    case 'double':
      return 2;
    case 'triple':
      return 3;
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function throwDart(state: CricketGameState, dart: DartThrow): CricketOutcome {
  if (state.status === 'finished') {
    return { state, result: { type: 'invalid', reason: 'Game already finished' } };
  }

  const playerId = currentPlayerId(state);
  const turn: CricketTurn = state.currentTurn ?? {
    playerId,
    throws: [],
    startMarks: { ...state.players[playerId].marks },
    startPoints: state.players[playerId].points,
  };

  if (turn.throws.length >= DARTS_PER_TURN) {
    return {
      state,
      result: { type: 'invalid', reason: `Turn already has ${DARTS_PER_TURN} darts` },
    };
  }

  const throws = [...turn.throws, dart];

  // Recompute the player's live marks/points from the turn's start snapshot
  // (opponents' marks are unchanged during this player's turn).
  const playerState: CricketPlayerState = {
    marks: { ...turn.startMarks },
    points: turn.startPoints,
  };
  const events: CricketEvent[] = [];
  for (const thrown of throws) {
    events.push(...applyDart(playerState, state, playerId, thrown));
  }

  const next: CricketGameState = {
    ...state,
    players: { ...state.players, [playerId]: playerState },
    currentTurn: { ...turn, throws },
  };

  // Win / deadlock / draw resolution (RULES.md → Cricket).
  const finished = resolveFinish(next, playerId);
  if (finished) return finished;

  // The turn automatically ends after the last dart (RULES.md).
  if (throws.length === DARTS_PER_TURN) {
    return completeTurn(next, events);
  }
  return { state: next, result: { type: 'success', events } };
}

export function endTurn(state: CricketGameState): CricketOutcome {
  if (state.status === 'finished') {
    return { state, result: { type: 'invalid', reason: 'Game already finished' } };
  }
  const turn = state.currentTurn;
  if (!turn || turn.throws.length === 0) {
    return { state, result: { type: 'invalid', reason: 'No darts thrown in the current turn' } };
  }

  return completeTurn(state, []);
}

export function undoLastThrow(state: CricketGameState): CricketOutcome {
  // Case 1: rewind a finished game (win or draw) to the last turn.
  if (state.status === 'finished') {
    if (state.history.length === 0) {
      return { state, result: { type: 'invalid', reason: 'Nothing to undo' } };
    }
    return restoreLastTurn({ ...state, status: 'in_progress', winnerId: null });
  }

  // Case 2: mid-turn — drop the last dart and recompute the player's state.
  const turn = state.currentTurn;
  if (turn && turn.throws.length > 0) {
    const throws = turn.throws.slice(0, -1);
    const playerState: CricketPlayerState = {
      marks: { ...turn.startMarks },
      points: turn.startPoints,
    };
    for (const thrown of throws) {
      applyDart(playerState, state, turn.playerId, thrown);
    }
    return {
      state: {
        ...state,
        players: { ...state.players, [turn.playerId]: playerState },
        currentTurn: throws.length === 0 ? null : { ...turn, throws },
      },
      result: { type: 'success', events: [] },
    };
  }

  // Case 3: between turns — restore the last completed turn.
  if (state.history.length === 0) {
    return { state, result: { type: 'invalid', reason: 'Nothing to undo' } };
  }
  return restoreLastTurn(state);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Apply one dart to `playerState`, scoring marks/points against the live
 * opponents in `state`. Mutates `playerState`; returns resulting events.
 */
function applyDart(
  playerState: CricketPlayerState,
  state: CricketGameState,
  playerId: string,
  dart: DartThrow,
): CricketEvent[] {
  if (dart.kind === 'miss') return [];
  const target = dart.target;
  if (!state.settings.targets.includes(target)) return [];

  const key = String(target);
  const wasClosed = playerState.marks[key] >= 3;
  const newMarks = playerState.marks[key] + dartMarks(dart);
  playerState.marks[key] = newMarks;

  const events: CricketEvent[] = [];
  if (newMarks >= 3 && !wasClosed) {
    events.push({ type: 'target_closed', target, playerId });
  }
  // Points only on targets already closed (RULES.md): the closing dart
  // itself never scores.
  if (wasClosed && opponentHasOpen(state, playerId, key)) {
    const points = dartValue(dart);
    playerState.points += points;
    events.push({ type: 'points_scored', playerId, points });
  }
  return events;
}

/** True while at least one opponent has the target open (< 3 marks). */
function opponentHasOpen(state: CricketGameState, playerId: string, key: string): boolean {
  return state.playerIds.some((id) => id !== playerId && (state.players[id].marks[key] ?? 0) < 3);
}

function allTargetsClosed(state: CricketGameState, playerId: string): boolean {
  return state.settings.targets.every(
    (target) => (state.players[playerId].marks[String(target)] ?? 0) >= 3,
  );
}

/**
 * Win conditions, checked after every dart (RULES.md → Cricket):
 * 1. Every player has closed all targets → deadlock: most points wins,
 *    equal points is a draw.
 * 2. Otherwise the thrower wins immediately when they close all targets
 *    with points greater than or equal to every opponent.
 */
function resolveFinish(state: CricketGameState, playerId: string): CricketOutcome | null {
  if (state.playerIds.every((id) => allTargetsClosed(state, id))) {
    const leader = maxPointsPlayer(state);
    const tied = state.playerIds.filter(
      (id) => state.players[id].points === state.players[leader].points,
    );
    if (tied.length > 1) {
      return finishGame(state, { type: 'draw', events: [] });
    }
    return finishGame(state, { type: 'game_won', winnerId: leader, events: [] });
  }

  if (
    allTargetsClosed(state, playerId) &&
    state.players[playerId].points >=
      Math.max(...state.playerIds.map((id) => state.players[id].points))
  ) {
    return finishGame(state, {
      type: 'game_won',
      winnerId: playerId,
      events: [],
    });
  }

  return null;
}

function maxPointsPlayer(state: CricketGameState): string {
  return state.playerIds.reduce((best, id) =>
    state.players[id].points > state.players[best].points ? id : best,
  );
}

function finishGame(state: CricketGameState, result: CricketResult): CricketOutcome {
  const turn = state.currentTurn;
  if (!turn) {
    return { state, result: { type: 'invalid', reason: 'No current turn' } };
  }
  const winnerId = result.type === 'game_won' ? result.winnerId : null;
  const next: CricketGameState = {
    ...state,
    history: [...state.history, turn],
    currentTurn: null,
    status: 'finished',
    winnerId,
  };
  return { state: next, result };
}

function completeTurn(state: CricketGameState, events: CricketEvent[]): CricketOutcome {
  const turn = state.currentTurn;
  if (!turn) {
    return { state, result: { type: 'invalid', reason: 'No current turn' } };
  }
  const next: CricketGameState = {
    ...state,
    history: [...state.history, turn],
    currentTurn: null,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.playerIds.length,
  };
  return {
    state: next,
    result: { type: 'success', events: [...events, { type: 'turn_completed' }] },
  };
}

function restoreLastTurn(state: CricketGameState): CricketOutcome {
  const last = state.history[state.history.length - 1];
  const next: CricketGameState = {
    ...state,
    history: state.history.slice(0, -1),
    players: {
      ...state.players,
      [last.playerId]: {
        marks: { ...last.startMarks },
        points: last.startPoints,
      },
    },
    currentPlayerIndex: state.playerIds.indexOf(last.playerId),
    currentTurn: { ...last },
  };
  return { state: next, result: { type: 'success', events: [] } };
}
