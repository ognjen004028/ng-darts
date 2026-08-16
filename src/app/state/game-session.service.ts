import { Injectable, computed, signal } from '@angular/core';
import { Player } from '../domain/models/player';
import { DartThrow } from '../domain/models/dart-throw';
import {
  GameSession as GameSessionShell,
  GameMode,
  GameStatus,
} from '../domain/models/game';
import {
  X01GameState,
  X01Result,
  X01Settings,
  createX01Game,
  endTurn as engineEndTurn,
  throwDart as engineThrowDart,
  undoLastThrow as engineUndoLastThrow,
} from '../domain/x01/x01-engine';
import {
  CricketGameState,
  CricketResult,
  CricketSettings,
  createCricketGame,
  endTurn as cricketEndTurn,
  throwDart as cricketThrowDart,
  undoLastThrow as cricketUndoLastThrow,
} from '../domain/cricket/cricket-engine';

/** Union of engine results returned by the mode-dispatched game actions. */
export type GameActionResult = X01Result | CricketResult;

/**
 * Active match session: the domain shell composed with mode-specific
 * settings and live engine state.
 */
export interface ActiveSession extends GameSessionShell {
  /** Resolved X01 settings, or null while playing Cricket. */
  x01Settings: X01Settings | null;
  /** Resolved Cricket settings, or null while playing X01. */
  cricketSettings: CricketSettings | null;
  /** Live X01 game state, or null while playing Cricket. */
  x01GameState: X01GameState | null;
  /** Live Cricket game state, or null while playing X01. */
  cricketGameState: CricketGameState | null;
}

/**
 * Single source of truth for the in-progress match (ROADMAP 2.1).
 * Home writes on Start; game screens read. Signals throughout.
 */
@Injectable({ providedIn: 'root' })
export class GameSessionService {
  private readonly session = signal<ActiveSession | null>(null);

  readonly players = computed(() => this.session()?.players ?? []);
  readonly mode = computed<GameMode | null>(() => this.session()?.mode ?? null);
  readonly status = computed<GameStatus | null>(() => this.session()?.status ?? null);
  readonly winnerId = computed<string | null>(() => this.session()?.winnerId ?? null);
  readonly x01Settings = computed<X01Settings | null>(() => this.session()?.x01Settings ?? null);
  readonly cricketSettings = computed<CricketSettings | null>(
    () => this.session()?.cricketSettings ?? null,
  );
  readonly x01GameState = computed<X01GameState | null>(
    () => this.session()?.x01GameState ?? null,
  );
  readonly cricketGameState = computed<CricketGameState | null>(
    () => this.session()?.cricketGameState ?? null,
  );

  /** True once a game has been started — guards `/game/*` routes. */
  readonly hasSession = computed(() => this.session() !== null);

  /** Start a new match. Engine state is created here for both modes. */
  startGame(mode: GameMode, players: Player[], settings: Partial<X01Settings> = {}): void {
    if (players.length === 0) {
      throw new Error('startGame requires at least one player');
    }

    if (mode === 'x01') {
      const gameState = createX01Game(players, settings);
      this.session.set({
        mode,
        players: [...players],
        status: gameState.status,
        winnerId: gameState.winnerId,
        x01Settings: gameState.settings,
        cricketSettings: null,
        x01GameState: gameState,
        cricketGameState: null,
      });
      return;
    }

    const gameState = createCricketGame(players);
    this.session.set({
      mode,
      players: [...players],
      status: gameState.status,
      winnerId: gameState.winnerId,
      x01Settings: null,
      cricketSettings: gameState.settings,
      x01GameState: null,
      cricketGameState: gameState,
    });
  }

  // ---------------------------------------------------------------------------
  // Game actions — delegate to the active mode's engine, then sync the shell.
  // UI never re-implements rules (architecture.md); it just calls these.
  // ---------------------------------------------------------------------------

  /** Apply a dart in the active game. Returns the engine result, or null when no game is active. */
  applyThrow(dart: DartThrow): GameActionResult | null {
    const session = this.session();
    if (!session) return null;

    if (session.mode === 'x01') {
      const state = session.x01GameState;
      if (!state) return null;
      const outcome = engineThrowDart(state, dart);
      this.updateX01GameState(outcome.state);
      return outcome.result;
    }

    const state = session.cricketGameState;
    if (!state) return null;
    const outcome = cricketThrowDart(state, dart);
    this.updateCricketGameState(outcome.state);
    return outcome.result;
  }

  /** End the current turn. Returns the engine result, or null when no game is active. */
  endTurn(): GameActionResult | null {
    const session = this.session();
    if (!session) return null;

    if (session.mode === 'x01') {
      const state = session.x01GameState;
      if (!state) return null;
      const outcome = engineEndTurn(state);
      this.updateX01GameState(outcome.state);
      return outcome.result;
    }

    const state = session.cricketGameState;
    if (!state) return null;
    const outcome = cricketEndTurn(state);
    this.updateCricketGameState(outcome.state);
    return outcome.result;
  }

  /** Undo the last dart (including busted / winning / drawn turns). Returns the engine result, or null when no game is active. */
  undoLastThrow(): GameActionResult | null {
    const session = this.session();
    if (!session) return null;

    if (session.mode === 'x01') {
      const state = session.x01GameState;
      if (!state) return null;
      const outcome = engineUndoLastThrow(state);
      this.updateX01GameState(outcome.state);
      return outcome.result;
    }

    const state = session.cricketGameState;
    if (!state) return null;
    const outcome = cricketUndoLastThrow(state);
    this.updateCricketGameState(outcome.state);
    return outcome.result;
  }

  /** Clear the session (new game / leaving a match). */
  reset(): void {
    this.session.set(null);
  }

  /** Write back X01 engine state and mirror status/winner on the session shell. */
  private updateX01GameState(state: X01GameState): void {
    const current = this.session();
    if (!current) return;
    this.session.set({
      ...current,
      status: state.status,
      winnerId: state.winnerId,
      x01GameState: state,
    });
  }

  /** Write back Cricket engine state and mirror status/winner on the session shell. */
  private updateCricketGameState(state: CricketGameState): void {
    const current = this.session();
    if (!current) return;
    this.session.set({
      ...current,
      status: state.status,
      winnerId: state.winnerId,
      cricketGameState: state,
    });
  }
}
