import { DartThrow } from '../app/domain/models/dart-throw';
import { GameSessionService } from '../app/state/game-session.service';
import { HISTORY_STORAGE_KEY } from '../app/state/history-persist';
import { SESSION_STORAGE_KEY } from '../app/state/session-persist';
import { throwAll } from './darts';

export function clearPersistedSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function clearPersistedHistory(): void {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

export function applyDarts(
  session: GameSessionService,
  darts: DartThrow[],
  playerId?: string,
): void {
  throwAll((dart) => session.applyThrow(dart, playerId), darts);
}
