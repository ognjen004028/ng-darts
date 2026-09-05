import { DartThrow } from '../app/domain/models/dart-throw';
import { GameSessionService } from '../app/state/game-session.service';
import { throwAll } from './darts';

export function applyDarts(session: GameSessionService, darts: DartThrow[]): void {
  throwAll((dart) => session.applyThrow(dart), darts);
}
