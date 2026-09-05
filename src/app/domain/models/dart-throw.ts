/**
 * Dart throw model — pure domain type, no Angular.
 *
 * Discriminated union so invalid combinations (e.g. a triple bull) are
 * unrepresentable at the type level.
 *
 * Value mapping (see RULES.md):
 * - miss: 0
 * - single bull (outer): 25
 * - double bull (inner): 50 — counts as D25 for double-in / double-out
 */

export type NumberSegment =
  1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export type Bull = 'bull';

export type DartTarget = NumberSegment | Bull;

export type DartThrow =
  | { kind: 'miss' }
  | { kind: 'single'; target: DartTarget }
  | { kind: 'double'; target: DartTarget }
  | { kind: 'triple'; target: NumberSegment };

/** Scored value of a dart (RULES.md → Dart values table). */
export function dartValue(dart: DartThrow): number {
  switch (dart.kind) {
    case 'miss':
      return 0;
    case 'single':
      return dart.target === 'bull' ? 25 : dart.target;
    case 'double':
      return dart.target === 'bull' ? 50 : dart.target * 2;
    case 'triple':
      return dart.target * 3;
  }
}

/** Inner bull and double segments count as doubles (RULES.md). */
export function isDouble(dart: DartThrow): boolean {
  return dart.kind === 'double';
}

export function isBull(dart: DartThrow): boolean {
  return dart.kind !== 'miss' && dart.target === 'bull';
}
