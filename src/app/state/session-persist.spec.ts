import { createCricketGame } from '../domain/cricket/cricket-engine';
import { createX01Game } from '../domain/x01/x01-engine';
import { ActiveSession } from './game-session.service';
import {
  SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY,
  loadActiveSession,
  saveActiveSession,
} from './session-persist';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function x01Session(): ActiveSession {
  const players = [{ id: 'p1', name: 'Ada', order: 0 }];
  const gameState = createX01Game(players, { startingScore: 301, doubleOut: false });
  return {
    mode: 'x01',
    players,
    status: gameState.status,
    winnerId: gameState.winnerId,
    settings: gameState.settings,
    gameState,
  };
}

describe('session persist', () => {
  it('round-trips an x01 session with a schema version', () => {
    const storage = memoryStorage();
    const session = x01Session();
    saveActiveSession(session, storage);

    expect(JSON.parse(storage.getItem(SESSION_STORAGE_KEY)!).version).toBe(SESSION_SCHEMA_VERSION);
    expect(loadActiveSession(storage)).toEqual(session);
  });

  it('round-trips a cricket session', () => {
    const storage = memoryStorage();
    const players = [
      { id: 'p1', name: 'Ada', order: 0 },
      { id: 'p2', name: 'Grace', order: 1 },
    ];
    const gameState = createCricketGame(players);
    const session: ActiveSession = {
      mode: 'cricket',
      players,
      status: gameState.status,
      winnerId: gameState.winnerId,
      settings: gameState.settings,
      gameState,
    };

    saveActiveSession(session, storage);

    expect(loadActiveSession(storage)?.mode).toBe('cricket');
    expect(loadActiveSession(storage)?.gameState).toEqual(gameState);
  });

  it('returns null when storage is empty', () => {
    expect(loadActiveSession(memoryStorage())).toBeNull();
  });

  it('drops a wrong schema version', () => {
    const storage = memoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 0, session: x01Session() }));

    expect(loadActiveSession(storage)).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('drops invalid json', () => {
    const storage = memoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{nope');

    expect(loadActiveSession(storage)).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('drops a payload without a session', () => {
    const storage = memoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: SESSION_SCHEMA_VERSION }));

    expect(loadActiveSession(storage)).toBeNull();
  });

  it('removes the key when saving null', () => {
    const storage = memoryStorage();
    saveActiveSession(x01Session(), storage);
    saveActiveSession(null, storage);

    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
