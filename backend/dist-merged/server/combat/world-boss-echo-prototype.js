"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchWorldBossEchoesPrototype = matchWorldBossEchoesPrototype;
const deterministic_rng_1 = require("./deterministic-rng");
const launch_combat_1 = require("./content/launch-combat");
const valid = (x) => typeof x === 'string' && x.trim().length > 0 && x.length <= 160;
const role = (def) => {
    if (def.role === 'tank' || def.role === 'damage' || def.role === 'support')
        return def.role;
    throw Error('world_boss_echo_invalid_role');
};
function snapOk(s) {
    const d = s.resolvedCombatant;
    return valid(s.snapshotId) && valid(s.ownerAccountId) && Boolean(d) && d.team === 'players' &&
        valid(d.id) && Number.isFinite(d.stats.maxHp) && d.stats.maxHp > 0 &&
        Number.isFinite(d.stats.attackPower) && d.stats.attackPower > 0 &&
        ['tank', 'damage', 'support'].includes(d.role);
}
const BRACKETS = [1, 2, 3, 4, 5];
const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const npcDefaults = { tank: 'Bastion', damage: 'Wayfinder', support: 'Stonecaller' };
function npcFor(roleId, slot, bracket, initiator) {
    const archetype = (0, launch_combat_1.launchPlayer)(npcDefaults[roleId], 25);
    // Strictly a test-only tier proxy. Real NPC gear/stats must be generated from
    // the server's calibrated bracket baseline, NEVER from mobile-supplied power.
    const cap = initiator.resolvedCombatant.stats.attackPower;
    const scale = (.55 + (bracket - 1) * .15);
    const attack = Math.max(1, Math.min(archetype.stats.attackPower * scale, cap * 1.15));
    const hp = Math.max(100, archetype.stats.maxHp * scale);
    const def = {
        ...archetype, id: 'WB_NPC_' + roleId + '_' + slot, level: initiator.resolvedCombatant.level,
        stats: { ...archetype.stats, attackPower: attack, maxHp: hp,
            healingPower: Math.min(archetype.stats.healingPower * scale, Math.max(0, initiator.resolvedCombatant.stats.attackPower * 1.4)),
            defense: archetype.stats.defense * scale }
    };
    return { snapshotId: 'wb_npc_' + roleId + '_' + slot + ':bracket_' + bracket,
        ownerAccountId: 'wb_npc_' + roleId + '_' + slot, npc: true, resolvedCombatant: def };
}
/**
 * A preference order is deterministic (same query/seed => same squad), but
 * not simply strongest-first. Adjacent bracket real players may be matched,
 * while incompatible power brackets fall back to calibrated NPC fixtures.
 * \`uses\` implements a soft least-used rotation, not a currency transfer.
 */
function matchWorldBossEchoesPrototype(input) {
    if (!valid(input.seed) || !valid(input.accountId) || !Number.isSafeInteger(input.atUtcMs) ||
        !BRACKETS.includes(input.bracket) || !snapOk(input.initiator) ||
        input.initiator.npc || input.initiator.ownerAccountId !== input.accountId)
        throw Error('world_boss_echo_invalid_query');
    const roles = { tank: 1, damage: 2, support: 1 };
    roles[role(input.initiator.resolvedCombatant)]--;
    const selected = [input.initiator];
    const owners = new Set([input.accountId]), snapshotIds = new Set([input.initiator.snapshotId]);
    const actors = new Set([input.initiator.resolvedCombatant.id]);
    const rng = new deterministic_rng_1.CombatRng(input.seed);
    let npcSlots = 0;
    const validCandidates = input.candidateEchoes.filter(c => c.eligible && !c.npc && snapOk(c) && c.ownerAccountId !== input.accountId &&
        Number.isSafeInteger(c.updatedAtUtcMs) && c.updatedAtUtcMs <= input.atUtcMs &&
        input.atUtcMs - c.updatedAtUtcMs <= MAX_SNAPSHOT_AGE_MS &&
        Number.isSafeInteger(c.uses) && c.uses >= 0 && BRACKETS.includes(c.bracket) &&
        Math.abs(c.bracket - input.bracket) <= 1);
    for (const requiredRole of ['tank', 'damage', 'support']) {
        for (let slot = 0; slot < roles[requiredRole]; slot++) {
            const pool = validCandidates.filter(c => role(c.resolvedCombatant) === requiredRole &&
                !owners.has(c.ownerAccountId) && !snapshotIds.has(c.snapshotId) && !actors.has(c.resolvedCombatant.id));
            if (!pool.length) {
                const npc = npcFor(requiredRole, npcSlots++, input.bracket, input.initiator);
                selected.push(npc);
                owners.add(npc.ownerAccountId);
                snapshotIds.add(npc.snapshotId);
                actors.add(npc.resolvedCombatant.id);
                continue;
            }
            // Prefer matched power first, fair borrowing second, guild/friend third;
            // seeded tie selection avoids picking the first database row each time.
            const sorted = [...pool].sort((a, b) => Math.abs(a.bracket - input.bracket) - Math.abs(b.bracket - input.bracket) ||
                a.uses - b.uses ||
                ((a.affinity === 'guild' || a.affinity === 'friend') ? 0 : 1) - ((b.affinity === 'guild' || b.affinity === 'friend') ? 0 : 1) ||
                a.snapshotId.localeCompare(b.snapshotId));
            const best = sorted[0];
            const ties = sorted.filter(c => Math.abs(c.bracket - input.bracket) === Math.abs(best.bracket - input.bracket) &&
                c.uses === best.uses && Boolean(c.affinity === 'guild' || c.affinity === 'friend') === Boolean(best.affinity === 'guild' || best.affinity === 'friend'));
            const random = rng.next(requiredRole + ':' + slot + ':echo') * 2;
            const chosen = ties[Math.min(ties.length - 1, Math.floor(random * ties.length))];
            selected.push(chosen);
            owners.add(chosen.ownerAccountId);
            snapshotIds.add(chosen.snapshotId);
            actors.add(chosen.resolvedCombatant.id);
        }
    }
    if (selected.length !== 4)
        throw Error('world_boss_echo_invalid_squad_count');
    const selectedRoles = selected.map(c => role(c.resolvedCombatant));
    if (selectedRoles.filter(x => x === 'tank').length !== 1 || selectedRoles.filter(x => x === 'damage').length !== 2 ||
        selectedRoles.filter(x => x === 'support').length !== 1)
        throw Error('world_boss_echo_role_invariant');
    return { squad: selected, selectedRealEchoIds: selected.filter((x, i) => i > 0 && !x.npc).map(x => x.snapshotId),
        npcSlots, matchedBracket: input.bracket };
}
