import {
  HISTORY_SCHEMA_VERSION,
  HISTORY_STORAGE_KEY,
  createMatchSummary,
  loadMatchHistory,
  saveMatchHistory,
} from './history-persist';

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

function x01Match() {
  return createMatchSummary({
    mode: 'x01',
    players: [
      { id: 'p1', name: 'Ada' },
      { id: 'p2', name: 'Grace' },
    ],
    winnerId: 'p1',
    settings: { startingScore: 301, doubleIn: false, doubleOut: true },
  });
}

function cricketDraw() {
  return createMatchSummary({
    mode: 'cricket',
    players: [
      { id: 'p1', name: 'Ada' },
      { id: 'p2', name: 'Grace' },
    ],
    winnerId: null,
  });
}

describe('history persist', () => {
  it('round-trips matches with a schema version', () => {
    const storage = memoryStorage();
    const matches = [x01Match(), cricketDraw()];
    saveMatchHistory(matches, storage);

    expect(JSON.parse(storage.getItem(HISTORY_STORAGE_KEY)!).version).toBe(HISTORY_SCHEMA_VERSION);
    expect(loadMatchHistory(storage)).toEqual(matches);
  });

  it('returns an empty list when storage is empty', () => {
    expect(loadMatchHistory(memoryStorage())).toEqual([]);
  });

  it('drops a wrong schema version', () => {
    const storage = memoryStorage();
    storage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({ version: 0, matches: [x01Match()] }),
    );

    expect(loadMatchHistory(storage)).toEqual([]);
    expect(storage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('drops invalid json', () => {
    const storage = memoryStorage();
    storage.setItem(HISTORY_STORAGE_KEY, '{nope');

    expect(loadMatchHistory(storage)).toEqual([]);
    expect(storage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('drops a payload without a matches array', () => {
    const storage = memoryStorage();
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: HISTORY_SCHEMA_VERSION }));

    expect(loadMatchHistory(storage)).toEqual([]);
    expect(storage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('skips a bad row and keeps valid rows', () => {
    const storage = memoryStorage();
    const good = x01Match();
    storage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({
        version: HISTORY_SCHEMA_VERSION,
        matches: [good, { mode: 'x01' }, cricketDraw()],
      }),
    );

    const loaded = loadMatchHistory(storage);
    expect(loaded.length).toBe(2);
    expect(loaded[0]).toEqual(good);
    expect(loaded[1].mode).toBe('cricket');
    expect(loaded[1].winnerId).toBeNull();
  });

  it('accepts an x01 starting score stored as a string', () => {
    const storage = memoryStorage();
    const match = x01Match();
    storage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({
        version: HISTORY_SCHEMA_VERSION,
        matches: [
          {
            ...match,
            settings: { ...match.settings, startingScore: '301' },
          },
        ],
      }),
    );

    const loaded = loadMatchHistory(storage);
    expect(loaded.length).toBe(1);
    expect(loaded[0].mode).toBe('x01');
    if (loaded[0].mode === 'x01') {
      expect(loaded[0].settings.startingScore).toBe(301);
    }
  });
});
