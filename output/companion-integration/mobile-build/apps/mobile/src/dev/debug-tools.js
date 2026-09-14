"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugSetLevel = debugSetLevel;
exports.debugAddXp = debugAddXp;
exports.debugAddGold = debugAddGold;
exports.debugAddItem = debugAddItem;
exports.debugUnlockMonster = debugUnlockMonster;
exports.debugAdvanceActivity = debugAdvanceActivity;
exports.debugCompleteQuest = debugCompleteQuest;
exports.debugDefeatFallenKnight = debugDefeatFallenKnight;
exports.debugCombatBalanceProbe = debugCombatBalanceProbe;
exports.debugSerializeSave = debugSerializeSave;
const items_1 = require("../content/items");
const monsters_1 = require("../content/monsters");
const progression_1 = require("../core/progression");
const game_1 = require("../core/game");
const world_weather_1 = require("../core/world-weather");
function requireCharacter(state) {
    if (!state.character)
        throw new Error('Debug action requires a character');
    return state.character;
}
function debugSetLevel(state, level) {
    const c = requireCharacter(state);
    const clamped = Math.max(1, Math.min(100, Math.floor(level)));
    const xp = (0, progression_1.characterTotalXpAtLevel)(clamped);
    const unlocked = monsters_1.MONSTERS.filter(m => m.unlockLevel <= clamped).map(m => m.id);
    return { ...state, character: { ...c, level: clamped, xp }, unlockedMonsterIds: [...new Set([...state.unlockedMonsterIds, ...unlocked])] };
}
function debugAddXp(state, amount) {
    const c = requireCharacter(state);
    const xp = Math.max(0, c.xp + Math.floor(amount));
    return { ...state, character: { ...c, xp, level: (0, progression_1.characterLevelFromXp)(xp) } };
}
function debugAddGold(state, amount) {
    const c = requireCharacter(state);
    return { ...state, character: { ...c, gold: Math.max(0, c.gold + Math.floor(amount)) } };
}
function debugAddItem(state, itemId, quantity = 1) {
    (0, items_1.itemDef)(itemId); // validate ID
    const incoming = { itemId, quantity: Math.max(1, Math.floor(quantity)) };
    return { ...state, inventory: { ...state.inventory, stacks: (0, game_1.stackItems)(state.inventory.stacks, [incoming]) } };
}
function debugUnlockMonster(state, monsterId) {
    if (!monsters_1.MONSTERS.some(m => m.id === monsterId))
        throw new Error('Unknown monster');
    return { ...state, unlockedMonsterIds: [...new Set([...state.unlockedMonsterIds, monsterId])] };
}
function debugAdvanceActivity(state, seconds) {
    if (!state.activity)
        return state;
    const deltaMs = Math.max(0, seconds) * 1000;
    return { ...state, activity: { ...state.activity, lastClaimAtMs: state.activity.lastClaimAtMs - deltaMs, startedAtMs: state.activity.startedAtMs - deltaMs } };
}
function debugCompleteQuest(state, questId) {
    return { ...state, quests: state.quests.map(q => q.questId === questId ? { ...q, status: 'complete', progress: Number.MAX_SAFE_INTEGER } : q) };
}
function debugDefeatFallenKnight(state) {
    return state.defeatedBossIds.includes('FALLEN_KNIGHT') ? state : { ...state, defeatedBossIds: [...state.defeatedBossIds, 'FALLEN_KNIGHT'] };
}
function debugCombatBalanceProbe(state, elapsedSeconds = 3600) {
    const c = requireCharacter(state);
    const nowMs = Math.max(1, Math.floor(elapsedSeconds)) * 1000;
    const samples = [];
    for (const monster of monsters_1.MONSTERS) {
        if (monster.boss)
            continue;
        const testState = {
            ...state,
            activity: {
                kind: 'combat',
                targetId: monster.id,
                startedAtMs: 0,
                lastClaimAtMs: 0,
                environment: (0, world_weather_1.captureActivityEnvironment)(monster.id, 0),
            },
        };
        const reward = (0, game_1.previewActivityReward)(testState, nowMs);
        samples.push({
            monsterId: monster.id,
            monster: monster.name,
            level: monster.level,
            unlockLevel: monster.unlockLevel,
            kills: reward.kills,
            xp: reward.xp,
            gold: reward.gold,
            elapsedSeconds: reward.elapsedSeconds,
            stopped: !!reward.stoppedReason,
            stopReason: reward.stoppedReason ?? '',
            endHp: reward.endHp ?? c.hp,
        });
    }
    return samples;
}
function debugSerializeSave(state) {
    return JSON.stringify(state, null, 2);
}
