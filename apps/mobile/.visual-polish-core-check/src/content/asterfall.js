"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASTERFALL_PRODUCTIVE_HOUR_BUDGET = exports.V1_BALANCE_TARGETS = exports.ASTERFALL_LEVEL_BANDS = void 0;
exports.ASTERFALL_LEVEL_BANDS = [
    { id: 'GREENFIELDS', name: 'Greenfields', minLevel: 1, maxLevel: 6, goal: 'Learn combat, first skill and equipment.' },
    { id: 'IRONWOOD', name: 'Ironwood Forest', minLevel: 7, maxLevel: 15, goal: 'Introduce tougher enemies, materials and meaningful gear.' },
    { id: 'OLD_MINES', name: 'Old Mines', minLevel: 16, maxLevel: 19, goal: 'Push crafting resources and higher-defense targets.' },
    { id: 'KINGS_ROAD', name: "King's Road", minLevel: 20, maxLevel: 25, goal: 'Prepare food, equipment and Oathglass readiness for Fallen Knight.' },
];
exports.V1_BALANCE_TARGETS = {
    targetLevel25ProductiveCombatHours: { min: 175, max: 288 },
    targetAsterfallNormalDays: { min: 12, max: 16 },
    targetAsterfallCasualDays: { min: 15, max: 23 },
    targetAsterfallActiveDays: { min: 7, max: 12 },
    targetAsterfallOptimizerDays: { min: 6, max: 9 },
    recommendedFallenKnightReadiness: 80,
    targetFallenKnightPreparedWinRate: { min: .55, max: .70 },
    targetClassKillSpeedSpreadPct: 18,
    targetCraftedGearUsefulPct: 35,
    guaranteedTutorialUpgrade: true,
    principle: 'Level 25 is necessary but not sufficient. Food, gear and relevant skilling create soft preparation gates.'
};
exports.ASTERFALL_PRODUCTIVE_HOUR_BUDGET = {
    combat: 252, mining: 64.8, smithing: 57.6, fishing: 50.4, cooking: 36, woodcutting: 21.6, questManual: 6, gearReadiness: 43.2, total: 531.6
};
