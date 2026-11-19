"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_V24_BALANCE_LIVE = void 0;
exports.auditWorldBossAccountReplayV24 = auditWorldBossAccountReplayV24;
const world_boss_account_raid_v22_1 = require("./world-boss-account-raid-v22");
exports.WORLD_BOSS_V24_BALANCE_LIVE = false;
const WEIGHTS = [1, .12, .07, .05, .04];
const finite = (n) => Number.isFinite(n) && n >= 0;
function auditWorldBossAccountReplayV24(raid) {
    if (!raid || raid.schema !== 'world-boss-v22-account-raid-prototype' ||
        raid.persisted !== false || !raid.combat || !Array.isArray(raid.combat.players) ||
        !Array.isArray(raid.combat.events) || !Array.isArray(raid.characterLedger) ||
        raid.combat.players.length < 1 || raid.combat.players.length > 5 ||
        raid.combat.players.length !== raid.characterLedger.length ||
        !finite(raid.rawPartyDamage) || !finite(raid.proposedWorldHpDamage))
        throw Error('world_boss_v24_invalid_replay');
    const states = new Map(raid.combat.players.map(p => [p.definition.id, p]));
    const ids = new Set();
    const values = raid.characterLedger.map(row => {
        const state = states.get(row.characterId);
        if (!state || state.definition.team !== 'players' ||
            !['damage', 'tank', 'support'].includes(state.definition.role) ||
            ids.has(row.characterId) ||
            !finite(row.rawDamage) || !finite(row.rawHealing) ||
            !finite(row.damageTaken) || !Number.isSafeInteger(row.interrupts) ||
            row.interrupts < 0 || typeof row.survived !== 'boolean' ||
            row.rawDamage !== state.damageDone ||
            row.rawHealing !== state.healingDone ||
            row.damageTaken !== state.damageTaken ||
            row.interrupts !== state.interrupts ||
            row.survived !== state.alive)
            throw Error('world_boss_v24_unverified_character_ledger');
        ids.add(row.characterId);
        return {
            characterId: row.characterId,
            role: state.definition.role,
            rawDamage: row.rawDamage,
            effectiveHealing: row.rawHealing,
            interruptions: row.interrupts,
            damageTaken: row.damageTaken,
            survived: row.survived,
        };
    });
    if (states.size !== values.length)
        throw Error('world_boss_v24_duplicate_combat_actor');
    const rawDamage = values.reduce((sum, v) => sum + v.rawDamage, 0);
    const damage = (0, world_boss_account_raid_v22_1.worldBossAccountDamageV22)(values);
    if (rawDamage !== raid.rawPartyDamage || damage !== raid.proposedWorldHpDamage)
        throw Error('world_boss_v24_world_damage_mismatch');
    const sorted = [...values].sort((a, b) => b.rawDamage - a.rawDamage ||
        a.characterId.localeCompare(b.characterId));
    const ranked = new Map(sorted.map((v, i) => [v.characterId, v.rawDamage * WEIGHTS[i]]));
    const strongestDamage = sorted[0].rawDamage;
    const secondaryBonusDamage = Math.max(0, damage - Math.floor(strongestDamage));
    const secondaryBonusFraction = strongestDamage > 0 ?
        Math.max(0, damage / strongestDamage - 1) : 0;
    if (!finite(secondaryBonusFraction) || secondaryBonusFraction > .28 + 1e-8 ||
        damage > rawDamage || damage > Number.MAX_SAFE_INTEGER)
        throw Error('world_boss_v24_diminishing_return_invariant_failed');
    let shieldAbsorbed = 0, shieldApplied = 0;
    for (const e of raid.combat.events) {
        if (!e || !Number.isSafeInteger(e.atMs) || e.atMs < 0)
            throw Error('world_boss_v24_invalid_event_timing');
        if (e.type === 'damage' || e.type === 'dot_tick') {
            if (ids.has(e.targetId ?? '')) {
                if (e.absorbed !== undefined && !finite(e.absorbed))
                    throw Error('world_boss_v24_invalid_absorption');
                shieldAbsorbed += e.absorbed ?? 0;
            }
        }
        else if (e.type === 'shield' && ids.has(e.targetId ?? '')) {
            if (e.amount !== undefined && !finite(e.amount))
                throw Error('world_boss_v24_invalid_shield');
            shieldApplied += e.amount ?? 0;
        }
    }
    const characters = values.map(v => ({
        ...v, provisionalWeightedDamage: ranked.get(v.characterId) ?? 0,
    }));
    return {
        status: 'test_only_not_approved', eventId: raid.eventId, boss: raid.boss,
        phase: raid.phase, accountSize: characters.length,
        strongestDamage, rawPartyDamage: raid.rawPartyDamage,
        proposedWorldHpDamage: damage, secondaryBonusDamage, secondaryBonusFraction,
        effectiveHealing: characters.reduce((sum, c) => sum + c.effectiveHealing, 0),
        interrupts: characters.reduce((sum, c) => sum + c.interruptions, 0),
        survivors: characters.filter(c => c.survived).length,
        unattributedShieldAbsorbed: shieldAbsorbed,
        uncreditedShieldApplied: shieldApplied,
        protectedRoleAttribution: 'not_available_do_not_score',
        victory: raid.combat.victory, characters, creditedRewards: false, persisted: false,
    };
}
