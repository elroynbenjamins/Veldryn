"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const profile_cosmetics_1 = require("../src/core/profile-cosmetics");
const visual_feedback_1 = require("../src/core/visual-feedback");
function assert(value, message) { if (!value)
    throw new Error(message); }
const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Preview Tester', 'female');
assert((0, profile_cosmetics_1.canUseProfileCosmetic)(state, 'background', 'asterfall-night'), 'Base profile stays available');
assert(!(0, profile_cosmetics_1.canUseProfileCosmetic)(state, 'background', 'unreleased-scene'), 'Unmapped preview cannot be equipped');
assert(!(0, profile_cosmetics_1.canUseProfileCosmetic)(state, 'border', 'frame_harvestwake_festival'), 'Locked event border cannot be equipped');
assert((0, profile_cosmetics_1.canUseProfileCosmetic)(state, 'border', '') && (0, profile_cosmetics_1.canUseProfileCosmetic)(state, 'pet', ''), 'Cosmetics can be removed');
assert(!(0, profile_cosmetics_1.canUseProfileCosmetic)(state, 'background', ''), 'Empty background not accepted');
const owned = { ...state, account: { ...state.account, unlockedProfileBorderIds: ['frame_harvestwake_festival'], unlockedCosmeticPetIds: ['pet_test'], unlockedProfileBackgroundIds: ['bg_test'] } };
assert((0, profile_cosmetics_1.canUseProfileCosmetic)(owned, 'border', 'frame_harvestwake_festival'), 'Owned border usable');
assert((0, profile_cosmetics_1.canUseProfileCosmetic)(owned, 'pet', 'pet_test') && (0, profile_cosmetics_1.canUseProfileCosmetic)(owned, 'background', 'bg_test'), 'Owned pet and scene usable');
assert(!(0, profile_cosmetics_1.canUseProfileCosmetic)(owned, 'border', 'pet_test'), 'Ownership kinds stay separate');
const before = { itemId: 'basic_sword', rank: 6, failures: 0, gemIds: [] };
assert((0, visual_feedback_1.enhancementFeedback)(before, before) === null, 'No success on unchanged state');
assert((0, visual_feedback_1.enhancementFeedback)(before, { ...before, itemId: 'another', rank: 7 }) === null, 'Selection changes are not upgrades');
assert((0, visual_feedback_1.enhancementFeedback)(before, { ...before, rank: 7 })?.tone === 'success', 'Confirmed upgrade announces success');
assert((0, visual_feedback_1.enhancementFeedback)(before, { ...before, failures: 1 })?.tone === 'info', 'Failed tempering never claims success');
assert((0, visual_feedback_1.enhancementFeedback)(before, { ...before, gemIds: ['gem'] })?.message === 'Gem sockets updated.', 'Confirmed socket updates announced');
assert((0, visual_feedback_1.newlyConfirmedIds)(['q1'], ['q1']).length === 0, 'Pending/replayed claim produces no success');
assert((0, visual_feedback_1.newlyConfirmedIds)(['q1'], ['q1', 'q2', 'q2']).join(',') === 'q2', 'Only newly confirmed claims announced');
assert((0, visual_feedback_1.newlyConfirmedIds)(['q1'], []).length === 0, 'Reset/removed claims do not celebrate');
console.log('PASS: cosmetic ownership, confirmed upgrade/failure/socket feedback and replay-safe claim announcements');
