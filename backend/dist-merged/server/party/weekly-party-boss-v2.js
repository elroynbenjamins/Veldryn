"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_BOSS_TIER_GROWTH_V4 = exports.PARTY_EVENT_BOSS_MAX_FIGHT_MS = exports.PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS = exports.PARTY_EVENT_BOSS_MAX_TIERS = void 0;
exports.deriveVerifiedPartyBossPreparation = deriveVerifiedPartyBossPreparation;
exports.freezePartyEventBossLoadout = freezePartyEventBossLoadout;
exports.partyEventRosterMedianLevel = partyEventRosterMedianLevel;
exports.applyVerifiedPartyPreparation = applyVerifiedPartyPreparation;
exports.deriveVerifiedPartyPhaseSupport = deriveVerifiedPartyPhaseSupport;
exports.resolvePartyEventDayEightBoss = resolvePartyEventDayEightBoss;
/**
 * Hidden Party Events v2 — Day 8 escalating co-operative boss.
 *
 * Uses the same deterministic combat engine and authoritative loadout record
 * interface as existing co-op. No dungeon unlock, fixed 4-role roster or level
 * sync: the introductory boss scales to party LEVEL, while better gear,
 * companions, class roles and optional supplies determine how far the party
 * can push. Not connected to a public endpoint, cron or reward dispenser.
 */
const node_crypto_1 = require("node:crypto");
const engine_1 = require("../combat/engine");
const snapshot_adapter_1 = require("../combat/snapshot-adapter");
const role_readiness_1 = require("../coop/role-readiness");
exports.PARTY_EVENT_BOSS_MAX_TIERS = 12;
exports.PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS = 60 * 60 * 1000;
exports.PARTY_EVENT_BOSS_MAX_FIGHT_MS = 90_000;
/** Provisional hidden v4 upper-tier calibration based on the real
 * online loadout pipeline (648 scenarios plus cross-curve comparisons).
 * Tier 1 is unaffected: each growth value is raised to (tier - 1).
 * Recalibrate when distinct family boss hazards are implemented.
 * The Party Events release gate remains disabled. */
