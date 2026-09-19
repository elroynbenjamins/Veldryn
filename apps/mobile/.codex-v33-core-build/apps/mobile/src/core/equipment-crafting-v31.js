"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRAFTING_UI_RULES_V31 = void 0;
exports.formatQueueTimeV31 = formatQueueTimeV31;
exports.sourceActionLabelV31 = sourceActionLabelV31;
exports.CRAFTING_UI_RULES_V31 = {
    recipeSheetOrder: ['Result', 'Set bonuses', 'Requirements', 'Crafting chain', 'Sources'],
    requirementGroups: ['Available', 'Can craft', 'Need materials', 'Need PvE', 'Need skill'],
    showRawExpansionCollapsedByDefault: true,
    neverAutoQueueGathering: true,
    neverAutoQueueCombat: true,
    neverAutoQueueDungeon: true,
    queueProcessesAndComponentsOnly: true,
    alwaysShowCraftedRarityOdds: true,
    showUpgradeAndGemEligibilityOnResult: true,
    rarityOdds: 'Common 88.8% · Uncommon 8% · Rare 2.5% · Epic 0.6% · Mythic 0.1%',
};
function formatQueueTimeV31(seconds) { if (seconds < 60)
    return `${seconds}s`; const m = Math.ceil(seconds / 60); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`; }
function sourceActionLabelV31(action) { return { gather: 'Go gather', train_skill: 'Train skill', hunt: 'Hunt source', run_content: 'Open content', unlock_recipe: 'View unlock', register_item: 'Content setup', level_character: 'Level character' }[action] ?? 'View'; }
