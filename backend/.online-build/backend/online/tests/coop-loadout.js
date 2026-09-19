"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const classes_1 = require("../../../apps/mobile/src/content/classes");
const novice_sets_1 = require("../../../apps/mobile/src/content/novice-sets");
const game_1 = require("../../../apps/mobile/src/core/game");
const coop_loadout_1 = require("../coop-loadout");
const loadout_snapshots_1 = require("../../src/server/coop/loadout-snapshots");
for (const definition of classes_1.CLASSES) {
    const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), definition.id, 'Coop Test');
    state.character.level = 25;
    const before = JSON.stringify(state), weak = (0, coop_loadout_1.deriveOnlineCoopLoadout)('owner', state, 1);
    node_assert_1.strict.equal(JSON.stringify(state), before, 'publication never grants or changes gear');
    state.character.equipment = Object.fromEntries((0, novice_sets_1.noviceSetFor)(definition.id).slots.map(slot => [slot, (0, novice_sets_1.noviceItemId)(definition.id, slot)]));
    const full = (0, coop_loadout_1.deriveOnlineCoopLoadout)('owner', state, 2);
    node_assert_1.strict.ok(full.stats.maxHp >= weak.stats.maxHp);
    node_assert_1.strict.ok(full.stats.attackPower >= weak.stats.attackPower);
    node_assert_1.strict.ok(full.stats.defense >= weak.stats.defense);
    const frozen = (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: 'owner', characterId: full.characterId, loadoutId: 'current', expectedRevision: 2, minLevel: 15, syncLevel: 25, repository: { getOwnedLoadout: () => full } });
    node_assert_1.strict.equal(frozen.readiness.ready, true);
    node_assert_1.strict.equal(full.legalEquipment, true);
    if (definition.role === 'Tank')
        node_assert_1.strict.equal(frozen.normalized.abilities[0].effects[0].value, 500, 'threat amounts are not percentage buffs');
    node_assert_1.strict.ok((0, coop_loadout_1.onlineCoopLoadoutHash)(full) !== (0, coop_loadout_1.onlineCoopLoadoutHash)(weak));
    const reordered = { ...Object.fromEntries(Object.entries(full).reverse()), stats: Object.fromEntries(Object.entries(full.stats).reverse()) };
    node_assert_1.strict.equal((0, coop_loadout_1.onlineCoopLoadoutHash)(full), (0, coop_loadout_1.onlineCoopLoadoutHash)(reordered), 'jsonb key ordering cannot invalidate a published snapshot');
    state.character.equipment.weapon = (0, novice_sets_1.noviceItemId)(definition.id, 'boots');
    node_assert_1.strict.equal((0, coop_loadout_1.deriveOnlineCoopLoadout)('owner', state, 3).legalEquipment, false, 'wrong-slot gear cannot publish an eligible loadout');
}
console.log('online co-op loadout derivation PASS: nine distinct kits, owned equipment, no grants, revision hashes, slot validation');
