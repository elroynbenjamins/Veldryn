"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUILD_PVE_V13_LIVE = void 0;
exports.verifyGuildPveV13Scripts = verifyGuildPveV13Scripts;
exports.guildPveV13PhaseCues = guildPveV13PhaseCues;
exports.projectGuildPveV13Receipt = projectGuildPveV13Receipt;
/**
 * Guild PvE V13 — HIDDEN authored cue ordering / replay projection.
 * This describes telegraphs for an already-settled V9 engine receipt; it DOES
 * NOT cause hits, cleanses, buffs, Pressure changes, or reward grants.
 * Actual V7 combat remains the source of damage/status/replay values.
 */
const guild_pve_broken_forge_v7_1 = require("./guild-pve-broken-forge-v7");
const guild_pve_shared_v8_1 = require("./guild-pve-shared-v8");
exports.GUILD_PVE_V13_LIVE = false;
const SCRIPTS = {
    iron_skin: [['plate_raise', 'setup'], ['slam_warning', 'warning'], ['slam_impact', 'resolve'], ['seam_open', 'opportunity']],
    gate_collapse: [['sunder_warning', 'warning'], ['sunder_apply', 'resolve'], ['rubble_warning', 'warning'], ['rubble_impact', 'resolve']],
    open_gate: [['charge_warning', 'warning'], ['charge_impact', 'resolve'], ['core_open', 'opportunity'], ['core_recover', 'recovery']],
    ash_veil: [['ash_warning', 'warning'], ['burn_apply', 'resolve'], ['cleansing_window', 'opportunity'], ['ember_strike', 'resolve']],
    curse_web: [['mark_warning', 'warning'], ['mark_apply', 'resolve'], ['web_warning', 'warning'], ['web_burst', 'resolve']],
    emberfall: [['eruption_warning', 'warning'], ['eruption_resolve', 'resolve'], ['cooling_window', 'opportunity'], ['ember_surge', 'setup']],
    armoured: [['plate_warning', 'warning'], ['plate_impact', 'resolve'], ['seam_exposed', 'opportunity'], ['plate_recover', 'recovery']],
    overload: [['pressure_warning', 'warning'], ['pressure_impact', 'resolve'], ['slam_warning', 'warning'], ['slam_impact', 'resolve']],
    exposed_core: [['core_exposed', 'opportunity'], ['detonation_warning', 'warning'], ['detonation_resolve', 'resolve'], ['recovery_window', 'recovery']],
};
const DANGEROUS = {
    'iron_skin.slam_impact': 'slam_warning',
    'gate_collapse.sunder_apply': 'sunder_warning',
    'gate_collapse.rubble_impact': 'rubble_warning',
    'open_gate.charge_impact': 'charge_warning',
    'ash_veil.burn_apply': 'ash_warning',
    'curse_web.mark_apply': 'mark_warning',
    'curse_web.web_burst': 'web_warning',
    'emberfall.eruption_resolve': 'eruption_warning',
    'armoured.plate_impact': 'plate_warning',
    'overload.pressure_impact': 'pressure_warning',
    'overload.slam_impact': 'slam_warning',
    'exposed_core.detonation_resolve': 'detonation_warning',
};
const OWNER = {
    iron_skin: 'gatekeeper', gate_collapse: 'gatekeeper', open_gate: 'gatekeeper',
    ash_veil: 'seer', curse_web: 'seer', emberfall: 'seer',
    armoured: 'warden', overload: 'warden', exposed_core: 'warden',
};
const TELEGRAPH_MS = {
    Scout: 1700, Veteran: 1350, Mythic: 1100,
};
function verifyGuildPveV13Scripts() {
    const ids = new Set();
    let count = 0;
    for (const boss of ['gatekeeper', 'seer', 'warden']) {
        for (const phase of guild_pve_broken_forge_v7_1.GUILD_PVE_V7_PHASES[boss]) {
            const beats = SCRIPTS[phase];
            if (OWNER[phase] !== boss || beats.length !== 4)
                throw Error('guild_pve_v13_invalid_phase_script');
            const seenWarnings = new Set();
            for (const [id, kind] of beats) {
                const full = boss + '.' + phase + '.' + id;
                if (ids.has(full))
                    throw Error('guild_pve_v13_duplicate_cue');
                ids.add(full);
                count++;
                const required = DANGEROUS[phase + '.' + id];
                if (required && !seenWarnings.has(required))
                    throw Error('guild_pve_v13_resolve_without_warning:' + id);
                if (kind === 'warning')
                    seenWarnings.add(id);
            }
        }
    }
    if (count !== 36 || Object.keys(DANGEROUS).length !== 12)
        throw Error('guild_pve_v13_incomplete_cues');
    return count;
}
verifyGuildPveV13Scripts();
function guildPveV13PhaseCues(input) {
    if (OWNER[input.phase] !== input.boss ||
        !Object.hasOwn(TELEGRAPH_MS, input.difficulty))
        throw Error('guild_pve_v13_invalid_phase');
    return SCRIPTS[input.phase].map(([id, kind], index) => ({
        id: input.boss + '.' + input.phase + '.' + id, boss: input.boss,
        phase: input.phase, ordinal: index + 1, kind,
        warningMs: kind === 'warning' ? TELEGRAPH_MS[input.difficulty] : 0,
        damageSource: 'engine-receipt-only',
    }));
}
/** Derive presentation ONLY from an immutable committed server receipt. */
function projectGuildPveV13Receipt(receipt, difficulty) {
    const def = guild_pve_shared_v8_1.GUILD_PVE_V8_MANIFEST.find(node => node.id === receipt.nodeId);
    if (receipt.kind !== 'battle' || receipt.status !== 'committed' ||
        receipt.costSeals !== 1 || !receipt.combat || !def?.boss ||
        receipt.combat.boss !== def.boss ||
        !guild_pve_broken_forge_v7_1.GUILD_PVE_V7_PHASES[def.boss].includes(receipt.combat.phase) ||
        !Number.isFinite(receipt.creditedHp) ||
        receipt.creditedHp < 0 || receipt.creditedHp > receipt.beforeHp ||
        receipt.rewardMinted !== false || receipt.inventorySpent !== false)
        throw Error('guild_pve_v13_requires_settled_combat_receipt');
    const phases = guild_pve_broken_forge_v7_1.GUILD_PVE_V7_PHASES[def.boss];
    const start = phases.indexOf(receipt.combat.phase);
    let last = start;
    for (const transition of receipt.phaseTransitions) {
        const index = phases.indexOf(transition);
        if (index !== last + 1)
            throw Error('guild_pve_v13_invalid_phase_transition');
        last = index;
    }
    return {
        cues: guildPveV13PhaseCues({ boss: def.boss, phase: receipt.combat.phase, difficulty }),
        nextPhases: [...receipt.phaseTransitions],
        actualEngineDamage: receipt.combat.rawPlayerDamage,
        actualHpCredit: receipt.creditedHp,
        neverCausesGameplayMutation: true,
    };
}
