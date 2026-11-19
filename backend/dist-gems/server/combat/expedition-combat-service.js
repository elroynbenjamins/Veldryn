"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expeditionEncounterPreview = expeditionEncounterPreview;
exports.expeditionBossTelegraph = expeditionBossTelegraph;
exports.buildExpeditionEncounter = buildExpeditionEncounter;
exports.resolveExpeditionCombat = resolveExpeditionCombat;
const node_crypto_1 = require("node:crypto");
const engine_1 = require("./engine");
const expedition_encounters_1 = require("./content/expedition-encounters");
const pve_encounter_identity_1 = require("./pve-encounter-identity");
const pve_simulation_telemetry_1 = require("./pve-simulation-telemetry");
const pve_encounter_identity_2 = require("./pve-encounter-identity");
const coop_room_modifiers_1 = require("../expeditions/coop-room-modifiers");
const dungeon_companion_counters_1 = require("../coop/dungeon-companion-counters");
function expeditionEncounterPreview(encounterId, enemyLevel) {
    const factory = expedition_encounters_1.EXPEDITION_ENCOUNTERS[encounterId];
    return factory ? (0, pve_encounter_identity_1.pveEncounterPreview)(enemyLevel === undefined ? factory() : buildExpeditionEncounter({ encounterId, enemyLevel })) : undefined;
}
function expeditionBossTelegraph(encounterId) {
    const factory = expedition_encounters_1.EXPEDITION_ENCOUNTERS[encounterId];
    return factory ? (0, pve_encounter_identity_2.pveBossTelegraph)(factory()) : undefined;
}
function buildExpeditionEncounter(input) {
    const factory = expedition_encounters_1.EXPEDITION_ENCOUNTERS[input.encounterId];
    if (!factory)
        throw new Error(`unknown_encounter:${input.encounterId}`);
    const tuning = input.bossTuning, removed = new Set(tuning?.removeAbilityIds ?? []);
    return factory().map((enemy, index) => {
        // Frostfall's five accessible tiers span levels 10–30; do not clamp its level-10 enemies to 65% of level-35 stats.
        const minimumRatio = input.encounterId.startsWith('EVENT_FROSTFALL_') ? .25 : .65;
        const levelRatio = input.enemyLevel === undefined ? 1 : Math.max(minimumRatio, Math.min(1.2, input.enemyLevel / Math.max(1, enemy.level)));
        const base = { ...enemy, level: input.enemyLevel ?? enemy.level, stats: { ...enemy.stats, maxHp: enemy.stats.maxHp * levelRatio * (input.enemyHpMultiplier ?? 1), attackPower: enemy.stats.attackPower * levelRatio * (input.enemyAttackMultiplier ?? 1), defense: enemy.stats.defense * levelRatio * (input.enemyDefenseMultiplier ?? 1) } };
        if (!base.boss || !tuning)
            return (0, coop_room_modifiers_1.applyCoopRoomModifier)(base, input.roomModifierId, index, input.roomModifierElite);
        const abilities = base.abilities.filter(ability => !removed.has(ability.id)).map(ability => {
            const damageMultiplier = tuning.abilityDamageMultipliers?.[ability.id] ?? 1, cooldownMultiplier = tuning.abilityCooldownMultipliers?.[ability.id] ?? 1;
            return { ...ability, cooldownMs: Math.max(500, Math.round(ability.cooldownMs * cooldownMultiplier)), effects: ability.effects.map(effect => (effect.kind === 'damage' || effect.kind === 'dot') && effect.coeff !== undefined ? { ...effect, coeff: effect.coeff * damageMultiplier } : effect) };
        });
        for (const added of tuning.addAbilities ?? [])
            if (!abilities.some(ability => ability.id === added.id))
                abilities.push(structuredClone(added));
        const phases = [...(base.phases ?? [])];
        for (const added of tuning.addPhases ?? [])
            if (!phases.some(phase => phase.id === added.id))
                phases.push(structuredClone(added));
        return (0, coop_room_modifiers_1.applyCoopRoomModifier)({ ...base, abilities, phases }, input.roomModifierId, index, input.roomModifierElite);
    });
}
function publicReplay(result, initialPlayerState) {
    const definitions = [...result.players, ...result.enemies].map(state => state.definition);
    const byId = new Map(definitions.map(definition => [definition.id, definition]));
    const playerIds = new Set(result.players.map(player => player.definition.id));
    const combatants = definitions.map(definition => {
        const carried = playerIds.has(definition.id) ? initialPlayerState?.[definition.id] : undefined;
        const startHp = Math.max(0, Math.min(definition.stats.maxHp, carried?.hp ?? definition.stats.maxHp));
        return { id: definition.id, name: definition.name, team: definition.team, maxHp: Number(definition.stats.maxHp.toFixed(2)), startHp: Number(startHp.toFixed(2)), startShield: 0, boss: Boolean(definition.boss) };
    });
    const maxHpById = new Map(combatants.map(item => [item.id, item.maxHp]));
    const tracked = new Map(combatants.map(item => [item.id, { hp: item.startHp, shield: item.startShield }]));
    const snapshot = () => combatants.map(item => { const state = tracked.get(item.id); return { id: item.id, hp: Number(state.hp.toFixed(2)), shield: Number(state.shield.toFixed(2)) }; });
    const applyEventState = (event) => {
        if (!event.targetId)
            return;
        const state = tracked.get(event.targetId), maxHp = maxHpById.get(event.targetId);
        if (!state || maxHp === undefined)
            return;
        const amount = Math.max(0, event.amount ?? 0), absorbed = Math.max(0, event.absorbed ?? 0);
        if (event.type === 'damage' || event.type === 'dot_tick') {
            state.shield = Math.max(0, state.shield - absorbed);
            state.hp = Math.max(0, state.hp - amount);
            return;
        }
        if (event.type === 'heal' || event.type === 'hot_tick') {
            state.hp = Math.min(maxHp, state.hp + amount);
            return;
        }
        if (event.type === 'shield') {
            state.shield = Math.max(0, state.shield + amount);
        }
    };
    const abilityNames = new Map(), castDurations = new Map(), companionAbilities = new Set(), bossIds = new Set(result.enemies.filter(enemy => enemy.definition.boss).map(enemy => enemy.definition.id));
    for (const definition of definitions) {
        for (const ability of definition.abilities) {
            abilityNames.set(ability.id, ability.name);
            castDurations.set(ability.id, ability.castTimeMs);
            if (ability.tags?.includes('combat_companion') || ability.id.includes(':assist'))
                companionAbilities.add(ability.id);
        }
        for (const phase of definition.phases ?? [])
            abilityNames.set(phase.id, phase.name?.trim() || phase.id.replace(/_/g, ' '));
    }
    const humanize = (value) => value.replace(/^gem:/, '').replace(/[_:-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    const statuses = result.events.filter(event => event.type === 'status_apply' && event.targetId && event.statusKind && event.expiresAtMs !== undefined && event.expiresAtMs > event.atMs).map(event => ({
        targetId: event.targetId,
        sourceId: event.actorId,
        kind: event.statusKind,
        tag: event.statusTag?.trim() || event.statusKind,
        label: (event.abilityId ? abilityNames.get(event.abilityId) : undefined)?.trim() || humanize(event.statusTag?.trim() || event.statusKind),
        abilityId: event.abilityId,
        startsAtMs: event.atMs,
        expiresAtMs: event.expiresAtMs,
    }));
    const gemStates = result.events.filter(event => event.type === 'gem_state' && Array.isArray(event.gemStates)).map(event => ({
        atMs: event.atMs,
        states: (event.gemStates ?? []).map(state => ({ targetId: state.targetId, tag: state.tag, expiriesAtMs: [...state.expiriesAtMs] })),
    }));
    const cues = [], assistSeen = new Set(), actionSeen = new Set();
    let lastBasicBeatAt = -Infinity;
    const names = (id) => id ? byId.get(id)?.name : undefined;
    const push = (cue) => cues.push({ ...cue, states: snapshot() });
    for (const event of result.events) {
        applyEventState(event);
        if (event.type === 'phase' && event.actorId && bossIds.has(event.actorId)) {
            push({ atMs: event.atMs, type: 'phase', actorId: event.actorId, actorName: names(event.actorId), abilityId: event.abilityId, abilityName: event.abilityId ? abilityNames.get(event.abilityId) : undefined });
            continue;
        }
        if (event.type === 'cast_start' && event.actorId && bossIds.has(event.actorId)) {
            const duration = event.abilityId ? castDurations.get(event.abilityId) : undefined;
            push({ atMs: event.atMs, type: 'cast', actorId: event.actorId, actorName: names(event.actorId), targetId: event.targetId, targetName: names(event.targetId), abilityId: event.abilityId, abilityName: event.abilityId ? abilityNames.get(event.abilityId) : undefined, ...(duration !== undefined ? { durationMs: duration } : {}) });
            continue;
        }
        if (event.actorId && event.abilityId && companionAbilities.has(event.abilityId) && ['damage', 'heal', 'shield', 'interrupt'].includes(event.type)) {
            const key = `${event.atMs}:${event.actorId}:${event.abilityId}`;
            if (!assistSeen.has(key)) {
                assistSeen.add(key);
                push({ atMs: event.atMs, type: 'assist', actorId: event.actorId, actorName: names(event.actorId), targetId: event.targetId, targetName: names(event.targetId), abilityId: event.abilityId, abilityName: abilityNames.get(event.abilityId) });
            }
            continue;
        }
        if (event.type === 'interrupt' && event.actorId) {
            push({ atMs: event.atMs, type: 'interrupt', actorId: event.actorId, actorName: names(event.actorId), targetId: event.targetId, targetName: names(event.targetId), abilityId: event.abilityId, abilityName: event.abilityId ? abilityNames.get(event.abilityId) : undefined });
            continue;
        }
        if (event.type === 'down' && event.targetId && result.players.some(player => player.definition.id === event.targetId)) {
            push({ atMs: event.atMs, type: 'down', actorId: event.actorId, actorName: names(event.actorId), targetId: event.targetId, targetName: names(event.targetId) });
            continue;
        }
        if ((event.type === 'damage' || event.type === 'miss' || event.type === 'heal' || event.type === 'shield') && event.actorId && event.targetId && event.abilityId) {
            const basic = event.abilityId === 'BASIC', key = `${event.atMs}:${event.actorId}:${event.targetId}:${event.abilityId}:${event.type}`;
            if (!actionSeen.has(key) && (!basic || event.atMs - lastBasicBeatAt >= 900)) {
                actionSeen.add(key);
                if (basic)
                    lastBasicBeatAt = event.atMs;
                const actionKind = event.type === 'heal' ? 'heal' : event.type === 'shield' ? 'shield' : 'damage';
                push({ atMs: event.atMs, type: 'action', actorId: event.actorId, actorName: names(event.actorId), targetId: event.targetId, targetName: names(event.targetId), abilityId: event.abilityId, abilityName: basic ? 'Basic Attack' : abilityNames.get(event.abilityId), actionKind, ...(event.type === 'miss' ? { outcome: 'miss' } : event.critical ? { outcome: 'critical' } : {}), ...(event.absorbed !== undefined && event.absorbed > 0 ? { absorbed: event.absorbed } : {}), ...(event.abilityId.startsWith('GEM_') ? { gemProc: true } : {}), amount: event.type === 'miss' ? 0 : event.amount });
            }
            continue;
        }
        if (event.type === 'combat_end')
            push({ atMs: event.atMs, type: result.reason });
    }
    if (cues.length <= 48)
        return { combatants, statuses, gemStates, cues };
    const terminal = cues[cues.length - 1], source = cues.slice(0, -1);
    const sample = (items, limit) => { if (items.length <= limit)
        return items; if (limit <= 0)
        return []; const picked = []; for (let i = 0; i < limit; i++)
        picked.push(items[Math.min(items.length - 1, Math.floor(i * items.length / limit))]); return picked; };
    const important = source.filter(cue => cue.type !== 'action'), keptImportant = sample(important, 47), actionBudget = Math.max(0, 47 - keptImportant.length), keptActions = sample(source.filter(cue => cue.type === 'action'), actionBudget);
    return { combatants, statuses, gemStates, cues: [...keptImportant, ...keptActions].sort((a, b) => a.atMs - b.atMs).concat(terminal) };
}
function resolveExpeditionCombat(input, includeDebugTrace = false) {
    const enemies = buildExpeditionEncounter(input);
    const safetyAiIds = new Set(input.safetyAiPlayerIds ?? []);
    const players = input.players.map(player => {
        if (!safetyAiIds.has(player.id))
            return player;
        const defensiveAbilities = player.abilities.filter(ability => ability.effects.length > 0 && ability.effects.every(effect => effect.kind === 'heal' || effect.kind === 'shield'));
        return { ...player, stats: { ...player.stats, attackPower: player.stats.attackPower * .70, healingPower: player.stats.healingPower * .70 }, abilities: defensiveAbilities };
    });
    const matched = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)(players, enemies, safetyAiIds);
    const result = (0, engine_1.simulateCombat)({ seed: `${input.serverSeed}:${input.runId}:${input.nodeIndex}:${input.encounterId}`, players: matched.players, enemies, initialPlayerState: input.initialPlayerState, maxDurationMs: input.maxDurationMs ?? 180000, enemyDamageProfile: input.enemyDamageProfile });
    const eventDigest = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(result.events)).digest().toString('hex');
    const rec = (xs, pick) => Object.fromEntries(xs.map(x => [x.definition.id, Number(pick(x).toFixed(2))]));
    const bossIds = new Set(result.enemies.filter(enemy => enemy.definition.boss).map(enemy => enemy.definition.id));
    const unique = (values) => [...new Set(values.filter((value) => Boolean(value)))];
    const bossPhaseIds = unique(result.events.filter(event => event.type === 'phase' && event.actorId && bossIds.has(event.actorId)).map(event => event.abilityId));
    const bossCastAbilityIds = unique(result.events.filter(event => event.type === 'cast_start' && event.actorId && bossIds.has(event.actorId)).map(event => event.abilityId));
    const replay = publicReplay(result, input.initialPlayerState), encounterIdentity = (0, pve_encounter_identity_1.pveEncounterPreview)(enemies), pveTelemetry = (0, pve_simulation_telemetry_1.buildPveSimulationTelemetry)(result, input.encounterId);
    return { success: result.victory, resultJson: { reason: result.reason, durationMs: result.durationMs, downs: result.players.filter(p => p.downed).map(p => p.definition.id), playerHp: rec(result.players, x => x.hp), enemyHp: rec(result.enemies, x => x.hp), damage: rec(result.players, x => x.damageDone), healing: rec(result.players, x => x.healingDone), damageTaken: rec(result.players, x => x.damageTaken), interrupts: rec(result.players, x => x.interrupts), eventDigest, eventCount: result.events.length, bossPhaseIds, bossCastAbilityIds, ...(safetyAiIds.size ? { safetyAiPlayerIds: [...safetyAiIds], safetyAiPolicy: { outputMultiplier: .70, allowedActions: ['basic_attack', 'basic_defensive'] } } : {}), ...(encounterIdentity ? { encounterIdentity } : {}), ...(matched.matchups.length ? { companionCounters: matched.matchups } : {}), pveTelemetry, replayCombatants: replay.combatants, replayStatuses: replay.statuses, replayGemStates: replay.gemStates, replayCues: replay.cues }, endingPlayerState: (0, engine_1.persistentPlayerState)(result), ...(includeDebugTrace ? { debugEvents: result.events } : {}) };
}
