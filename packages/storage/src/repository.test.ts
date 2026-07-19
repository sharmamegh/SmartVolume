import { describe, expect, it } from 'vitest';
import { createLocalRepository } from './repository';
describe('local repository', () => {
  it('recovers from malformed storage and deletes all data', async () => {
    const map = new Map([['smartvolume.local.v1', '{bad']]);
    const storage = {
      get: async (key: string) => map.get(key) ?? null,
      set: async (key: string, value: string) => { map.set(key, value); },
      remove: async (key: string) => { map.delete(key); }
    };
    const repository = createLocalRepository(storage);
    expect((await repository.load()).version).toBe(1);
    await repository.setOnboardingComplete();
    expect((await repository.load()).onboardingComplete).toBe(true);
    await repository.deleteAll();
    expect((await repository.load()).onboardingComplete).toBe(false);
  });
  it('migrates version zero settings', async () => {
    const map = new Map([['smartvolume.local.v1', JSON.stringify({
      version: 0,
      settings: { sessionSeconds: 10 },
      sessions: [],
      onboardingComplete: true,
    })]]);
    const repository = createLocalRepository({
      get: async key => map.get(key) ?? null,
      set: async (key, value) => { map.set(key, value); },
      remove: async key => { map.delete(key); },
    });
    const migrated = await repository.load();
    expect(migrated.version).toBe(1);
    expect(migrated.settings.sessionSeconds).toBe(10);
    expect(migrated.settings.maxRecommendedVolume).toBeGreaterThan(0);
  });
});
