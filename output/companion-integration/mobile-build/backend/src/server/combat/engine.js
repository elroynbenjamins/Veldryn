"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCombat = simulateCombat;
exports.persistentPlayerState = persistentPlayerState;
const calculations_1 = require("./calculations");
const deterministic_rng_1 = require("./deterministic-rng");
function init(def, carried) {
    const hp = Math.max(0, Math.min(def.stats.maxHp, carried?.hp ?? def.stats.maxHp));
    const downed = carried?.downed ?? false;
    return { definition: def, hp, shield: 0, alive: !downed && hp > 0, downed, threat: {}, cooldownReadyAt: { ...(carried?.cooldownRemainingMs ?? {}) }, nextBasicAt: carried?.basicAttackRemainingMs ?? 0, periodic: [], modifiers: [], damageDone: 0, healingDone: 0, damageTaken: 0, interrupts: 0, triggeredPhases: [] };
}
function living(xs) { return xs.filter(x => x.alive); }
function hpPct(x) { return x.hp / Math.max(1, x.definition.stats.maxHp); }
function modifier(state, tag, now) {
    return state.modifiers.filter(m => m.tag === tag && m.expiresAt > now).reduce((s, m) => s + m.value, 0);
}
function chooseEnemy(actor, enemies, rng, label) {
    const live = living(enemies);
    if (!live.length)
        return undefined;
    if (actor.definition.team === 'enemies') {
        const tank = live.find(x => x.definition.role === 'tank');
        if (tank)
            return tank;
        return live.reduce((a, b) => ((actor.threat[b.definition.id] || 0) > (actor.threat[a.definition.id] || 0) ? b : a), live[0]);
    }
    return rng.pick(live, label);
}
function targetsFor(rule, actor, allies, enemies, rng, label) {
    switch (rule) {
        case 'self': return [actor];
        case 'lowest_hp_ally': {
            const live = living(allies);
            return live.length ? [live.reduce((a, b) => hpPct(b) < hpPct(a) ? b : a)] : [];
        }
        case 'all_allies': return living(allies);
        case 'all_enemies': return living(enemies);
        case 'random_enemy': {
            const live = living(enemies);
            return live.length ? [rng.pick(live, label)] : [];
        }
        case 'current_target':
        default: {
            const t = chooseEnemy(actor, enemies, rng, label);
            return t ? [t] : [];
        }
    }
}
function conditionOk(a, actor, allies, enemies) {
    switch (a.aiCondition || 'always') {
        case 'self_below_50': return hpPct(actor) < 0.5;
        case 'ally_below_50': return living(allies).some(x => hpPct(x) < 0.5);
        case 'target_casting': return living(enemies).some(x => !!x.casting && (x.definition.abilities.find(z => z.id === x.casting.abilityId)?.interruptible ?? false));
        case 'multiple_enemies': return living(enemies).length >= 2;
        default: return true;
    }
}
function simulateCombat(input) {
    if (!input.players.length || !input.enemies.length)
        throw new Error('combat_requires_both_teams');
    const maxMs = input.maxDurationMs ?? 180_000;
    const tick = input.tickMs ?? 100;
    const mitigationConstant = input.mitigationConstant ?? 1200;
    const accuracyScale = input.accuracyScale ?? 1400;
    const players = input.players.map(def => init(def, input.initialPlayerState?.[def.id])), enemies = input.enemies.map(def => init(def)), all = [...players, ...enemies];
    const rng = new deterministic_rng_1.CombatRng(input.seed);
    const events = [{ atMs: 0, type: 'combat_start' }];
    const addThreat = (target, source, amount) => { if (target.definition.team === 'enemies')
        target.threat[source.definition.id] = (target.threat[source.definition.id] || 0) + amount; };
    const applyDamage = (now, source, target, effect, abilityId, eventType = 'damage') => {
        if (!target.alive)
            return;
        const hc = (0, calculations_1.hitChance)(source.definition.stats.accuracy, target.definition.stats.evasion, accuracyScale);
        if (rng.next(`${now}:${source.definition.id}:${abilityId}:hit`) > hc)
            return;
        const mit = effect.damageType === 'true' ? 0 : (0, calculations_1.defenseMitigation)(target.definition.stats.defense, mitigationConstant);
        const crit = rng.next(`${now}:${source.definition.id}:${abilityId}:crit`) < (0, calculations_1.clamp)(source.definition.stats.critChance + modifier(source, 'crit', now), 0, .75);
        let raw = (0, calculations_1.damageAfterMitigation)(source.definition.stats.attackPower, effect.coeff ?? 0, mit, .95 + rng.next(`${now}:${abilityId}:var`) * .10, crit, source.definition.stats.critMultiplier) + (effect.flat ?? 0);
        raw *= Math.max(.1, 1 + modifier(source, 'damage_done', now));
        raw *= Math.max(.1, 1 + modifier(target, 'damage_taken', now));
        const absorbed = Math.min(target.shield, raw);
        target.shield -= absorbed;
        const dealt = Math.max(0, raw - absorbed);
        target.hp = Math.max(0, target.hp - dealt);
        source.damageDone += dealt;
        target.damageTaken += dealt;
        addThreat(target, source, dealt * (effect.threatMultiplier ?? 1));
        events.push({ atMs: now, type: eventType, actorId: source.definition.id, targetId: target.definition.id, abilityId, amount: Number(dealt.toFixed(2)) });
        if (target.hp <= 0 && target.alive) {
            target.alive = false;
            target.downed = target.definition.team === 'players';
            events.push({ atMs: now, type: target.downed ? 'down' : 'death', targetId: target.definition.id, actorId: source.definition.id });
        }
    };
    const applyHeal = (now, source, target, effect, abilityId, eventType = 'heal') => { if (!target.alive)
        return; const amount = Math.max(0, source.definition.stats.healingPower * (effect.coeff ?? 0) + (effect.flat ?? 0)); const actual = Math.min(amount, target.definition.stats.maxHp - target.hp); target.hp += actual; source.healingDone += actual; events.push({ atMs: now, type: eventType, actorId: source.definition.id, targetId: target.definition.id, abilityId, amount: Number(actual.toFixed(2)) }); enemies.forEach(e => { if (e.alive)
        addThreat(e, source, actual * .5 * (effect.threatMultiplier ?? 1)); }); };
    const applyEffect = (now, source, target, effect, abilityId) => {
        if (effect.kind === 'damage')
            return applyDamage(now, source, target, effect, abilityId);
        if (effect.kind === 'heal')
            return applyHeal(now, source, target, effect, abilityId);
        if (effect.kind === 'shield') {
            const amt = Math.max(0, source.definition.stats.healingPower * (effect.coeff ?? 0) + (effect.flat ?? 0));
            target.shield += amt;
            events.push({ atMs: now, type: 'shield', actorId: source.definition.id, targetId: target.definition.id, abilityId, amount: Number(amt.toFixed(2)) });
            return;
        }
        if (effect.kind === 'dot' || effect.kind === 'hot') {
            target.periodic.push({ sourceId: source.definition.id, effectId: abilityId, kind: effect.kind, coeff: effect.coeff ?? 0, flat: effect.flat ?? 0, damageType: effect.damageType, nextTickAt: now + (effect.tickMs ?? 1000), expiresAt: now + (effect.durationMs ?? 3000), tickMs: effect.tickMs ?? 1000 });
            return;
        }
        if (effect.kind === 'interrupt') {
            if (target.casting) {
                const def = target.definition.abilities.find(a => a.id === target.casting.abilityId);
                if (def?.interruptible) {
                    target.casting = undefined;
                    source.interrupts++;
                    events.push({ atMs: now, type: 'interrupt', actorId: source.definition.id, targetId: target.definition.id, abilityId });
                }
            }
            return;
        }
        if (effect.kind === 'taunt') {
            if (target.definition.team === 'enemies') {
                const top = Math.max(1, ...Object.values(target.threat));
                target.threat[source.definition.id] = top + Math.max(100, effect.value ?? 100);
            }
            return;
        }
        if (effect.kind === 'buff' || effect.kind === 'debuff') {
            target.modifiers.push({ sourceId: source.definition.id, tag: effect.tag ?? 'generic', value: effect.value ?? 0, expiresAt: now + (effect.durationMs ?? 5000) });
            return;
        }
    };
    for (let now = 0; now <= maxMs; now += tick) {
        for (const state of all) {
            if (!state.alive)
                continue;
            state.modifiers = state.modifiers.filter(m => m.expiresAt > now);
            for (const p of [...state.periodic]) {
                if (p.nextTickAt <= now && p.expiresAt >= now) {
                    const src = all.find(x => x.definition.id === p.sourceId);
                    if (src?.alive) {
                        const fx = { kind: p.kind, coeff: p.coeff, flat: p.flat, damageType: p.damageType };
                        p.kind === 'dot' ? applyDamage(now, src, state, fx, p.effectId, 'dot_tick') : applyHeal(now, src, state, fx, p.effectId, 'hot_tick');
                    }
                    p.nextTickAt += p.tickMs;
                }
            }
            state.periodic = state.periodic.filter(p => p.expiresAt > now);
        }
        if (!living(enemies).length) {
            events.push({ atMs: now, type: 'combat_end', detail: 'victory' });
            return { victory: true, durationMs: now, reason: 'victory', events, players, enemies };
        }
        if (!living(players).length) {
            events.push({ atMs: now, type: 'combat_end', detail: 'wipe' });
            return { victory: false, durationMs: now, reason: 'wipe', events, players, enemies };
        }
        // Generic HP-threshold boss phases. Data declares the phase; engine applies it once.
        for (const boss of living(enemies).filter(x => x.definition.boss)) {
            for (const phase of (boss.definition.phases || []).sort((a, b) => b.hpPct - a.hpPct)) {
                if (hpPct(boss) <= phase.hpPct && !boss.triggeredPhases.includes(phase.id)) {
                    boss.triggeredPhases.push(phase.id);
                    events.push({ atMs: now, type: 'phase', actorId: boss.definition.id, abilityId: phase.id, detail: `hp<=${phase.hpPct}` });
                    for (const fx of phase.effects) {
                        for (const t of targetsFor(phase.target, boss, enemies, players, rng, `${now}:${phase.id}:phase`))
                            applyEffect(now, boss, t, fx, phase.id);
                    }
                }
            }
        }
        for (const actor of all) {
            if (!actor.alive)
                continue;
            const allies = actor.definition.team === 'players' ? players : enemies, foes = actor.definition.team === 'players' ? enemies : players;
            if (actor.casting && actor.casting.completesAt <= now) {
                const ab = actor.definition.abilities.find(a => a.id === actor.casting.abilityId);
                const target = all.find(x => x.definition.id === actor.casting.targetId);
                actor.casting = undefined;
                if (ab && target?.alive) {
                    events.push({ atMs: now, type: 'cast_complete', actorId: actor.definition.id, targetId: target.definition.id, abilityId: ab.id });
                    for (const fx of ab.effects) {
                        for (const t of targetsFor(ab.target, actor, allies, foes, rng, `${now}:${ab.id}:target`))
                            applyEffect(now, actor, t, fx, ab.id);
                    }
                }
            }
            if (actor.casting)
                continue;
            const ready = actor.definition.abilities.filter(a => (actor.cooldownReadyAt[a.id] ?? 0) <= now && conditionOk(a, actor, allies, foes)).sort((a, b) => b.priority - a.priority);
            const ab = ready[0];
            if (ab) {
                const ts = targetsFor(ab.target, actor, allies, foes, rng, `${now}:${ab.id}:select`);
                const t = ts[0];
                if (t) {
                    actor.cooldownReadyAt[ab.id] = now + Math.round(ab.cooldownMs / Math.max(.25, 1 + actor.definition.stats.haste));
                    if (ab.castTimeMs > 0) {
                        actor.casting = { abilityId: ab.id, completesAt: now + ab.castTimeMs, targetId: t.definition.id };
                        events.push({ atMs: now, type: 'cast_start', actorId: actor.definition.id, targetId: t.definition.id, abilityId: ab.id });
                    }
                    else {
                        for (const fx of ab.effects) {
                            for (const x of targetsFor(ab.target, actor, allies, foes, rng, `${now}:${ab.id}:instant`))
                                applyEffect(now, actor, x, fx, ab.id);
                        }
                    }
                    continue;
                }
            }
            if (actor.nextBasicAt <= now) {
                const t = chooseEnemy(actor, foes, rng, `${now}:${actor.definition.id}:basic`);
                if (t) {
                    applyDamage(now, actor, t, { kind: 'damage', coeff: actor.definition.basicAttackCoeff, damageType: 'physical', threatMultiplier: actor.definition.role === 'tank' ? 2.5 : 1 }, 'BASIC');
                    actor.nextBasicAt = now + Math.round(actor.definition.basicAttackMs / Math.max(.25, 1 + actor.definition.stats.haste));
                }
            }
        }
    }
    events.push({ atMs: maxMs, type: 'combat_end', detail: 'timeout' });
    return { victory: false, durationMs: maxMs, reason: 'timeout', events, players, enemies };
}
function persistentPlayerState(result) {
    return Object.fromEntries(result.players.map(player => [player.definition.id, {
            hp: player.hp,
            downed: player.downed,
            cooldownRemainingMs: Object.fromEntries(Object.entries(player.cooldownReadyAt).map(([abilityId, readyAt]) => [abilityId, Math.max(0, readyAt - result.durationMs)])),
            basicAttackRemainingMs: Math.max(0, player.nextBasicAt - result.durationMs),
        }]));
}
