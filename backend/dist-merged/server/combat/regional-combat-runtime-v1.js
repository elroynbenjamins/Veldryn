"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUNSCAR_REGIONAL_COMBAT_CATALOG_V1 = void 0;
exports.regionalCombatCatalogEntryV1 = regionalCombatCatalogEntryV1;
exports.buildRegionalCombatEnemyV1 = buildRegionalCombatEnemyV1;
exports.startRegionalCombatV1 = startRegionalCombatV1;
exports.resolveRegionalCombatV1 = resolveRegionalCombatV1;
const node_crypto_1 = require("node:crypto");
const engine_1 = require("./engine");
const snapshot_adapter_1 = require("./snapshot-adapter");
const sunscar_region_v20_1 = require("../content/sunscar-region-v20");
const regional_gem_settlement_v1_1 = require("../equipment/gems/regional-gem-settlement-v1");
exports.SUNSCAR_REGIONAL_COMBAT_CATALOG_V1 = [
    { encounterId: 'REGCOM_SUN_006_STANDARD', zoneId: 'ZONE_006', kind: 'standard', contentId: 'SUNMON_001', name: 'Saffron Gate Patrol', level: 25 },
    { encounterId: 'REGCOM_SUN_007_ELITE', zoneId: 'ZONE_007', kind: 'elite', contentId: 'SUNMON_005', name: 'Sunspine Elite', level: 32 },
    { encounterId: 'REGCOM_SUN_008_ELITE', zoneId: 'ZONE_008', kind: 'elite', contentId: 'SUNMON_010', name: 'Mirage Basin Elite', level: 38 },
    { encounterId: 'REGCOM_SUN_009_ELITE', zoneId: 'ZONE_009', kind: 'elite', contentId: 'SUNMON_014', name: 'Observatory Elite', level: 43 },
    { encounterId: 'REGCOM_SUN_010_BOSS', zoneId: 'ZONE_010', kind: 'regional_boss', contentId: 'BOSS_002', name: 'The Sand Tyrant', level: 45 },
];
const damageType = (value) => value === 'poison' ? 'nature' : value;
const neutralDefense = (armor, ward) => Math.max(0, Math.round((armor + ward) / 2));
function basicAbility(id, name, type, coeff = 1) {
    return { id, name, cooldownMs: 6500, castTimeMs: 600, target: 'current_target', priority: 70, effects: [{ kind: 'damage', coeff, damageType: type }] };
}
function enemyDefinition(source, elite) {
    const multiplier = elite ? 1.8 : 1;
    return {
        id: source.id, name: source.name, team: 'enemies', role: 'enemy', level: source.level,
        stats: {
            maxHp: Math.round(source.stats.maxHp * multiplier),
            attackPower: Math.round(source.stats.power * multiplier),
            healingPower: source.stats.healingPower,
            defense: Math.round(neutralDefense(source.stats.armor, source.stats.ward) * multiplier),
            accuracy: source.stats.accuracy,
            evasion: source.stats.evasion,
            critChance: source.stats.critChance,
            critMultiplier: source.stats.critDamage,
            haste: source.stats.haste,
        },
        basicAttackMs: 2600, basicAttackCoeff: .72,
        abilities: [basicAbility(source.id + ':SIGNATURE', source.signatureMechanic.split(':')[0], damageType(source.damageType), elite ? 1.35 : 1.05)],
        tags: elite ? ['elite', source.zoneId] : [source.zoneId],
    };
}
function bossDefinition(source) {
    const primary = damageType(source.damageTypes[0] ?? 'physical');
    return {
        id: source.id, name: source.name, team: 'enemies', role: 'enemy', level: source.level, boss: true,
        stats: {
            maxHp: source.stats.maxHp,
            attackPower: source.stats.power,
            healingPower: source.stats.healingPower,
            defense: neutralDefense(source.stats.armor, source.stats.ward),
            accuracy: source.stats.accuracy,
            evasion: source.stats.evasion,
            critChance: source.stats.critChance,
            critMultiplier: source.stats.critDamage,
            haste: source.stats.haste,
        },
        basicAttackMs: 2500, basicAttackCoeff: .78,
        abilities: [
            basicAbility(source.id + ':STRIKE', source.telegraphedMechanics[0] ?? 'Boss Strike', primary, 1.25),
            { id: source.id + ':PRESSURE', name: source.telegraphedMechanics[1] ?? 'Regional Pressure', cooldownMs: 10500, castTimeMs: 1400, target: 'all_enemies', priority: 90, interruptible: true, effects: [{ kind: 'damage', coeff: .82, damageType: primary }] },
        ],
        phases: source.phases.filter(phase => phase.startsAtHpFraction < 1).map(phase => ({ id: source.id + ':' + phase.id, name: phase.name, hpPct: phase.startsAtHpFraction, target: 'all_enemies', effects: [{ kind: 'damage', coeff: .42, damageType: primary }] })),
        tags: ['regional_boss', source.zoneId],
    };
}
function regionalCombatCatalogEntryV1(encounterId) { return exports.SUNSCAR_REGIONAL_COMBAT_CATALOG_V1.find(row => row.encounterId === encounterId); }
function buildRegionalCombatEnemyV1(entry) {
    if (entry.kind === 'regional_boss') {
        const boss = sunscar_region_v20_1.SUNSCAR_BOSSES_V20.find(row => row.id === entry.contentId && row.zoneId === entry.zoneId);
        if (!boss)
            throw new Error('regional_boss_content_missing');
        return bossDefinition(boss);
    }
    const enemy = sunscar_region_v20_1.SUNSCAR_ENEMIES_V20.find(row => row.id === entry.contentId && row.zoneId === entry.zoneId);
    if (!enemy)
        throw new Error('regional_enemy_content_missing');
    return enemyDefinition(enemy, entry.kind === 'elite');
}
function gemKind(kind) { return kind === 'standard' ? 'enemy' : kind; }
function resultDigest(result) { return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(result.events)).digest().toString('hex'); }
function regionalReplayCuesV1(result) {
    const defs = [...result.players, ...result.enemies].map(row => row.definition), names = new Map(defs.map(row => [row.id, row.name])), abilities = new Map();
    for (const def of defs)
        for (const ability of def.abilities)
            abilities.set(ability.id, ability.name);
    for (const def of defs)
        for (const phase of def.phases ?? [])
            abilities.set(phase.id, phase.name ?? phase.id.replace(/_/g, ' '));
    const important = [], actions = [];
    for (const event of result.events) {
        const base = { atMs: event.atMs, actorName: event.actorId ? names.get(event.actorId) : undefined, targetName: event.targetId ? names.get(event.targetId) : undefined, abilityName: event.abilityId ? (abilities.get(event.abilityId) ?? (event.abilityId === 'BASIC' ? 'Basic Attack' : event.abilityId)) : undefined };
        if (event.type === 'phase')
            important.push({ ...base, type: 'phase' });
        else if (event.type === 'cast_start')
            important.push({ ...base, type: 'cast' });
        else if (event.type === 'interrupt')
            important.push({ ...base, type: 'interrupt' });
        else if (event.type === 'down' || event.type === 'death')
            important.push({ ...base, type: 'down' });
        else if (event.type === 'damage' && event.amount !== undefined && (event.critical || event.abilityId !== 'BASIC'))
            actions.push({ ...base, type: 'damage', amount: Number(event.amount.toFixed(2)), ...(event.critical ? { critical: true } : {}), ...(event.absorbed ? { absorbed: Number(event.absorbed.toFixed(2)) } : {}) });
        else if (event.type === 'heal' && event.amount !== undefined)
            actions.push({ ...base, type: 'heal', amount: Number(event.amount.toFixed(2)) });
        else if (event.type === 'shield' && event.amount !== undefined)
            actions.push({ ...base, type: 'shield', amount: Number(event.amount.toFixed(2)) });
        else if (event.type === 'combat_end')
            important.push({ atMs: event.atMs, type: result.reason });
    }
    const sampled = actions.length <= 14 ? actions : Array.from({ length: 14 }, (_, i) => actions[Math.min(actions.length - 1, Math.floor(i * actions.length / 14))]);
    return [...important, ...sampled].sort((a, b) => a.atMs - b.atMs).slice(0, 24);
}
async function startRegionalCombatV1(deps, input) {
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(input.requestId))
        throw new Error('invalid_request');
    const encounter = regionalCombatCatalogEntryV1(input.encounterId);
    if (!encounter)
        throw new Error('unknown_regional_encounter');
    await deps.authorizer.assertEncounterUnlocked({ accountId: input.accountId, characterId: input.characterId, encounter });
    const verified = await deps.authorizer.loadVerifiedPlayer({ accountId: input.accountId, characterId: input.characterId, encounter });
    if (verified.snapshot.characterId !== input.characterId)
        throw new Error('regional_snapshot_character_mismatch');
    const player = (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)(verified.snapshot, [...verified.abilities]);
    const requestHash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ characterId: input.characterId, encounterId: encounter.encounterId })).digest().toString('hex');
    const reservation = {
        receiptId: deps.randomId(), requestId: input.requestId, requestHash, accountId: input.accountId, characterId: input.characterId,
        encounterId: encounter.encounterId, zoneId: encounter.zoneId, kind: encounter.kind, contentId: encounter.contentId,
        serverSeed: deps.randomSeed(), player, createdAtMs: deps.nowMs(),
    };
    return deps.store.reserve(reservation);
}
async function resolveRegionalCombatV1(deps, input) {
    const prior = await deps.store.readResult(input.receiptId);
    if (prior) {
        if ((await deps.store.load(input.receiptId)).accountId !== input.accountId)
            throw new Error('regional_combat_owner_mismatch');
        const reservation = await deps.store.load(input.receiptId);
        const reward = prior.victory ? await (0, regional_gem_settlement_v1_1.settleVerifiedRegionalGemEncounterV1)(deps.rewards, { accountId: input.accountId, receiptKey: 'regional:' + reservation.receiptId, zoneId: reservation.zoneId, kind: gemKind(reservation.kind), victory: true }) : undefined;
        return { result: prior, reward, duplicate: true };
    }
    const reservation = await deps.store.load(input.receiptId);
    if (reservation.accountId !== input.accountId)
        throw new Error('regional_combat_owner_mismatch');
    const encounter = regionalCombatCatalogEntryV1(reservation.encounterId);
    if (!encounter || encounter.zoneId !== reservation.zoneId || encounter.contentId !== reservation.contentId || encounter.kind !== reservation.kind)
        throw new Error('regional_combat_receipt_content_mismatch');
    const enemy = buildRegionalCombatEnemyV1(encounter);
    const combat = (0, engine_1.simulateCombat)({ seed: 'regional:' + reservation.serverSeed + ':' + reservation.receiptId, players: [structuredClone(reservation.player)], enemies: [enemy], maxDurationMs: 180000 });
    const stored = {
        receiptId: reservation.receiptId, victory: combat.victory, reason: combat.reason, durationMs: combat.durationMs, eventDigest: resultDigest(combat),
        damageDone: Number(combat.players[0].damageDone.toFixed(2)), healingDone: Number(combat.players[0].healingDone.toFixed(2)),
        playerHp: Number(combat.players[0].hp.toFixed(2)), playerMaxHp: Number(combat.players[0].definition.stats.maxHp.toFixed(2)), playerName: combat.players[0].definition.name,
        enemyHp: Number(combat.enemies[0].hp.toFixed(2)), enemyMaxHp: Number(combat.enemies[0].definition.stats.maxHp.toFixed(2)), enemyName: combat.enemies[0].definition.name,
        replayCues: regionalReplayCuesV1(combat),
    };
    const committed = await deps.store.commitResult(stored);
    const reward = committed.result.victory ? await (0, regional_gem_settlement_v1_1.settleVerifiedRegionalGemEncounterV1)(deps.rewards, { accountId: input.accountId, receiptKey: 'regional:' + reservation.receiptId, zoneId: reservation.zoneId, kind: gemKind(reservation.kind), victory: true }) : undefined;
    return { result: committed.result, reward, duplicate: committed.duplicate };
}
