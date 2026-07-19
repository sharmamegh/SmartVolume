import { DEFAULT_SETTINGS, type SessionSummary, type Settings } from '@smartvolume/domain/models';

export interface PersistedState { version: 1; settings: Settings; sessions: SessionSummary[]; onboardingComplete: boolean }
type StoredState = {
  version?: number;
  settings?: Partial<Settings>;
  sessions?: SessionSummary[];
  onboardingComplete?: boolean;
};
const KEY = 'smartvolume.local.v1';
const initial: PersistedState = { version: 1, settings: DEFAULT_SETTINGS, sessions: [], onboardingComplete: false };
const cloneInitial = (): PersistedState => JSON.parse(JSON.stringify(initial)) as PersistedState;

export interface LocalRepository {
  load(): Promise<PersistedState>;
  saveSettings(settings: Settings): Promise<PersistedState>;
  addSession(session: SessionSummary): Promise<PersistedState>;
  setOnboardingComplete(): Promise<PersistedState>;
  deleteAll(): Promise<PersistedState>;
  exportJson(): Promise<string>;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createLocalRepository(storage: KeyValueStore): LocalRepository {
  const read = async (): Promise<PersistedState> => {
    try {
      const parsed = JSON.parse((await storage.get(KEY)) ?? '') as StoredState;
      if (parsed?.version === 1 && parsed.settings && parsed.sessions) {
        return {
          version: 1,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          sessions: parsed.sessions.slice(0, 100),
          onboardingComplete: Boolean(parsed.onboardingComplete),
        };
      }
      if (parsed?.version === 0) {
        return {
          version: 1,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, 100) : [],
          onboardingComplete: Boolean(parsed.onboardingComplete),
        };
      }
      return cloneInitial();
    } catch { return cloneInitial(); }
  };
  const write = async (state: PersistedState) => { await storage.set(KEY, JSON.stringify(state)); return state; };
  return {
    load: read,
    saveSettings: async settings => write({ ...(await read()), settings }),
    addSession: async session => {
      const current = await read();
      return write({ ...current, sessions: [session, ...current.sessions].slice(0, 100) });
    },
    setOnboardingComplete: async () => write({ ...(await read()), onboardingComplete: true }),
    deleteAll: async () => { await storage.remove(KEY); return cloneInitial(); },
    exportJson: async () => JSON.stringify(await read(), null, 2)
  };
}

const memory = new Map<string, string>();
export const memoryStore: KeyValueStore = {
  async get(key) { return memory.get(key) ?? null; },
  async set(key, value) { memory.set(key, value); },
  async remove(key) { memory.delete(key); }
};

function indexedDbStore(): KeyValueStore {
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('smartvolume', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('local');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = async <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) => {
    const database = await open();
    return new Promise<T>((resolve, reject) => {
      const request = operation(database.transaction('local', mode).objectStore('local'));
      request.onsuccess = () => { resolve(request.result); database.close(); };
      request.onerror = () => { reject(request.error); database.close(); };
    });
  };
  return {
    async get(key) { return (await transaction('readonly', store => store.get(key))) as string | null ?? null; },
    async set(key, value) { await transaction('readwrite', store => store.put(value, key)); },
    async remove(key) { await transaction('readwrite', store => store.delete(key)); }
  };
}

export const repository = createLocalRepository(typeof indexedDB === 'undefined' ? memoryStore : indexedDbStore());
