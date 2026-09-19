"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHASE_RECIPE_POLICY_V26 = exports.CHASE_RECIPE_RULES_V26 = void 0;
exports.recipeUnlockRuleV26 = recipeUnlockRuleV26;
const tierNum = (t) => Number(t.slice(1));
function recipeUnlockRuleV26(piece) {
    const n = tierNum(piece.tier);
    const small = ['Helmet', 'Gloves', 'Boots'].includes(piece.slot);
    const large = ['Chest', 'Legs'].includes(piece.slot);
    if (n === 1)
        return { kind: 'profession_story', deterministic: true, description: 'Starter profession/story unlock' };
    if (n === 2) {
        if (piece.path === 'Foundation')
            return { kind: 'profession_story', deterministic: true, description: 'Profession + region story' };
        if (piece.path === 'Specialist')
            return { kind: 'sidequest_mastery', deterministic: true, description: 'Regional side quest / monster mastery' };
        return { kind: piece.slot === 'Weapon' || piece.slot === 'Off-hand' ? 'dungeon_token' : 'regional_challenge', deterministic: true, description: 'Rootbound/regional challenge progression' };
    }
    if (piece.path === 'Foundation')
        return { kind: 'profession_story', deterministic: true, description: 'Region story + profession level' };
    if (piece.path === 'Specialist')
        return { kind: small ? 'sidequest_mastery' : large ? 'dungeon_first_clear' : 'dungeon_token', deterministic: true, description: small ? 'Regional activity/mastery' : large ? 'Dungeon first-clear' : 'Dungeon boss blueprint/token' };
    return { kind: small ? 'regional_challenge' : large ? 'boss_mastery' : 'recipe_fragments', deterministic: true, description: small ? 'Regional challenge/mastery' : large ? 'Boss/dungeon mastery' : 'Boss mastery or deterministic recipe fragments' };
}
exports.CHASE_RECIPE_RULES_V26 = [
    { tier: 'T4', dropChance: .03, fragmentTarget: 20, description: 'Fallen Knight / Fallen Procession optional masterwork variant' },
    { tier: 'T6', dropChance: .025, fragmentTarget: 24, description: 'Sand Tyrant / Observatory hard-route optional masterwork variant' },
    { tier: 'T9', dropChance: .02, fragmentTarget: 30, description: 'Frost Wyrm / Wyrmspine mastery optional masterwork variant' }
];
exports.CHASE_RECIPE_POLICY_V26 = { requiredForProgression: false, requiredForSevenPieceSkin: false, sameTierBudget: true, fragmentFallbackGuaranteed: true };
