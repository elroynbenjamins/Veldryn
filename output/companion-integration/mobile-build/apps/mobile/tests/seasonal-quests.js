"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const seasonal_quests_1 = require("../src/core/seasonal-quests");
const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'BASTION', 'Tester');
const date = new Date('2026-09-05T12:00:00Z'), daily = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'daily', date), a = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'weekly', date), b = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'weekly', date), m = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'monthly', date);
if (daily.length !== 2 || a.length !== 3 || m.length !== 4)
    throw new Error('Seasonal board sizes are incorrect');
if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error('Same seasonal period must be deterministic');
if (a.some(q => q.className !== 'Bastion' || !q.id.startsWith('WEEKLY_')))
    throw new Error('Class-aligned weekly quests missing');
if (m.some(q => q.rewardGold <= a[0].rewardGold))
    throw new Error('Monthly rewards should exceed weekly rewards');
if ([...daily, ...a, ...m].some(q => !seasonal_quests_1.QUEST_RARITIES[q.rarity] || q.rewardGold <= 0 || q.rewardXp <= 0 || q.rewardItemQty <= 0 || !q.rewardItemId))
    throw new Error('Contracts require a valid rarity reward structure');
if (daily.some(q => q.rarity === 'epic' || q.rarity === 'legendary') || m.some(q => q.rarity === 'common' || q.rarity === 'uncommon'))
    throw new Error('Period rarity pools are incorrect');
const complete = { ...state, character: { ...state.character, xp: 100000, equipment: { weapon: 'basic_sword', helmet: 'ASTER_IRON_HELM', chest: 'ASTER_IRON_CHEST', legs: 'ASTER_IRON_LEGS', boots: 'ASTER_IRON_BOOTS', gloves: 'ASTER_IRON_GLOVES' }, craftedNoviceItemIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, skills: state.skills.map(skill => ({ ...skill, xp: 10000, level: 20 })), unlockedMonsterIds: ['MOSS_RAT', 'FIELD_WISP', 'ROADSIDE_BOAR', 'SILVERFIN_SWARM', 'IRONWOOD_WOLF', 'VENOM_WEAVER', 'THORNLING'] };
const ready = (0, seasonal_quests_1.seasonalQuestBoard)(complete, 'daily', date).find(quest => quest.progress >= quest.required);
const claimed = (0, game_1.claimSeasonalContract)(complete, 'daily', ready.id, date.getTime());
if (claimed.character.gold !== complete.character.gold + ready.rewardGold || claimed.character.xp !== complete.character.xp + ready.rewardXp || !claimed.account.seasonalContractClaimIds?.includes(ready.id))
    throw new Error('Contract claim must award and persist exactly once');
let duplicateRejected = false;
try {
    (0, game_1.claimSeasonalContract)(claimed, 'daily', ready.id, date.getTime());
}
catch {
    duplicateRejected = true;
}
if (!duplicateRejected)
    throw new Error('Contract cache cannot be claimed twice');
const other = (0, seasonal_quests_1.seasonalQuestBoard)((0, game_1.createCharacter)((0, game_1.newGame)(0), 'WAYFINDER', 'Scout'), 'weekly', date);
if (JSON.stringify(a.map(q => q.name)) === JSON.stringify(other.map(q => q.name)))
    throw new Error('Class layouts should differ');
console.log('PASS: deterministic class-aligned weekly and monthly quest boards');
