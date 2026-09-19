"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMBAT_BALANCE_SURFACES = exports.COMBAT_ECONOMY_GUARDRAILS = exports.RAID_BALANCE = exports.GUILD_BOSS_BALANCE = exports.PVP_BALANCE = exports.COMPANION_COMBAT_BALANCE = exports.CHARACTER_TRIAL_BALANCE = exports.EXPEDITION_TIER_BALANCE = exports.COOP_SYNC_TARGETS = exports.COOP_ROLE_TARGET = exports.ELITE_REGION_SCALING = exports.REGIONAL_BOSS_OUTCOME_TARGETS = exports.REGIONAL_BOSS_BASELINES = exports.REGION_POWER_CURVE = exports.CLASS_OUTPUT_BUDGETS = exports.CHARACTER_PROGRESSION_BALANCE = exports.FULL_COMBAT_BALANCE_VERSION = void 0;
exports.FULL_COMBAT_BALANCE_VERSION = '2026-09-12.v1';
exports.CHARACTER_PROGRESSION_BALANCE = {
    /** Current implemented idle/combat-only Asterfall test band. */
    asterfallLevel25ProductiveCombatHours: { min: 175, max: 288, evidence: 'runtime_verified' },
    /** Observed/accepted player-profile calendar pacing around the current idle loop. */
    asterfallCalendarDays: {
        normal: { min: 35, max: 55 },
        active: { min: 24, max: 38 },
        optimizer: { min: 18, max: 30 },
    },
    /** Historical vertical-slice target must not be used as the character-XP authority. */
    supersededVerticalSliceActiveEquivalentHours: { min: 18, max: 30, superseded: true },
    openingLevel5Minutes: { min: 20, max: 60 },
    bossFirstClearSeriousAttempts: { min: 2, max: 6 },
};
exports.CLASS_OUTPUT_BUDGETS = [
    { id: 'CLS_001', name: 'Ironwarden', role: 'tank', minPureDpsReference: .55, maxPureDpsReference: .65, identity: 'balanced mitigation / threat', evidence: 'data_calibrated' },
    { id: 'TANK_02', name: 'Bastion', role: 'tank', minPureDpsReference: .50, maxPureDpsReference: .60, identity: 'highest shielding / lowest personal damage', evidence: 'real_repo_required' },
    { id: 'TANK_03', name: 'Dreadguard', role: 'tank', minPureDpsReference: .60, maxPureDpsReference: .70, identity: 'control + self-sustain / higher tank damage', evidence: 'real_repo_required' },
    { id: 'CLS_002', name: 'Dawnkeeper', role: 'support', minPureDpsReference: .35, maxPureDpsReference: .45, identity: 'primary restoration / cleanse', evidence: 'data_calibrated' },
    { id: 'CLS_003', name: 'Wayfinder', role: 'damage', minPureDpsReference: .99, maxPureDpsReference: 1.01, identity: 'reliable ranged reference', evidence: 'data_calibrated' },
    { id: 'CLS_004', name: 'Ravager', role: 'damage', minPureDpsReference: .98, maxPureDpsReference: 1.03, identity: 'burst + armor break', evidence: 'data_calibrated' },
    { id: 'CLS_005', name: 'Hexweaver', role: 'damage', minPureDpsReference: .97, maxPureDpsReference: 1.02, identity: 'setup / DoT / debuff utility', evidence: 'data_calibrated' },
    { id: 'CLS_006', name: 'Knife Dancer', role: 'damage', minPureDpsReference: .99, maxPureDpsReference: 1.04, identity: 'execution difficulty / mobility', evidence: 'data_calibrated' },
    { id: 'CLS_007', name: 'Stonecaller', role: 'support', minPureDpsReference: .45, maxPureDpsReference: .55, identity: 'mitigation / resource utility', evidence: 'data_calibrated' },
];
exports.REGION_POWER_CURVE = [
    { region: 'Asterfall', entryLevel: 1, bossLevel: 25, playerIndex: 1, bossAttackIndex: 1, ratio: 1, evidence: 'runtime_verified' },
    { region: 'Sunscar', entryLevel: 25, bossLevel: 45, playerIndex: 1.888, bossAttackIndex: 1.912, ratio: .987, evidence: 'data_calibrated' },
    { region: 'Frostmarch', entryLevel: 45, bossLevel: 70, playerIndex: 3.355, bossAttackIndex: 3.309, ratio: 1.014, evidence: 'data_calibrated' },
    { region: 'Ashlands', entryLevel: 70, bossLevel: 100, playerIndex: 5.94, bossAttackIndex: 5.735, ratio: 1.036, evidence: 'data_calibrated' },
];
exports.REGIONAL_BOSS_BASELINES = [
    { id: 'BOSS_001', name: 'Fallen Knight', level: 25, hp: 180_000, attack: 68, attackInterval: 2.5, accuracy: 420, enrageSeconds: 360 },
    { id: 'BOSS_002', name: 'Sand Tyrant', level: 45, hp: 520_000, attack: 130, attackInterval: 2.4, accuracy: 760, enrageSeconds: 360 },
    { id: 'BOSS_003', name: 'Frost Wyrm', level: 70, hp: 1_450_000, attack: 225, attackInterval: 2.3, accuracy: 1350, enrageSeconds: 390 },
    { id: 'BOSS_004', name: 'Cinder Regent', level: 100, hp: 4_100_000, attack: 390, attackInterval: 2.2, accuracy: 2400, enrageSeconds: 420 },
];
exports.REGIONAL_BOSS_OUTCOME_TARGETS = {
    preparedFirstClearWinRate: { min: .60, max: .80 },
    intendedClearLeadBeforeEnrageSeconds: { min: 45, max: 75 },
    tankUnmitigatedBasicSurvivalMinimum: 6,
    hardSingleGearProfileRequired: false,
};
exports.ELITE_REGION_SCALING = [
    { region: 'Asterfall', hpMultiplier: 1.8, damageMultiplier: 1.45, rareDropChance: .025, pity: 25 },
    { region: 'Sunscar', hpMultiplier: 2.0, damageMultiplier: 1.50, rareDropChance: .025, pity: 25 },
    { region: 'Frostmarch', hpMultiplier: 2.1, damageMultiplier: 1.55, rareDropChance: .025, pity: 25 },
    { region: 'Ashlands', hpMultiplier: 2.2, damageMultiplier: 1.60, rareDropChance: .025, pity: 25 },
];
exports.COOP_ROLE_TARGET = { tank: 1, damage: 2, support: 1 };
exports.COOP_SYNC_TARGETS = [
    { tier: 'Asterfall T1', level: 12, targetPower: 500, softCapPower: 575, overcapRetention: .35 },
    { tier: 'Asterfall T2', level: 18, targetPower: 760, softCapPower: 875, overcapRetention: .35 },
    { tier: 'Asterfall T3', level: 23, targetPower: 1040, softCapPower: 1195, overcapRetention: .35 },
    { tier: 'Sunscar T1', level: 30, targetPower: 1450, softCapPower: 1665, overcapRetention: .35 },
];
exports.EXPEDITION_TIER_BALANCE = [
    { tier: 1, difficultyIndex: 1.00, clearMin: .90, clearMid: .95, clearMax: .97, rewardMultiplier: 1.00 },
    { tier: 2, difficultyIndex: 1.06, clearMin: .82, clearMid: .87, clearMax: .92, rewardMultiplier: 1.10 },
    { tier: 3, difficultyIndex: 1.11, clearMin: .70, clearMid: .775, clearMax: .85, rewardMultiplier: 1.25 },
    { tier: 4, difficultyIndex: 1.19, clearMin: .55, clearMid: .625, clearMax: .70, rewardMultiplier: 1.45 },
    { tier: 5, difficultyIndex: 1.29, clearMin: .35, clearMid: .45, clearMax: .55, rewardMultiplier: 1.70 },
];
exports.CHARACTER_TRIAL_BALANCE = {
    floorCount: 30,
    bossEvery: 5,
    synergyCombatCap: 1.08,
    recommendationBase: 900,
    recommendationGrowth: 1.075,
    evidence: 'data_calibrated',
};
exports.COMPANION_COMBAT_BALANCE = {
    characterAssistTypicalContribution: { min: .06, max: .10, hardCap: .12 },
    raidContributionPerPlayer: { min: .02, max: .05 },
    rarityTotalPower: { standard: 1, rare: 1.09, elite: 1.12, prestige: 1.155 },
    trialRecommendedPower: { floor1: 2750, floor30: 4300 },
    trialEnemyGrowth: 1.020,
    trialFloor30EndgameClearTarget: { min: .75, max: .95 },
    evidence: 'seeded_verified',
};
exports.PVP_BALANCE = {
    ranked: { gearNormalized: true, combatCompanionNormalized: true, rarityBonus: 0, achievementBonus: 0, targetWinRate: { min: .48, max: .52 }, targetDurationSeconds: { min: 90, max: 150 } },
    casual: { gearNormalized: false, combatCompanionNormalized: true, targetDurationSeconds: { min: 60, max: 180 } },
    synergyCombatCap: 1.08,
};
exports.GUILD_BOSS_BALANCE = [
    { id: 'GBOSS_001', region: 'Asterfall', targetPowerSync: 650, memberContributionCap: .08, attemptsPerMember: 3, windowDays: 3 },
    { id: 'GBOSS_002', region: 'Asterfall', targetPowerSync: 950, memberContributionCap: .07, attemptsPerMember: 3, windowDays: 3 },
    { id: 'GBOSS_003', region: 'Sunscar', targetPowerSync: 1550, memberContributionCap: .06, attemptsPerMember: 3, windowDays: 3 },
    { id: 'GBOSS_004', region: 'Frostmarch', targetPowerSync: 2400, memberContributionCap: .05, attemptsPerMember: 3, windowDays: 3 },
];
exports.RAID_BALANCE = {
    partySize: 8,
    requiredLevel: 100,
    bossEnrageSeconds: { min: 420, max: 600 },
    companionContributionPerPlayer: { min: .02, max: .05 },
    personalLootRollsPerBossPerWeek: 1,
    pityEligibleBossKills: 40,
    targetedCraftFallbackWeeks: { min: 6, max: 10 },
    challengeModeExclusivePower: false,
    evidence: 'data_calibrated',
};
exports.COMBAT_ECONOMY_GUARDRAILS = {
    /** Direct equipment is a jackpot shortcut; crafting is the reliable path. */
    directGearDropCaps: { common: .025, uncommon: .0125, rare: .0025, epic: .0005, legendary: .0001, mythic: .00002 },
    bossDirectGearCapMultiplier: 2,
    lateAsterfallPlus10GoldFarmHours: { min: 6, max: 14, absoluteMax: 20 },
    regionalRareGearFallbackPity: 75,
    companionTrialMonthlyFirstClear: { companionEssence: 3570, gold: 73050, bondstones: 12 },
    companionTrialFullRepeat: { companionEssence: 0, gold: 1995, bondstones: 0 },
    coopEnhancedRewardCaps: { daily: 3, weekly: 12 },
    coopBossBonusWeeklyPerRegion: 3,
    rankedPvpEnhancedRewardCaps: { daily: 5, weekly: 25 },
};
exports.COMBAT_BALANCE_SURFACES = [
    { area: 'Combat Companions / assist', evidence: 'runtime_verified', status: 'retuned', note: '6–10% typical owner contribution; lower-DPS classes gain more from Damage companions because same-role equip remains forbidden.' },
    { area: 'Companion Trials', evidence: 'seeded_verified', status: 'retuned', note: 'Recommendation and enemy-stat curves separated; Floor 30 calibrated by real combat seeds.' },
    { area: 'Asterfall ordinary combat', evidence: 'runtime_verified', status: 'balanced', note: 'Existing progression difficulty already offsets collection/Faith/Companion power; no blind global enemy buff.' },
    { area: 'Asterfall character progression', evidence: 'runtime_verified', status: 'monitor', note: 'Use productive idle-combat hours/calendar days, not the superseded 18–30h vertical-slice row.' },
    { area: 'Class PvE role budgets', evidence: 'data_calibrated', status: 'monitor', note: '7 legacy class budgets are defined; Bastion/Dreadguard require full current-repository combat simulation.' },
    { area: 'Regional elites', evidence: 'data_calibrated', status: 'balanced', note: 'HP/damage multipliers rise modestly by region; pity remains bounded.' },
    { area: 'Regional bosses', evidence: 'data_calibrated', status: 'balanced', note: 'Player/boss indexed power remains within ~4% of parity; mechanics carry difficulty.' },
    { area: 'Co-op / Expedition tiers', evidence: 'seeded_verified', status: 'balanced', note: 'Existing simulated clear bands broadly match Tier I–V targets; preserve current tier indices.' },
    { area: 'Character Triad Trials', evidence: 'data_calibrated', status: 'real_repo_validation', note: 'Keep 30-floor/boss-every-5/synergy<=8%; run full current-repo squad combat before numeric retune.' },
    { area: 'Arena PvP', evidence: 'data_calibrated', status: 'real_repo_validation', note: 'Ranked must normalize gear and Combat Companion rarity power; aim 48–52% balanced matchup win rate.' },
    { area: 'Guild bosses', evidence: 'data_calibrated', status: 'real_repo_validation', note: 'Contribution caps decrease as tier rises; validate live snapshot damage in complete repository.' },
    { area: 'Raids', evidence: 'data_calibrated', status: 'real_repo_validation', note: '7–10m enrages and 2–5% companion contribution are contracts; full raid stat blocks/runtime are not in recovered source.' },
];
