import { Player } from './player';

export type GameMode = 'cricket' | 'x01';

export type GameStatus = 'setup' | 'in_progress' | 'finished';

/**
 * Minimal session shell. Mode-specific game state (e.g. `X01GameState`)
 * lives with its engine and is composed by `GameSessionService` (Phase 2).
 */
export interface GameSession {
  mode: GameMode;
  players: Player[];
  status: GameStatus;
  winnerId: string | null;
}
