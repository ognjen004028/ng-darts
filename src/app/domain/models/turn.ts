import { DartThrow } from './dart-throw';

/** Maximum darts in one turn (RULES.md). */
export const DARTS_PER_TURN = 3;

/** A single turn of up to `DARTS_PER_TURN` darts for one player. */
export interface Turn {
  playerId: string;
  throws: DartThrow[];
}
