/** Stable key; schema version lives in the payload (ROADMAP 5.2b). */
export const HISTORY_STORAGE_KEY = 'ng-darts.history';
export const HISTORY_SCHEMA_VERSION = 1;

export type MatchPlayer = { id: string; name: string };

export type X01MatchSettings = {
  startingScore: 301 | 501 | 701;
  doubleIn: boolean;
  doubleOut: boolean;
};

export type CricketMatchSettings = { scoring: 'standard' };

type MatchSummaryBase = {
  id: string;
  players: MatchPlayer[];
  winnerId: string | null;
  finishedAt: string;
};

export type MatchSummary =
  | (MatchSummaryBase & { mode: 'x01'; settings: X01MatchSettings })
  | (MatchSummaryBase & { mode: 'cricket'; settings: CricketMatchSettings });

/** Fields copied from a finished live session (no engine state). */
export type MatchHistorySource =
  | {
      mode: 'x01';
      players: MatchPlayer[];
      winnerId: string | null;
      settings: X01MatchSettings;
    }
  | {
      mode: 'cricket';
      players: MatchPlayer[];
      winnerId: string | null;
    };

export function createMatchSummary(source: MatchHistorySource): MatchSummary {
  const players = source.players.map((player) => ({ id: player.id, name: player.name }));
  const base = {
    id: crypto.randomUUID(),
    players,
    winnerId: source.winnerId,
    finishedAt: new Date().toISOString(),
  };

  if (source.mode === 'x01') {
    const score = Number(source.settings.startingScore);
    return {
      ...base,
      mode: 'x01',
      settings: {
        startingScore: score as X01MatchSettings['startingScore'],
        doubleIn: source.settings.doubleIn,
        doubleOut: source.settings.doubleOut,
      },
    };
  }

  return { ...base, mode: 'cricket', settings: { scoring: 'standard' } };
}

export function saveMatchHistory(
  matches: MatchSummary[],
  storage: Storage = localStorage,
): void {
  try {
    storage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({ version: HISTORY_SCHEMA_VERSION, matches }),
    );
  } catch {
    /* keep the in-memory list */
  }
}

/** Read versioned history. Invalid or stale payloads are dropped. */
export function loadMatchHistory(storage: Storage = localStorage): MatchSummary[] {
  const raw = storage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const matches = unwrap(JSON.parse(raw));
    if (matches) return matches;
  } catch {
    /* fall through and drop */
  }

  try {
    storage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

function unwrap(parsed: unknown): MatchSummary[] | null {
  if (!isRecord(parsed)) return null;
  if (parsed['version'] !== HISTORY_SCHEMA_VERSION) return null;
  if (!Array.isArray(parsed['matches'])) return null;
  const matches: MatchSummary[] = [];
  for (const row of parsed['matches']) {
    const match = normalizeMatch(row);
    if (match) matches.push(match);
  }
  return matches;
}

function normalizeMatch(value: unknown): MatchSummary | null {
  if (!isMatchSummary(value)) return null;
  if (value.mode === 'x01') {
    return {
      ...value,
      settings: {
        ...value.settings,
        startingScore: Number(value.settings.startingScore) as X01MatchSettings['startingScore'],
      },
    };
  }
  return value;
}

function isMatchSummary(value: unknown): value is MatchSummary {
  if (!isRecord(value)) return false;
  if (typeof value['id'] !== 'string' || value['id'].length === 0) return false;
  if (typeof value['finishedAt'] !== 'string' || value['finishedAt'].length === 0) return false;
  if (value['winnerId'] !== null && typeof value['winnerId'] !== 'string') return false;
  if (!Array.isArray(value['players']) || value['players'].length === 0) return false;
  if (!value['players'].every(isMatchPlayer)) return false;
  if (!isRecord(value['settings'])) return false;

  if (value['mode'] === 'x01') {
    return isX01Settings(value['settings']);
  }
  if (value['mode'] === 'cricket') {
    return value['settings']['scoring'] === 'standard';
  }
  return false;
}

function isMatchPlayer(value: unknown): value is MatchPlayer {
  return isRecord(value) && typeof value['id'] === 'string' && typeof value['name'] === 'string';
}

function isX01Settings(value: Record<string, unknown>): boolean {
  const score = Number(value['startingScore']);
  return (
    (score === 301 || score === 501 || score === 701) &&
    typeof value['doubleIn'] === 'boolean' &&
    typeof value['doubleOut'] === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