exports.PARTY_EVENT_BOSS_TIER_GROWTH_V4 = Object.freeze({
    hp: 1.42, attack: 1.20, defense: 1.16,
});
/** Only COMPLETE orders count; excess supply or multiple stacks cannot boost buffs. */
function deriveVerifiedPartyBossPreparation(orders, throughStage = 3) {
    if (![1, 2, 3].includes(throughStage))
        throw new Error('party_boss_invalid_stage');
    const required = [1, 2, 3].filter(stage => stage <= throughStage).filter(stage => {
        const rows = orders.filter(o => o.kind === 'required' && o.stage === stage);
        return rows.length > 0 && rows.every(o => o.quantity > 0 && o.donatedQuantity >= o.quantity);
    });
    const optional = ['reinforced', 'provisions', 'specialist']
        .filter((key) => {
        const rows = orders.filter(o => o.kind === 'optional' && o.preparation === key && o.stage <= throughStage);
        return rows.length > 0 && rows.every(o => o.quantity > 0 && o.donatedQuantity >= o.quantity);
    });
    for (const order of orders) {
        if (!Number.isSafeInteger(order.quantity) || order.quantity < 1
            || !Number.isSafeInteger(order.donatedQuantity) || order.donatedQuantity < 0
            || order.donatedQuantity > order.quantity) {
            throw new Error('party_boss_invalid_supply_receipt');
        }
    }
    const complete = required.length;
    return {
        completedRequiredStages: complete,
        completedOptionalPreparations: optional,
        outgoingBonus: .015 * complete + (optional.includes('specialist') ? .08 : 0),
        damageReduction: .015 * complete + (optional.includes('reinforced') ? .08 : 0),
        healingBonus: .015 * complete + (optional.includes('provisions') ? .12 : 0),
        shieldingBonus: .015 * complete + (optional.includes('reinforced') ? .10 : 0) + (optional.includes('provisions') ? .08 : 0),
        maxHpBonus: optional.includes('provisions') ? .04 : 0,
    };
}
function canonical(value) {
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object')
        return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
    return JSON.stringify(value);
}
/** Saving is permitted throughout the active week and snapshots may be replaced. */
function freezePartyEventBossLoadout(input) {
    const { selection, repository, nowMs, eventStartsAtMs, eventEndsAtMs } = input;
    if (!Number.isFinite(nowMs) || nowMs < eventStartsAtMs || nowMs >= eventEndsAtMs)
        throw new Error('party_boss_loadout_window_closed');
    const record = repository.getOwnedLoadout(selection.accountId, selection.characterId, selection.loadoutId);
    if (!record || record.accountId !== selection.accountId || record.characterId !== selection.characterId)
        throw new Error('party_boss_loadout_not_owned');
    if (record.revision !== selection.expectedRevision)
        throw new Error('party_boss_loadout_revision_mismatch');
    if (!record.legalEquipment)
        throw new Error('party_boss_illegal_equipment');
    if (!Number.isInteger(record.characterLevel) || record.characterLevel < 1 || record.characterLevel > 100)
        throw new Error('party_boss_invalid_level');
    const role = (0, role_readiness_1.deriveRole)(record.classId);
    const source = {
        ...structuredClone(record.stats), role,
        classId: record.classId, characterId: record.characterId, level: record.characterLevel,
    };
    const actor = (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)(source, structuredClone(record.abilities));
    const payload = { accountId: record.accountId, characterId: record.characterId,
        classId: record.classId, loadoutId: record.loadoutId, revision: record.revision,
        actor, savedAtMs: nowMs };
    return { ...payload, snapshotHash: (0, node_crypto_1.createHash)('sha256').update(canonical(JSON.parse(JSON.stringify(payload)))).digest('hex') };
}
/** True midpoint median prevents a level-1 partner anchoring a level-100 duo.
 * Roster levels are server-verified and are NOT derived from equipment or votes. */
