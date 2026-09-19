"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanionPhase2Application = void 0;
const assignments_1 = require("./assignments");
const codex_1 = require("./codex");
const content_1 = require("./content");
const team_1 = require("./team");
const progression_v2_1 = require("./progression-v2");
const proving_grounds_1 = require("./proving-grounds");
const trials_1 = require("./trials");
const special_challenges_1 = require("./special-challenges");
const idempotency_1 = require("./idempotency");
const trial_season_1 = require("./trial-season");
class CompanionPhase2Application {
    repository;
    combat;
    clock;
    unlockFactsProvider;
    constructor(repository, combat, clock = { nowMs: () => Date.now() }, unlockFactsProvider) {
        this.repository = repository;
        this.combat = combat;
        this.clock = clock;
        this.unlockFactsProvider = unlockFactsProvider;
    }
    busy(state) { return new Set((0, assignments_1.rolloverCompanionAssignmentStatuses)(state.assignments, this.clock.nowMs()).filter(x => x.status === 'active').flatMap(x => x.companionIds)); }
    specialBusy(state) { return new Set([...this.busy(state), ...(state.trialProgress?.season.activeRun?.teamCompanionIds ?? [])]); }
    async startTrial(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_trial_start', command.requestId, command, async (state) => { const now = this.clock.nowMs(), result = (0, trials_1.startCompanionTrial)({ progress: state.trialProgress, owned: state.owned, busyCompanionIds: this.busy(state), trialsUnlocked: state.trialsUnlocked, serverNowMs: now }, command.teamIds, command.seed, command.restrictions, command.startFloor); return { state: { ...state, trialProgress: result.progress }, result: { run: result.run, teamPower: result.teamPower, synergies: result.synergies, resetInfo: result.resetInfo } }; }); }
    async abandonTrial(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_trial_abandon', command.requestId, command, state => { const now = this.clock.nowMs(), rolled = (0, trial_season_1.rolloverCompanionTrialSeason)(state.trialProgress, now); if (rolled.expiredRunId === command.runId)
        return { state: { ...state, trialProgress: rolled.progress }, result: { abandoned: true, expiredBySeason: true } }; const active = rolled.progress.season.activeRun; if (!active || active.runId !== command.runId)
        throw new Error('companion_trial_run_not_active'); const trialProgress = (0, trials_1.abandonCompanionTrial)(rolled.progress, now); return { state: { ...state, trialProgress }, result: { abandoned: true, expiredBySeason: false } }; }); }
    async resolveTrialFloor(accountId, command) {
        return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_trial_resolve_floor', command.requestId, command, async (state) => {
            const now = this.clock.nowMs(), runBefore = state.trialProgress?.season.activeRun, floorBefore = runBefore?.currentFloor ?? 0, teamBefore = runBefore?.teamCompanionIds ?? [], resolved = (0, trials_1.resolveCompanionTrialFloor)({ progress: state.trialProgress, owned: state.owned, busyCompanionIds: this.busy(state), trialsUnlocked: state.trialsUnlocked, serverNowMs: now }, command.runId, this.combat);
            let economy = { ...state.economy, gold: state.economy.gold + resolved.reward.gold, companionEssence: state.economy.companionEssence + resolved.reward.companionEssence, bondstones: state.economy.bondstones + resolved.reward.bondstones, materials: { ...state.economy.materials } };
            for (const [id, q] of Object.entries(resolved.reward.materials))
                economy.materials[id] = (economy.materials[id] ?? 0) + q;
            let owned = { ...state.owned }, overflow = state.overflow;
            if (resolved.result.victory) {
                const floor = resolved.progress.season.currentSeasonHighestFloor, levelXp = 12 + floor * 2, bondXp = resolved.result.players?.length ? 8 + (floor % 5 === 0 ? 18 : 0) : 8;
                for (const id of teamBefore) {
                    const p = owned[id];
                    if (!p)
                        continue;
                    const xp = (0, progression_v2_1.awardCompanionXpServer)({ progress: p, amount: levelXp, companionEssence: economy.companionEssence, overflow, serverNowMs: now });
                    economy = { ...economy, companionEssence: xp.companionEssence };
                    overflow = xp.overflow;
                    owned[id] = (0, progression_v2_1.awardCompanionBondXpServer)(xp.progress, bondXp);
                }
            }
            let provingGround = state.provingGround;
            if (resolved.result.victory && floorBefore > 0 && teamBefore.length === 3) {
                const event = { eventId: `trial:${command.runId}:${floorBefore}`, type: floorBefore % 5 === 0 ? 'trial_boss_clear' : 'trial_floor_clear', companionIds: [...teamBefore], trialFloor: floorBefore, teamPower: (0, team_1.companionTeamPower)(teamBefore, owned), recommendedPower: (0, content_1.companionTrialRecommendedPower)(floorBefore), noDefeats: (resolved.result.players ?? []).every(x => x.alive) };
                provingGround = (0, proving_grounds_1.recordCompanionProvingGroundEvent)({ state: provingGround, serverNowMs: now, event, owned }).state;
            }
            return { state: { ...state, trialProgress: resolved.progress, economy, owned, overflow, provingGround }, result: { ...resolved, reward: resolved.reward, resetInfo: (0, trial_season_1.companionTrialResetInfo)(now) } };
        });
    }
    async claimWeeklyChallenge(_accountId, _command) { throw new Error('weekly_companion_challenge_moved_to_proving_grounds'); }
    /** Internal/trusted settlement hook. Do not expose this as a client-authoritative activity endpoint. */
    async recordTrustedProvingGroundEvent(accountId, event) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_proving_ground_event', event.eventId, event, state => { const now = this.clock.nowMs(), recorded = (0, proving_grounds_1.recordCompanionProvingGroundEvent)({ state: state.provingGround, serverNowMs: now, event, owned: state.owned }); return { state: { ...state, provingGround: recorded.state }, result: { weekKey: recorded.state.weekKey, completedIds: recorded.state.completedIds, activeChallengeIds: recorded.active.map(x => x.id) } }; }); }
    async claimProvingGroundChallenge(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_proving_ground_claim', command.requestId, command, state => { const now = this.clock.nowMs(), claimed = (0, proving_grounds_1.claimCompanionProvingGroundChallenge)({ state: state.provingGround, serverNowMs: now, challengeId: command.challengeId }), reward = claimed.reward, economy = { ...state.economy, gold: state.economy.gold + reward.gold, companionEssence: state.economy.companionEssence + reward.companionEssence, bondstones: state.economy.bondstones + reward.bondstones, materials: { ...state.economy.materials } }; for (const [id, q] of Object.entries(reward.materials ?? {}))
        economy.materials[id] = (economy.materials[id] ?? 0) + q; const profile = { ...state.profile, codexRewardIds: [...new Set([...(state.profile.codexRewardIds ?? []), ...(reward.rewardIds ?? [])])] }; return { state: { ...state, provingGround: claimed.state, economy, profile }, result: { reward, challengeId: claimed.definition.id } }; }); }
    async startAssignment(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_assignment_start', command.requestId, command, async (state) => { const now = this.clock.nowMs(), assignments = (0, assignments_1.rolloverCompanionAssignmentStatuses)(state.assignments, now), started = (0, assignments_1.startCompanionAssignment)({ accountId, missionId: command.missionId, companionIds: command.companionIds, owned: state.owned, assignments, equippedCompanionIds: new Set(state.equippedCompanionIds), lockedTrialCompanionIds: new Set(state.trialProgress?.season.activeRun?.teamCompanionIds ?? []), expeditionPensLevel: state.sanctuary.expeditionPensLevel, economy: state.economy, serverNowMs: now, requestId: command.requestId }); return { state: { ...state, economy: started.economy, assignments: [...assignments, started.assignment] }, result: { assignment: started.assignment, expectedGrade: started.expectedGrade, bonusRequirementMet: started.bonusRequirementMet, durationMs: started.durationMs } }; }); }
    async claimAssignment(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_assignment_claim', command.requestId, command, async (state) => { const now = this.clock.nowMs(), assignments = (0, assignments_1.rolloverCompanionAssignmentStatuses)(state.assignments, now), index = assignments.findIndex(x => x.assignmentId === command.assignmentId); if (index < 0)
        throw new Error('companion_assignment_not_found'); const weekKey = (0, trial_season_1.companionTrialWeekKey)(now), used = state.assignmentBondstoneWeekKey === weekKey ? state.assignmentBondstonesClaimedThisWeek : 0, claimed = (0, assignments_1.claimCompanionAssignment)({ assignment: assignments[index], owned: state.owned, serverNowMs: now, bondstonesClaimedThisWeek: used }); let economy = { ...state.economy, gold: state.economy.gold + claimed.reward.gold, companionEssence: state.economy.companionEssence + claimed.reward.companionEssence, bondstones: state.economy.bondstones + claimed.reward.bondstones, materials: { ...state.economy.materials } }, owned = { ...state.owned }, overflow = state.overflow; for (const [id, q] of Object.entries(claimed.reward.materials))
        economy.materials[id] = (economy.materials[id] ?? 0) + q; for (const id of claimed.assignment.companionIds) {
        const p = owned[id];
        if (!p)
            continue;
        const xp = (0, progression_v2_1.awardCompanionXpServer)({ progress: p, amount: claimed.reward.companionXpById?.[id] ?? 0, companionEssence: economy.companionEssence, overflow, serverNowMs: now });
        economy = { ...economy, companionEssence: xp.companionEssence };
        overflow = xp.overflow;
        owned[id] = (0, progression_v2_1.awardCompanionBondXpServer)(xp.progress, claimed.reward.bondXpById?.[id] ?? 0);
    } assignments[index] = claimed.assignment; return { state: { ...state, economy, owned, overflow, assignments, assignmentBondstoneWeekKey: weekKey, assignmentBondstonesClaimedThisWeek: used + claimed.reward.bondstones }, result: { assignment: claimed.assignment, reward: claimed.reward } }; }); }
    async selectTechnique(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_technique_select', command.requestId, command, async (state) => { const p = state.owned[command.companionId]; if (!p)
        throw new Error('companion_not_owned'); const selected = (0, progression_v2_1.selectCompanionTechnique)(p, command.techniqueId, state.economy); return { state: { ...state, economy: selected.economy, owned: { ...state.owned, [command.companionId]: selected.progress } }, result: { companionId: command.companionId, selectedTechniqueId: selected.progress.selectedTechniqueId, cost: selected.cost } }; }); }
    async grantCompanionReward(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_reward_unlock', command.requestId, command, async (state) => { const defProgress = command.originalEventReleaseYear ? { companionId: command.companionId, level: 1, xp: 0, ascensionTier: 0, bondLevel: 1, bondXp: 0, bondTraitUnlocked: false, originalEventReleaseYear: command.originalEventReleaseYear, veteranCosmeticEligible: command.veteranCosmeticEligible === true } : undefined, granted = (0, progression_v2_1.grantCombatCompanionOrConvertDuplicate)({ companionId: command.companionId, owned: state.owned, companionEssence: state.economy.companionEssence, obtainedProgress: defProgress }), profile = { ...state.profile, discoveredCompanionIds: [...new Set([...(state.profile.discoveredCompanionIds ?? []), command.companionId])] }; return { state: { ...state, owned: granted.owned, economy: { ...state.economy, companionEssence: granted.companionEssence }, profile }, result: { duplicate: granted.duplicate, convertedEssence: granted.convertedEssence } }; }); }
    async resolveSpecialChallenge(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_special_challenge', command.requestId, command, async (state) => { if (!this.unlockFactsProvider)
        throw new Error('companion_unlock_facts_provider_not_configured'); const facts = this.unlockFactsProvider.factsFor(accountId, state); const r = (0, special_challenges_1.resolveSpecialCompanionChallenge)({ challengeId: command.challengeId, facts, teamIds: command.teamIds, owned: state.owned, busyCompanionIds: this.specialBusy(state), seed: command.seed }, this.combat); if (!r.unlockedCompanionId)
        return { state, result: r }; const granted = (0, progression_v2_1.grantCombatCompanionOrConvertDuplicate)({ companionId: r.unlockedCompanionId, owned: state.owned, companionEssence: state.economy.companionEssence }), profile = { ...state.profile, discoveredCompanionIds: [...new Set([...(state.profile.discoveredCompanionIds ?? []), r.unlockedCompanionId])] }; return { state: { ...state, owned: granted.owned, economy: { ...state.economy, companionEssence: granted.companionEssence }, specialBossClears: [...new Set([...state.specialBossClears, r.completionKey])], profile }, result: { ...r, duplicate: granted.duplicate, convertedEssence: granted.convertedEssence } }; }); }
    async claimCodexMilestone(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_codex_milestone_claim', command.requestId, command, state => { const claimed = (0, codex_1.claimCompanionCodexMilestone)({ milestoneId: command.milestoneId, owned: state.owned, profile: (0, codex_1.sanitizeCompanionShowcase)(state.profile, state.owned), economy: state.economy }); return { state: { ...state, profile: claimed.profile, economy: claimed.economy }, result: { reward: claimed.reward, summary: claimed.summary } }; }); }
    async updateShowcase(accountId, command) { return (0, idempotency_1.runCompanionCommand)(this.repository, accountId, 'companion_showcase_update', command.requestId, command, async (state) => { const clean = (0, codex_1.sanitizeCompanionShowcase)(state.profile, state.owned), profile = (0, progression_v2_1.setCompanionShowcase)(clean, new Set(Object.keys(state.owned)), command.favoriteCompanionId, command.showcaseCompanionIds); return { state: { ...state, profile }, result: profile }; }); }
}
exports.CompanionPhase2Application = CompanionPhase2Application;
