"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const launch_combat_1 = require("../../combat/content/launch-combat");
const weekly_party_stage_prototype_v3_1 = require("../weekly-party-stage-prototype-v3");
const weekly_party_events_v2_1 = require("../weekly-party-events-v2");
function assert(value, msg) { if (!value)
    throw Error('party-stage-v3: ' + msg); }
function rejects(fn, part) { let error = ''; try {
    fn();
}
catch (e) {
    error = String(e);
} assert(error.includes(part), part + ': ' + error); }
assert(weekly_party_stage_prototype_v3_1.PARTY_EVENT_STAGE_V3_RELEASED === false, 'stage feature must remain disabled');
const catalog = [
    { itemId: 'GREENWOOD_LOG', category: 'wood', tier: 'common', secondsPerUnit: 20, unlocked: true },
    { itemId: 'COPPER_ORE', category: 'ore', tier: 'common', secondsPerUnit: 20, unlocked: true },
    { itemId: 'DEWLEAF', category: 'herb', tier: 'common', secondsPerUnit: 30, unlocked: true },
];
const kit = ['Ironwarden', 'Wayfinder', 'Dawnkeeper', 'Ravager'].map((name, index) => ({ ...(0, launch_combat_1.launchPlayer)(name, 25), id: 'party-stage-player-' + index }));
let count = 0, encounters = 0, variantCount = 0;
for (const [family, data] of Object.entries(weekly_party_events_v2_1.WEEKLY_PARTY_EVENT_FAMILIES)) {
    for (const variation of data.variations) {
        variantCount++;
        for (const partySize of [2, 3, 4]) {
            const orders = (0, weekly_party_events_v2_1.buildWeeklyPartySupplyOrders)(family, (0, weekly_party_events_v2_1.weeklyPartyBudget)(partySize, 'standard'), catalog, 37)
                .map(o => ({ ...o, donatedQuantity: o.quantity }));
            for (const stage of [1, 2, 3]) {
                const choiceId = stage === 1 ? undefined : stage === 2
                    ? { broken_caravan: 'safe_pass', nightfall_hunt: 'clear_trail', broken_wards: 'ground_spires', lost_reliquary: 'quiet_passage' }[family]
                    : { broken_caravan: 'brace_wagons', nightfall_hunt: 'hold_ground', broken_wards: 'protect_wards', lost_reliquary: 'preserve_seals' }[family];
                const input = { family: family, variation,
                    stage, difficulty: 'standard', seed: 211, orders,
                    frozenActors: kit.slice(0, partySize), ...(choiceId ? { choiceId } : {}) };
                const preview = (0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)(input);
                assert(preview.kind === 'non_rewarding_prototype', 'never claim production authority');
                assert(!('eventPoints' in preview) && !('rewards' in preview), 'stage prototype must not grant EP or items');
                assert(preview.cues.length === 3 && preview.cues.every(c => c.atMs > 0), 'three authored cue windows');
                assert(preview.requiredOrdersComplete === stage, 'only current-stage verified supply buffs');
                assert(preview.estimatedObjectiveIntegrity >= 0 && preview.estimatedObjectiveIntegrity <= 100, 'bounded objective integrity');
                if (stage === 1)
                    assert(preview.combatResult === null, 'scouting has no forced combat');
                else {
                    assert(preview.combatResult !== null, 'confrontation and defense simulate real combat');
                    assert(preview.combatResult.totalDamage >= 0 && preview.combatResult.durationMs <= 72000, 'bounded combat telemetry');
                    assert(preview.choices.length === 2, 'exactly two vote choices');
                    encounters++;
                }
                if (count % 15 === 0)
                    assert(JSON.stringify((0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)(input)) === JSON.stringify(preview), 'seeded preview is deterministic');
                count++;
            }
        }
    }
}
assert(variantCount === 12 && count === 108 && encounters === 72, 'complete four-family, twelve-variant, all-sizes stage coverage');
const example = { family: 'broken_caravan', variation: 'bandits_crossing', stage: 2, difficulty: 'standard',
    seed: 5, frozenActors: kit.slice(0, 2), orders: [], choiceId: 'safe_pass' };
const noSupply = (0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)(example);
const withSupplies = (0, weekly_party_events_v2_1.buildWeeklyPartySupplyOrders)('broken_caravan', (0, weekly_party_events_v2_1.weeklyPartyBudget)(2, 'standard'), catalog, 5)
    .map(o => ({ ...o, donatedQuantity: o.quantity }));
const supported = (0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)({ ...example, orders: withSupplies });
assert(noSupply.requiredOrdersComplete === 0 && supported.requiredOrdersComplete === 2, 'stage2 receives only stage1/2 supplies');
assert(supported.optionalPreparations.length === 3, 'verified optional orders show in stage2');
rejects(() => (0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)({ ...example, variation: 'invented' }), 'party_stage_unknown_family_variation');
rejects(() => (0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)({ ...example, choiceId: 'invented' }), 'party_stage_choice_unresolved');
rejects(() => (0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)({ ...example, stage: 1, choiceId: 'safe_pass' }), 'party_stage_early_vote');
rejects(() => (0, weekly_party_stage_prototype_v3_1.simulatePartyEventStagePrototype)({ ...example, frozenActors: [kit[0]] }), 'party_stage_invalid_verified_roster');
console.log('PASS hidden Party Events v3 stage preview: ' + count + ' stages; ' + encounters + ' deterministic combat encounters; no rewards or EP');
