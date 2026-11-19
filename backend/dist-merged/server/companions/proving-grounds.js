"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_PROVING_GROUND_WEEKLY_COUNT = void 0;
exports.activeCompanionProvingGroundChallenges = activeCompanionProvingGroundChallenges;
exports.newCompanionProvingGroundState = newCompanionProvingGroundState;
exports.rolloverCompanionProvingGroundState = rolloverCompanionProvingGroundState;
exports.provingGroundEventMatches = provingGroundEventMatches;
exports.recordCompanionProvingGroundEvent = recordCompanionProvingGroundEvent;
exports.claimCompanionProvingGroundChallenge = claimCompanionProvingGroundChallenge;
const content_1 = require("./content");
const trial_season_1 = require("./trial-season");
const RARITY_ORDER = { standard: 0, rare: 1, elite: 2, prestige: 3 };
exports.COMPANION_PROVING_GROUND_WEEKLY_COUNT = 3;
function activeCompanionProvingGroundChallenges(serverNowMs) { const weekKey = (0, trial_season_1.companionTrialWeekKey)(serverNowMs), hash = [...weekKey].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17), start = hash % content_1.COMPANION_PROVING_GROUNDS.length, definitions = []; for (let i = 0; i < Math.min(exports.COMPANION_PROVING_GROUND_WEEKLY_COUNT, content_1.COMPANION_PROVING_GROUNDS.length); i++)
    definitions.push(content_1.COMPANION_PROVING_GROUNDS[(start + i) % content_1.COMPANION_PROVING_GROUNDS.length]); return { weekKey, definitions }; }
function newCompanionProvingGroundState(serverNowMs) { return { weekKey: (0, trial_season_1.companionTrialWeekKey)(serverNowMs), progress: {}, completedIds: [], claimedIds: [] }; }
function rolloverCompanionProvingGroundState(state, serverNowMs) { const weekKey = (0, trial_season_1.companionTrialWeekKey)(serverNowMs); return !state || state.weekKey !== weekKey ? { state: newCompanionProvingGroundState(serverNowMs), rolled: true } : { state, rolled: false }; }
function eventMembers(event, owned) { return event.companionIds.map(id => ({ def: (0, content_1.companionServerDefinition)(id), progress: owned[id] })).filter((x) => !!x.def && !!x.progress); }
function rarityMixSatisfied(rarities, members) { return rarities.every((r, i) => i === rarities.length - 1 && r === 'elite' ? members.some(x => x.def.rarity === 'elite' || x.def.rarity === 'prestige') : members.some(x => x.def.rarity === r)); }
function provingGroundEventMatches(definition, event, owned) {
    if (!definition.eventTypes.includes(event.type))
        return false;
    const members = eventMembers(event, owned);
    if (!members.length)
        return false;
    const c = definition.condition;
    if (c.maxRarity && !members.some(x => RARITY_ORDER[x.def.rarity] <= RARITY_ORDER[c.maxRarity]))
        return false;
    if (c.minBondLevel !== undefined && !members.some(x => x.progress.bondLevel >= c.minBondLevel))
        return false;
    if (c.requiredCharacterRole && event.characterRole !== c.requiredCharacterRole)
        return false;
    if (c.requiredCompanionRole && !members.some(x => x.def.role === c.requiredCompanionRole))
        return false;
    if (c.requiredRarity && !members.some(x => x.def.rarity === c.requiredRarity))
        return false;
    if (c.requiredOriginId && (members.filter(x => x.def.originId === c.requiredOriginId).length < (c.requiredOriginCount ?? 1)))
        return false;
    if (!c.requiredOriginId && c.requiredOriginCount) {
        const counts = new Map();
        for (const x of members)
            counts.set(x.def.originId, (counts.get(x.def.originId) ?? 0) + 1);
        if (Math.max(0, ...counts.values()) < c.requiredOriginCount)
            return false;
    }
    if (c.trialBoss === true && event.type !== 'trial_boss_clear')
        return false;
    if (c.belowRecommendedPower === true && !(typeof event.teamPower === 'number' && typeof event.recommendedPower === 'number' && event.teamPower < event.recommendedPower))
        return false;
    if (c.rarityMix && !rarityMixSatisfied(c.rarityMix, members))
        return false;
    return true;
}
function recordCompanionProvingGroundEvent(input) {
    const rolled = rolloverCompanionProvingGroundState(input.state, input.serverNowMs), active = activeCompanionProvingGroundChallenges(input.serverNowMs), progress = { ...rolled.state.progress }, completed = new Set(rolled.state.completedIds);
    for (const def of active.definitions) {
        if (completed.has(def.id) || !provingGroundEventMatches(def, input.event, input.owned))
            continue;
        const next = Math.min(def.targetCount, (progress[def.id] ?? 0) + 1);
        progress[def.id] = next;
        if (next >= def.targetCount)
            completed.add(def.id);
    }
    return { state: { ...rolled.state, progress, completedIds: [...completed] }, rolled: rolled.rolled, active: active.definitions };
}
function claimCompanionProvingGroundChallenge(input) {
    const rolled = rolloverCompanionProvingGroundState(input.state, input.serverNowMs), active = activeCompanionProvingGroundChallenges(input.serverNowMs), definition = active.definitions.find(x => x.id === input.challengeId);
    if (!definition)
        throw new Error('proving_ground_challenge_not_active');
    if (!rolled.state.completedIds.includes(definition.id))
        throw new Error('proving_ground_challenge_not_complete');
    if (rolled.state.claimedIds.includes(definition.id))
        throw new Error('proving_ground_challenge_already_claimed');
    return { state: { ...rolled.state, claimedIds: [...rolled.state.claimedIds, definition.id] }, reward: definition.rewards, definition };
}
