/**
 * X01 game engine — pure domain logic, no Angular.
 * Implements exactly the rules locked in RULES.md.
 *
 * All functions are pure: they return a new state plus a structured
 * result; the UI never re-implements rules.
 */
import { DartThrow, dartValue, isDouble } from '../models/dart-throw';
import { DARTS_PER_TURN, Turn } from '../models/turn';
import { Player } from '../models/player';

export interface X01Settings {
  startingScore: 301 | 501 | 701;
  /** First turn of the game must hit a double before any score counts (RULES.md). */
  doubleIn: boolean;
  /** Winning dart must be a double (RULES.md). */
  doubleOut: boolean;
}

export const DEFAULT_X01_SETTINGS: X01Settings = {
  startingScore: 501,
  doubleIn: false,
  doubleOut: true,
};

/** A single X01 turn with its score bookkeeping. */
export interface X01Turn extends Turn {
  /** Score at the start of the turn (used for bust revert and undo). */
  startScore: number;
  /** Score after this turn's scored darts. */
  endScore: number;
  busted: boolean;
  doubleInHit: boolean;
}

export interface X01GameState {
  settings: X01Settings;
  /** Player ids in turn order (fixed rotation). */
  playerIds: string[];
  /** Live score per player. */
  scores: Record<string, number>;
  currentPlayerIndex: number;
  /** The in-progress turn, or null between turns. */
  currentTurn: X01Turn | null;
  /** Completed turns (scored, busted or winning) — supports undo. */
  history: X01Turn[];
  status: 'in_progress' | 'finished';
  winnerId: string | null;
}

export type X01Event =
  { type: 'turn_completed' } | { type: 'bust' } | { type: 'double_in' } | { type: 'checkout' };

export type X01Result =
  | { type: 'success'; events: X01Event[] }
  | { type: 'bust'; events: X01Event[] }
  | { type: 'invalid'; reason: string }
  | { type: 'game_won'; winnerId: string; events: X01Event[] };

