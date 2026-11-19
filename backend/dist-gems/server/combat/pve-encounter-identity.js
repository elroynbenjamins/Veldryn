"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPveIdentity = withPveIdentity;
exports.pveHeavyStrike = pveHeavyStrike;
exports.pveFocusStrike = pveFocusStrike;
exports.pveInterruptibleWave = pveInterruptibleWave;
exports.pveHex = pveHex;
exports.pveDotWave = pveDotWave;
exports.pveBarrier = pveBarrier;
exports.pveEnrage = pveEnrage;
exports.pveExecuteStrike = pveExecuteStrike;
exports.pveSustain = pveSustain;
exports.pveAllyMend = pveAllyMend;
exports.pveSupportRally = pveSupportRally;
exports.pveHealingPressure = pveHealingPressure;
exports.pveEncounterPreview = pveEncounterPreview;
exports.pveBossTelegraph = pveBossTelegraph;
const ARCHETYPE_LABEL = Object.freeze({
    bruiser: 'Bruiser', assassin: 'Assassin', caster: 'Caster', swarm: 'Swarm', guardian: 'Guardian', hexer: 'Hexer', executioner: 'Executioner', support: 'Support',
});
const MECHANICS = Object.freeze({
    heavy_hit: { id: 'heavy_hit', label: 'Heavy Hit', description: 'Strong focused attacks create tank pressure.' },
    focus: { id: 'focus', label: 'Focus', description: 'Can pressure a non-tank party member.' },
    interrupt: { id: 'interrupt', label: 'Interrupt', description: 'Dangerous casts can be interrupted.' },
    aoe: { id: 'aoe', label: 'Party Damage', description: 'Can damage multiple party members at once.' },
    dot: { id: 'dot', label: 'DoT', description: 'Applies damage over time.' },
    vulnerability: { id: 'vulnerability', label: 'Vulnerability', description: 'Applies increased damage taken.' },
    healing_reduction: { id: 'healing_reduction', label: 'Heal Cut', description: 'Reduces healing received for a short time.' },
    barrier: { id: 'barrier', label: 'Barrier', description: 'Can create a protective barrier.' },
    enrage: { id: 'enrage', label: 'Enrage', description: 'Temporarily increases offensive pressure.' },
    execute: { id: 'execute', label: 'Execute', description: 'Deals increased damage to low-health targets.' },
    sustain: { id: 'sustain', label: 'Sustain', description: 'Can restore health or prolong the fight.' },
});
const archetypeTag = (value) => `pve:archetype:${value}`;
const mechanicTag = (value) => `pve:mechanic:${value}`;
function withPveIdentity(definition, archetype, mechanics) {
    const existing = (definition.tags ?? []).filter(tag => !tag.startsWith('pve:archetype:') && !tag.startsWith('pve:mechanic:'));
    return { ...definition, tags: [...existing, archetypeTag(archetype), ...[...new Set(mechanics)].map(mechanicTag)] };
}
function pveHeavyStrike(id, name, damageType, coeff, cooldownMs = 6800, castTimeMs = 700) {
    return { id, name, cooldownMs, castTimeMs, target: 'current_target', priority: 78, effects: [{ kind: 'damage', coeff, damageType }] };
}
function pveFocusStrike(id, name, damageType, coeff, cooldownMs = 7000) {
    return { id, name, cooldownMs, castTimeMs: 500, target: 'random_enemy', priority: 92, effects: [{ kind: 'damage', coeff, damageType, executeBelowHpPct: .35, executeBonus: .22 }] };
}
function pveInterruptibleWave(id, name, damageType, coeff, cooldownMs = 9800, castTimeMs = 1300) {
    return { id, name, cooldownMs, castTimeMs, target: 'all_enemies', priority: 95, interruptible: true, effects: [{ kind: 'damage', coeff, damageType }] };
}
function pveHex(id, name, damageType, coeff = .62, cooldownMs = 7600) {
    return { id, name, cooldownMs, castTimeMs: 800, target: 'current_target', priority: 92, effects: [{ kind: 'damage', coeff, damageType }, { kind: 'debuff', tag: 'damage_taken', value: .07, durationMs: 6000 }] };
}
function pveDotWave(id, name, damageType, coeff = .5, cooldownMs = 9800) {
    return { id, name, cooldownMs, castTimeMs: 1300, target: 'all_enemies', priority: 94, interruptible: true, effects: [{ kind: 'damage', coeff, damageType }, { kind: 'dot', coeff: .10, damageType, durationMs: 6000, tickMs: 2000 }] };
}
function pveBarrier(id, name, flat, cooldownMs = 12000) {
    return { id, name, cooldownMs, castTimeMs: 0, target: 'self', priority: 88, effects: [{ kind: 'shield', flat }] };
}
function pveEnrage(id, name, value = .1, cooldownMs = 16000) {
    return { id, name, cooldownMs, castTimeMs: 0, target: 'self', priority: 70, effects: [{ kind: 'buff', tag: 'damage_done', value, durationMs: 7000 }] };
}
function pveExecuteStrike(id, name, damageType, coeff, cooldownMs = 7200) {
    return { id, name, cooldownMs, castTimeMs: 650, target: 'current_target', priority: 90, effects: [{ kind: 'damage', coeff, damageType, executeBelowHpPct: .35, executeBonus: .3 }] };
}
function pveSustain(id, name, flat, cooldownMs = 11000) {
    return { id, name, cooldownMs, castTimeMs: 900, target: 'self', priority: 86, aiCondition: 'self_below_50', effects: [{ kind: 'heal', flat }] };
}
function pveAllyMend(id, name, flat, cooldownMs = 9000) {
    return { id, name, cooldownMs, castTimeMs: 850, target: 'lowest_hp_ally', priority: 96, aiCondition: 'ally_below_80', effects: [{ kind: 'heal', flat }] };
}
function pveSupportRally(id, name, value = .06, cooldownMs = 14500) {
    return { id, name, cooldownMs, castTimeMs: 0, target: 'all_allies', priority: 72, effects: [{ kind: 'buff', tag: 'damage_done', value, durationMs: 6000 }] };
}
function pveHealingPressure(id, name, damageType, coeff = .52, cooldownMs = 8200) {
    return { id, name, cooldownMs, castTimeMs: 750, target: 'current_target', priority: 93, effects: [{ kind: 'damage', coeff, damageType }, { kind: 'debuff', tag: 'healing_received', value: -.25, durationMs: 6000 }] };
}
function parseArchetype(tags) {
    const value = tags.find(tag => tag.startsWith('pve:archetype:'))?.slice('pve:archetype:'.length);
    return value && value in ARCHETYPE_LABEL ? value : undefined;
}
function parseMechanics(tags) {
    return [...new Set(tags.filter(tag => tag.startsWith('pve:mechanic:')).map(tag => tag.slice('pve:mechanic:'.length)).filter(value => value in MECHANICS))];
}
function pveEncounterPreview(definitions) {
    const enemies = definitions.filter(definition => definition.team === 'enemies');
    if (!enemies.length)
        return undefined;
    const archetypes = [...new Set(enemies.map(enemy => parseArchetype(enemy.tags ?? [])).filter((value) => Boolean(value)))].slice(0, 2);
    const mechanicIds = [...new Set(enemies.flatMap(enemy => parseMechanics(enemy.tags ?? [])))].slice(0, 4);
    if (!archetypes.length && !mechanicIds.length)
        return undefined;
    const mechanics = mechanicIds.map(id => MECHANICS[id]);
    const labels = [...archetypes.map(id => ARCHETYPE_LABEL[id]), ...mechanics.slice(0, 2).map(item => item.label)];
    return { archetypes: archetypes.map(id => ({ id, label: ARCHETYPE_LABEL[id] })), mechanics, summary: labels.join(' · ') };
}
/** Presentation-safe boss plan for standard dungeons. Numeric combat stats and
 * effect coefficients stay server-side; only readable counterplay information
 * is exposed to the route/combat UI. */
function pveBossTelegraph(definitions) {
    const boss = definitions.find(definition => definition.team === 'enemies' && definition.boss);
    if (!boss)
        return undefined;
    const readable = (value) => value.replace(/[_:-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    return {
        bossName: boss.name,
        phases: (boss.phases ?? []).map(phase => ({ id: phase.id, label: phase.name?.trim() || readable(phase.id), hpPct: Math.round(phase.hpPct * 100), objectiveSensitive: false })),
        castAbilities: boss.abilities.filter(ability => ability.castTimeMs > 0 || ability.interruptible === true).map(ability => ({ id: ability.id, label: ability.name, castMs: ability.castTimeMs, cooldownMs: ability.cooldownMs, interruptible: ability.interruptible === true, objectiveSensitive: false })),
        suppressedAbilities: [],
    };
}
