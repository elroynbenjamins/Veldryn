"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPveBalanceBatch = runPveBalanceBatch;
const expedition_combat_service_1 = require("./expedition-combat-service");
const engine_1 = require("./engine");
const pve_simulation_telemetry_1 = require("./pve-simulation-telemetry");
const rounded = (value, digits = 4) => Number(value.toFixed(digits));
function numericSummary(values) {
    if (!values.length)
        return { min: 0, p10: 0, p50: 0, p90: 0, max: 0, mean: 0 };
    const sorted = [...values].sort((a, b) => a - b), at = (p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)))];
    return { min: rounded(sorted[0]), p10: rounded(at(.10)), p50: rounded(at(.50)), p90: rounded(at(.90)), max: rounded(sorted[sorted.length - 1]), mean: rounded(values.reduce((sum, value) => sum + value, 0) / values.length) };
}
function addRecord(target, source) {
    for (const [key, value] of Object.entries(source))
        target[key] = (target[key] ?? 0) + value;
}
function abilityMetrics(record, iterations) {
    return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)).map(([key, total]) => [key, { total: rounded(total, 2), meanPerRun: rounded(total / iterations, 2) }]));
}
function rate(value, total) { return total > 0 ? rounded(value / total) : 0; }
function runPveBalanceBatch(input) {
    if (!Number.isInteger(input.iterations) || input.iterations < 1 || input.iterations > 100_000)
        throw new Error('invalid_balance_iterations');
    if (!input.players.length)
        throw new Error('balance_party_required');
    const seedPrefix = input.seedPrefix?.trim() || 'VELDRYN_PVE_BATCH_V1', telemetry = [];
    for (let index = 0; index < input.iterations; index++) {
        const enemies = (0, expedition_combat_service_1.buildExpeditionEncounter)(input);
        const result = (0, engine_1.simulateCombat)({
            seed: `${seedPrefix}:${input.encounterId}:${index}`,
            players: structuredClone(input.players),
            enemies,
            maxDurationMs: input.maxDurationMs ?? 180_000,
        });
        telemetry.push((0, pve_simulation_telemetry_1.buildPveSimulationTelemetry)(result, input.encounterId));
    }
    const counts = { victory: 0, wipe: 0, timeout: 0 }, duration = [], victoryDuration = [], partyDowns = [], partyHp = [], firstDown = [], enemyHp = [];
    const archetypes = new Set(), mechanics = new Set(), phaseCounts = {};
    const incoming = {}, partyDamage = {}, partyHealing = {}, partyShielding = {}, enemyHealing = {}, enemyShielding = {}, downs = {}, partyStatuses = {}, enemyStatuses = {}, enemyFocus = {}, bossFocus = {};
    const casts = new Map();
    const playerRows = new Map();
    for (const row of telemetry) {
        counts[row.reason]++;
        duration.push(row.durationMs);
        if (row.victory)
            victoryDuration.push(row.durationMs);
        partyDowns.push(row.partyDowns);
        partyHp.push(row.partyEndHpPctAvg);
        enemyHp.push(row.enemyEndHpPctAvg);
        if (row.firstPartyDownAtMs !== undefined)
            firstDown.push(row.firstPartyDownAtMs);
        row.encounterArchetypes.forEach(value => archetypes.add(value));
        row.encounterMechanics.forEach(value => mechanics.add(value));
        row.bossPhases.forEach(phase => { phaseCounts[phase.phaseId] = (phaseCounts[phase.phaseId] ?? 0) + 1; });
        addRecord(incoming, row.incomingDamageByAbility);
        addRecord(partyDamage, row.partyDamageByAbility);
        addRecord(partyHealing, row.partyHealingByAbility);
        addRecord(partyShielding, row.partyShieldingByAbility);
        addRecord(enemyHealing, row.enemyHealingByAbility);
        addRecord(enemyShielding, row.enemyShieldingByAbility);
        addRecord(downs, row.downsByAbility);
        addRecord(partyStatuses, row.statusApplicationsToParty);
        addRecord(enemyStatuses, row.enemyStatusApplicationsToEnemies);
        addRecord(enemyFocus, row.enemyFocusTargets);
        addRecord(bossFocus, row.bossFocusTargets);
        for (const cast of row.enemyCasts) {
            const key = `${cast.actorId}:${cast.abilityId}`, existing = casts.get(key);
            if (existing) {
                existing.started += cast.started;
                existing.completed += cast.completed;
                existing.interrupted += cast.interrupted;
                continue;
            }
            casts.set(key, { ...cast, completionRate: 0, interruptionRate: 0 });
        }
        for (const player of row.players) {
            let aggregate = playerRows.get(player.id);
            if (!aggregate) {
                aggregate = { id: player.id, ...(player.classId ? { classId: player.classId } : {}), role: player.role, endHp: [], damage: [], healing: [], damageTaken: [], interrupts: [], downs: 0 };
                playerRows.set(player.id, aggregate);
            }
            aggregate.endHp.push(player.endHpPct);
            aggregate.damage.push(player.damage);
            aggregate.healing.push(player.healing);
            aggregate.damageTaken.push(player.damageTaken);
            aggregate.interrupts.push(player.interrupts);
            aggregate.downs += player.downed ? 1 : 0;
        }
    }
    const enemyCasts = [...casts.values()].map(cast => ({ ...cast, completionRate: rate(cast.completed, cast.started), interruptionRate: rate(cast.interrupted, cast.started) })).sort((a, b) => a.actorId.localeCompare(b.actorId) || a.abilityId.localeCompare(b.abilityId));
    const players = [...playerRows.values()].map(player => ({ id: player.id, ...(player.classId ? { classId: player.classId } : {}), role: player.role, runs: player.endHp.length, downRate: rate(player.downs, player.endHp.length), endHpPct: numericSummary(player.endHp), damage: numericSummary(player.damage), healing: numericSummary(player.healing), damageTaken: numericSummary(player.damageTaken), interrupts: numericSummary(player.interrupts) })).sort((a, b) => a.id.localeCompare(b.id));
    return {
        schemaVersion: 1,
        telemetrySchemaVersion: 2,
        encounterId: input.encounterId,
        iterations: input.iterations,
        seedPrefix,
        party: input.players.map(player => ({ id: player.id, ...(player.classId ? { classId: player.classId } : {}), role: player.role, level: player.level })),
        resultCounts: counts,
        winRate: rate(counts.victory, input.iterations),
        durationMs: numericSummary(duration),
        ...(victoryDuration.length ? { victoryDurationMs: numericSummary(victoryDuration) } : {}),
        partyDowns: numericSummary(partyDowns),
        partyEndHpPctAvg: numericSummary(partyHp),
        firstPartyDownRate: rate(firstDown.length, input.iterations),
        ...(firstDown.length ? { firstPartyDownAtMs: numericSummary(firstDown) } : {}),
        enemyEndHpPctAvg: numericSummary(enemyHp),
        encounterArchetypes: [...archetypes].sort(),
        encounterMechanics: [...mechanics].sort(),
        bossPhaseReachRate: Object.fromEntries(Object.entries(phaseCounts).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => [key, rate(count, input.iterations)])),
        enemyCasts,
        abilities: { incomingDamage: abilityMetrics(incoming, input.iterations), partyDamage: abilityMetrics(partyDamage, input.iterations), partyHealing: abilityMetrics(partyHealing, input.iterations), partyShielding: abilityMetrics(partyShielding, input.iterations), enemyHealing: abilityMetrics(enemyHealing, input.iterations), enemyShielding: abilityMetrics(enemyShielding, input.iterations), downs: abilityMetrics(downs, input.iterations) },
        statuses: { appliedToParty: abilityMetrics(partyStatuses, input.iterations), appliedToEnemies: abilityMetrics(enemyStatuses, input.iterations) },
        focusTargets: { allEnemies: abilityMetrics(enemyFocus, input.iterations), bossOnly: abilityMetrics(bossFocus, input.iterations) },
        players,
    };
}
