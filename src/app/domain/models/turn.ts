import { DartThrow } from './dart-throw';

/** A single turn of up to 3 darts for one player. */
export interface Turn {
  playerId: string;
  throws: DartThrow[];
}
