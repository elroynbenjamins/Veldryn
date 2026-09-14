"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionCombatExecutor = void 0;
exports.companionOwned = companionOwned;
exports.companionEconomy = companionEconomy;
exports.refreshCompanions = refreshCompanions;
exports.companionView = companionView;
exports.assertCompanionIdle = assertCompanionIdle;
exports.executeCompanionActivity = executeCompanionActivity;
exports.companionUnlockFacts = companionUnlockFacts;
exports.recordCompanionActivity = recordCompanionActivity;
const combat_companions_1 = require("./combat-companions");
const monsters_1 = require("../content/monsters");
const skills_1 = require("../content/skills");
const engine_1 = require("../../../../backend/src/server/combat/engine");
const trials_1 = require("../../../../backend/src/server/companions/trials");
const assignments_1 = require("../../../../backend/src/server/companions/assignments");
const progression_v2_1 = require("../../../../backend/src/server/companions/progression-v2");
const codex_1 = require("../../../../backend/src/server/companions/codex");
const projection_1 = require("../../../../backend/src/server/companions/projection");
const proving_grounds_1 = require("../../../../backend/src/server/companions/proving-grounds");
const trial_season_1 = require("../../../../backend/src/server/companions/trial-season");
const team_1 = require("../../../../backend/src/server/companions/team");
const content_1 = require("../../../../backend/src/server/companions/content");
const special_challenges_1 = require("../../../../backend/src/server/companions/special-challenges");
exports.companionCombatExecutor = { simulate: input => (0, engine_1.simulateCombat)(input) };
function companionOwned(state) {
    return Object.fromEntries((state.account.unlockedCombatCompanionIds ?? []).flatMap(id => {
        const p = state.account.combatCompanionProgress?.[id];
        return p ? [[id, { ...p, companionId: id }]] : [];
    }));
}
function companionEconomy(state) {
    const materials = { ...(state.account.companionMaterials ?? {}) };
    for (const stack of [...state.inventory.stacks, ...state.bank.stacks])
        materials[stack.itemId] = (materials[stack.itemId] ?? 0) + stack.quantity;
    return { gold: state.character?.gold ?? 0, companionEssence: state.account.companionEssence ?? 0, bondstones: state.account.bondstones ?? 0, materials };
}
/** Apply only material deltas; preserve inventory locations, capacities and unrelated stacks. */
function applyEconomy(state, economy) {
    const before = companionEconomy(state), materials = { ...(state.account.companionMaterials ?? {}) };
    let inventory = state.inventory.stacks.map(x => ({ ...x })), bank = state.bank.stacks.map(x => ({ ...x }));
    for (const id of new Set([...Object.keys(before.materials), ...Object.keys(economy.materials)])) {
        const delta = (economy.materials[id] ?? 0) - (before.materials[id] ?? 0);
        if (delta >= 0) {
            if (delta)
                materials[id] = (materials[id] ?? 0) + delta;
            continue;
        }
        let left = -delta;
        const stored = Math.min(left, materials[id] ?? 0);
        materials[id] = (materials[id] ?? 0) - stored;
        left -= stored;
        for (const stacks of [inventory, bank])
            for (const stack of stacks) {
                if (stack.itemId !== id)
                    continue;
                const used = Math.min(left, stack.quantity);
                stack.quantity -= used;
                left -= used;
            }
        if (left > 0)
            throw new Error('Missing companion materials.');
    }
    return { ...state, inventory: { ...state.inventory, stacks: inventory.filter(x => x.quantity > 0) }, bank: { ...state.bank, stacks: bank.filter(x => x.quantity > 0) }, character: state.character ? { ...state.character, gold: economy.gold } : null, account: { ...state.account, companionEssence: economy.companionEssence, bondstones: economy.bondstones, companionMaterials: materials } };
}
function reward(state, r) {
    const e = companionEconomy(state);
    e.gold += r.gold ?? 0;
    e.companionEssence += r.companionEssence ?? 0;
    e.bondstones += r.bondstones ?? 0;
    for (const [id, n] of Object.entries(r.materials ?? {}))
        e.materials[id] = (e.materials[id] ?? 0) + n;
    return applyEconomy(state, e);
}
function setOwned(state, owned) {
    return { ...state, account: { ...state.account, unlockedCombatCompanionIds: Object.keys(owned), combatCompanionProgress: Object.fromEntries(Object.entries(owned).map(([id, p]) => [id, { ...state.account.combatCompanionProgress?.[id], ...p }])) } };
}
function awardUse(state, ids, xp, bond, now) {
    const owned = companionOwned(state);
    let essence = state.account.companionEssence ?? 0, overflow = state.account.companionOverflow;
    for (const id of ids) {
        if (!owned[id])
            continue;
        const r = (0, progression_v2_1.awardCompanionXpServer)({ progress: owned[id], amount: xp, companionEssence: essence, overflow, serverNowMs: now });
        essence = r.companionEssence;
        overflow = r.overflow;
        owned[id] = (0, progression_v2_1.awardCompanionBondXpServer)(r.progress, bond);
    }
    return { ...setOwned(state, owned), account: { ...setOwned(state, owned).account, companionEssence: essence, companionOverflow: overflow } };
}
function refreshCompanions(state, now) {
    let next = (0, combat_companions_1.reconcileCombatCompanionUnlocks)(state, now);
    next = { ...next, account: { ...next.account, companionSchemaVersion: 1, companionAssignments: (0, assignments_1.rolloverCompanionAssignmentStatuses)(next.account.companionAssignments ?? [], now), companionTrialProgress: (0, projection_1.projectCompanionTrial)(next.account.companionTrialProgress, now).progress, companionProvingGround: (0, projection_1.projectCompanionProvingGrounds)(next.account.companionProvingGround, now).state } };
    return next;
}
function companionView(state, now) {
    const owned = companionOwned(state), profile = state.account.companionPhase2Profile ?? { showcaseCompanionIds: [], showcaseSlotsUnlocked: 1 };
    return { owned, trial: (0, projection_1.projectCompanionTrial)(state.account.companionTrialProgress, now), codex: (0, projection_1.projectCompanionCodex)(owned, profile), weekly: (0, proving_grounds_1.activeCompanionProvingGroundChallenges)(now), proving: (0, projection_1.projectCompanionProvingGrounds)(state.account.companionProvingGround, now), assignments: (0, assignments_1.rolloverCompanionAssignmentStatuses)(state.account.companionAssignments ?? [], now) };
}
function stringArg(a, key) { const v = a[key]; if (typeof v !== 'string' || !v || v.length > 120)
    throw new Error(`Invalid ${key}.`); return v; }
