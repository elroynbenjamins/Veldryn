import { GameState } from './types';

export const SAVE_SCHEMA_VERSION: GameState['version'] = 4;

type AnySave = Record<string, unknown> & { version?: number };

function withDefaults(raw: AnySave): GameState {
  const settings = (raw.settings ?? {}) as Record<string, unknown>;
  return {
    ...(raw as unknown as GameState),
    version: SAVE_SCHEMA_VERSION,
    createdAtMs: typeof raw.createdAtMs === 'number' ? raw.createdAtMs : Date.now(),
    character: (raw.character ?? null) as GameState['character'],
    inventory: (raw.inventory ?? { stacks: [], capacity: 60 }) as GameState['inventory'],
    activity: (raw.activity ?? null) as GameState['activity'],
    quests: Array.isArray(raw.quests) ? raw.quests as GameState['quests'] : [],
    unlockedMonsterIds: Array.isArray(raw.unlockedMonsterIds) ? raw.unlockedMonsterIds as string[] : ['MOSS_RAT'],
    defeatedBossIds: Array.isArray(raw.defeatedBossIds) ? raw.defeatedBossIds as string[] : [],
    skills: Array.isArray(raw.skills) ? raw.skills as GameState['skills'] : [],
    settings: {
      numberMode: settings.numberMode === 'exact' ? 'exact' : 'abbreviated',
      reduceMotion: settings.reduceMotion === true,
      textScale: ([1, 1.15, 1.3, 1.5] as const).includes(settings.textScale as 1 | 1.15 | 1.3 | 1.5)
        ? settings.textScale as 1 | 1.15 | 1.3 | 1.5
        : 1,
    },
  };
}

export function migrateSave(input: unknown): GameState {
  if (!input || typeof input !== 'object') throw new Error('Invalid VELDRYN save');
  const raw = input as AnySave;
  const version = typeof raw.version === 'number' ? raw.version : 1;
  if (version > SAVE_SCHEMA_VERSION) {
    throw new Error(`Save version ${version} is newer than supported version ${SAVE_SCHEMA_VERSION}`);
  }
  // v1-v3 prototype saves are structurally normalized into the v4 shape.
  // Future incompatible changes should add explicit sequential transforms here.
  return withDefaults(raw);
}
