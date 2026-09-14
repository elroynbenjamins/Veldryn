"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_SPECIAL_CHALLENGES = exports.COMPANION_CODEX_MILESTONES = exports.COMPANION_PROVING_GROUNDS = exports.companionMission = exports.COMPANION_MISSIONS = exports.COMPANION_WEEKLY_CHALLENGES = exports.COMPANION_MONTHLY_COMPLETION_REWARD = exports.companionTrialReward = exports.companionTrialFloorModifiers = exports.companionTrialEnemyScale = exports.companionTrialRecommendedPower = exports.COMPANION_TRIAL_MITIGATION_CONSTANT = exports.COMPANION_TRIAL_ENEMY_GROWTH = exports.COMPANION_TRIAL_RECOMMENDED_POWER_END = exports.COMPANION_TRIAL_RECOMMENDED_POWER_START = exports.COMPANION_TRIAL_BOSS_INTERVAL = exports.COMPANION_TRIAL_FLOOR_COUNT = exports.COMPANION_TRIAL_MODIFIERS = exports.COMPANION_SYNERGY_COMBAT_CAP = exports.COMPANION_TECHNIQUE_SWITCH_COST = exports.COMPANION_EXPEDITION_BONUS_CHANCE_CAP = exports.COMPANION_EXPEDITION_PEN_DURATION_REDUCTION = exports.COMPANION_EXPEDITION_GRADE_THRESHOLDS = exports.COMPANION_EXPEDITION_BOND_RATE = exports.COMPANION_MAX_XP_WEEKLY_ESSENCE_CAP = exports.COMPANION_MAX_XP_ESSENCE_RATE = exports.COMPANION_DUPLICATE_ESSENCE = exports.COMPANION_RARITY_MAX_LEVEL = exports.COMPANION_RARITY_TARGET = exports.companionTechnique = exports.companionTechniques = exports.COMPANION_TECHNIQUES = exports.COMPANION_TECHNIQUE_UNLOCK = exports.companionServerDefinition = exports.COMPANION_SERVER_DEFINITIONS = void 0;
exports.companionTrialSeasonDefinition = companionTrialSeasonDefinition;
const raw = [
    ['UNIT_001', 'Ironwood Hound', 'damage', 'standard', 'REG_001', 180, 22, 12, 2, 'damage', 1.00], ['UNIT_002', 'Runebound Sentry', 'tank', 'standard', 'REG_001', 260, 14, 24, 2.6, 'shield', .06], ['UNIT_003', 'Silverbrook Sprite', 'support', 'standard', 'REG_001', 150, 12, 10, 2.2, 'heal', .04],
    ['UNIT_004', 'Briarhorn Cub', 'damage', 'rare', 'REG_001', 230, 25, 18, 2.4, 'damage', 1.20], ['UNIT_005', 'Lantern Wisp', 'support', 'rare', 'REG_001', 145, 18, 11, 2, 'interrupt', .55], ['UNIT_006', 'Oathbound Page', 'tank', 'rare', 'REG_001', 290, 16, 25, 2.8, 'shield', .05],
    ['UNIT_007', 'Gloamknife Shade', 'damage', 'elite', 'REG_001', 155, 29, 10, 1.7, 'damage', 1.45], ['UNIT_008', 'Dawnwing', 'support', 'elite', 'REG_001', 180, 14, 14, 2.3, 'shield', .04], ['UNIT_009', 'Echo Stalker', 'damage', 'elite', 'REG_001', 175, 27, 13, 1.9, 'damage', 1.25],
    ['UNIT_010', 'Forge Automaton', 'damage', 'rare', 'REG_001', 205, 26, 20, 2.9, 'damage', 1.35], ['UNIT_011', "Veyren's Memory", 'support', 'elite', 'REG_001', 190, 21, 16, 2.4, 'damage', .85], ['UNIT_012', 'Oathglass Knightling', 'support', 'prestige', 'REG_001', 220, 23, 21, 2.2, 'utility', .25],
    ['UNIT_013', 'Dune Stalker', 'damage', 'rare', 'REG_SUNSCAR', 190, 27, 15, 2.2, 'damage', 1.10], ['UNIT_014', 'Oasis Djinnling', 'support', 'elite', 'REG_SUNSCAR', 205, 18, 15, 2.2, 'heal', .05], ['UNIT_015', 'Solar Scarab', 'tank', 'elite', 'REG_SUNSCAR', 205, 18, 25, 2.2, 'shield', .05], ['UNIT_016', "Tyrant's Heir", 'tank', 'prestige', 'REG_SUNSCAR', 225, 18, 25, 2.2, 'shield', .06],
    ['UNIT_017', 'Rime Wolf Pup', 'damage', 'rare', 'REG_FROSTMARCH', 190, 27, 15, 2.2, 'damage', 1.10], ['UNIT_018', 'Bell Sprite', 'support', 'elite', 'REG_FROSTMARCH', 205, 18, 15, 2.2, 'heal', .05], ['UNIT_019', 'Choir Golem', 'tank', 'elite', 'REG_FROSTMARCH', 205, 18, 25, 2.2, 'shield', .05], ['UNIT_020', 'Wyrm Echo', 'damage', 'prestige', 'REG_FROSTMARCH', 225, 27, 15, 2.2, 'damage', 1.18],
    ['UNIT_021', 'Obsidian Drakelet', 'damage', 'rare', 'REG_ASHLANDS', 190, 27, 15, 2.2, 'damage', 1.10], ['UNIT_022', 'Forge Custodian', 'tank', 'elite', 'REG_ASHLANDS', 205, 18, 25, 2.2, 'shield', .05], ['UNIT_023', 'Primal Spark', 'damage', 'elite', 'REG_ASHLANDS', 205, 27, 15, 2.2, 'damage', 1.14], ['UNIT_024', 'Regent Shade', 'support', 'prestige', 'REG_ASHLANDS', 225, 18, 15, 2.2, 'heal', .06],
];
const cooldown = (rarity, role) => 1000 * (role === 'damage' ? (rarity === 'prestige' ? 18 : 20) : rarity === 'prestige' ? 22 : 24);
const target = (role) => role === 'damage' ? { assistTarget: 'current_target', standaloneTarget: 'current_target' } : role === 'tank' ? { assistTarget: 'owner', standaloneTarget: 'self' } : { assistTarget: 'owner', standaloneTarget: 'lowest_hp_ally' };
const effect = (kind) => kind === 'damage' ? 'damage' : kind === 'shield' ? 'shield' : kind === 'interrupt' ? 'interrupt' : kind === 'heal' ? 'heal' : 'utility';
exports.COMPANION_SERVER_DEFINITIONS = raw.map(([id, name, role, rarity, originId, hp, power, defense, attackSpeed, kind, coeff]) => ({
    id, name, role, rarity, originId, baseStats: { hp, power, defense, attackSpeed }, tags: [role, rarity, originId],
    active: { id: `${id}_ACTIVE`, name: `${name} Signature`, cooldownMs: cooldown(rarity, role), baseCoeff: coeff, perLevelCoeff: kind === 'damage' ? .004 : .0006, effectKind: effect(kind), targeting: target(role) },
    visual: rarity === 'prestige' ? { rarityFrame: 'prestige', summonEffect: 'prestige_summon', idleEffect: 'prestige_idle', profileFrame: 'prestige_profile', masteryMarker: 'prestige_mastery', nameplateTreatment: 'prestige_nameplate', animationRef: `${id}_prestige_entry`, rarityIcon: '★', rarityLabel: 'Prestige', accessibilityLabel: 'Prestige combat companion. Star rarity icon and ornate structured frame.', reducedMotionFallback: 'prestige_static_entry' } : rarity === 'elite' ? { rarityFrame: 'elite', summonEffect: 'elite_summon', masteryMarker: 'elite_mastery', rarityIcon: '◆◆◆', rarityLabel: 'Elite', accessibilityLabel: 'Elite combat companion. Triple-diamond rarity icon and distinct structured frame.', reducedMotionFallback: 'elite_static_entry' } : rarity === 'rare' ? { rarityFrame: 'rare', rarityIcon: '◆◆', rarityLabel: 'Rare', accessibilityLabel: 'Rare combat companion. Double-diamond rarity icon and enhanced frame.' } : { rarityFrame: 'standard', rarityIcon: '◆', rarityLabel: 'Standard', accessibilityLabel: 'Standard combat companion. Single-diamond rarity icon and simple frame.' },
}));
const companionServerDefinition = (id) => exports.COMPANION_SERVER_DEFINITIONS.find(x => x.id === id);
exports.companionServerDefinition = companionServerDefinition;
exports.COMPANION_TECHNIQUE_UNLOCK = { ascensionTier: 2, bondLevel: 7, mode: 'all' };
const techniquePair = (def) => {
    const group = `${def.id}:technique`, unlock = exports.COMPANION_TECHNIQUE_UNLOCK;
    if (def.role === 'tank')
        return [
            { id: `${def.id}_FORTIFIED`, companionId: def.id, name: 'Fortified Shell', description: 'Shield strength +15%.', mutuallyExclusiveGroup: group, unlock, effects: [{ kind: 'shield_strength', value: .15 }] },
            { id: `${def.id}_REFLECTIVE`, companionId: def.id, name: 'Reflective Shell', description: 'Shield strength -5%, but reflects part of absorbed damage.', mutuallyExclusiveGroup: group, unlock, effects: [{ kind: 'shield_strength', value: -.05 }, { kind: 'reflect', value: .12 }] },
        ];
    if (def.role === 'damage')
        return [
            { id: `${def.id}_EXECUTIONER`, companionId: def.id, name: 'Executioner', description: 'Higher damage against enemies below 30% HP.', mutuallyExclusiveGroup: group, unlock, effects: [{ kind: 'execute', value: .10 }] },
            { id: `${def.id}_RELENTLESS`, companionId: def.id, name: 'Relentless', description: 'Smaller damage bonus with a shorter active cooldown.', mutuallyExclusiveGroup: group, unlock, effects: [{ kind: 'damage', value: .03 }, { kind: 'cooldown', value: -.08 }] },
        ];
    return [
        { id: `${def.id}_DEEP_RESTORATION`, companionId: def.id, name: 'Deep Restoration', description: 'Stronger healing and restoration.', mutuallyExclusiveGroup: group, unlock, effects: [{ kind: 'heal_strength', value: .13 }] },
        { id: `${def.id}_RAPID_AID`, companionId: def.id, name: 'Rapid Aid', description: 'Slightly weaker effect with a shorter active cooldown.', mutuallyExclusiveGroup: group, unlock, effects: [{ kind: 'heal_strength', value: -.04 }, { kind: 'cooldown', value: -.12 }] },
    ];
};
exports.COMPANION_TECHNIQUES = exports.COMPANION_SERVER_DEFINITIONS.flatMap(techniquePair);
const companionTechniques = (companionId) => exports.COMPANION_TECHNIQUES.filter(x => x.companionId === companionId);
exports.companionTechniques = companionTechniques;
const companionTechnique = (id) => exports.COMPANION_TECHNIQUES.find(x => x.id === id);
exports.companionTechnique = companionTechnique;
exports.COMPANION_RARITY_TARGET = { standard: 1, rare: 1.09, elite: 1.12, prestige: 1.155 };
exports.COMPANION_RARITY_MAX_LEVEL = { standard: 20, rare: 25, elite: 30, prestige: 35 };
exports.COMPANION_DUPLICATE_ESSENCE = { standard: 50, rare: 100, elite: 180, prestige: 300 };
exports.COMPANION_MAX_XP_ESSENCE_RATE = .10;
exports.COMPANION_MAX_XP_WEEKLY_ESSENCE_CAP = 500;
exports.COMPANION_EXPEDITION_BOND_RATE = .25;
exports.COMPANION_EXPEDITION_GRADE_THRESHOLDS = { B: 1.10, A: 1.25, S: 1.50 };
exports.COMPANION_EXPEDITION_PEN_DURATION_REDUCTION = { 0: 0, 1: 0, 2: .03, 3: .05 };
exports.COMPANION_EXPEDITION_BONUS_CHANCE_CAP = .20;
exports.COMPANION_TECHNIQUE_SWITCH_COST = { gold: 2500, companionEssence: 80 };
exports.COMPANION_SYNERGY_COMBAT_CAP = 1.06;
exports.COMPANION_TRIAL_MODIFIERS = {
    armored: { id: 'armored', description: 'Enemies have increased defense.', enemyDefenseMultiplier: 1.10 },
    rushing: { id: 'rushing', description: 'Enemies act faster.', enemyHasteBonus: .05 },
    anti_heal: { id: 'anti_heal', description: 'Healing is reduced.', playerHealingMultiplier: .88 },
    shattering: { id: 'shattering', description: 'Enemy attacks pressure shields.', enemyAttackMultiplier: 1.04, playerShieldMultiplier: .94 },
    arcane_storm: { id: 'arcane_storm', description: 'Periodic magic pressure.', enemyAttackMultiplier: 1.06 },
    execution: { id: 'execution', description: 'Low-HP companions are threatened.', enemyAttackMultiplier: 1.03, enemyAccuracyBonus: .02 },
    predator: { id: 'predator', description: 'Enemies pressure the weakest companion.', enemyAccuracyBonus: .03 },
    unstable_magic: { id: 'unstable_magic', description: 'Companion cooldowns recover slightly faster, but enemy magic pressure rises.', playerHasteBonus: .04, enemyAttackMultiplier: 1.05 },
    thick_hide: { id: 'thick_hide', description: 'Enemies resist basic pressure.', enemyDefenseMultiplier: 1.06, enemyHpMultiplier: 1.03 },
    frailty: { id: 'frailty', description: 'Companion shields are modestly weaker.', playerShieldMultiplier: .90 },
    relentless: { id: 'relentless', description: 'Enemies fight with increasing tempo.', enemyHasteBonus: .07 },
};
exports.COMPANION_TRIAL_FLOOR_COUNT = 30;
exports.COMPANION_TRIAL_BOSS_INTERVAL = 5;
exports.COMPANION_TRIAL_RECOMMENDED_POWER_START = 2750;
exports.COMPANION_TRIAL_RECOMMENDED_POWER_END = 4300;
exports.COMPANION_TRIAL_ENEMY_GROWTH = 1.020;
exports.COMPANION_TRIAL_MITIGATION_CONSTANT = 100;
const companionTrialRecommendedPower = (floor) => { const f = Math.max(1, Math.min(exports.COMPANION_TRIAL_FLOOR_COUNT, Math.floor(floor))); const t = (f - 1) / Math.max(1, exports.COMPANION_TRIAL_FLOOR_COUNT - 1); return Math.round(exports.COMPANION_TRIAL_RECOMMENDED_POWER_START * Math.pow(exports.COMPANION_TRIAL_RECOMMENDED_POWER_END / exports.COMPANION_TRIAL_RECOMMENDED_POWER_START, t)); };
exports.companionTrialRecommendedPower = companionTrialRecommendedPower;
const companionTrialEnemyScale = (floor) => Math.pow(exports.COMPANION_TRIAL_ENEMY_GROWTH, Math.max(0, Math.floor(floor) - 1));
exports.companionTrialEnemyScale = companionTrialEnemyScale;
const companionTrialFloorModifiers = (floor) => {
    const pool = ['armored', 'rushing', 'anti_heal', 'shattering', 'arcane_storm', 'execution', 'predator', 'unstable_magic', 'thick_hide', 'frailty', 'relentless'];
    const count = floor >= 21 ? 3 : floor >= 11 ? 2 : 1;
    return Array.from({ length: count }, (_, i) => pool[(floor * 3 + i * 4) % pool.length]);
};
exports.companionTrialFloorModifiers = companionTrialFloorModifiers;
const companionTrialReward = (floor, firstClear, boss) => ({
    companionEssence: firstClear ? Math.round(25 + floor * 4 + (boss ? 60 : 0)) : 0,
    gold: firstClear ? Math.round(300 + floor * 90 + (boss ? 1200 : 0)) : Math.round(20 + floor * 3),
    bondstones: firstClear && boss ? (floor >= 30 ? 3 : floor >= 20 ? 2 : floor >= 10 ? 1 : 0) : 0,
    materials: firstClear && boss ? { TRIAL_SANCTUARY_MATERIAL: Math.max(1, Math.floor(floor / 10)) } : {},
});
exports.companionTrialReward = companionTrialReward;
exports.COMPANION_MONTHLY_COMPLETION_REWARD = { companionEssence: 600, gold: 15000, bondstones: 3, materials: { TRIAL_SANCTUARY_MATERIAL: 4 } };
exports.COMPANION_WEEKLY_CHALLENGES = [
    { id: 'NO_PRESTIGE_15', name: 'Humble Resolve', description: 'Clear Floor 15 with no Prestige companion.', minimumFloor: 15, restrictions: [{ type: 'prohibit_rarity', rarity: 'prestige' }], rewards: { companionEssence: 120, bondstones: 1, gold: 2500 } },
    { id: 'STANDARD_BOSS', name: 'Common Ground', description: 'Clear a boss using at least one Standard companion.', minimumFloor: 5, restrictions: [{ type: 'require_rarity', rarity: 'standard', count: 1 }], rewards: { companionEssence: 100, bondstones: 1, gold: 2200 } },
    { id: 'ASTERFALL_PAIR', name: 'Asterfall Kin', description: 'Clear 5+ floors with two Asterfall companions.', minimumFloor: 5, restrictions: [{ type: 'require_origin', originId: 'REG_001', count: 2 }], rewards: { companionEssence: 110, bondstones: 0, gold: 2500, materials: { IRONWOOD_FANG: 3 } } },
    { id: 'RARITY_SPECTRUM', name: 'Rarity Spectrum', description: 'Clear a boss with Standard, Rare and Elite/Prestige represented.', minimumFloor: 10, restrictions: [{ type: 'rarity_mix', rarities: ['standard', 'rare', 'elite'] }], rewards: { companionEssence: 150, bondstones: 1, gold: 3000 } },
];
exports.COMPANION_MISSIONS = [
    { id: 'MISSION_SCOUT_2H', name: 'Asterfall Perimeter Patrol', originId: 'REG_001', durationMs: 2 * 3600_000, missionVersion: 2, minCompanions: 1, maxCompanions: 2, minimumPenLevel: 1, minimumLevel: 5, recommendedPower: 1050, requirements: [{ type: 'min_level', value: 5 }], bonusRequirements: [{ type: 'origin_count', originId: 'REG_001', count: 1 }], costs: { gold: 300 }, baseRewards: { companionEssence: 3, gold: 280, companionXp: 85, bondXp: 12, materials: { IRONWOOD_FANG: 1 } }, bonusRewards: { companionEssence: 2, materials: { SUPPLIES: 1 } }, bonusRewardChanceByGrade: { B: .05, A: .10, S: .15 } },
    { id: 'MISSION_SUNSCAR_4H', name: 'Sunscar Caravan Guard', originId: 'REG_SUNSCAR', durationMs: 4 * 3600_000, missionVersion: 2, minCompanions: 2, maxCompanions: 3, minimumPenLevel: 1, minimumLevel: 15, recommendedPower: 2800, requirements: [{ type: 'role_count', role: 'tank', count: 1 }, { type: 'role_count', role: 'support', count: 1 }, { type: 'min_level', value: 15 }, { type: 'origin_count', originId: 'REG_SUNSCAR', count: 1 }], bonusRequirements: [{ type: 'origin_count', originId: 'REG_SUNSCAR', count: 2 }], bonusOriginId: 'REG_SUNSCAR', costs: { gold: 650, materials: { SUPPLIES: 2 } }, baseRewards: { companionEssence: 7, gold: 600, companionXp: 160, bondXp: 20, materials: { AMBERGLASS: 1 } }, bonusRewards: { companionEssence: 4, materials: { AMBERGLASS: 1 } }, bonusRewardChanceByGrade: { B: .04, A: .08, S: .14 } },
    { id: 'MISSION_ASTERFALL_SHRINE_8H', name: 'Forgotten Asterfall Shrine', originId: 'REG_001', durationMs: 8 * 3600_000, missionVersion: 1, minCompanions: 3, maxCompanions: 3, minimumPenLevel: 2, minimumBondLevel: 4, recommendedPower: 3000, requirements: [{ type: 'min_bond', value: 4 }, { type: 'min_rarity', rarity: 'rare', count: 1 }], bonusRequirements: [{ type: 'origin_count', originId: 'REG_001', count: 3 }], costs: { gold: 1050, materials: { SUPPLIES: 3 } }, baseRewards: { companionEssence: 14, gold: 900, companionXp: 250, bondXp: 30, materials: { IRONWOOD_FANG: 3 } }, bonusRewards: { companionEssence: 7, materials: { TRIAL_SANCTUARY_MATERIAL: 1 } }, bonusRewardChanceByGrade: { A: .06, S: .14 } },
    { id: 'MISSION_FROST_8H', name: 'Frostmarch Bell Route', originId: 'REG_FROSTMARCH', durationMs: 8 * 3600_000, missionVersion: 2, minCompanions: 2, maxCompanions: 3, minimumPenLevel: 2, minimumLevel: 15, recommendedPower: 3000, requirements: [{ type: 'role_count', role: 'support', count: 1 }, { type: 'min_level', value: 15 }], bonusRequirements: [{ type: 'origin_count', originId: 'REG_FROSTMARCH', count: 2 }], bonusOriginId: 'REG_FROSTMARCH', costs: { gold: 1100, materials: { SUPPLIES: 3 } }, baseRewards: { companionEssence: 15, gold: 950, companionXp: 270, bondXp: 32, materials: { RIMEGLASS: 1 } }, bonusRewards: { companionEssence: 7, materials: { RIMEGLASS: 1 } }, bonusRewardChanceByGrade: { A: .05, S: .12 }, bondstoneEligible: true },
    { id: 'MISSION_ASH_12H', name: 'Ashlands Crucible Watch', originId: 'REG_ASHLANDS', durationMs: 12 * 3600_000, missionVersion: 2, minCompanions: 3, maxCompanions: 3, minimumPenLevel: 3, minimumLevel: 20, recommendedPower: 4000, requirements: [{ type: 'role_count', role: 'tank', count: 1 }, { type: 'role_count', role: 'damage', count: 1 }, { type: 'min_level', value: 20 }, { type: 'min_ascension', tier: 2, count: 2 }], bonusRequirements: [{ type: 'origin_count', originId: 'REG_ASHLANDS', count: 2 }], bonusOriginId: 'REG_ASHLANDS', costs: { gold: 1600, materials: { SUPPLIES: 4 } }, baseRewards: { companionEssence: 22, gold: 1350, companionXp: 400, bondXp: 44, materials: { BANNER_ASH: 1 } }, bonusRewards: { companionEssence: 10, materials: { TRIAL_SANCTUARY_MATERIAL: 1 } }, bonusRewardChanceByGrade: { A: .04, S: .10 }, bondstoneEligible: true },
];
const companionMission = (id) => exports.COMPANION_MISSIONS.find(x => x.id === id);
exports.companionMission = companionMission;
exports.COMPANION_PROVING_GROUNDS = [
    { id: 'PG_UNDERESTIMATED', name: 'Underestimated', description: 'Defeat a boss while using a Rare-or-lower Combat Companion.', eventTypes: ['boss_defeat'], targetCount: 1, condition: { maxRarity: 'rare' }, rewards: { companionEssence: 100, gold: 2500, bondstones: 1 } },
    { id: 'PG_TRUSTED_ALLY', name: 'Trusted Ally', description: 'Complete a Dungeon using a Companion with Bond Level 8+.', eventTypes: ['dungeon_complete'], targetCount: 1, condition: { minBondLevel: 8 }, rewards: { companionEssence: 80, gold: 2200, bondstones: 0, materials: { TRIAL_SANCTUARY_MATERIAL: 1 } } },
    { id: 'PG_BORROWED_DEFENSE', name: 'Borrowed Defense', description: 'As a Damage character, complete content using a Tank Companion.', eventTypes: ['battle_complete', 'boss_defeat', 'dungeon_complete'], targetCount: 3, condition: { requiredCharacterRole: 'damage', requiredCompanionRole: 'tank' }, rewards: { companionEssence: 75, gold: 1800, bondstones: 0 } },
    { id: 'PG_OLD_FRIENDS', name: 'Old Friends', description: 'Complete 25 battles using a Standard Companion.', eventTypes: ['battle_complete'], targetCount: 25, condition: { requiredRarity: 'standard' }, rewards: { companionEssence: 130, gold: 3200, bondstones: 1 } },
    { id: 'PG_REGIONAL_LOYALTY', name: 'Regional Loyalty', description: 'Clear a Companion Trial boss with at least two Companions from the same origin.', eventTypes: ['trial_boss_clear'], targetCount: 1, condition: { requiredOriginCount: 2 }, rewards: { companionEssence: 110, gold: 2600, bondstones: 1 } },
    { id: 'PG_AGAINST_ODDS', name: 'Against the Odds', description: 'Clear a Companion Trial floor below its recommended Companion Team Power.', eventTypes: ['trial_floor_clear', 'trial_boss_clear'], targetCount: 1, condition: { belowRecommendedPower: true }, rewards: { companionEssence: 90, gold: 2100, bondstones: 0 } },
    { id: 'PG_MIXED_COMPANY', name: 'Mixed Company', description: 'Clear Companion Trials with one Standard, one Rare and one Elite/Prestige.', eventTypes: ['trial_floor_clear', 'trial_boss_clear'], targetCount: 3, condition: { rarityMix: ['standard', 'rare', 'elite'] }, rewards: { companionEssence: 150, gold: 3400, bondstones: 1 } },
];
exports.COMPANION_CODEX_MILESTONES = [
    { id: 'CODEX_COLLECTOR_I', name: 'Companion Collector I', description: 'Own 5 Combat Companions.', requirement: { type: 'owned_total', count: 5 }, reward: { companionEssence: 120, rewardIds: ['PROFILE_BADGE_COMPANION_COLLECTOR_I'] } },
    { id: 'CODEX_COLLECTOR_II', name: 'Companion Collector II', description: 'Own 15 Combat Companions.', requirement: { type: 'owned_total', count: 15 }, reward: { companionEssence: 200, rewardIds: ['PROFILE_BACKGROUND_COMPANION_GALLERY'], showcaseSlots: 2 } },
    { id: 'CODEX_BONDKEEPER', name: 'Bondkeeper', description: 'Reach Bond 10 with 5 Combat Companions.', requirement: { type: 'bond_10', count: 5 }, reward: { companionEssence: 160, rewardIds: ['TITLE_BONDKEEPER'] } },
    { id: 'CODEX_MASTER_HANDLER', name: 'Master Handler', description: 'Fully Master 3 Combat Companions.', requirement: { type: 'mastered', count: 3 }, reward: { companionEssence: 250, rewardIds: ['PROFILE_BORDER_MASTER_HANDLER'], showcaseSlots: 3 } },
    { id: 'CODEX_WORLDLY_COMPANY', name: 'Worldly Company', description: 'Own Combat Companions from 5 different origins.', requirement: { type: 'origins_owned', count: 5 }, reward: { companionEssence: 180, rewardIds: ['PROFILE_BADGE_WORLDLY_COMPANY'] } },
];
exports.COMPANION_SPECIAL_CHALLENGES = [
    { id: 'CHALLENGE_OATHGLASS_KNIGHTLING', name: 'Oathglass Reflection Trial', bossId: 'BOSS_COMPANION_OATHGLASS', rewardCompanionId: 'UNIT_012', recommendedTeamPower: 3800, requirements: [
            { type: 'trial_floor', amount: 20, description: 'Reach Companion Trial Floor 20.' }, { type: 'boss_clear_count', target: 'FALLEN_KNIGHT', amount: 10, description: 'Defeat the Fallen Knight 10 times.' }, { type: 'companion_owned', target: 'UNIT_007', amount: 1, description: 'Own Gloamknife Shade.' }, { type: 'companion_bond_total', amount: 18, originId: 'REG_001', description: 'Reach 18 total Bond across Asterfall companions.' },
        ] },
    { id: 'CHALLENGE_ASHEN_SUNWYRM_FUTURE', name: 'Ashen Sunwyrm Challenge', bossId: 'BOSS_COMPANION_ASHEN_SUNWYRM', rewardCompanionId: 'FUTURE_ASHEN_SUNWYRM', recommendedTeamPower: 4350, requirements: [
            { type: 'region_completion', target: 'REG_SUNSCAR', description: 'Complete Sunscar story progression.' }, { type: 'trial_floor', amount: 25, description: 'Reach Companion Trial Floor 25.' }, { type: 'boss_clear_count', target: 'SUNSCAR_REGIONAL_BOSS', amount: 15, description: 'Defeat the Sunscar regional boss 15 times.' }, { type: 'companion_bond_total', amount: 18, originId: 'REG_SUNSCAR', description: 'Reach 18 total Bond across Sunscar companions.' },
        ] },
];
const utcBounds = (seasonKey) => { const [y, m] = seasonKey.split('-').map(Number); const startsAt = new Date(Date.UTC(y, m - 1, 1)).toISOString(); const endsAt = new Date(Date.UTC(y, m, 1)).toISOString(); return { startsAt, endsAt }; };
const SEASON_OVERRIDES = {
    '2026-09': { floorSetId: 'tower_v1', modifiers: ['armored', 'unstable_magic'], rewardSetId: 'monthly_v1', specialChallenges: ['NO_PRESTIGE_15'], featuredOrigin: 'REG_SUNSCAR', featuredCompanionIds: ['UNIT_013', 'UNIT_014', 'UNIT_015', 'UNIT_016'] },
    '2026-10': { floorSetId: 'tower_v1', modifiers: ['thick_hide', 'execution'], rewardSetId: 'monthly_v1', specialChallenges: ['STANDARD_BOSS'], featuredOrigin: 'REG_FROSTMARCH', featuredCompanionIds: ['UNIT_017', 'UNIT_018', 'UNIT_019', 'UNIT_020'] },
    '2026-11': { floorSetId: 'tower_v1', modifiers: ['relentless', 'frailty'], rewardSetId: 'monthly_v1', specialChallenges: ['RARITY_SPECTRUM'], featuredOrigin: 'REG_ASHLANDS', featuredCompanionIds: ['UNIT_021', 'UNIT_022', 'UNIT_023', 'UNIT_024'] },
};
function companionTrialSeasonDefinition(seasonKey) {
    const bounds = utcBounds(seasonKey), override = SEASON_OVERRIDES[seasonKey] ?? {};
    return { seasonKey, ...bounds, floorSetId: override.floorSetId ?? 'tower_v1', modifiers: override.modifiers ?? [], rewardSetId: override.rewardSetId ?? 'monthly_v1', specialChallenges: override.specialChallenges ?? [], featuredOrigin: override.featuredOrigin, featuredCompanionIds: override.featuredCompanionIds };
}
