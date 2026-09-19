"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAVE_SCHEMA_VERSION = void 0;
exports.migrateSave = migrateSave;
const save_normalization_1 = require("./save-normalization");
exports.SAVE_SCHEMA_VERSION = 11;
function migrateSave(input) {
    if (!input || typeof input !== 'object')
        throw new Error('Invalid VELDRYN save');
    const raw = input;
    const version = typeof raw.version === 'number' ? raw.version : 1;
    if (version > exports.SAVE_SCHEMA_VERSION)
        throw new Error(`Save version ${version} is newer than supported version ${exports.SAVE_SCHEMA_VERSION}`);
    // Early prototypes predate explicit migrations but already used the same
    // character/inventory/activity primitives. Promote them to the v4 boundary,
    // then let the canonical v5 normalizer add health, storage and settings.
    const v4Compatible = version < 4 ? {
        ...raw,
        version: 4,
        createdAtMs: typeof raw.createdAtMs === 'number' ? raw.createdAtMs : Date.now(),
        character: raw.character ?? null,
        inventory: raw.inventory ?? { stacks: [], capacity: 60 },
        activity: raw.activity ?? null,
        quests: Array.isArray(raw.quests) ? raw.quests : [],
        unlockedMonsterIds: Array.isArray(raw.unlockedMonsterIds) ? raw.unlockedMonsterIds : ['MOSS_RAT'],
        defeatedBossIds: Array.isArray(raw.defeatedBossIds) ? raw.defeatedBossIds : [],
        skills: Array.isArray(raw.skills) ? raw.skills : [],
        settings: raw.settings ?? {},
    } : raw;
    const normalized = (0, save_normalization_1.normalizeSave)(v4Compatible);
    // The additive companion pass has its own wire boundary. Legacy v6 saves
    // remain v6 unless they actually carry roster or timed Faith/Alchemy state.
    // This keeps old transfer backups stable while making new data explicit.
    const activity = raw.activity;
    const character = raw.character;
    const hasV11State = Array.isArray(raw.otherCharacters)
        || activity?.kind === 'faith'
        || activity?.kind === 'alchemy'
        || !!character?.faith?.selectedBlessingId
        || Number(raw.skills?.find((skill) => skill?.skillId === 'alchemy')?.xp) > 0
        || Number(raw.rewardRemainders?.['xp:alchemy']) > 0
        || !!raw.account && (!!raw.account.collectionPreferences || !!raw.account.guideState)
        || Array.isArray(raw.character?.savedLoadouts);
    return hasV11State ? { ...normalized, version: 11 } : normalized;
}
