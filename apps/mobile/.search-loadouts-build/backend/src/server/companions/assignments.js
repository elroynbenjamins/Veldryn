"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionExpeditionPenCapacity = void 0;
exports.busyCompanionIds = busyCompanionIds;
exports.rolloverCompanionAssignmentStatuses = rolloverCompanionAssignmentStatuses;
exports.companionMissionRequirementSatisfied = companionMissionRequirementSatisfied;
exports.predictedCompanionMissionGrade = predictedCompanionMissionGrade;
exports.validateCompanionMissionTeam = validateCompanionMissionTeam;
exports.startCompanionAssignment = startCompanionAssignment;
exports.claimCompanionAssignment = claimCompanionAssignment;
const content_1 = require("./content");
const team_1 = require("./team");
const companionExpeditionPenCapacity = (level) => level <= 0 ? 0 : Math.min(3, Math.max(1, Math.floor(level)));
exports.companionExpeditionPenCapacity = companionExpeditionPenCapacity;
function busyCompanionIds(assignments) { return new Set(assignments.filter(x => x.status === 'active').flatMap(x => x.companionIds)); }
function rolloverCompanionAssignmentStatuses(assignments, serverNowMs) { return assignments.map(a => a.status === 'active' && serverNowMs >= Date.parse(a.endsAt) ? { ...a, status: 'completed' } : a); }
function hash(text) { let h = 2166136261 >>> 0; for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
} return h >>> 0; }
function spend(e, cost) { if (e.gold < cost.gold)
    throw new Error('missing_gold'); for (const [id, q] of Object.entries(cost.materials ?? {}))
    if ((e.materials[id] ?? 0) < q)
        throw new Error(`missing_material:${id}`); const materials = { ...e.materials }; for (const [id, q] of Object.entries(cost.materials ?? {}))
    materials[id] -= q; return { ...e, gold: e.gold - cost.gold, materials }; }
const RARITY_ORDER = { standard: 0, rare: 1, elite: 2, prestige: 3 };
function roleCounts(ids) { const out = { tank: 0, damage: 0, support: 0 }; for (const id of ids) {
    const d = (0, content_1.companionServerDefinition)(id);
    if (d)
        out[d.role]++;
} return out; }
function countMatching(ids, fn, owned) { let count = 0; for (const id of ids) {
    const p = owned[id];
    if (p && fn(id, p))
        count++;
} return count; }
function companionMissionRequirementSatisfied(requirement, ids, owned) {
    const roles = roleCounts(ids), countOrAll = (count) => count ?? ids.length;
    switch (requirement.type) {
        case 'role_count': return roles[requirement.role] >= requirement.count;
        case 'min_level': return countMatching(ids, (_id, p) => p.level >= requirement.value, owned) >= countOrAll(requirement.count);
        case 'min_bond': return countMatching(ids, (_id, p) => p.bondLevel >= requirement.value, owned) >= countOrAll(requirement.count);
        case 'min_rarity': return countMatching(ids, (id) => { const d = (0, content_1.companionServerDefinition)(id); return !!d && RARITY_ORDER[d.rarity] >= RARITY_ORDER[requirement.rarity]; }, owned) >= countOrAll(requirement.count);
        case 'max_rarity': return ids.every(id => { const d = (0, content_1.companionServerDefinition)(id); return !!d && RARITY_ORDER[d.rarity] <= RARITY_ORDER[requirement.rarity]; });
        case 'origin_count': return countMatching(ids, id => (0, content_1.companionServerDefinition)(id)?.originId === requirement.originId, owned) >= requirement.count;
        case 'min_team_power': return (0, team_1.companionTeamPower)(ids, owned) >= requirement.value;
        case 'min_ascension': return countMatching(ids, (_id, p) => p.ascensionTier >= requirement.tier, owned) >= countOrAll(requirement.count);
        case 'tag_count': return countMatching(ids, id => (0, content_1.companionServerDefinition)(id)?.tags.includes(requirement.tag) === true, owned) >= requirement.count;
        case 'companion_id': return ids.includes(requirement.companionId);
    }
}
function missionBonusSatisfied(missionId, ids, owned) { const mission = (0, content_1.companionMission)(missionId); if (!mission)
    return false; if (mission.bonusRequirements?.length)
    return mission.bonusRequirements.every(r => companionMissionRequirementSatisfied(r, ids, owned)); return !!mission.bonusOriginId && ids.some(id => (0, content_1.companionServerDefinition)(id)?.originId === mission.bonusOriginId); }