function idsArg(a) { const v = a.ids; if (!Array.isArray(v) || v.length > 3 || v.some(x => typeof x !== 'string' || x.length > 80) || new Set(v).size !== v.length)
    throw new Error('Choose unique companions.'); return v; }
function assertCompanionIdle(state, id) {
    if ((state.account.companionAssignments ?? []).some(a => a.status !== 'claimed' && a.status !== 'cancelled' && a.companionIds.includes(id)) || state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id))
        throw new Error('Companion is busy. Finish or abandon its activity first.');
}
/** Synchronous domain entry point called only inside the existing trusted game transaction online. */
function executeCompanionActivity(input, type, a, now) {
    let state = refreshCompanions(structuredClone(input), now);
    if (!state.character)
        throw new Error('Create a character first.');
    const owned = companionOwned(state), profile = state.account.companionPhase2Profile ?? { showcaseCompanionIds: [], showcaseSlotsUnlocked: 1 };
    const assignments = state.account.companionAssignments ?? [];
    const busy = new Set(assignments.filter(x => x.status !== 'claimed' && x.status !== 'cancelled').flatMap(x => x.companionIds));
    const sequence = (state.account.companionActionSequence ?? 0) + 1, seed = `${state.character.id}:${sequence}:${now}`;
    const trialInput = { progress: state.account.companionTrialProgress, owned, busyCompanionIds: busy, trialsUnlocked: ['tank', 'damage', 'support'].every(role => Object.keys(owned).some(id => (0, content_1.companionServerDefinition)(id)?.role === role)), serverNowMs: now };
    switch (type) {
        case 'companion_trial_start': {
            const r = (0, trials_1.startCompanionTrial)(trialInput, idsArg(a), seed, [], a.floor === undefined ? undefined : Number(a.floor));
            state.account.companionTrialProgress = r.progress;
            break;
        }
        case 'companion_trial_abandon': {
            if (state.account.companionTrialProgress?.season.activeRun?.runId !== stringArg(a, 'id'))
                throw new Error('Trial run is no longer active.');
            state.account.companionTrialProgress = (0, trials_1.abandonCompanionTrial)(state.account.companionTrialProgress, now);
            break;
        }
        case 'companion_trial_floor': {
            const run = state.account.companionTrialProgress?.season.activeRun;
            if (!run || a.floor !== run.currentFloor)
                throw new Error('Trial floor changed. Refresh before continuing.');
            const r = (0, trials_1.resolveCompanionTrialFloor)(trialInput, stringArg(a, 'id'), exports.companionCombatExecutor);
            state.account.companionTrialProgress = r.progress;
            state = reward(state, r.reward);
            if (r.result.victory) {
                state = awardUse(state, run.teamCompanionIds, 12 + run.currentFloor * 2, 8 + (run.currentFloor % 5 === 0 ? 18 : 0), now);
                state.account.companionProvingGround = (0, proving_grounds_1.recordCompanionProvingGroundEvent)({ state: state.account.companionProvingGround, serverNowMs: now, owned, event: { eventId: `${run.runId}:${run.currentFloor}`, type: run.currentFloor % 5 === 0 ? 'trial_boss_clear' : 'trial_floor_clear', companionIds: run.teamCompanionIds, trialFloor: run.currentFloor, teamPower: (0, team_1.companionTeamPower)(run.teamCompanionIds, owned), recommendedPower: (0, content_1.companionTrialRecommendedPower)(run.currentFloor), noDefeats: r.result.players?.every(p => p.alive) } }).state;
            }
            state.account.companionLastBattle = { title: `Trial Floor ${run.currentFloor}`, won: r.result.victory, durationMs: r.result.durationMs, gold: r.reward.gold, essence: r.reward.companionEssence, bondstones: r.reward.bondstones, atMs: now };
            break;
        }
        case 'companion_assignment_start': {
            const r = (0, assignments_1.startCompanionAssignment)({ accountId: state.character.id, missionId: stringArg(a, 'id'), companionIds: idsArg(a), owned, assignments: assignments.filter(x => x.status !== 'claimed' && x.status !== 'cancelled'), equippedCompanionIds: new Set(state.character.equippedCombatCompanionId ? [state.character.equippedCombatCompanionId] : []), lockedTrialCompanionIds: new Set(state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds ?? []), expeditionPensLevel: state.account.companionSanctuary?.expeditionPensLevel ?? 0, economy: companionEconomy(state), serverNowMs: now, requestId: seed });
            state = applyEconomy(state, r.economy);
            state.account.companionAssignments = [...assignments.filter(x => x.status === 'claimed' || x.status === 'cancelled').slice(-8), ...assignments.filter(x => x.status !== 'claimed' && x.status !== 'cancelled'), r.assignment];
            break;
        }
        case 'companion_assignment_claim': {
            const assignment = assignments.find(x => x.assignmentId === stringArg(a, 'id'));
            if (!assignment)
                throw new Error('Assignment not found.');
            const week = (0, trial_season_1.companionTrialWeekKey)(now), used = state.account.companionAssignmentBondstoneWeek === week ? state.account.companionAssignmentBondstones ?? 0 : 0;
            const r = (0, assignments_1.claimCompanionAssignment)({ assignment, owned, serverNowMs: now, bondstonesClaimedThisWeek: used });
            state = reward(state, r.reward);
            for (const id of assignment.companionIds)
                state = awardUse(state, [id], r.reward.companionXpById?.[id] ?? 0, r.reward.bondXpById?.[id] ?? 0, now);
            state.account.companionAssignments = assignments.map(x => x.assignmentId === assignment.assignmentId ? r.assignment : x);
            state.account.companionAssignmentBondstoneWeek = week;
            state.account.companionAssignmentBondstones = used + r.reward.bondstones;
            break;
        }
        case 'companion_technique': {
            const id = stringArg(a, 'id');
            assertCompanionIdle(state, id);
            if (!owned[id])
                throw new Error('Companion is locked.');
            const r = (0, progression_v2_1.selectCompanionTechnique)(owned[id], stringArg(a, 'technique'), companionEconomy(state));
            state = applyEconomy(setOwned(state, { ...owned, [id]: r.progress }), r.economy);
            break;
        }
        case 'companion_codex': {
            const r = (0, codex_1.claimCompanionCodexMilestone)({ milestoneId: stringArg(a, 'id'), owned, profile, economy: companionEconomy(state) });
            state = applyEconomy(state, r.economy);
            state.account.companionPhase2Profile = r.profile;
            break;
        }
        case 'companion_showcase': {
            state.account.companionPhase2Profile = (0, progression_v2_1.setCompanionShowcase)(profile, new Set(Object.keys(owned)), a.id === undefined ? undefined : stringArg(a, 'id'), idsArg(a));
            break;
        }
        case 'companion_weekly': {
            const r = (0, proving_grounds_1.claimCompanionProvingGroundChallenge)({ state: state.account.companionProvingGround, serverNowMs: now, challengeId: stringArg(a, 'id') });
            state = reward(state, r.reward);
            state.account.companionProvingGround = r.state;
            state.account.companionPhase2Profile = { ...profile, codexRewardIds: [...new Set([...(profile.codexRewardIds ?? []), ...(r.reward.rewardIds ?? [])])] };
            break;
        }
        case 'companion_special': {
            const id = stringArg(a, 'id');
            if (state.account.companionSpecialClears?.includes(id))
                throw new Error('Special challenge reward already claimed.');
            for (const locked of state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds ?? [])
                busy.add(locked);
            const r = (0, special_challenges_1.resolveSpecialCompanionChallenge)({ challengeId: id, facts: companionUnlockFacts(state), teamIds: idsArg(a), owned, busyCompanionIds: busy, seed }, exports.companionCombatExecutor);
            if (r.unlockedCompanionId) {
                const granted = (0, progression_v2_1.grantCombatCompanionOrConvertDuplicate)({ companionId: r.unlockedCompanionId, owned, companionEssence: state.account.companionEssence ?? 0 });
                state = setOwned(state, granted.owned);
                state.account.companionEssence = granted.companionEssence;
                state.account.companionSpecialClears = [...(state.account.companionSpecialClears ?? []), id];
            }
            state.account.companionLastBattle = { title: 'Special Companion Challenge', won: r.result.victory, durationMs: r.result.durationMs, gold: 0, essence: 0, bondstones: 0, atMs: now };
            break;
        }
        default: throw new Error('Unknown companion activity.');
    }
    state.account.companionActionSequence = sequence;
    return refreshCompanions(state, now);
}
function companionUnlockFacts(state) {
    const owned = companionOwned(state), ownedByRole = { tank: 0, damage: 0, support: 0 }, bondTotalByOrigin = {}, levelTotalByOrigin = {};
    for (const [id, p] of Object.entries(owned)) {
        const d = (0, content_1.companionServerDefinition)(id);
        if (!d)
            continue;
        ownedByRole[d.role]++;
        bondTotalByOrigin[d.originId] = (bondTotalByOrigin[d.originId] ?? 0) + p.bondLevel;
        levelTotalByOrigin[d.originId] = (levelTotalByOrigin[d.originId] ?? 0) + p.level;
    }
    return { highestTrialFloor: state.account.companionTrialProgress?.lifetime.lifetimeHighestFloor ?? 0, specialBossClears: new Set(state.account.companionSpecialClears ?? []), bossClearCounts: { ...Object.fromEntries(state.defeatedBossIds.map(id => [id, 1])), ...state.account.companionBossClears }, regionCompletion: new Set(state.quests.some(q => q.questId === 'QST_015' && q.status === 'claimed') ? ['REG_001'] : []), eventCompletion: new Set(), ownedCompanionIds: new Set(Object.keys(owned)), ownedByRole, bondTotal: Object.values(owned).reduce((s, p) => s + p.bondLevel, 0), levelTotal: Object.values(owned).reduce((s, p) => s + p.level, 0), bondTotalByOrigin, levelTotalByOrigin, achievements: new Set(), mastery: state.account.companionUnlockProgress ?? {}, reputation: {}, eventChallenges: new Set(), companionEssence: state.account.companionEssence ?? 0 };
}
/** Call only for settled, verified activity. Counts never arrive from a client command. */
function recordCompanionActivity(state, source, target, units, now) {
    if (units <= 0)
        return state;
    let next = structuredClone(state);
    const counters = { ...(next.account.companionUnlockProgress ?? {}) };
    if (source === 'combat') {
        if (monsters_1.MONSTERS.find(m => m.id === target)?.zone === 'OLD_MINES')
            counters.OLD_MINES_KILLS = (counters.OLD_MINES_KILLS ?? 0) + units;
    }
    if (source === 'gathering') {
        const node = skills_1.GATHERING.find(g => g.id === target);
        if (node?.zoneId === 'SILVERBROOK')
            counters[`node:${target}`] = 1;
        const nodes = skills_1.GATHERING.filter(g => g.zoneId === 'SILVERBROOK');
        if (nodes.length && nodes.every(g => counters[`node:${g.id}`]))
            counters.SILVERBROOK_NODES = 1;
    }
    if (source === 'crafting')
        counters.EQUIPMENT_CRAFTS = (counters.EQUIPMENT_CRAFTS ?? 0) + units;
    if (source === 'boss')
        next.account.companionBossClears = { ...next.account.companionBossClears, [target]: (next.account.companionBossClears?.[target] ?? 0) + units };
    next.account.companionUnlockProgress = counters;
    const id = next.character?.equippedCombatCompanionId;
    if (id && (source === 'combat' || source === 'boss')) {
        const bondBonus = 1 + (next.account.companionSanctuary?.bondHallLevel ?? 0) * .05;
        next = awardUse(next, [id], (source === 'boss' ? 120 : 9) * units, Math.round((source === 'boss' ? 60 : 4) * units * bondBonus), now);
        const event = { eventId: `${target}:${now}`, type: source === 'boss' ? 'boss_defeat' : 'battle_complete', companionIds: [id], characterRole: (0, combat_companions_1.classCompanionRole)(next.character.classId) };
        const view = (0, projection_1.projectCompanionProvingGrounds)(next.account.companionProvingGround, now), owned = companionOwned(next), progress = { ...view.state.progress }, completed = new Set(view.state.completedIds);
        for (const def of (0, proving_grounds_1.activeCompanionProvingGroundChallenges)(now).definitions)
            if ((0, proving_grounds_1.provingGroundEventMatches)(def, event, owned)) {
                progress[def.id] = Math.min(def.targetCount, (progress[def.id] ?? 0) + units);
                if (progress[def.id] >= def.targetCount)
                    completed.add(def.id);
            }
        next.account.companionProvingGround = { ...view.state, progress, completedIds: [...completed] };
    }
    return (0, combat_companions_1.reconcileCombatCompanionUnlocks)(next, now);
}
