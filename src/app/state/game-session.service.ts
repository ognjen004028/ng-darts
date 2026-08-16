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

/**
 * Active match session: the domain shell composed with mode-specific
 * settings and live engine state. Cricket fields arrive with the
 * cricket engine (Phase 4).
 */
export interface ActiveSession extends GameSessionShell {
  /** Resolved X01 settings, or null while playing Cricket. */
  x01Settings: X01Settings | null;
  /** Live X01 game state, or null until the cricket engine lands. */
  gameState: X01GameState | null;
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
  readonly gameState = computed<X01GameState | null>(() => this.session()?.gameState ?? null);

  /** True once a game has been started — guards `/game/*` routes. */
  readonly hasSession = computed(() => this.session() !== null);

  /**
   * Start a new match. For X01 the engine state is created here; Cricket
   * gets a shell session until its engine exists (Phase 4).
   */
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
        gameState,
      });
      return;
    }

    this.session.set({
      mode,
      players: [...players],
      status: 'in_progress',
      winnerId: null,
      x01Settings: null,
      gameState: null,
    });
  }

  // ---------------------------------------------------------------------------
  // Game actions — delegate to the engine, then sync the session shell.
  // UI never re-implements rules (architecture.md); it just calls these.
  // ---------------------------------------------------------------------------

  /** Apply a dart in the active X01 game. Returns the engine result, or null when no X01 game is active. */
  applyThrow(dart: DartThrow): X01Result | null {
    const state = this.session()?.gameState;
    if (!state) return null;
    const outcome = engineThrowDart(state, dart);
    this.updateX01GameState(outcome.state);
    return outcome.result;
  }

  /** End the current turn in the active X01 game. Returns the engine result, or null when no X01 game is active. */
  endTurn(): X01Result | null {
    const state = this.session()?.gameState;
    if (!state) return null;
    const outcome = engineEndTurn(state);
    this.updateX01GameState(outcome.state);
    return outcome.result;
  }

  /** Undo the last dart (including a busted or winning turn) in the active X01 game. Returns the engine result, or null when no X01 game is active. */
  undoLastThrow(): X01Result | null {
    const state = this.session()?.gameState;
    if (!state) return null;
    const outcome = engineUndoLastThrow(state);
    this.updateX01GameState(outcome.state);
    return outcome.result;
  }

  /** Clear the session (new game / leaving a match). */
  reset(): void {
    this.session.set(null);
  }

  /** Write back engine state and mirror status/winner on the session shell. */
  private updateX01GameState(state: X01GameState): void {
    const current = this.session();
    if (!current) return;
    this.session.set({
      ...current,
      status: state.status,
      winnerId: state.winnerId,
      gameState: state,
    });
  }
}
