import { DartThrow, NumberSegment } from '../app/domain/models/dart-throw';
import { Player } from '../app/domain/models/player';

export const s = (target: NumberSegment): DartThrow => ({ kind: 'single', target });
export const d = (target: NumberSegment): DartThrow => ({ kind: 'double', target });
export const t = (target: NumberSegment): DartThrow => ({ kind: 'triple', target });
export const singleBull = (): DartThrow => ({ kind: 'single', target: 'bull' });
export const doubleBull = (): DartThrow => ({ kind: 'double', target: 'bull' });
export const miss = (): DartThrow => ({ kind: 'miss' });

export function players(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
  }));
}

/** One player on 301: three T20, then T20 + T7 + D20 checkout. */
export const x01CheckoutFrom301: DartThrow[] = [t(20), t(20), t(20), t(20), t(7), d(20)];

/** Two players on 301. Player 2 misses between turns; last dart busts from 20. */
export const x01BustFrom301: DartThrow[] = [
  t(20),
  t(20),
  t(20),
  miss(),
  miss(),
  miss(),
  t(20),
  t(13),
  s(2),
  miss(),
  miss(),
  miss(),
  t(10),
];

/** Close 15–20 with triples, skip player 2, then close bull (D25 + 25). */
export const cricketCloseAll: DartThrow[] = [
  t(20),
  t(19),
  t(18),
  miss(),
  miss(),
  miss(),
  t(17),
  t(16),
  t(15),
  miss(),
  miss(),
  miss(),
  doubleBull(),
  singleBull(),
];

export function throwAll(apply: (dart: DartThrow) => void, darts: DartThrow[]): void {
  for (const dart of darts) apply(dart);
}