function predictedCompanionMissionGrade(missionId, ids, owned) { const mission = (0, content_1.companionMission)(missionId); if (!mission)
    throw new Error('unknown_companion_mission'); const power = (0, team_1.companionTeamPower)(ids, owned), ratio = power / Math.max(1, mission.recommendedPower), bonus = missionBonusSatisfied(missionId, ids, owned); return ratio >= content_1.COMPANION_EXPEDITION_GRADE_THRESHOLDS.S && bonus ? 'S' : ratio >= content_1.COMPANION_EXPEDITION_GRADE_THRESHOLDS.A ? 'A' : ratio >= content_1.COMPANION_EXPEDITION_GRADE_THRESHOLDS.B ? 'B' : 'C'; }
function validateCompanionMissionTeam(input) {
    const mission = (0, content_1.companionMission)(input.missionId);
    if (!mission)
        return { ok: false, reason: 'unknown_companion_mission' };
    const ids = input.companionIds;
    if (ids.length < mission.minCompanions || ids.length > mission.maxCompanions)
        return { ok: false, reason: 'invalid_mission_team_size' };
    if (new Set(ids).size !== ids.length)
        return { ok: false, reason: 'duplicate_companion' };
    if ((input.expeditionPensLevel ?? 3) < (mission.minimumPenLevel ?? 1))
        return { ok: false, reason: 'companion_expedition_pen_tier' };
    const busy = busyCompanionIds(input.assignments);
    for (const id of ids) {
        const p = input.owned[id], d = (0, content_1.companionServerDefinition)(id);
        if (!p || !d)
            return { ok: false, reason: 'companion_not_owned' };
        if (input.unavailableCompanionIds?.has(id))
            return { ok: false, reason: 'companion_unavailable' };
        if (busy.has(id))
            return { ok: false, reason: 'companion_busy' };
        if (input.equippedCompanionIds.has(id))
            return { ok: false, reason: 'equipped_companion_cannot_be_assigned' };
        if (input.lockedTrialCompanionIds?.has(id))
            return { ok: false, reason: 'trial_companion_cannot_be_assigned' };
        if ((mission.minimumLevel ?? 1) > p.level)
            return { ok: false, reason: 'companion_below_mission_level' };
        if ((mission.minimumBondLevel ?? 1) > p.bondLevel)
            return { ok: false, reason: 'companion_below_mission_bond' };
        if (mission.requiredRarities && !mission.requiredRarities.includes(d.rarity))
            return { ok: false, reason: 'companion_rarity_not_allowed' };
        if (mission.requiredOriginId && d.originId !== mission.requiredOriginId)
            return { ok: false, reason: 'companion_origin_not_allowed' };
    }
    for (const [role, count] of Object.entries(mission.requiredRoles ?? {}))
        if (count && (roleCounts(ids)[role] ?? 0) < count)
            return { ok: false, reason: `mission_requires_${role}` };
    for (const requirement of mission.requirements ?? [])
        if (!companionMissionRequirementSatisfied(requirement, ids, input.owned))
            return { ok: false, reason: `mission_requirement_${requirement.type}` };
    const power = (0, team_1.companionTeamPower)(ids, input.owned);
    return { ok: true, mission, power, grade: predictedCompanionMissionGrade(input.missionId, ids, input.owned), bonusRequirementMet: missionBonusSatisfied(input.missionId, ids, input.owned) };
}
function startCompanionAssignment(input) {
    if (!input.requestId)
        throw new Error('request_id_required');
    const refreshed = rolloverCompanionAssignmentStatuses(input.assignments, input.serverNowMs), capacity = (0, exports.companionExpeditionPenCapacity)(input.expeditionPensLevel), active = refreshed.filter(x => x.status === 'active').length;
    if (active >= capacity)
        throw new Error('companion_expedition_pen_capacity');
    const valid = validateCompanionMissionTeam({ ...input, assignments: refreshed });
    if (!valid.ok)
        throw new Error(valid.reason);
    const economy = spend(input.economy, valid.mission.costs), seed = `${input.accountId}|${input.requestId}|${valid.mission.id}|${valid.mission.missionVersion}`, assignmentId = `CA_${hash(seed).toString(36)}_${input.serverNowMs.toString(36)}`, reduction = content_1.COMPANION_EXPEDITION_PEN_DURATION_REDUCTION[Math.max(0, Math.min(3, Math.floor(input.expeditionPensLevel)))] ?? 0, durationMs = Math.max(60000, Math.round(valid.mission.durationMs * (1 - reduction)));
    const assignment = { assignmentId, missionId: valid.mission.id, companionIds: [...input.companionIds], startedAt: new Date(input.serverNowMs).toISOString(), endsAt: new Date(input.serverNowMs + durationMs).toISOString(), missionVersion: valid.mission.missionVersion, seed, status: 'active' };
    return { economy, assignment, expectedGrade: valid.grade, bonusRequirementMet: valid.bonusRequirementMet, durationMs };
}
function claimCompanionAssignment(input) {
    if (input.assignment.status === 'claimed')
        throw new Error('companion_assignment_already_claimed');
    if (input.assignment.status === 'cancelled')
        throw new Error('companion_assignment_cancelled');
    if (input.serverNowMs < Date.parse(input.assignment.endsAt))
        throw new Error('companion_assignment_not_complete');
    const mission = (0, content_1.companionMission)(input.assignment.missionId);
    if (!mission || mission.missionVersion !== input.assignment.missionVersion)
        throw new Error('companion_mission_version_unavailable');
    const completed = input.assignment.status === 'active' ? { ...input.assignment, status: 'completed' } : input.assignment, grade = predictedCompanionMissionGrade(mission.id, completed.companionIds, input.owned), mult = grade === 'S' ? 1.5 : grade === 'A' ? 1.25 : grade === 'B' ? 1.1 : 1, bonusRequirementMet = missionBonusSatisfied(mission.id, completed.companionIds, input.owned), bonusMult = bonusRequirementMet ? 1.1 : 1;
    const bondstoneRoll = hash(`${completed.seed}|bondstone`) % 1000, bondstones = mission.bondstoneEligible && input.bondstonesClaimedThisWeek < 1 && grade !== 'C' && bondstoneRoll < (grade === 'S' ? 60 : 25) ? 1 : 0;
    const perXp = Math.round(mission.baseRewards.companionXp * mult), perBond = Math.max(1, Math.round(mission.baseRewards.bondXp * content_1.COMPANION_EXPEDITION_BOND_RATE * mult));
    const chance = Math.min(content_1.COMPANION_EXPEDITION_BONUS_CHANCE_CAP, Math.max(0, mission.bonusRewardChanceByGrade?.[grade] ?? 0)), bonusRoll = (hash(`${completed.seed}|bonus`) % 10000) / 10000, bonusRewardGranted = bonusRequirementMet && !!mission.bonusRewards && bonusRoll < chance;
    const materials = {};
    for (const [id, q] of Object.entries(mission.baseRewards.materials ?? {}))
        materials[id] = Math.max(1, Math.round(q * mult));
    if (bonusRewardGranted)
        for (const [id, q] of Object.entries(mission.bonusRewards?.materials ?? {}))
            materials[id] = (materials[id] ?? 0) + q;
    const reward = { companionEssence: Math.round(mission.baseRewards.companionEssence * mult * bonusMult) + (bonusRewardGranted ? mission.bonusRewards?.companionEssence ?? 0 : 0), gold: Math.round(mission.baseRewards.gold * mult) + (bonusRewardGranted ? mission.bonusRewards?.gold ?? 0 : 0), companionXp: perXp, bondXp: perBond, bondstones, materials, companionXpById: Object.fromEntries(completed.companionIds.map(id => [id, perXp])), bondXpById: Object.fromEntries(completed.companionIds.map(id => [id, perBond])), bonusRewardGranted };
    return { assignment: { ...completed, status: 'claimed', claimedAt: new Date(input.serverNowMs).toISOString(), performanceGrade: grade, rewardSnapshot: reward }, reward };
}
