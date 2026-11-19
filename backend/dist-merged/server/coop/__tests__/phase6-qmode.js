"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../../combat/content/launch-combat");
const qmode_1 = require("../qmode");
const config_1 = require("../config");
node_assert_1.strict.equal(config_1.COOP_ROGUELITE_CONFIG.echoFreshnessMs, 7 * 24 * 60 * 60 * 1000, 'Published Echo snapshots remain eligible for seven days');
function frozen(accountId, classId, characterId) {
    const player = (0, launch_combat_1.launchPlayer)(classId, 25);
    const role = player.role;
    const snapshot = { characterId, classId, role, level: 25, ...player.stats };
    return { accountId, characterId, classId, loadoutId: `load-${characterId}`, revision: 1, normalized: { snapshot, abilities: player.abilities, effectiveLevel: 25, normalizationVersion: 'test', before: { level: 25, maxHp: snapshot.maxHp, attackPower: snapshot.attackPower, healingPower: snapshot.healingPower, defense: snapshot.defense } }, readiness: { ready: true, role, normalizedScore: 1, failures: [] }, snapshotHash: `hash-${characterId}` };
}
function echo(accountId, classId, characterId) { return { profileId: `profile-${characterId}`, sourceAccountId: accountId, optedIn: true, publishedAtMs: 9_000, contentVersion: 'v1', blockedAccountIds: [], snapshot: frozen(accountId, classId, characterId) }; }
const profiles = [echo('tank-owner', 'Ironwarden', 'tank-char'), echo('damage-owner-1', 'Wayfinder', 'damage-char-1'), echo('damage-owner-dup', 'Wayfinder', 'damage-char-dup'), echo('damage-owner-2', 'Ravager', 'damage-char-2'), echo('support-owner', 'Stonecaller', 'support-char')];
const repository = new qmode_1.MemoryQModeRunRepository();
const firstService = new qmode_1.QModeService(repository, 'q-secret-success');
let run = firstService.create({ requestId: 'request-1', runId: 'q-run-1', controllerAccountId: 'controller', controllerSnapshot: frozen('controller', 'Dawnkeeper', 'controller-char'), expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'b1', nowMs: 10_000, profiles });
node_assert_1.strict.equal(run.players.length, 4);
node_assert_1.strict.equal(run.qmodePressureVersion, 1, 'New Q-Mode runs use stronger Echo/NPC enemy hits');
node_assert_1.strict.equal(new Set(run.echoSourceAccountIds).size, 3);
node_assert_1.strict.equal(run.phase, 'awaiting_choice');
const damageClasses = run.players.filter(player => player.role === 'damage').map(player => player.classId);
node_assert_1.strict.equal(damageClasses.length, 2);
node_assert_1.strict.equal(new Set(damageClasses).size, 2, 'Q-Mode must choose two different Damage classes even if duplicate-class Echoes are available');
node_assert_1.strict.equal(firstService.create({ requestId: 'request-1', runId: 'different', controllerAccountId: 'controller', controllerSnapshot: frozen('controller', 'Dawnkeeper', 'controller-char'), expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'b1', nowMs: 10_000, profiles }).id, 'q-run-1');
let denied = '';
try {
    firstService.getAuthorized(run.id, 'tank-owner');
}
catch (error) {
    denied = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(denied, 'not_participant');
const resumedService = new qmode_1.QModeService(repository, 'q-secret-success');
for (let depth = 1; depth <= run.graph.preBossNodeCount; depth++) {
    const current = run.graph.nodes.find(node => node.nodeId === run.currentNodeId);
    const options = current.nextNodeIds.map(id => run.graph.nodes.find(node => node.nodeId === id));
    const selected = options.find(node => node.kind === 'camp') ?? options[0];
    run = resumedService.choose({ runId: run.id, controllerAccountId: 'controller', optionNodeId: selected.nodeId });
    node_assert_1.strict.equal(run.phase, 'awaiting_choice');
}
run = resumedService.choose({ runId: run.id, controllerAccountId: 'controller', optionNodeId: 'boss' });
node_assert_1.strict.equal(run.phase, 'completed');
node_assert_1.strict.ok((run.rewardMarks ?? 0) > 0);
node_assert_1.strict.equal(run.persistentState.visitedNodeIds.length, run.graph.preBossNodeCount + 1);
console.log('coop phase6 qmode OK', JSON.stringify({ echoes: run.echoSourceAccountIds.length, preBoss: run.graph.preBossNodeCount, rewardMarks: run.rewardMarks }));
// Production NPC fallback: preserve roles, unique DPS and real Echo preference.
const qmode_npc_allies_1 = require("../qmode-npc-allies");
const qmode_public_projection_1 = require("../qmode-public-projection");
const npcKits = (0, qmode_npc_allies_1.createQModeNpcAllies)({ minimumLevel: 15, syncLevel: 25, controllerLevel: 25 });
node_assert_1.strict.equal(npcKits.length, 9);
node_assert_1.strict.ok(npcKits.every(npc => npc.readiness.ready));
const npcOnly = new qmode_1.QModeService(new qmode_1.MemoryQModeRunRepository(), 'npc-test').create({
    requestId: 'npc-test-request', runId: 'npc-run', controllerAccountId: 'controller',
    controllerSnapshot: frozen('controller', 'Dawnkeeper', 'controller-char'), expeditionId: 'EXP_001', tier: 1,
    contentVersion: 'v1', balanceVersion: 'b1', nowMs: 10_000, profiles: [], npcSnapshots: npcKits
});
node_assert_1.strict.equal(npcOnly.npcCharacterIds?.length, 3);
node_assert_1.strict.equal(npcOnly.qmodePressureVersion, 1, 'NPC fallback receives same combat difficulty as real Echo recruits');
node_assert_1.strict.equal(npcOnly.echoSourceAccountIds.length, 0);
node_assert_1.strict.deepEqual((0, qmode_public_projection_1.projectQModeRun)(npcOnly).team.map(member => member.kind), ['controller', 'npc', 'npc', 'npc']);
node_assert_1.strict.equal(new Set(npcOnly.players.filter(player => player.role === 'damage').map(player => player.classId)).size, 2);
// Live remains on its established pressure profile; old persisted Q-Mode runs
// without the explicit opt-in marker are not silently changed mid-run.
const liveRun = new qmode_1.QModeService(new qmode_1.MemoryQModeRunRepository(), 'live-test').createLive({
    requestId: 'live-test-request', runId: 'live-test-run', controllerAccountId: 'controller',
    expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'b1',
    snapshots: [frozen('controller', 'Ironwarden', 'tank-live'), frozen('damage-1', 'Wayfinder', 'dps-live-1'), frozen('damage-2', 'Ravager', 'dps-live-2'), frozen('support', 'Stonecaller', 'support-live')],
});
node_assert_1.strict.equal(liveRun.qmodePressureVersion, undefined, 'Live combat must not inherit Q-Mode pressure');
const legacyRepository = new qmode_1.MemoryQModeRunRepository();
legacyRepository.save({ ...npcOnly, qmodePressureVersion: undefined });
node_assert_1.strict.equal(new qmode_1.QModeService(legacyRepository, 'npc-test').getAuthorized(npcOnly.id, 'controller').qmodePressureVersion, undefined, 'Previously saved Q-Mode runs retain their existing difficulty');
const mixed = new qmode_1.QModeService(new qmode_1.MemoryQModeRunRepository(), 'npc-test').create({
    requestId: 'mixed-test-request', runId: 'mixed-run', controllerAccountId: 'controller',
    controllerSnapshot: frozen('controller', 'Dawnkeeper', 'controller-char'), expeditionId: 'EXP_001', tier: 1,
    contentVersion: 'v1', balanceVersion: 'b1', nowMs: 10_000, profiles: [profiles[0]], npcSnapshots: npcKits
});
node_assert_1.strict.equal(mixed.echoSourceAccountIds.length, 1);
node_assert_1.strict.equal(mixed.npcCharacterIds?.length, 2);
node_assert_1.strict.deepEqual((0, qmode_public_projection_1.projectQModeRun)(mixed).team.map(member => member.kind), ['controller', 'echo', 'npc', 'npc']);
console.log('Q-Mode NPC fallback passed');
const launch_content_1 = require("../../expeditions/content/launch-content");
const config_2 = require("../config");
const echo_recruitment_1 = require("../echo-recruitment");
// Every reachable dungeon/tier must have NPC kits for all four party compositions
// without creating fake accounts, donor Echo profiles or duplicate Damage classes.
let tierCombinations = 0;
for (const dungeon of Object.values(launch_content_1.EXPEDITIONS)) {
    for (const tier of [1, 2, 3, 4, 5]) {
        const minimumLevel = (0, config_2.coopRequiredLevel)(dungeon.minLevel, tier);
        if (minimumLevel > 100)
            continue;
        const tierKits = (0, qmode_npc_allies_1.createQModeNpcAllies)({ minimumLevel, syncLevel: dungeon.recommendedLevel, controllerLevel: minimumLevel });
        node_assert_1.strict.equal(tierKits.length, 9);
        node_assert_1.strict.ok(tierKits.every(npc => npc.readiness.ready && npc.normalized.before.level >= minimumLevel));
        for (const [controllerRole, controllerClassId] of [['tank', 'IRONWARDEN'], ['damage', 'WAYFINDER'], ['support', 'DAWNKEEPER']]) {
            const allies = (0, echo_recruitment_1.recruitQModeAllies)({
                serverSecret: 'npc-tier-regression', requestId: `npc-${dungeon.id}-${tier}-${controllerRole}`,
                controllerAccountId: 'controller', controllerRole, controllerClassId,
                contentVersion: 'v1', nowMs: 10_000, profiles: [], npcSnapshots: tierKits,
            });
            node_assert_1.strict.equal(allies.length, 3);
            node_assert_1.strict.ok(allies.every(ally => ally.kind === 'npc' && ally.snapshot.accountId.startsWith('npc:qmode:')));
            node_assert_1.strict.ok(allies.every(ally => ally.snapshot.normalized.snapshot.displayName?.startsWith('NPC · ') === true));
            const roles = [controllerRole, ...allies.map(ally => ally.snapshot.readiness.role)];
            node_assert_1.strict.equal(roles.filter(role => role === 'tank').length, 1);
            node_assert_1.strict.equal(roles.filter(role => role === 'damage').length, 2);
            node_assert_1.strict.equal(roles.filter(role => role === 'support').length, 1);
            const damageClasses = [...(controllerRole === 'damage' ? [controllerClassId] : []), ...allies.filter(ally => ally.snapshot.readiness.role === 'damage').map(ally => ally.snapshot.classId)];
            node_assert_1.strict.equal(new Set(damageClasses).size, 2);
            tierCombinations++;
        }
    }
}
console.log('Q-Mode NPC tier coverage passed', tierCombinations);
const consumable_policy_1 = require("../consumable-policy");
node_assert_1.strict.equal(consumable_policy_1.DUNGEON_FOOD_ALLOWED, false, 'food remains forbidden in all dungeon tiers');
for (const [tier, cap] of [[1, 3], [2, 3], [3, 4], [4, 4], [5, 5]])
    node_assert_1.strict.equal((0, consumable_policy_1.dungeonConsumablePolicy)(tier).potionCharges, cap);
const dungeonCharacter = { character: { id: 'controller-char', equippedHealingPotionId: 'DEWLEAF_DRAUGHT' }, inventory: { stacks: [{ itemId: 'DEWLEAF_DRAUGHT', quantity: 7 }, { itemId: 'VIGOR_TONIC', quantity: 8 }, { itemId: 'MOSS_RAT_MEAT', quantity: 10 }] } };
const actorId = 'controller-char', maximum = 200;
const initialRun = { ...npcOnly.persistentState, actors: { ...npcOnly.persistentState.actors, [actorId]: { ...npcOnly.persistentState.actors[actorId], hp: 40 } } };
const args = { runId: npcOnly.id, tier: 1, phase: 'awaiting_choice', actorId, ownerCharacterId: actorId, maxHp: maximum };
const firstPotion = (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'use-1', persistentState: initialRun, characterState: dungeonCharacter });
node_assert_1.strict.equal(firstPotion.receipt.itemId, 'DEWLEAF_DRAUGHT');
node_assert_1.strict.equal(firstPotion.receipt.healedHp, 40);
node_assert_1.strict.equal(firstPotion.persistentState.actors[actorId].hp, 80);
node_assert_1.strict.equal(firstPotion.characterState.inventory.stacks.find(x => x.itemId === 'DEWLEAF_DRAUGHT')?.quantity, 6);
node_assert_1.strict.equal(firstPotion.persistentState.dungeonPotionChargesUsed, 1);
const replay = (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'use-1', persistentState: firstPotion.persistentState, characterState: firstPotion.characterState });
node_assert_1.strict.equal(replay.replayed, true, 'replayed request must not consume a second potion');
node_assert_1.strict.equal(replay.characterState.inventory.stacks.find(x => x.itemId === 'DEWLEAF_DRAUGHT')?.quantity, 6);
let used = firstPotion;
for (const requestId of ['use-2', 'use-3'])
    used = (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId, persistentState: used.persistentState, characterState: used.characterState });
