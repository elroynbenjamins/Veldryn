"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const monster_mastery_1 = require("../src/core/monster-mastery");
const dashboard_1 = require("../src/core/dashboard");
const game_commands_1 = require("../src/core/game-commands");
const save_transfer_1 = require("../src/core/save-transfer");
let checks = 0;
const ok = (v, m) => { checks++; if (!v)
    throw new Error(m); };
const now = Date.UTC(2026, 8, 13);
let s = (0, game_1.createCharacter)((0, game_1.newGame)(now), 'WAYFINDER', 'Mastery Test');
s = (0, game_1.startCombat)(s, 'MOSS_RAT', now);
const claimed = (0, game_1.claimActivity)(s, now + 60000);
ok((0, monster_mastery_1.monsterMastery)(claimed.state, 'MOSS_RAT').points === claimed.reward.kills, 'one point per verified kill');
ok((0, monster_mastery_1.monsterMastery)((0, game_1.claimActivity)(claimed.state, now + 60000).state, 'MOSS_RAT').points === claimed.reward.kills, 'no repeat points');
for (const [points, rank, damage, yieldBonus] of [[124, 4, 0, 0], [125, 5, .01, 0], [250, 10, .01, 0], [375, 15, .01, .03], [750, 30, .02, .05]]) {
    const x = structuredClone(s);
    x.character.monsterMasteryPoints = { MOSS_RAT: points };
    const m = (0, monster_mastery_1.monsterMastery)(x, 'MOSS_RAT');
    ok(m.rank === rank && m.damageBonus === damage && m.materialBonus === yieldBonus, 'rank bonuses ' + rank);
}
const master = (0, monster_mastery_1.recordMonsterMastery)(s, 'MOSS_RAT', 10000);
ok((0, monster_mastery_1.monsterMastery)(master, 'MOSS_RAT').points === 750, 'points cap');
ok((0, monster_mastery_1.monsterMastery)(master, 'FIELD_WISP').damageBonus === 0 && (0, monster_mastery_1.monsterMastery)(master, 'FALLEN_KNIGHT').damageBonus === 0, 'species only, excludes boss');
ok((0, dashboard_1.activityCycleSeconds)(master) < (0, dashboard_1.activityCycleSeconds)(s), 'dashboard reflects mastery speed');
const before = (0, game_1.previewActivityReward)(s, now + (0, dashboard_1.activityCycleSeconds)(s) * 1000 * 100 + 1), after = (0, game_1.previewActivityReward)(master, now + (0, dashboard_1.activityCycleSeconds)(master) * 1000 * 100 + 1);
ok(before.kills === after.kills, 'equal encounter sample');
const material = before.items.find(i => i.itemId === 'MOSS_FIBER');
ok(after.items.find(i => i.itemId === 'MOSS_FIBER').quantity === material.quantity + Math.floor(material.quantity * .05), '5% actual normal material yield');
const gear = before.items.find(i => i.itemId === 'MOSSWRAP_GLOVES');
ok(after.items.find(i => i.itemId === 'MOSSWRAP_GLOVES')?.quantity === gear?.quantity, 'no mastery bonus to gear');
let forest = (0, game_1.createCharacter)((0, game_1.newGame)(now), 'WAYFINDER', 'Forest Test');
forest.character.level = 25;
forest.character.hp = 10000;
forest.character.currentHp = 10000;
forest.character.monsterMasteryPoints = { FOREST_TROLL: 499 };
forest.currentRegionId = 'IRONWOOD';
forest.unlockedMonsterIds.push('FOREST_TROLL');
forest = (0, game_1.startCombat)(forest, 'FOREST_TROLL', now);
forest = (0, game_1.claimActivity)(forest, now + 600000).state;
ok(forest.account.unlockedCombatCompanionIds?.includes('UNIT_004'), 'real Forest Troll combat unlocks Briarhorn Cub');
const saved = (0, save_transfer_1.parseSaveBackup)((0, save_transfer_1.createSaveBackup)(forest));
ok((0, monster_mastery_1.monsterMastery)(saved, 'FOREST_TROLL').points === (0, monster_mastery_1.monsterMastery)(forest, 'FOREST_TROLL').points, 'save keeps mastery');
ok(Object.keys((0, monster_mastery_1.normalizeMonsterMastery)({ FALLEN_KNIGHT: 750, MOSS_RAT: NaN, fake: 99 })).length === 0, 'invalid and boss points rejected');
let rejected = false;
try {
    (0, game_commands_1.validateGameCommand)({ type: 'mastery', args: { rank: 30 } });
}
catch {
    rejected = true;
}
ok(rejected, 'no client rank grants');
console.log(`PASS monster mastery: ${checks} checks`);