function partyEventRosterMedianLevel(levels) {
    if (levels.length < 2 || levels.length > 4 || levels.some(l => !Number.isInteger(l) || l < 1 || l > 100))
        throw new Error('party_boss_invalid_level_roster');
    const ordered = [...levels].sort((a, b) => a - b);
    return Math.round((ordered[Math.floor((ordered.length - 1) / 2)] +
        ordered[Math.floor(ordered.length / 2)]) / 2);
}
const BOSS_NAMES = {
    broken_caravan: 'Roadbreaker Captain',
    nightfall_hunt: 'Nightfall Alpha',
    broken_wards: 'The Unbound Guardian',
    lost_reliquary: 'Reliquary Sentinel',
};
function applyVerifiedPartyPreparation(actor, prep) {
    return {
        ...actor,
        stats: { ...actor.stats, maxHp: actor.stats.maxHp * (1 + prep.maxHpBonus) },
        alchemyModifiers: {
            outgoing: (actor.alchemyModifiers?.outgoing ?? 1) * (1 + prep.outgoingBonus),
            incoming: (actor.alchemyModifiers?.incoming ?? 1) * (1 - prep.damageReduction),
            healing: (actor.alchemyModifiers?.healing ?? 1) * (1 + prep.healingBonus),
            shielding: (actor.alchemyModifiers?.shielding ?? 1) * (1 + prep.shieldingBonus),
        },
    };
}
function tierBoss(family, partySize, medianLevel, tier, difficulty) {
    const difficultyScale = { standard: 1, veteran: 1.20, heroic: 1.40 }[difficulty];
    const levelScale = Math.max(.045, medianLevel / 25);
    const hp = Math.round(partySize * 5400 * levelScale * Math.pow(exports.PARTY_EVENT_BOSS_TIER_GROWTH_V4.hp, tier - 1) * difficultyScale);
    const attack = Math.round(355 * levelScale * Math.pow(exports.PARTY_EVENT_BOSS_TIER_GROWTH_V4.attack, tier - 1) * difficultyScale);
    const defense = Math.round(520 * levelScale * Math.pow(exports.PARTY_EVENT_BOSS_TIER_GROWTH_V4.defense, tier - 1) * difficultyScale);
    return {
        id: 'PARTY_EVENT_BOSS', name: BOSS_NAMES[family], team: 'enemies', role: 'enemy', boss: true,
        level: Math.max(1, Math.min(100, medianLevel + 2 * (tier - 1))),
        stats: { maxHp: hp, attackPower: attack, healingPower: 0, defense,
            accuracy: 750, evasion: 110, critChance: .045, critMultiplier: 1.4, haste: .03 },
        basicAttackMs: 2700, basicAttackCoeff: .8,
        abilities: [
            { id: 'PE_BOSS_SLAM', name: 'Overwhelming Strike', cooldownMs: 6900, castTimeMs: 400,
                target: 'current_target', priority: 80, effects: [{ kind: 'damage', coeff: 1.15 }] },
            { id: 'PE_BOSS_PULSE', name: 'Rising Threat', cooldownMs: 12000, castTimeMs: 900,
                target: 'all_enemies', priority: 85, interruptible: true,
                effects: [{ kind: 'damage', coeff: .38 + Math.min(.3, .03 * tier) }] },
        ],
        phases: [{ id: 'ENRAGE', hpPct: .35, target: 'self',
                effects: [{ kind: 'buff', tag: 'damage_done', value: Math.min(.35, .07 + .015 * tier), durationMs: 90_000 }] }],
    };
}
/**
 * During phases 1–3, only support from completed orders at that point is
 * available. The same multipliers power stage encounters and the Day 8 boss.
 * Objective support is separate from EP: supplies NEVER mint extra weekly EP.
 */
