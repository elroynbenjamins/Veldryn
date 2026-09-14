"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionTrialFloorDefinition = companionTrialFloorDefinition;
exports.applyCompanionTrialModifiers = applyCompanionTrialModifiers;
exports.buildCompanionTrialEncounter = buildCompanionTrialEncounter;
exports.startCompanionTrial = startCompanionTrial;
exports.abandonCompanionTrial = abandonCompanionTrial;
exports.resolveCompanionTrialFloor = resolveCompanionTrialFloor;
exports.claimWeeklyCompanionChallenge = claimWeeklyCompanionChallenge;
const content_1 = require("./content");
const combat_adapter_1 = require("./combat-adapter");
const team_1 = require("./team");
const trial_season_1 = require("./trial-season");
function companionTrialFloorDefinition(floor, seasonKey) {
    if (floor < 1 || floor > content_1.COMPANION_TRIAL_FLOOR_COUNT || !Number.isInteger(floor))
        throw new Error('invalid_companion_trial_floor');
    const season = (0, content_1.companionTrialSeasonDefinition)(seasonKey);
    return { floor, recommendedPower: (0, content_1.companionTrialRecommendedPower)(floor), modifiers: [...new Set([...season.modifiers, ...(0, content_1.companionTrialFloorModifiers)(floor)])], boss: floor % content_1.COMPANION_TRIAL_BOSS_INTERVAL === 0 };
}
function enemy(id, name, floor, boss = false, role = 'enemy') {
    const scale = (0, content_1.companionTrialEnemyScale)(floor);
    return { id, name, team: 'enemies', role, level: floor, stats: { maxHp: Math.round((boss ? 520 : 180) * scale), attackPower: Number(((boss ? 28 : 15) * scale).toFixed(2)), healingPower: 0, defense: Number(((boss ? 24 : 12) * scale).toFixed(2)), accuracy: .88, evasion: .04, critChance: .05, critMultiplier: 1.5, haste: Math.min(.35, .03 + floor * .004) }, basicAttackMs: boss ? 2200 : 2500, basicAttackCoeff: boss ? .82 : .55, abilities: boss ? [{ id: `TRIAL_BOSS_${floor}_ACTIVE`, name: 'Trial Boss Signature', cooldownMs: 14000, castTimeMs: 0, target: 'current_target', effects: [{ kind: 'damage', coeff: 1.05, tag: 'trial_boss' }], priority: 80, aiCondition: 'always' }] : [], boss, tags: ['companion_trial_enemy', boss ? 'boss' : 'normal'] };
}
function applyCompanionTrialModifiers(players, enemies, modifierIds) {
    let playerHealing = 1, playerHaste = 0, playerShield = 1, enemyDefense = 1, enemyAttack = 1, enemyHp = 1, enemyHaste = 0, enemyAccuracy = 0;
    for (const id of modifierIds) {
        const m = content_1.COMPANION_TRIAL_MODIFIERS[id];
        if (!m)
            continue;
        playerHealing *= m.playerHealingMultiplier ?? 1;
        playerHaste += m.playerHasteBonus ?? 0;
        playerShield *= m.playerShieldMultiplier ?? 1;
        enemyDefense *= m.enemyDefenseMultiplier ?? 1;
        enemyAttack *= m.enemyAttackMultiplier ?? 1;
        enemyHp *= m.enemyHpMultiplier ?? 1;
        enemyHaste += m.enemyHasteBonus ?? 0;
        enemyAccuracy += m.enemyAccuracyBonus ?? 0;
    }
    const tagged = (tags) => [...(tags ?? []), ...modifierIds.map(id => `trial_modifier:${id}`)];
    const nextPlayers = players.map(p => ({ ...p, stats: { ...p.stats, healingPower: Number((p.stats.healingPower * playerHealing).toFixed(4)), haste: Math.min(.60, p.stats.haste + playerHaste) }, abilities: p.abilities.map(a => ({ ...a, effects: a.effects.map(e => e.kind === 'shield' && e.coeff !== undefined ? { ...e, coeff: Number((e.coeff * playerShield).toFixed(4)) } : e) })), tags: tagged(p.tags) }));
    const nextEnemies = enemies.map(e => ({ ...e, stats: { ...e.stats, maxHp: Math.round(e.stats.maxHp * enemyHp), attackPower: Number((e.stats.attackPower * enemyAttack).toFixed(4)), defense: Number((e.stats.defense * enemyDefense).toFixed(4)), haste: Math.min(.60, e.stats.haste + enemyHaste), accuracy: Math.min(.99, e.stats.accuracy + enemyAccuracy) }, tags: tagged(e.tags) }));
    return { players: nextPlayers, enemies: nextEnemies };
}
function rawCompanionTrialEncounter(floor) { const boss = floor % content_1.COMPANION_TRIAL_BOSS_INTERVAL === 0; return boss ? [enemy(`COMPANION_TRIAL_BOSS_${floor}`, `Trial Guardian ${floor}`, floor, true)] : [enemy(`COMPANION_TRIAL_${floor}_A`, 'Trial Vanguard', floor), enemy(`COMPANION_TRIAL_${floor}_B`, 'Trial Striker', floor), enemy(`COMPANION_TRIAL_${floor}_C`, 'Trial Adept', floor)]; }
function buildCompanionTrialEncounter(floor, seasonKey = '2000-01') { const def = companionTrialFloorDefinition(floor, seasonKey); return applyCompanionTrialModifiers([], rawCompanionTrialEncounter(floor), def.modifiers).enemies; }
function runId(seed, nowMs) { return `CTR_${nowMs.toString(36)}_${Math.abs([...seed].reduce((n, c) => (n * 33 + c.charCodeAt(0)) | 0, 5381)).toString(36)}`; }
function startCompanionTrial(input, teamIds, seed, restrictions = [], requestedStartFloor) {
    if (!input.trialsUnlocked)
        throw new Error('companion_trials_locked');
    const rolled = (0, trial_season_1.rolloverCompanionTrialSeason)(input.progress, input.serverNowMs), progress = rolled.progress;
    const validation = (0, team_1.validateCompanionTrialTeam)({ companionIds: teamIds, owned: input.owned, busyCompanionIds: input.busyCompanionIds, restrictions });
    if (!validation.ok)
        throw new Error(validation.reason);
    if (progress.season.activeRun)
        throw new Error('companion_trial_run_already_active');
    const unlockedCheckpoint = Math.max(1, Math.min(content_1.COMPANION_TRIAL_FLOOR_COUNT, progress.season.checkpointFloor));
    const requested = requestedStartFloor ?? unlockedCheckpoint;
    if (requested < 1 || requested > unlockedCheckpoint || !(requested === 1 || (requested - 1) % content_1.COMPANION_TRIAL_BOSS_INTERVAL === 0))
        throw new Error('invalid_or_locked_trial_checkpoint');
    const startFloor = requested;
    const ids = [...teamIds];
    const run = { runId: runId(seed, input.serverNowMs), seasonKey: progress.season.seasonKey, teamCompanionIds: ids, startedAt: new Date(input.serverNowMs).toISOString(), contentVersion: 'companion_trials_v1', currentFloor: startFloor, startFloor, seed, restrictionIds: restrictions.map(r => JSON.stringify(r)) };
    return { progress: { ...progress, season: { ...progress.season, activeRun: run, currentFloor: startFloor } }, run, teamPower: validation.power, synergies: validation.synergies, resetInfo: (0, trial_season_1.companionTrialResetInfo)(input.serverNowMs), rolled: rolled.rolled };
}
function abandonCompanionTrial(progress, serverNowMs) { const rolled = (0, trial_season_1.rolloverCompanionTrialSeason)(progress, serverNowMs); return { ...rolled.progress, season: { ...rolled.progress.season, activeRun: undefined, currentFloor: rolled.progress.season.checkpointFloor } }; }
function resolveCompanionTrialFloor(input, runIdValue, executor) {
    if (!input.trialsUnlocked)
        throw new Error('companion_trials_locked');
    const rolled = (0, trial_season_1.rolloverCompanionTrialSeason)(input.progress, input.serverNowMs), progress = rolled.progress;
    if (rolled.expiredRunId === runIdValue)
        throw new Error('trial_run_expired_by_season_rollover');
    const run = progress.season.activeRun;
    if (!run || run.runId !== runIdValue)
        throw new Error('companion_trial_run_not_active');
    if (run.seasonKey !== progress.season.seasonKey)
        throw new Error('trial_run_expired_by_season_rollover');
    const teamCheck = (0, team_1.validateCompanionTrialTeam)({ companionIds: run.teamCompanionIds, owned: input.owned, busyCompanionIds: input.busyCompanionIds });
    if (!teamCheck.ok)
        throw new Error(teamCheck.reason);
    const floorDef = companionTrialFloorDefinition(run.currentFloor, progress.season.seasonKey), synergies = teamCheck.synergies, synergyMultiplier = (0, team_1.totalCompanionSynergyMultiplier)(synergies), hasteBonus = (0, team_1.totalCompanionHasteBonus)(synergies);
    const basePlayers = run.teamCompanionIds.map(id => (0, combat_adapter_1.buildOwnedCompanionCombatant)(input.owned[id], { mode: 'companion_trial', teamSynergyMultiplier: synergyMultiplier, teamHasteBonus: hasteBonus }));
    const modified = applyCompanionTrialModifiers(basePlayers, rawCompanionTrialEncounter(run.currentFloor), floorDef.modifiers);
    const result = executor.simulate({ seed: `${run.seed}:${progress.season.seasonKey}:${run.currentFloor}`, players: modified.players, enemies: modified.enemies, mitigationConstant: content_1.COMPANION_TRIAL_MITIGATION_CONSTANT });
    if (!result.victory) {
        return { progress: { ...progress, season: { ...progress.season, activeRun: undefined, currentFloor: progress.season.checkpointFloor } }, result, reward: { companionEssence: 0, gold: 0, bondstones: 0, materials: {} }, firstClear: false, monthlyCompleted: false, weeklyCompleted: false };
    }
    const floor = run.currentFloor, boss = floorDef.boss, firstClear = !progress.season.firstClearFloors.includes(floor), base = (0, content_1.companionTrialReward)(floor, firstClear, boss), seasonDef = (0, content_1.companionTrialSeasonDefinition)(progress.season.seasonKey);
    const featured = !!seasonDef.featuredOrigin && teamCheck.members.some(x => x.originId === seasonDef.featuredOrigin), essenceMult = (0, team_1.companionEssenceRewardMultiplier)(synergies) * (featured ? 1.05 : 1);
    const reward = { ...base, companionEssence: Math.round(base.companionEssence * essenceMult), materials: Object.fromEntries(Object.entries(base.materials).filter(([, v]) => typeof v === 'number')) };
    const firstClearFloors = firstClear ? [...progress.season.firstClearFloors, floor] : progress.season.firstClearFloors;
    const bossRewardFloors = firstClear && boss ? [...progress.season.bossRewardFloors, floor] : progress.season.bossRewardFloors;
    const previousHighest = progress.season.currentSeasonHighestFloor, currentSeasonHighestFloor = Math.max(previousHighest, floor), monthlyCompleted = firstClear && floor === content_1.COMPANION_TRIAL_FLOOR_COUNT;
    if (monthlyCompleted) {
        reward.companionEssence += content_1.COMPANION_MONTHLY_COMPLETION_REWARD.companionEssence;
        reward.gold += content_1.COMPANION_MONTHLY_COMPLETION_REWARD.gold;
        reward.bondstones += content_1.COMPANION_MONTHLY_COMPLETION_REWARD.bondstones;
        for (const [id, q] of Object.entries(content_1.COMPANION_MONTHLY_COMPLETION_REWARD.materials))
            reward.materials[id] = (reward.materials[id] ?? 0) + q;
    }
    const teamPower = (0, team_1.companionTeamPower)(run.teamCompanionIds, input.owned), lifetime = { ...progress.lifetime, lifetimeHighestFloor: Math.max(progress.lifetime.lifetimeHighestFloor, floor), totalTrialFloorsCleared: progress.lifetime.totalTrialFloorsCleared + 1, totalTrialBossesDefeated: progress.lifetime.totalTrialBossesDefeated + (boss ? 1 : 0), monthlyFloor30Clears: progress.lifetime.monthlyFloor30Clears + (monthlyCompleted ? 1 : 0), bestEverCompanionTeamPower: Math.max(progress.lifetime.bestEverCompanionTeamPower, teamPower) };
    const weeklyCompleted = false; // Weekly recurring goals now live in server-authoritative Companion Proving Grounds.
    const special = { ...progress.season.monthlyChallengeCompletion };
    for (const challengeId of seasonDef.specialChallenges) {
        const c = content_1.COMPANION_WEEKLY_CHALLENGES.find(x => x.id === challengeId);
        if (c && floor >= c.minimumFloor && c.restrictions.every(r => r.type === 'no_defeats' ? (result.players ?? []).every(x => x.alive) : (0, team_1.restrictionSatisfied)(teamCheck.members, r, teamPower)))
            special[c.id] = true;
    }
    const nextFloor = Math.min(content_1.COMPANION_TRIAL_FLOOR_COUNT, floor + 1), checkpointFloor = boss ? (floor === content_1.COMPANION_TRIAL_FLOOR_COUNT ? Math.max(1, floor - content_1.COMPANION_TRIAL_BOSS_INTERVAL + 1) : floor + 1) : progress.season.checkpointFloor;
    const endRun = boss || floor === content_1.COMPANION_TRIAL_FLOOR_COUNT;
    const nextRun = endRun ? undefined : { ...run, currentFloor: nextFloor };
    const nextProgress = { ...progress, lifetime, season: { ...progress.season, currentFloor: endRun ? checkpointFloor : nextFloor, checkpointFloor, currentSeasonHighestFloor, firstClearFloors, bossRewardFloors, leaderboardScore: Math.max(progress.season.leaderboardScore, Math.round(floor * 1000 - result.durationMs / 100)), activeRun: nextRun, monthlyChallengeCompletion: special } };
    return { progress: nextProgress, result, reward, firstClear, monthlyCompleted, weeklyCompleted, runEnded: endRun, nextFloor: nextProgress.season.currentFloor, checkpointFloor };
}
/** @deprecated Weekly Companion rewards moved to Companion Proving Grounds. */
function claimWeeklyCompanionChallenge() { throw new Error('weekly_companion_challenge_moved_to_proving_grounds'); }
