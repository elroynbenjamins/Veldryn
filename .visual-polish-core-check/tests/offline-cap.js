"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const novice_sets_1 = require("../src/content/novice-sets");
let state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'BASTION', 'Tester');
if ((0, game_1.offlineCapBreakdown)(state).hours !== 24)
    throw new Error('Fresh account must start with 24 hours');
state = { ...state, activity: { kind: 'combat', targetId: 'MOSS_RAT', startedAtMs: 0, lastClaimAtMs: 0 } };
if ((0, game_1.previewActivityReward)(state, 40 * 60 * 60 * 1000).elapsedSeconds !== 24 * 60 * 60)
    throw new Error('Reward preview must use base cap');
state = { ...state, character: { ...state.character, craftedNoviceItemIds: (0, novice_sets_1.noviceSetFor)('BASTION').slots.map(slot => (0, novice_sets_1.noviceItemId)('BASTION', slot)) }, account: { createdCharacterCount: 3, guildMember: true, patronTier: 'crown' }, defeatedBossIds: ['FALLEN_KNIGHT'], quests: state.quests.map(q => q.questId === 'QST_005' ? { ...q, status: 'claimed' } : q) };
const full = (0, game_1.offlineCapBreakdown)(state);
if (full.hours !== 36 || (0, game_1.offlineCapSeconds)(state) !== 36 * 60 * 60)
    throw new Error(`AFK upgrades must clamp to 36h, got ${full.hours}`);
console.log(`PASS: AFK reserve scales ${full.baseHours}h to ${full.hours}h and clamps at ${full.maxHours}h`);