function deriveVerifiedPartyPhaseSupport(orders, stage) {
    const combat = deriveVerifiedPartyBossPreparation(orders, stage);
    const active = new Set(combat.completedOptionalPreparations);
    return {
        combat,
        escortIntegrityMultiplier: 1 + .02 * combat.completedRequiredStages
            + (active.has('reinforced') ? .10 : 0),
        recoveryMultiplier: 1 + .015 * combat.completedRequiredStages
            + (active.has('provisions') ? .10 : 0),
        objectiveEffectivenessMultiplier: 1 + .01 * combat.completedRequiredStages
            + (active.has('specialist') ? .08 : 0),
    };
}
function resolvePartyEventDayEightBoss(input) {
    if (!input.eventId || !Number.isSafeInteger(input.seed) || input.seed < 0)
        throw new Error('party_boss_invalid_identity');
    if (!Number.isFinite(input.nowMs) || !Number.isFinite(input.eventEndsAtMs)
        || input.nowMs < input.eventEndsAtMs + exports.PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS)
        throw new Error('party_boss_day_eight_not_ready');
    if (input.frozen.length < 2 || input.frozen.length > 4 ||
        new Set(input.frozen.map(x => x.accountId)).size !== input.frozen.length ||
        new Set(input.frozen.map(x => x.characterId)).size !== input.frozen.length)
        throw new Error('party_boss_invalid_roster');
    if (input.eventEndsAtMs - input.eventStartsAtMs !== 7 * 86_400_000)
        throw new Error('party_boss_invalid_week');
    for (const frozen of input.frozen) {
        const { snapshotHash, ...payload } = frozen;
        if (frozen.savedAtMs < input.eventStartsAtMs || frozen.savedAtMs >= input.eventEndsAtMs
            || frozen.actor.team !== 'players' || frozen.actor.id !== frozen.characterId
            || frozen.actor.role === 'enemy'
            || (0, node_crypto_1.createHash)('sha256').update(canonical(JSON.parse(JSON.stringify(payload)))).digest('hex') !== snapshotHash)
            throw new Error('party_boss_invalid_frozen_loadout');
    }
    const actors = input.frozen.map(x => structuredClone(x.actor));
    const levels = actors.map(actor => actor.level);
    const medianLevel = partyEventRosterMedianLevel(levels);
    const preparation = deriveVerifiedPartyBossPreparation(input.orders);
    const players = actors.map(actor => applyVerifiedPartyPreparation(actor, preparation));
    const aggregate = new Map(input.frozen.map(x => [x.characterId, {
            accountId: x.accountId, characterId: x.characterId, role: x.actor.role,
            damage: 0, healing: 0, shielding: 0, absorbedDamage: 0, damageTaken: 0, interrupts: 0,
            meaningfulContribution: false,
        }]));
    const tiers = [];
    let tiersCleared = 0, totalBossDamage = 0, totalPossibleBossHp = 0;
    for (let tier = 1; tier <= exports.PARTY_EVENT_BOSS_MAX_TIERS; tier++) {
        const enemy = tierBoss(input.family, players.length, medianLevel, tier, input.difficulty);
        const result = (0, engine_1.simulateCombat)({ seed: input.eventId + ':' + input.seed + ':tier:' + tier,
            players, enemies: [enemy], maxDurationMs: exports.PARTY_EVENT_BOSS_MAX_FIGHT_MS });
        const remaining = Math.max(0, result.enemies[0]?.hp ?? enemy.stats.maxHp);
        const damage = Math.min(enemy.stats.maxHp, Math.max(0, enemy.stats.maxHp - remaining));
        totalBossDamage += damage;
        totalPossibleBossHp += enemy.stats.maxHp;
        tiers.push({ tier, cleared: result.victory, bossMaxHp: enemy.stats.maxHp,
            bossRemainingHp: remaining, partyDamage: damage, durationMs: result.durationMs, reason: result.reason });
        for (const player of result.players) {
            const row = aggregate.get(player.definition.id);
            row.damage += Math.max(0, player.damageDone);
            row.healing += Math.max(0, player.healingDone);
            row.damageTaken += Math.max(0, player.damageTaken);
            row.interrupts += Math.max(0, player.interrupts);
        }
        // Actual shield absorption comes from authoritative combat events.
        for (const event of result.events) {
            if (event.type === 'shield' && event.actorId && event.amount && event.amount > 0) {
                const caster = aggregate.get(event.actorId);
                if (caster)
                    caster.shielding += event.amount;
            }
            if (event.type === 'damage' && event.targetId && event.absorbed && event.absorbed > 0) {
                const row = aggregate.get(event.targetId);
                if (row)
                    row.absorbedDamage += event.absorbed;
            }
        }
        if (!result.victory)
            break;
        tiersCleared++;
    }
    const contributions = [...aggregate.values()].map(c => ({
        ...c,
        damage: Math.round(c.damage), healing: Math.round(c.healing), shielding: Math.round(c.shielding),
        damageTaken: Math.round(c.damageTaken), absorbedDamage: Math.round(c.absorbedDamage),
        meaningfulContribution: c.damage + c.healing + c.shielding + c.absorbedDamage + c.damageTaken + c.interrupts * 100 > 0,
    }));
    // Shared rewards reward how far the entire party fought. Each member also
    // needs to meet the existing personal EP eligibility rules to claim.
    const last = tiers[tiers.length - 1];
    const fractional = last.cleared ? 0 : last.partyDamage / Math.max(1, last.bossMaxHp);
    const rewardBand = Math.min(6, Math.floor((tiersCleared + fractional) / 2) + 1);
    return { completedAtMs: input.nowMs, tiersCleared, highestTierReached: tiers.length,
        totalBossDamage: Math.round(totalBossDamage), totalPossibleBossHp: Math.round(totalPossibleBossHp),
        rewardBand, preparation, contributions, tiers };
}
