import type { ActiveSession } from './game-session.service';

/** Stable key; schema version lives in the payload (ROADMAP 5.2). */
export const SESSION_STORAGE_KEY = 'ng-darts.session';
export const SESSION_SCHEMA_VERSION = 1;

/**
 * Write the live session, or remove the key when `session` is null.
 * Failures (quota, private mode) leave the in-memory game running.
 */
export function saveActiveSession(
  session: ActiveSession | null,
  storage: Storage = localStorage,
): void {
  try {
    if (!session) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ version: SESSION_SCHEMA_VERSION, session }),
    );
  } catch {
    /* continue in memory */
  }
}

/** Read a versioned session. Invalid or stale payloads are dropped. */
export function loadActiveSession(storage: Storage = localStorage): ActiveSession | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = unwrap(JSON.parse(raw));
    if (session) return session;
  } catch {
    /* fall through and drop */
  }

  saveActiveSession(null, storage);
  return null;
}

function unwrap(parsed: unknown): ActiveSession | null {
  if (!isRecord(parsed)) return null;
  if (parsed['version'] !== SESSION_SCHEMA_VERSION) return null;
  return isActiveSession(parsed['session']) ? parsed['session'] : null;
}

function isActiveSession(value: unknown): value is ActiveSession {
  if (!isRecord(value)) return false;
  if (value['status'] !== 'in_progress' && value['status'] !== 'finished') return false;
  if (!Array.isArray(value['players']) || value['players'].length === 0) return false;
  if (!isRecord(value['settings']) || !isRecord(value['gameState'])) return false;

  const gameState = value['gameState'];
  if (value['mode'] === 'x01') {
    return Array.isArray(gameState['playerIds']) && isRecord(gameState['scores']);
  }
  if (value['mode'] === 'cricket') {
    return Array.isArray(gameState['playerIds']) && isRecord(gameState['players']);
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
