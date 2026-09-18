import { Injectable, computed, inject, signal } from '@angular/core';
import { Player } from '../domain/models/player';
import { DartThrow } from '../domain/models/dart-throw';
import { GameMode, GameStatus } from '../domain/models/game';
import {
  X01GameState,
  X01Outcome,
  X01Settings,
  createX01Game,
  endTurn as engineEndTurn,
  throwDart as engineThrowDart,
  undoLastThrow as engineUndoLastThrow,
} from '../domain/x01/x01-engine';
import {
  CricketGameState,
  CricketOutcome,
  CricketSettings,
  createCricketGame,
  endTurn as cricketEndTurn,
  throwDart as cricketThrowDart,
  undoLastThrow as cricketUndoLastThrow,
} from '../domain/cricket/cricket-engine';
import { loadActiveSession, saveActiveSession } from './session-persist';
import { MatchHistoryService } from './match-history.service';

/** Union of engine results returned by the mode-dispatched game actions. */
export type GameActionResult = X01Outcome['result'] | CricketOutcome['result'];

/**
 * Active match session: one mode, with that mode's settings and live engine state.
 */
export type ActiveSession =
  | {
      mode: 'x01';
      players: Player[];
      status: GameStatus;
      winnerId: string | null;
      settings: X01Settings;
      gameState: X01GameState;
    }
  | {
      mode: 'cricket';
      players: Player[];
      status: GameStatus;
      winnerId: string | null;
      settings: CricketSettings;
      gameState: CricketGameState;
    };

/**
 * Single source of truth for the in-progress match (ROADMAP 2.1).
 * Home writes on Start; game screens read. Signals throughout.
 * Restores from localStorage so a refresh (or WebView kill) keeps the live game.
 */
@Injectable({ providedIn: 'root' })
export class GameSessionService {
  private readonly history = inject(MatchHistoryService);
  private readonly session = signal<ActiveSession | null>(loadActiveSession());

  readonly players = computed(() => this.session()?.players ?? []);
  readonly mode = computed<GameMode | null>(() => this.session()?.mode ?? null);
  readonly status = computed<GameStatus | null>(() => this.session()?.status ?? null);
  readonly winnerId = computed<string | null>(() => this.session()?.winnerId ?? null);
  readonly x01Settings = computed<X01Settings | null>(() => {
    const session = this.session();
    return session?.mode === 'x01' ? session.settings : null;
  });
  readonly cricketSettings = computed<CricketSettings | null>(() => {
    const session = this.session();
    return session?.mode === 'cricket' ? session.settings : null;
  });
  readonly x01GameState = computed<X01GameState | null>(() => {
    const session = this.session();
    return session?.mode === 'x01' ? session.gameState : null;
  });
  readonly cricketGameState = computed<CricketGameState | null>(() => {
    const session = this.session();
    return session?.mode === 'cricket' ? session.gameState : null;
  });

  /** True once a game has been started — guards `/game/*` routes. */
  readonly hasSession = computed(() => this.session() !== null);

  /** Start a new match. Engine state is created here for both modes. */
  startGame(mode: GameMode, players: Player[], settings: Partial<X01Settings> = {}): void {
    if (players.length === 0) {
      throw new Error('startGame requires at least one player');
    }

    const orderedPlayers = players.map((player, index) => ({ ...player, order: index }));

    if (mode === 'x01') {
      const gameState = createX01Game(orderedPlayers, settings);
      this.commit({
        mode,
        players: orderedPlayers,
        status: gameState.status,
        winnerId: gameState.winnerId,
        settings: gameState.settings,
        gameState,
      });
      return;
    }

    const gameState = createCricketGame(orderedPlayers);
    this.commit({
      mode,
      players: orderedPlayers,
      status: gameState.status,
      winnerId: gameState.winnerId,
      settings: gameState.settings,
      gameState,
    });
  }

  // ---------------------------------------------------------------------------
  // Game actions — delegate to the active mode's engine, then sync the shell.
  // UI never re-implements rules (architecture.md); it just calls these.
  // ---------------------------------------------------------------------------

  /** Apply a dart in the active game. Returns the engine result, or null when no game is active.
   *  Cricket requires `playerId` (the player whose zone was tapped). X01 ignores it.
   */
  applyThrow(dart: DartThrow, playerId?: string): GameActionResult | null {
    return this.runEngine(
      (state) => engineThrowDart(state, dart),
      (state) => {
        if (!playerId) {
          return { state, result: { type: 'invalid', reason: 'Player required' } };
        }
        return cricketThrowDart(state, dart, playerId);
      },
    );
  }

  /** End the current turn. Returns the engine result, or null when no game is active. */
  endTurn(): GameActionResult | null {
    return this.runEngine(engineEndTurn, cricketEndTurn);
  }

  /** Undo the last dart (including busted / winning / drawn turns). Returns the engine result, or null when no game is active. */
  undoLastThrow(): GameActionResult | null {
    const previous = this.session();
    const result = this.runEngine(engineUndoLastThrow, cricketUndoLastThrow);
    if (previous?.status === 'finished' && this.session()?.status === 'in_progress') {
      this.history.retractLast();
    }
    return result;
  }

  /** Clear the session (new game / leaving a match). */
  reset(): void {
    this.commit(null);
  }

  private commit(session: ActiveSession | null): void {
    const previous = this.session();
    this.session.set(session);
    saveActiveSession(session);
    if (previous?.status === 'in_progress' && session?.status === 'finished') {
      this.history.record(
        session.mode === 'x01'
          ? {
              mode: 'x01',
              players: session.players,
              winnerId: session.winnerId,
              settings: session.settings,
            }
          : {
              mode: 'cricket',
              players: session.players,
              winnerId: session.winnerId,
            },
      );
    }
  }

  private runEngine(
    x01: (state: X01GameState) => X01Outcome,
    cricket: (state: CricketGameState) => CricketOutcome,
  ): GameActionResult | null {
    const session = this.session();
    if (!session) return null;

    if (session.mode === 'x01') {
      const outcome = x01(session.gameState);
      this.commit({
        ...session,
        status: outcome.state.status,
        winnerId: outcome.state.winnerId,
        gameState: outcome.state,
      });
      return outcome.result;
    }

    const outcome = cricket(session.gameState);
    this.commit({
      ...session,
      status: outcome.state.status,
      winnerId: outcome.state.winnerId,
      gameState: outcome.state,
    });
    return outcome.result;
  }
}
