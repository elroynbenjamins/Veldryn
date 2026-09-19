"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUNSCAR_DUNGEON_NODES_V20 = exports.SUNSCAR_DUNGEONS_V20 = void 0;
exports.validateSunscarDungeonDefinitionsV20 = validateSunscarDungeonDefinitionsV20;
const queue = (contentId, minLevel) => ({
    contentId, minLevel, maxLevelDeltaPreferred: 6, startPowerWindowFraction: .10, expandPowerWindowFractionPerMinute: .05, maxPowerWindowFraction: .40,
    minimumTankScore: .72, minimumSupportScore: .72, readyCheckSeconds: 20, routeVoteSeconds: 8, reconnectGraceSeconds: 30, safetyAiAfterSeconds: 30, hardDisconnectSeconds: 150,
});
exports.SUNSCAR_DUNGEONS_V20 = [
    {
        id: 'COP_004', name: 'Caravan of Glass', regionId: 'REG_002', minLevel: 30, expectedMinutes: 18, routeDepthMin: 4, routeDepthMax: 6, branchOptionsMin: 3, strictComposition: '1T/2D/1S', bossId: 'SUNBOSS_DUN_001', queueRules: queue('COP_004', 30),
        bossChecks: [
            { role: 'tank', label: 'Shard Charge', requirement: 'Face/position the Colossus away from the caravan and absorb the committed charge.', failureEffect: 'Caravan integrity takes heavy damage.' },
            { role: 'support', label: 'Glasswind Recovery', requirement: 'Recover the party after wind pressure or mitigate the burst window.', failureEffect: 'Wind attrition carries into the next plate break.' },
            { role: 'damage', label: 'Exposed Plates', requirement: 'Break exposed crystal plates before the armor reseals.', failureEffect: 'Boss retains armor and the caravan loses time.' },
            { role: 'party', label: 'Crossing Integrity', requirement: 'Keep caravan integrity above zero while routing threats across moving lanes.', failureEffect: 'Run fails.' },
        ],
        rewardHooks: ['SUNRES_001', 'SUNRES_006', 'sunscar_cosmetic_cache', 'generic_equipment_reward_hook'], equipmentRewardsFinalized: false,
    },
    {
        id: 'COP_005', name: 'Mirage Well', regionId: 'REG_002', minLevel: 36, expectedMinutes: 20, routeDepthMin: 5, routeDepthMax: 6, branchOptionsMin: 3, strictComposition: '1T/2D/1S', bossId: 'SUNBOSS_DUN_002', queueRules: queue('COP_005', 36),
        bossChecks: [
            { role: 'tank', label: 'Reflection Anchor', requirement: 'Keep the true Reflection anchored after reveal and prevent clone pressure reaching Support.', failureEffect: 'Illusion lanes merge.' },
            { role: 'support', label: 'Thirst Wave', requirement: 'Heal/mitigate the periodic basin drain and cleanse the real debuff target.', failureEffect: 'Resource pressure snowballs.' },
            { role: 'damage', label: 'True Target', requirement: 'Identify and burst the revealed true target rather than feeding false copies.', failureEffect: 'Boss restores a capped amount of health.' },
            { role: 'party', label: 'Oasis Anchors', requirement: 'Vote and rotate between three anchors; the repeated safe option becomes progressively weaker.', failureEffect: 'Final phase starts with a curse stack.' },
        ],
        rewardHooks: ['SUNRES_004', 'SUNRES_008', 'REL_013_chance', 'generic_equipment_reward_hook'], equipmentRewardsFinalized: false,
    },
    {
        id: 'COP_006', name: 'Buried Observatory', regionId: 'REG_002', minLevel: 40, expectedMinutes: 23, routeDepthMin: 6, routeDepthMax: 7, branchOptionsMin: 3, strictComposition: '1T/2D/1S', bossId: 'SUNBOSS_DUN_003', queueRules: queue('COP_006', 40),
        bossChecks: [
            { role: 'tank', label: 'Lens Alignment', requirement: 'Position the Custodian so lens sweeps leave a safe quadrant.', failureEffect: 'Safe space collapses.' },
            { role: 'support', label: 'Astral Pressure', requirement: 'Stabilize unavoidable pulses through healing, mitigation, Ward or resource sustain.', failureEffect: 'Party enters Starfall under-resourced.' },
            { role: 'damage', label: 'Interrupt Order', requirement: 'Interrupt marked casts in the server-selected order and use burnout windows.', failureEffect: 'Custodian gains an Overclock stack.' },
            { role: 'party', label: 'Rotating Lens', requirement: 'Resolve route-earned lens information and move to the correct quadrant.', failureEffect: 'Deterministic heavy damage; telegraph cannot crit.' },
        ],
        rewardHooks: ['SUNRES_002', 'SUNRES_011', 'REL_015_chance', 'generic_equipment_reward_hook'], equipmentRewardsFinalized: false,
    },
];
exports.SUNSCAR_DUNGEON_NODES_V20 = [
    { id: 'SUNNODE_001', dungeonId: 'COP_004', depth: 1, type: 'combat', name: 'Jackal Wake', risk: 'medium', estimatedMinutes: 2, description: 'Clear pack hunters from the caravan rear.', rewardTags: ['sunstone_small'], mechanicTags: ['split_attention'] },
    { id: 'SUNNODE_002', dungeonId: 'COP_004', depth: 1, type: 'hazard', name: 'Glasswind Cut', risk: 'medium', estimatedMinutes: 1, description: 'Vote between a fast exposed lane and a slower sheltered lane.', rewardTags: ['route_time'], mechanicTags: ['wind_lane'] },
    { id: 'SUNNODE_003', dungeonId: 'COP_004', depth: 1, type: 'event', name: 'Broken Axle', risk: 'low', estimatedMinutes: 1, description: 'Repair using gathered material or defend while the caravan crew works.', rewardTags: ['caravan_integrity'], mechanicTags: ['skill_option'] },
    { id: 'SUNNODE_004', dungeonId: 'COP_004', depth: 2, type: 'elite', name: 'Sunspine Ambush', risk: 'high', estimatedMinutes: 3, description: 'Optional elite sting encounter for a stronger reward cache.', rewardTags: ['venom', 'elite_cache'], mechanicTags: ['telegraph'] },
    { id: 'SUNNODE_005', dungeonId: 'COP_004', depth: 3, type: 'rest', name: 'Canvas Shade', risk: 'low', estimatedMinutes: 1, description: 'Recover or reinforce caravan integrity.', rewardTags: ['recovery'], mechanicTags: ['choice'] },
    { id: 'SUNNODE_006', dungeonId: 'COP_004', depth: 4, type: 'treasure', name: 'Merchant Lockbox', risk: 'medium', estimatedMinutes: 1, description: 'Take the safe cache or pry open the heat-sealed compartment.', rewardTags: ['sunstone', 'cosmetic_chance'], mechanicTags: ['greed'] },
    { id: 'SUNNODE_101', dungeonId: 'COP_005', depth: 1, type: 'puzzle', name: 'Three Reflections', risk: 'low', estimatedMinutes: 2, description: 'Use environmental tells to identify the true passage.', rewardTags: ['mirage_insight'], mechanicTags: ['illusion'] },
    { id: 'SUNNODE_102', dungeonId: 'COP_005', depth: 1, type: 'combat', name: 'Keeper Garden', risk: 'medium', estimatedMinutes: 2, description: 'Oasis Keepers sustain illusion adds until interrupted.', rewardTags: ['herbs'], mechanicTags: ['support_enemy'] },
    { id: 'SUNNODE_103', dungeonId: 'COP_005', depth: 1, type: 'event', name: 'The Offered Cup', risk: 'medium', estimatedMinutes: 1, description: 'Choose a short boon with a mirrored drawback.', rewardTags: ['route_boon'], mechanicTags: ['tradeoff'] },
    { id: 'SUNNODE_104', dungeonId: 'COP_005', depth: 2, type: 'elite', name: 'Shimmer Court', risk: 'high', estimatedMinutes: 3, description: 'Accuracy pressure with multiple false targets.', rewardTags: ['mirage_bloom', 'elite_cache'], mechanicTags: ['accuracy'] },
    { id: 'SUNNODE_105', dungeonId: 'COP_005', depth: 3, type: 'rest', name: 'True Water', risk: 'low', estimatedMinutes: 1, description: 'Cleanse one route curse or recover resources.', rewardTags: ['recovery'], mechanicTags: ['cleanse'] },
    { id: 'SUNNODE_106', dungeonId: 'COP_005', depth: 4, type: 'hazard', name: 'Dry Spiral', risk: 'medium', estimatedMinutes: 1, description: 'Race a draining spiral or stabilize each ring.', rewardTags: ['route_time'], mechanicTags: ['resource_pressure'] },
    { id: 'SUNNODE_201', dungeonId: 'COP_006', depth: 1, type: 'puzzle', name: 'Orrery Lock', risk: 'low', estimatedMinutes: 2, description: 'Align discovered constellations for a route advantage.', rewardTags: ['astral_script'], mechanicTags: ['memory'] },
    { id: 'SUNNODE_202', dungeonId: 'COP_006', depth: 1, type: 'combat', name: 'Runic Shell Hall', risk: 'medium', estimatedMinutes: 2, description: 'Star-Scribed Scarabs alternate defenses.', rewardTags: ['star_glass'], mechanicTags: ['damage_profile_swap'] },
    { id: 'SUNNODE_203', dungeonId: 'COP_006', depth: 1, type: 'hazard', name: 'Lens Gallery', risk: 'medium', estimatedMinutes: 1, description: 'Rotating beam lanes preview the final boss grammar.', rewardTags: ['route_boon'], mechanicTags: ['beam_lane'] },
    { id: 'SUNNODE_204', dungeonId: 'COP_006', depth: 2, type: 'elite', name: 'Null Astronomer', risk: 'high', estimatedMinutes: 3, description: 'Ordered interrupts under Starfall pressure.', rewardTags: ['astral_script', 'elite_cache'], mechanicTags: ['interrupt_order'] },
    { id: 'SUNNODE_205', dungeonId: 'COP_006', depth: 3, type: 'treasure', name: 'Sealed Astrolabe', risk: 'medium', estimatedMinutes: 1, description: 'A reward cache that can add a boss modifier if overcharged.', rewardTags: ['amberglass', 'relic_chance'], mechanicTags: ['risk_reward'] },
    { id: 'SUNNODE_206', dungeonId: 'COP_006', depth: 4, type: 'rest', name: 'Dark-Sky Chamber', risk: 'low', estimatedMinutes: 1, description: 'Recover or bank one route boon against a final curse.', rewardTags: ['recovery'], mechanicTags: ['choice'] },
];
function validateSunscarDungeonDefinitionsV20() {
    const errors = [];
    for (const dungeon of exports.SUNSCAR_DUNGEONS_V20) {
        if (dungeon.routeDepthMin < 4 || dungeon.routeDepthMax > 7 || dungeon.routeDepthMin > dungeon.routeDepthMax)
            errors.push(`${dungeon.id}:route_depth_invalid`);
        if (dungeon.branchOptionsMin < 3)
            errors.push(`${dungeon.id}:needs_at_least_three_branch_options`);
        if (dungeon.queueRules.contentId !== dungeon.id)
            errors.push(`${dungeon.id}:queue_content_mismatch`);
        if (dungeon.queueRules.minimumTankScore < .72 || dungeon.queueRules.minimumTankScore > 1)
            errors.push(`${dungeon.id}:tank_score_invalid`);
        if (dungeon.queueRules.minimumSupportScore < .72 || dungeon.queueRules.minimumSupportScore > 1)
            errors.push(`${dungeon.id}:support_score_invalid`);
        if (dungeon.bossChecks.filter(c => c.role === 'tank').length !== 1)
            errors.push(`${dungeon.id}:tank_check_missing`);
        if (dungeon.bossChecks.filter(c => c.role === 'support').length !== 1)
            errors.push(`${dungeon.id}:support_check_missing`);
        if (dungeon.bossChecks.filter(c => c.role === 'damage').length !== 1)
            errors.push(`${dungeon.id}:damage_check_missing`);
    }
    return errors;
}