export interface X01Outcome {
  state: X01GameState;
  result: X01Result;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createX01Game(
  players: Player[],
  settings: Partial<X01Settings> = {},
): X01GameState {
  if (players.length === 0) {
    throw new Error('createX01Game requires at least one player');
  }
  const fullSettings: X01Settings = { ...DEFAULT_X01_SETTINGS, ...settings };
  const scores: Record<string, number> = {};
  for (const player of players) {
    scores[player.id] = fullSettings.startingScore;
  }
  return {
    settings: fullSettings,
    playerIds: players.map((player) => player.id),
    scores,
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

export function currentPlayerId(state: X01GameState): string {
  return state.playerIds[state.currentPlayerIndex];
}

export function isFinished(state: X01GameState): boolean {
  return state.status === 'finished';
}

export function getWinner(state: X01GameState): string | null {
  return state.winnerId;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function throwDart(state: X01GameState, dart: DartThrow): X01Outcome {
  if (state.status === 'finished') {
    return { state, result: { type: 'invalid', reason: 'Game already finished' } };
  }

  const playerId = currentPlayerId(state);
  const turn: X01Turn = state.currentTurn ?? {
    playerId,
    throws: [],
    startScore: state.scores[playerId],
    endScore: state.scores[playerId],
    busted: false,
    doubleInHit: false,
  };

  if (turn.throws.length >= DARTS_PER_TURN) {
    return {
      state,
      result: { type: 'invalid', reason: `Turn already has ${DARTS_PER_TURN} darts` },
    };
  }

  const throws = [...turn.throws, dart];
  const doubleInRequired = needsDoubleIn(state, playerId);
  const updated = computeTurn({ ...turn, throws }, state.settings, doubleInRequired);
  const newScore = updated.endScore;

  // Checkout / bust evaluation (RULES.md → X01).
  if (newScore === 0) {
    const validCheckout = !state.settings.doubleOut || isDouble(dart);
    if (validCheckout) {
      return finishGame(state, updated, playerId);
    }
    // Landed on 0 with a non-double while double-out is on → bust.
    return bustTurn(state, updated, playerId);
  }
  if (newScore < 0) {
    return bustTurn(state, updated, playerId);
  }
  if (newScore === 1 && state.settings.doubleOut) {
    return bustTurn(state, updated, playerId);
  }

  // Normal scoring dart: update the live score.
  const next: X01GameState = {
    ...state,
    scores: { ...state.scores, [playerId]: newScore },
    currentTurn: updated,
  };

  // The turn automatically ends after the last dart (RULES.md).
  if (throws.length === DARTS_PER_TURN) {
    return completeTurn(next);
  }
  return {
    state: next,
    result: { type: 'success', events: successEvents(updated, doubleInRequired) },
  };
}

export function endTurn(state: X01GameState): X01Outcome {
  if (state.status === 'finished') {
    return { state, result: { type: 'invalid', reason: 'Game already finished' } };
  }
  const turn = state.currentTurn;
  if (!turn || turn.throws.length === 0) {
    return { state, result: { type: 'invalid', reason: 'No darts thrown in the current turn' } };
  }

  const playerId = currentPlayerId(state);
  const next: X01GameState = {
    ...state,
    scores: { ...state.scores, [playerId]: turn.busted ? turn.startScore : turn.endScore },
  };
  return completeTurn(next);
}

export function undoLastThrow(state: X01GameState): X01Outcome {
  // Case 1: rewind a finished game (undo the checkout turn).
  if (state.status === 'finished') {
    if (state.history.length === 0) {
      return { state, result: { type: 'invalid', reason: 'Nothing to undo' } };
    }
    return restoreLastTurn({ ...state, status: 'in_progress', winnerId: null });
  }

  // Case 2: mid-turn — drop the last dart and recompute the turn.
  const turn = state.currentTurn;
  if (turn && turn.throws.length > 0) {
    const throws = turn.throws.slice(0, -1);
    const doubleInRequired = needsDoubleIn(state, turn.playerId);
    const updated = computeTurn({ ...turn, throws }, state.settings, doubleInRequired);
    const cleared: X01Turn = { ...updated, busted: false };
    const scores = { ...state.scores, [turn.playerId]: updated.endScore };
    return {
      state: {
        ...state,
        scores,
        currentTurn: throws.length === 0 ? null : cleared,
      },
      result: { type: 'success', events: [] },
    };
  }

  // Case 3: between turns — restore the last completed turn so its darts
  // can be undone one by one (covers busted and winning turns).
  if (state.history.length === 0) {
    return { state, result: { type: 'invalid', reason: 'Nothing to undo' } };
  }
  return restoreLastTurn(state);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Double-in applies only to a player's first turn (RULES.md). */
function needsDoubleIn(state: X01GameState, playerId: string): boolean {
  return state.settings.doubleIn && !state.history.some((turn) => turn.playerId === playerId);
}

/** Total scored value of the throws, honoring double-in gating. */
function turnDelta(
  throws: DartThrow[],
  doubleInRequired: boolean,
): { delta: number; doubleInHit: boolean } {
  let delta = 0;
  let doubleInHit = false;
  for (const dart of throws) {
    if (dart.kind === 'miss') continue;
    if (doubleInRequired && !doubleInHit) {
      if (isDouble(dart)) {
        doubleInHit = true;
        delta += dartValue(dart);
      }
      continue;
    }
    delta += dartValue(dart);
  }
  return { delta, doubleInHit };
}

function computeTurn(turn: X01Turn, settings: X01Settings, doubleInRequired: boolean): X01Turn {
  const { delta, doubleInHit } = turnDelta(turn.throws, doubleInRequired);
  return {
    ...turn,
    endScore: turn.startScore - delta,
    doubleInHit: doubleInRequired ? doubleInHit : true,
  };
}

function successEvents(turn: X01Turn, doubleInRequired: boolean): X01Event[] {
  return doubleInRequired && turn.doubleInHit ? [{ type: 'double_in' }] : [];
}

/** Play passes to the next player immediately after a bust (RULES.md). */
function bustTurn(state: X01GameState, turn: X01Turn, playerId: string): X01Outcome {
  const bustedTurn: X01Turn = { ...turn, busted: true, endScore: turn.startScore };
  const next: X01GameState = {
    ...state,
    scores: { ...state.scores, [playerId]: turn.startScore },
    currentTurn: bustedTurn,
  };
  return completeTurn(next, {
    type: 'bust',
    events: [{ type: 'bust' }],
  });
}

function finishGame(state: X01GameState, turn: X01Turn, winnerId: string): X01Outcome {
  const next: X01GameState = {
    ...state,
    scores: { ...state.scores, [winnerId]: 0 },
    history: [...state.history, turn],
    currentTurn: null,
    status: 'finished',
    winnerId,
  };
  return {
    state: next,
    result: { type: 'game_won', winnerId, events: [{ type: 'checkout' }] },
  };
}

function completeTurn(state: X01GameState, result?: X01Result): X01Outcome {
  const turn = state.currentTurn;
  if (!turn) {
    return { state, result: { type: 'invalid', reason: 'No current turn' } };
  }
  const next: X01GameState = {
    ...state,
    history: [...state.history, turn],
    currentTurn: null,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.playerIds.length,
  };
  return {
    state: next,
    result: result ?? { type: 'success', events: [{ type: 'turn_completed' }] },
  };
}

function restoreLastTurn(state: X01GameState): X01Outcome {
  const last = state.history[state.history.length - 1];
  const next: X01GameState = {
    ...state,
    history: state.history.slice(0, -1),
    // Live score must match the restored darts (same as mid-turn play).
    scores: { ...state.scores, [last.playerId]: last.endScore },
    currentPlayerIndex: state.playerIds.indexOf(last.playerId),
    currentTurn: { ...last },
  };
  return { state: next, result: { type: 'success', events: [] } };
}
