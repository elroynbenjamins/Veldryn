"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../../combat/content/launch-combat");
const expedition_combat_service_1 = require("../../combat/expedition-combat-service");
const event_expeditions_1 = require("../content/event-expeditions");
const event_service_1 = require("../event-service");
const players = ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'].map(classId => (0, launch_combat_1.launchPlayer)(classId, 80));
const members = [['a', 'c1', 'tank'], ['b', 'c2', 'damage'], ['c', 'c3', 'damage'], ['d', 'c4', 'support']].map(([accountId, characterId, role]) => ({ accountId, characterId, role: role }));
const now = Date.UTC(2026, 6, 15);
const gated = new event_service_1.EventExpeditionService(new event_service_1.MemoryEventRunRepository(), 'event-test-secret');
node_assert_1.strict.throws(() => gated.start({ requestId: 'event-off-req', runId: 'event-off-run', accountId: 'a', eventId: 'EVENT_SUNCREST_SHATTERED_ISLES', members, players, nowMs: now }), /event_not_live/);
node_assert_1.strict.throws(() => gated.start({ requestId: 'event-wrong-req', runId: 'event-wrong-run', accountId: 'a', eventId: 'EVENT_SUNCREST_SHATTERED_ISLES', activeLiveEventId: 'EVT_ANNUAL_010_2026', members, players, nowMs: now }), /event_not_live/);
const effects = new Set();
for (const definition of event_expeditions_1.EVENT_EXPEDITIONS) {
    const service = new event_service_1.EventExpeditionService(new event_service_1.MemoryEventRunRepository(), `route-secret-${definition.id}`);
    const run = service.start({ requestId: `request-${definition.liveEventSeriesId}`, runId: `run-${definition.liveEventSeriesId}`, accountId: 'a', eventId: definition.id, activeLiveEventId: `${definition.liveEventSeriesId}_2026`, members, players, nowMs: now });
    node_assert_1.strict.equal(run.graph.preBossNodeCount, definition.routeNodeCount, `${definition.eventName} route length drifted`);
    node_assert_1.strict.equal(run.graph.generatorVersion, 'event-route-v5');
    node_assert_1.strict.equal(run.mechanic?.id, definition.mechanic.id);
    node_assert_1.strict.equal(run.mechanic?.value, definition.mechanic.startValue);
    node_assert_1.strict.equal(run.objective?.id, definition.objective.id);
    node_assert_1.strict.equal(run.objective?.count, definition.objective.startCount);
    node_assert_1.strict.ok(run.graph.nodes.some(node => node.mechanicDelta && node.mechanicDelta > 0), `${definition.eventName} needs a restorative/success mechanic node`);
    node_assert_1.strict.ok(run.graph.nodes.some(node => (node.objectiveDelta ?? 0) > 0) || definition.objective.startCount > 0, `${definition.eventName} needs objective progression`);
    node_assert_1.strict.ok(run.graph.nodes.some(node => node.kind !== 'battle' && node.kind !== 'boss' && node.kind !== 'entry'), `${definition.eventName} needs non-combat route variety`);
    for (let depth = 1; depth <= 2; depth++)
        node_assert_1.strict.ok(run.graph.nodes.filter(node => node.depth === depth).every(node => node.kind === 'battle'), `${definition.eventName} must open with readable combat rooms`);
    const maxed = { ...run, objective: { id: definition.objective.id, count: definition.objective.maxCount } };
    const objective = (0, event_service_1.eventObjectiveProjection)(maxed);
    effects.add(objective.effect);
    if (objective.effect === 'boss_attack_down')
        node_assert_1.strict.ok(objective.bossAttackMultiplier < 1);
    if (objective.effect === 'boss_hp_down')
        node_assert_1.strict.ok(objective.bossHpMultiplier < 1);
    if (objective.effect === 'boss_defense_down')
        node_assert_1.strict.ok(objective.bossDefenseMultiplier < 1);
    if (objective.effect === 'reward_bonus')
        node_assert_1.strict.ok(objective.rewardBonus > 0);
    if (objective.effect === 'preboss_heal')
        node_assert_1.strict.ok(objective.preBossHealPct > 0);
    const bossProfile = (0, event_service_1.eventBossMechanicProjection)(run);
    node_assert_1.strict.ok(bossProfile?.label.trim());
    node_assert_1.strict.ok(bossProfile?.summary.trim());
    node_assert_1.strict.ok(bossProfile?.telegraph.bossName.trim());
    node_assert_1.strict.ok((bossProfile?.telegraph.phases.length ?? 0) > 0);
    node_assert_1.strict.ok(bossProfile?.telegraph.phases.every(phase => phase.label.trim()));
    node_assert_1.strict.ok(bossProfile?.telegraph.castAbilities.some(ability => ability.label.trim()));
    const altCount = definition.objective.startCount === definition.objective.maxCount ? 0 : definition.objective.maxCount;
    const alternate = (0, event_service_1.eventBossMechanicProjection)({ ...run, objective: { id: definition.objective.id, count: altCount } });
    node_assert_1.strict.ok(alternate);
    node_assert_1.strict.notEqual(alternate.profileId, bossProfile.profileId);
}
node_assert_1.strict.deepEqual(effects, new Set(['boss_attack_down', 'boss_hp_down', 'boss_defense_down', 'reward_bonus', 'preboss_heal']));
const frostfall = event_expeditions_1.EVENT_EXPEDITIONS.find(item => item.id === 'EVENT_FROSTFALL_AURORA_HOLLOW');
node_assert_1.strict.equal(frostfall.minLevel, 10);
for (let tier = 1; tier <= 5; tier++) {
    const required = 10 + (tier - 1) * 5;
    node_assert_1.strict.equal((0, event_expeditions_1.eventTierMinLevel)(frostfall, tier), required);
    node_assert_1.strict.ok((0, event_expeditions_1.eventTierRewardMarks)(frostfall, tier) >= frostfall.rewardMarks);
}
node_assert_1.strict.throws(() => (0, event_expeditions_1.eventTierMinLevel)(frostfall, 0), /invalid_event_tier/);
node_assert_1.strict.throws(() => (0, event_expeditions_1.eventTierMinLevel)(frostfall, 6), /invalid_event_tier/);
const frostBase = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_FROSTFALL_BATTLE_01' })[0];
const frostEntry = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_FROSTFALL_BATTLE_01', enemyLevel: 10 })[0];
const frostVeteran = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_FROSTFALL_BATTLE_01', enemyLevel: 30 })[0];
node_assert_1.strict.ok(frostEntry.stats.maxHp < frostBase.stats.maxHp * .5, 'Tier I must not inherit level-35 hit points');
node_assert_1.strict.ok(frostVeteran.stats.maxHp > frostEntry.stats.maxHp * 2, 'Tier V must be meaningfully tougher than Tier I');
node_assert_1.strict.equal(frostEntry.level, 10);
node_assert_1.strict.equal(frostVeteran.level, 30);
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('EVENT_FROSTFALL_BATTLE_01', 10), 'tier encounter preview available');
for (let tier = 1; tier <= 5; tier++) {
    const service = new event_service_1.EventExpeditionService(new event_service_1.MemoryEventRunRepository(), 'frostfall-tier-test-' + tier);
    const run = service.start({ requestId: 'frost-tier-request-' + tier, runId: 'frost-tier-run-' + tier, accountId: 'a', eventId: frostfall.id, tier, activeLiveEventId: 'EVT_ANNUAL_012_2026', members, players, nowMs: now });
    node_assert_1.strict.equal(run.tier, tier);
    node_assert_1.strict.equal(run.syncLevel, (0, event_expeditions_1.eventTierMinLevel)(frostfall, tier));
    node_assert_1.strict.equal(run.graph.preBossNodeCount, 6);
}
node_assert_1.strict.throws(() => new event_service_1.EventExpeditionService(new event_service_1.MemoryEventRunRepository(), 'frostfall-gate').start({ requestId: 'frost-req-level', runId: 'frost-run-level', accountId: 'a', eventId: frostfall.id, tier: 2, activeLiveEventId: 'EVT_ANNUAL_012_2026', members, players: players.map((player, index) => index === 0 ? { ...player, level: 14 } : player), nowMs: now }), /event_level_requirement/);
const veil = event_expeditions_1.EVENT_EXPEDITIONS.find(item => item.id === 'EVENT_VEILBREAK_GLOAM_BREACH'), veilService = new event_service_1.EventExpeditionService(new event_service_1.MemoryEventRunRepository(), 'veil-telegraph-secret');
const veilRun = veilService.start({ requestId: 'veil-telegraph-request', runId: 'veil-telegraph-run', accountId: 'a', eventId: veil.id, activeLiveEventId: 'EVT_ANNUAL_010_2026', members, players, nowMs: now });
node_assert_1.strict.equal(veil.minLevel, 15);
node_assert_1.strict.deepEqual(veil.levelScaling, { minLevel: 15, maxLevel: 35 });
node_assert_1.strict.equal(veilRun.syncLevel, 35, 'high-level lobbies should clamp to the Veilbreak bracket');
const mixedPlayers = players.map((player, index) => ({ ...player, level: [15, 20, 25, 35][index] }));
const mixedVeil = veilService.start({ requestId: 'veil-mixed-request', runId: 'veil-mixed-run', accountId: 'a', eventId: veil.id, activeLiveEventId: 'EVT_ANNUAL_010_2026', members, players: mixedPlayers, nowMs: now });
node_assert_1.strict.equal(mixedVeil.syncLevel, 24, 'Veilbreak should sync to the lobby average within its bracket');
const fullVeil = (0, event_service_1.eventBossMechanicProjection)({ ...veilRun, objective: { id: veil.objective.id, count: veil.objective.maxCount } });
node_assert_1.strict.ok(fullVeil.telegraph.suppressedAbilities.some(ability => ability.label === 'Lantern Extinction'));
node_assert_1.strict.ok(!fullVeil.telegraph.castAbilities.some(ability => ability.label === 'Lantern Extinction'));
const service = new event_service_1.EventExpeditionService(new event_service_1.MemoryEventRunRepository(), 'event-suncrest-secret');
const suncrest = event_expeditions_1.EVENT_EXPEDITIONS.find(item => item.id === 'EVENT_SUNCREST_SHATTERED_ISLES');
let run = service.start({ requestId: 'event-request-1', runId: 'event-run-1', accountId: 'a', eventId: suncrest.id, activeLiveEventId: 'EVT_ANNUAL_006_2026', members, players, nowMs: now });
const originalGraph = JSON.stringify(run.graph);
node_assert_1.strict.equal(originalGraph, JSON.stringify(service.start({ requestId: 'event-request-1', runId: 'ignored', accountId: 'a', eventId: suncrest.id, activeLiveEventId: 'EVT_ANNUAL_006_2026', members, players, nowMs: now }).graph));
const initialMeter = run.mechanic.value, initialObjective = run.objective.count;
for (let depth = 1; depth <= run.graph.preBossNodeCount; depth++) {
    const current = run.graph.nodes.find(node => node.nodeId === run.currentNodeId);
    const options = current.nextNodeIds.map(id => run.graph.nodes.find(node => node.nodeId === id));
    const selected = options.find(node => (node.objectiveDelta ?? 0) > 0) ?? options.find(node => (node.mechanicDelta ?? 0) > 0) ?? options.find(node => node.kind === 'camp' || node.kind === 'shrine') ?? options.find(node => node.kind === 'battle');
    run = service.choose({ runId: run.id, accountId: 'a', optionNodeId: selected.nodeId, requestId: `event-choice-${depth}` });
    if (run.phase === 'failed')
        throw new Error('event route failed');
}
node_assert_1.strict.ok(run.mechanic.value >= initialMeter, 'themed route choices should be able to improve the seasonal meter');
node_assert_1.strict.ok(run.objective.count > initialObjective, 'signature objective should progress through themed route choices');
const beforeBoss = (0, event_service_1.eventMechanicProjection)(run), objectiveBeforeBoss = (0, event_service_1.eventObjectiveProjection)(run), bossBefore = (0, event_service_1.eventBossMechanicProjection)(run);
run = service.choose({ runId: run.id, accountId: 'a', optionNodeId: 'boss', requestId: 'event-choice-boss' });
node_assert_1.strict.equal(run.phase, 'completed');
node_assert_1.strict.equal(run.lastResolution?.result.summary.bossTuningProfile, bossBefore?.tuning.profileId);
node_assert_1.strict.equal(run.rewardMarks, suncrest.rewardMarks + beforeBoss.rewardBonus + objectiveBeforeBoss.rewardBonus);
node_assert_1.strict.equal(service.claimReward({ runId: run.id, accountId: 'a', requestId: 'event-claim' }).marks, run.rewardMarks);
node_assert_1.strict.equal(service.claimReward({ runId: run.id, accountId: 'a', requestId: 'event-claim' }).idempotentReplay, true);
node_assert_1.strict.equal(service.choose({ runId: run.id, accountId: 'a', optionNodeId: 'boss', requestId: 'event-choice-boss' }).phase, 'completed');
const clearRepo = new event_service_1.MemoryEventRunRepository(), clearService = new event_service_1.EventExpeditionService(clearRepo, 'daily-clear-secret');
for (let index = 0; index < 3; index++)
    clearRepo.save({ ...run, id: `daily-clear-run-${index}`, requestId: `daily-clear-request-${index}`, settlement: 'pending', phase: 'completed', rewardMarks: 1 });
node_assert_1.strict.equal(clearService.claimReward({ runId: 'daily-clear-run-0', accountId: 'a', requestId: 'daily-clear-0', nowMs: now }).marks, 1);
node_assert_1.strict.equal(clearService.claimReward({ runId: 'daily-clear-run-1', accountId: 'a', requestId: 'daily-clear-1', nowMs: now }).marks, 1);
node_assert_1.strict.throws(() => clearService.claimReward({ runId: 'daily-clear-run-2', accountId: 'a', requestId: 'daily-clear-2', nowMs: now }), /event_daily_clear_limit/);
console.log('event service tests passed');