node_assert_1.strict.equal(used.persistentState.dungeonPotionChargesUsed, 3);
node_assert_1.strict.throws(() => (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'use-4', persistentState: used.persistentState, characterState: used.characterState }), /charges_exhausted/);
node_assert_1.strict.throws(() => (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'bad-actor', ownerCharacterId: 'other', persistentState: initialRun, characterState: dungeonCharacter }), /character_mismatch/);
node_assert_1.strict.throws(() => (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'finished', phase: 'completed', persistentState: initialRun, characterState: dungeonCharacter }), /not_active/);
node_assert_1.strict.throws(() => (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'downed', persistentState: { ...initialRun, actors: { ...initialRun.actors, [actorId]: { ...initialRun.actors[actorId], downed: true } } }, characterState: dungeonCharacter }), /actor_downed/);
node_assert_1.strict.throws(() => (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'full', persistentState: { ...initialRun, actors: { ...initialRun.actors, [actorId]: { ...initialRun.actors[actorId], hp: 200 } } }, characterState: dungeonCharacter }), /health_full/);
node_assert_1.strict.throws(() => (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'no-stock', persistentState: initialRun, characterState: { ...dungeonCharacter, inventory: { ...dungeonCharacter.inventory, stacks: [] } } }), /out_of_stock/);
node_assert_1.strict.throws(() => (0, consumable_policy_1.planDungeonPotionUse)({ ...args, requestId: 'food-not-potion', persistentState: initialRun, characterState: { ...dungeonCharacter, character: { ...dungeonCharacter.character, equippedHealingPotionId: 'MOSS_RAT_MEAT' } } }), /not_selected/);
node_assert_1.strict.equal(dungeonCharacter.inventory.stacks.find(x => x.itemId === 'VIGOR_TONIC')?.quantity, 8, 'non-healing tonics are untouched');
console.log('dungeon potion transaction plan: stock, healing, tier caps, idempotency and security guards passed');
/** Guard the cross-package source of truth without importing React Native into backend TypeScript. */
const healing_potion_catalog_1 = require("../../../shared/healing-potion-catalog");
const node_fs_1 = require("node:fs");
const alchemySource = (0, node_fs_1.readFileSync)('../apps/mobile/src/content/alchemy.ts', 'utf8');
for (const [id, fraction] of Object.entries(healing_potion_catalog_1.HEALING_POTION_MAX_HP_FRACTIONS)) {
    const potionLine = alchemySource.split('\n').find(line => line.includes(`id:'${id}'`) && line.includes('maxHpFraction:'));
    node_assert_1.strict.ok(potionLine, `mobile Alchemy catalog missing ${id}`);
    const matched = potionLine.match(/maxHpFraction:(0?\.\d+)/);
    node_assert_1.strict.ok(matched && Number(matched[1]) === fraction, `dungeon heal amount must match brewed ${id}`);
}
console.log('Draught heal values remain consistent across mobile and backend');
