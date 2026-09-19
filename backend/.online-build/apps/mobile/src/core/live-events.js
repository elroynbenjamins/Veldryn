"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventLifecycle = eventLifecycle;
exports.activeLiveEvent = activeLiveEvent;
exports.claimableLiveEvent = claimableLiveEvent;
exports.eventProgress = eventProgress;
exports.eventCurrencyBalance = eventCurrencyBalance;
exports.eventPrestigeBalance = eventPrestigeBalance;
exports.eventMilestones = eventMilestones;
exports.eventRewardClaimed = eventRewardClaimed;
exports.eventProjectChoice = eventProjectChoice;
exports.eventEffectiveDropRate = eventEffectiveDropRate;
exports.eventContributionValue = eventContributionValue;
exports.activityEventDrops = activityEventDrops;
exports.activityEventDiscoveries = activityEventDiscoveries;
exports.applyEventDrops = applyEventDrops;
exports.applyEventDiscoveries = applyEventDiscoveries;
exports.eventDiscoveryBoard = eventDiscoveryBoard;
exports.claimEventDiscovery = claimEventDiscovery;
exports.grantEventActivity = grantEventActivity;
exports.eventRewardOwned = eventRewardOwned;
exports.eventCollectionJournal = eventCollectionJournal;
exports.claimEventReward = claimEventReward;
exports.claimAllEventMilestones = claimAllEventMilestones;
exports.availableEventRepeatCaches = availableEventRepeatCaches;
exports.claimEventRepeatCache = claimEventRepeatCache;
exports.eventDailyGift = eventDailyGift;
exports.claimEventDailyGift = claimEventDailyGift;
exports.eventContractBoard = eventContractBoard;
exports.acceptEventContract = acceptEventContract;
exports.eventObjectiveProgress = eventObjectiveProgress;
exports.eventObjectiveClaimed = eventObjectiveClaimed;
exports.claimEventObjective = claimEventObjective;
exports.eventWeeklyBoard = eventWeeklyBoard;
exports.claimEventWeeklyObjective = claimEventWeeklyObjective;
exports.eventOfferPurchaseCount = eventOfferPurchaseCount;
exports.eventMarketOffers = eventMarketOffers;
exports.purchaseEventOffer = purchaseEventOffer;
exports.chooseEventProject = chooseEventProject;
exports.contributeEventCurrency = contributeEventCurrency;
exports.eventCommunityStage = eventCommunityStage;
exports.eventCommunityMilestones = eventCommunityMilestones;
exports.claimEventCommunityMilestone = claimEventCommunityMilestone;
exports.setLocalEventEnabled = setLocalEventEnabled;
const live_events_1 = require("../content/live-events");
const rng_1 = require("./rng");
function eventLifecycle(state, nowMs = Date.now()) { const runtime = state.account.liveEvent; if (!runtime?.enabled)
    return null; const definition = (0, live_events_1.liveEventDef)(runtime.eventId); if (!definition)
    return null; const claimEndsAtMs = runtime.endsAtMs + definition.claimGraceDays * 86400_000; if (nowMs < runtime.startsAtMs)
    return { runtime, definition, phase: 'upcoming', claimEndsAtMs }; if (nowMs < runtime.endsAtMs)
    return { runtime, definition, phase: 'active', claimEndsAtMs }; if (nowMs < claimEndsAtMs)
    return { runtime, definition, phase: 'claiming', claimEndsAtMs }; return null; }
function activeLiveEvent(state, nowMs = Date.now()) { const event = eventLifecycle(state, nowMs); return event?.phase === 'active' ? event : null; }
function claimableLiveEvent(state, nowMs = Date.now()) { const event = eventLifecycle(state, nowMs); return event?.phase === 'active' || event?.phase === 'claiming' ? event : null; }
function eventBoardTime(state, nowMs) { const event = eventLifecycle(state, nowMs); return event?.phase === 'claiming' ? event.runtime.endsAtMs - 1 : nowMs; }
function eventProgress(state, eventId) { return Math.max(0, Math.floor(state.account.eventProgressById?.[eventId] ?? 0)); }
function eventCurrencyBalance(state, eventId) { return Math.max(0, Math.floor(state.account.eventCurrencyBalanceById?.[eventId] ?? 0)); }
function eventPrestigeBalance(state, eventId) { return Math.max(0, Math.floor(state.account.eventPrestigeBalanceById?.[eventId] ?? 0)); }
function eventMilestones(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); return event && state.character ? event.definition.milestones(state.character.classId) : []; }
function eventRewardClaimed(state, eventId, rewardId) { return (state.account.eventRewardClaimIds ?? []).includes(`${eventId}:${rewardId}`); }
function eventProjectChoice(state, eventId) { const event = (0, live_events_1.liveEventDef)(eventId), choiceId = state.account.eventChoiceById?.[eventId]; return event?.choices.find(choice => choice.id === choiceId); }
function eventEffectiveDropRate(state, eventId, source) { const event = (0, live_events_1.liveEventDef)(eventId); if (!event)
    return 0; return event.dropRates[source] * (eventProjectChoice(state, eventId)?.dropMultipliers?.[source] ?? 1); }
function eventContributionValue(state, eventId, spent) { const multiplier = eventProjectChoice(state, eventId)?.contributionMultiplier ?? 1; return Math.max(0, Math.floor(spent * multiplier)); }
function eventDropQuantity(state, source, units, nowMs) { const event = activeLiveEvent(state, nowMs); if (!event || units <= 0)
    return 0; const expected = units * eventEffectiveDropRate(state, event.definition.id, source), whole = Math.floor(expected), fraction = expected - whole; return whole + ((0, rng_1.random01)(`${state.character?.id}:${event.definition.id}:${source}:${nowMs}`, 0) < fraction ? 1 : 0); }
function activityEventDrops(state, reward, nowMs) { const event = activeLiveEvent(state, nowMs); if (!event || !state.activity)
    return []; const source = state.activity.kind === 'combat' ? 'combat' : 'gathering', units = source === 'combat' ? reward.kills : Math.floor(reward.elapsedSeconds / 60), quantity = eventDropQuantity(state, source, units, nowMs); return units > 0 ? [{ eventId: event.definition.id, currencyId: event.definition.currencyId, name: event.definition.currencyName, quantity, source, units, recordedAtMs: nowMs }] : []; }
function activityEventDiscoveries(state, source, units, nowMs) { const event = activeLiveEvent(state, nowMs); if (!event || units <= 0)
    return []; return event.definition.discoveries.filter(discovery => discovery.source === source).map(discovery => { const expected = units * discovery.chance, whole = Math.floor(expected), fraction = expected - whole, quantity = whole + ((0, rng_1.random01)(`${state.character?.id}:${event.definition.id}:discovery:${discovery.id}:${nowMs}`, 0) < fraction ? 1 : 0); return { eventId: event.definition.id, discoveryId: discovery.id, name: discovery.name, quantity }; }).filter(entry => entry.quantity > 0); }
function applyEventDrops(state, drops) {
    if (!drops.length)
        return state;
    const progress = { ...(state.account.eventProgressById ?? {}) }, currency = { ...(state.account.eventCurrencyBalanceById ?? {}) }, activity = { ...(state.account.eventActivityById ?? {}) }, periods = { ...(state.account.eventPeriodActivityById ?? {}) };
    for (const drop of drops) {
        progress[drop.eventId] = (progress[drop.eventId] ?? 0) + drop.quantity;
        currency[drop.eventId] = (currency[drop.eventId] ?? 0) + drop.quantity;
        if (drop.source) {
            const units = drop.units ?? 1, prior = { ...(activity[drop.eventId] ?? {}) };
            prior[drop.source] = (prior[drop.source] ?? 0) + units;
            activity[drop.eventId] = prior;
            for (const key of [`${drop.eventId}:day:${utcDayKey(drop.recordedAtMs ?? Date.now())}`, `${drop.eventId}:week:${utcWeekKey(drop.recordedAtMs ?? Date.now())}`]) {
                const bucket = { ...(periods[key] ?? {}) };
                bucket[drop.source] = (bucket[drop.source] ?? 0) + units;
                periods[key] = bucket;
            }
        }
    }
    return { ...state, account: { ...state.account, eventProgressById: Object.fromEntries(Object.entries(progress).slice(-12)), eventCurrencyBalanceById: Object.fromEntries(Object.entries(currency).slice(-12)), eventActivityById: Object.fromEntries(Object.entries(activity).slice(-12)), eventPeriodActivityById: Object.fromEntries(Object.entries(periods).slice(-90)) } };
}
function applyEventDiscoveries(state, finds) { if (!finds.length)
    return state; const counts = { ...(state.account.eventDiscoveryCounts ?? {}) }; for (const find of finds) {
    const discovery = (0, live_events_1.liveEventDef)(find.eventId)?.discoveries.find(entry => entry.id === find.discoveryId), key = `${find.eventId}:${find.discoveryId}`;
    if (discovery)
        counts[key] = Math.min(discovery.required, (counts[key] ?? 0) + Math.max(0, Math.floor(find.quantity)));
} return { ...state, account: { ...state.account, eventDiscoveryCounts: Object.fromEntries(Object.entries(counts).slice(-120)) } }; }
function eventDiscoveryBoard(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    return []; return event.definition.discoveries.map(discovery => { const id = `${event.definition.id}:${discovery.id}`, count = Math.max(0, state.account.eventDiscoveryCounts?.[id] ?? 0); return { id, discovery, count, ready: count >= discovery.required, claimed: (state.account.eventDiscoveryClaimIds ?? []).includes(id) }; }); }
function claimEventDiscovery(state, discoveryId, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    throw new Error('Event rewards are no longer available.'); const entry = eventDiscoveryBoard(state, nowMs).find(item => item.discovery.id === discoveryId); if (!entry)
    throw new Error('Unknown folklore discovery.'); if (entry.claimed)
    throw new Error('This discovery reward was already claimed.'); if (!entry.ready)
    throw new Error('Complete this discovery collection first.'); const rewarded = addReward(state, entry.discovery.reward); return { ...rewarded, account: { ...rewarded.account, eventDiscoveryClaimIds: [...(rewarded.account.eventDiscoveryClaimIds ?? []), entry.id].slice(-120) } }; }
function grantEventActivity(state, source, nowMs = Date.now()) { const event = activeLiveEvent(state, nowMs); if (!event)
    return state; const quantity = eventDropQuantity(state, source, 1, nowMs), withDrops = applyEventDrops(state, [{ eventId: event.definition.id, currencyId: event.definition.currencyId, name: event.definition.currencyName, quantity, source, units: 1, recordedAtMs: nowMs }]); return applyEventDiscoveries(withDrops, activityEventDiscoveries(state, source, 1, nowMs)); }
function addReward(state, reward) {
    const account = { ...state.account };
    let character = state.character;
    if (reward.kind === 'skin')
        account.unlockedEventSkinIds = [...new Set([...(account.unlockedEventSkinIds ?? []), reward.id])];
    else if (reward.kind === 'pet') {
        account.unlockedCosmeticPetIds = [...new Set([...(account.unlockedCosmeticPetIds ?? []), reward.id])];
        if (character) {
            character = { ...character, ownedPetIds: [...new Set([...(character.ownedPetIds ?? []), reward.id])] };
        }
    }
    else if (reward.kind === 'background')
        account.unlockedProfileBackgroundIds = [...new Set([...(account.unlockedProfileBackgroundIds ?? []), reward.id])];
    else if (reward.kind === 'border')
        account.unlockedProfileBorderIds = [...new Set([...(account.unlockedProfileBorderIds ?? []), reward.id])];
    else if (reward.kind === 'emote')
        account.unlockedEmoteIds = [...new Set([...(account.unlockedEmoteIds ?? []), reward.id])];
    else
        account.unlockedTitleIds = [...new Set([...(account.unlockedTitleIds ?? []), reward.id])];
    return character === state.character ? { ...state, account } : { ...state, account, character };
}
function grantEventCurrencies(state, eventId, common, prestige) { return { ...state, account: { ...state.account, eventProgressById: { ...(state.account.eventProgressById ?? {}), [eventId]: eventProgress(state, eventId) + common }, eventCurrencyBalanceById: { ...(state.account.eventCurrencyBalanceById ?? {}), [eventId]: eventCurrencyBalance(state, eventId) + common }, eventPrestigeBalanceById: { ...(state.account.eventPrestigeBalanceById ?? {}), [eventId]: eventPrestigeBalance(state, eventId) + prestige } } }; }
function eventRewardOwned(state, reward) { const ids = reward.kind === 'skin' ? state.account.unlockedEventSkinIds : reward.kind === 'pet' ? state.account.unlockedCosmeticPetIds : reward.kind === 'background' ? state.account.unlockedProfileBackgroundIds : reward.kind === 'border' ? state.account.unlockedProfileBorderIds : reward.kind === 'emote' ? state.account.unlockedEmoteIds : state.account.unlockedTitleIds; return ids?.includes(reward.id) ?? false; }
function eventCollectionJournal(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event || !state.character)
    return []; const entries = [...event.definition.milestones(state.character.classId).map(entry => ({ source: `${entry.points.toLocaleString()} reputation`, reward: entry.reward })), ...event.definition.shop.map(entry => ({ source: entry.currency === 'common' ? 'Harvest Market' : 'Amber Pantry', reward: entry.reward })), ...event.definition.communityMilestones.filter(entry => entry.reward).map(entry => ({ source: `Storehouse ${entry.percent}%`, reward: entry.reward })), ...event.definition.discoveries.map(entry => ({ source: `${entry.name} discovery`, reward: entry.reward }))]; return entries.map(entry => ({ ...entry, owned: eventRewardOwned(state, entry.reward) })); }
function claimEventReward(state, rewardId, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event || !state.character)
    throw new Error('Event rewards are no longer available.'); const milestone = event.definition.milestones(state.character.classId).find(entry => entry.reward.id === rewardId); if (!milestone)
    throw new Error('Unknown event reward.'); if (eventProgress(state, event.definition.id) < milestone.points)
    throw new Error('This milestone is not complete.'); if (eventRewardClaimed(state, event.definition.id, rewardId))
    throw new Error('This reward was already claimed.'); const rewarded = addReward(state, milestone.reward), claimId = `${event.definition.id}:${rewardId}`; return { ...rewarded, account: { ...rewarded.account, eventRewardClaimIds: [...(rewarded.account.eventRewardClaimIds ?? []), claimId].slice(-160) } }; }
function claimAllEventMilestones(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event || !state.character)
    throw new Error('Event rewards are no longer available.'); const available = event.definition.milestones(state.character.classId).filter(entry => entry.points <= eventProgress(state, event.definition.id) && !eventRewardClaimed(state, event.definition.id, entry.reward.id)); if (!available.length)
    throw new Error('No milestone rewards are ready.'); return available.reduce((next, entry) => claimEventReward(next, entry.reward.id, nowMs), state); }
function availableEventRepeatCaches(state, eventId) { const event = (0, live_events_1.liveEventDef)(eventId); if (!event)
    return 0; const earned = Math.floor(Math.max(0, eventProgress(state, eventId) - event.maxProgress) / 1000), claimed = state.account.eventRepeatCacheClaimsById?.[eventId] ?? 0; return Math.max(0, earned - claimed); }
function claimEventRepeatCache(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    throw new Error('Event rewards are no longer available.'); if (!availableEventRepeatCaches(state, event.definition.id))
    throw new Error('Earn 1,000 reputation beyond the final milestone first.'); const id = event.definition.id; return { ...state, account: { ...state.account, eventPrestigeBalanceById: { ...(state.account.eventPrestigeBalanceById ?? {}), [id]: eventPrestigeBalance(state, id) + 1 }, eventRepeatCacheClaimsById: { ...(state.account.eventRepeatCacheClaimsById ?? {}), [id]: (state.account.eventRepeatCacheClaimsById?.[id] ?? 0) + 1 } } }; }
function utcDayKey(nowMs) { return new Date(nowMs).toISOString().slice(0, 10); }
function utcWeekKey(nowMs) { const date = new Date(nowMs), daysSinceMonday = (date.getUTCDay() + 6) % 7; date.setUTCDate(date.getUTCDate() - daysSinceMonday); return date.toISOString().slice(0, 10); }
function nextUtcDayMs(nowMs) { const date = new Date(nowMs); return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1); }
function eventDailyGift(state, nowMs = Date.now()) { const event = activeLiveEvent(state, nowMs); if (!event)
    return null; const startDay = Date.parse(new Date(event.runtime.startsAtMs).toISOString().slice(0, 10) + 'T00:00:00.000Z'), today = Date.parse(utcDayKey(nowMs) + 'T00:00:00.000Z'), eventDay = Math.max(1, Math.floor((today - startDay) / 86400_000) + 1), giftDay = (eventDay - 1) % event.definition.dailyGifts.length + 1, gift = event.definition.dailyGifts.find(entry => entry.day === giftDay); const id = `${event.definition.id}:${utcDayKey(nowMs)}`; return { id, eventDay, giftDay, gift, claimed: (state.account.eventDailyGiftClaimIds ?? []).includes(id), nextAtMs: nextUtcDayMs(nowMs) }; }
function claimEventDailyGift(state, nowMs = Date.now()) { const event = activeLiveEvent(state, nowMs), status = eventDailyGift(state, nowMs); if (!event || !status)
    throw new Error('This event is not active.'); if (status.claimed)
    throw new Error("Today's festival gift was already claimed."); const rewarded = grantEventCurrencies(state, event.definition.id, status.gift.rewardCurrency, status.gift.rewardPrestige); return { ...rewarded, account: { ...rewarded.account, eventDailyGiftClaimIds: [...(rewarded.account.eventDailyGiftClaimIds ?? []), status.id].slice(-180) } }; }
function contractId(eventId, objectiveId, nowMs) { return `${eventId}:${utcDayKey(nowMs)}:${objectiveId}`; }
function eventContractBoard(state, nowMs = Date.now()) {
    const event = claimableLiveEvent(state, nowMs);
    if (!event)
        return [];
    const boardTime = eventBoardTime(state, nowMs);
    const seed = [...`${event.definition.id}:${utcDayKey(boardTime)}`].reduce((sum, char) => sum + char.charCodeAt(0), 0), pool = event.definition.objectives, offset = seed % pool.length;
    return Array.from({ length: Math.min(3, pool.length) }, (_, index) => pool[(offset + index) % pool.length]).map(objective => { const id = contractId(event.definition.id, objective.id, boardTime), accepted = (state.account.eventAcceptedContractIds ?? []).includes(id), claimed = (state.account.eventObjectiveClaimIds ?? []).includes(id), total = Math.max(0, Math.floor(state.account.eventActivityById?.[event.definition.id]?.[objective.source] ?? 0)), baseline = state.account.eventContractBaselines?.[id] ?? total; return { id, objective, accepted, claimed, progress: accepted ? Math.max(0, total - baseline) : 0 }; });
}
function acceptEventContract(state, objectiveId, nowMs = Date.now()) {
    const event = activeLiveEvent(state, nowMs);
    if (!event)
        throw new Error('This event is not active.');
    const board = eventContractBoard(state, nowMs), contract = board.find(entry => entry.objective.id === objectiveId);
    if (!contract)
        throw new Error('This contract is not offered today.');
    if (contract.accepted)
        return state;
    const acceptedToday = board.filter(entry => entry.accepted).length;
    if (acceptedToday >= 2)
        throw new Error('You may accept two Harvest Contracts per day.');
    const total = Math.max(0, Math.floor(state.account.eventActivityById?.[event.definition.id]?.[contract.objective.source] ?? 0));
    return { ...state, account: { ...state.account, eventAcceptedContractIds: [...(state.account.eventAcceptedContractIds ?? []), contract.id].slice(-240), eventContractBaselines: { ...(state.account.eventContractBaselines ?? {}), [contract.id]: total } } };
}
function eventObjectiveProgress(state, eventId, objectiveId, nowMs = Date.now()) { if (claimableLiveEvent(state, nowMs)?.definition.id !== eventId)
    return 0; return eventContractBoard(state, nowMs).find(entry => entry.objective.id === objectiveId)?.progress ?? 0; }
function eventObjectiveClaimed(state, eventId, objectiveId, nowMs = Date.now()) { if (claimableLiveEvent(state, nowMs)?.definition.id !== eventId)
    return false; return eventContractBoard(state, nowMs).find(entry => entry.objective.id === objectiveId)?.claimed ?? false; }
function claimEventObjective(state, objectiveId, nowMs = Date.now()) {
    const event = claimableLiveEvent(state, nowMs);
    if (!event)
        throw new Error('Event rewards are no longer available.');
    const contract = eventContractBoard(state, nowMs).find(entry => entry.objective.id === objectiveId);
    if (!contract)
        throw new Error('This contract is not available.');
    if (!contract.accepted)
        throw new Error('Accept this contract before making progress.');
    if (contract.claimed)
        throw new Error('This contract was already claimed.');
    if (contract.progress < contract.objective.required)
        throw new Error('Complete the contract first.');
    const objective = contract.objective;
    const id = event.definition.id, progress = { ...(state.account.eventProgressById ?? {}) }, currency = { ...(state.account.eventCurrencyBalanceById ?? {}) }, prestige = { ...(state.account.eventPrestigeBalanceById ?? {}) };
    progress[id] = (progress[id] ?? 0) + objective.rewardCurrency;
    currency[id] = (currency[id] ?? 0) + objective.rewardCurrency;
    prestige[id] = (prestige[id] ?? 0) + objective.rewardPrestige;
    return { ...state, account: { ...state.account, eventProgressById: progress, eventCurrencyBalanceById: currency, eventPrestigeBalanceById: prestige, eventObjectiveClaimIds: [...(state.account.eventObjectiveClaimIds ?? []), contract.id].slice(-240) } };
}
function eventWeeklyBoard(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    return []; const week = utcWeekKey(eventBoardTime(state, nowMs)), bucket = state.account.eventPeriodActivityById?.[`${event.definition.id}:week:${week}`] ?? {}; return event.definition.weeklyObjectives.map(objective => ({ id: `${event.definition.id}:${week}:${objective.id}`, objective, progress: Math.max(0, Math.floor(bucket[objective.source] ?? 0)), claimed: (state.account.eventWeeklyClaimIds ?? []).includes(`${event.definition.id}:${week}:${objective.id}`) })); }
function claimEventWeeklyObjective(state, objectiveId, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    throw new Error('Event rewards are no longer available.'); const challenge = eventWeeklyBoard(state, nowMs).find(entry => entry.objective.id === objectiveId); if (!challenge)
    throw new Error('Unknown weekly challenge.'); if (challenge.claimed)
    throw new Error('This weekly challenge was already claimed.'); if (challenge.progress < challenge.objective.required)
    throw new Error('Complete the weekly challenge first.'); const id = event.definition.id, progress = { ...(state.account.eventProgressById ?? {}) }, currency = { ...(state.account.eventCurrencyBalanceById ?? {}) }, prestige = { ...(state.account.eventPrestigeBalanceById ?? {}) }; progress[id] = (progress[id] ?? 0) + challenge.objective.rewardCurrency; currency[id] = (currency[id] ?? 0) + challenge.objective.rewardCurrency; prestige[id] = (prestige[id] ?? 0) + challenge.objective.rewardPrestige; return { ...state, account: { ...state.account, eventProgressById: progress, eventCurrencyBalanceById: currency, eventPrestigeBalanceById: prestige, eventWeeklyClaimIds: [...(state.account.eventWeeklyClaimIds ?? []), challenge.id].slice(-160) } }; }
function eventOfferPurchaseCount(state, eventId, offerId) { return Math.max(0, Math.floor(state.account.eventShopPurchaseCounts?.[`${eventId}:${offerId}`] ?? 0)); }
function eventMarketOffers(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    return []; const common = event.definition.shop.filter(offer => offer.currency === 'common'), prestige = event.definition.shop.filter(offer => offer.currency === 'prestige'), offset = [...utcDayKey(eventBoardTime(state, nowMs))].reduce((sum, char) => sum + char.charCodeAt(0), 0) % Math.max(1, common.length); return [...Array.from({ length: Math.min(2, common.length) }, (_, index) => common[(offset + index) % common.length]), ...prestige]; }
function purchaseEventOffer(state, offerId, nowMs = Date.now()) {
    const event = claimableLiveEvent(state, nowMs);
    if (!event)
        throw new Error('The event market is closed.');
    const offer = eventMarketOffers(state, nowMs).find(entry => entry.id === offerId);
    if (!offer)
        throw new Error('This market offer is not currently available.');
    const count = eventOfferPurchaseCount(state, event.definition.id, offerId);
    if (count >= offer.limit)
        throw new Error('Purchase limit reached.');
    const common = { ...(state.account.eventCurrencyBalanceById ?? {}) }, prestige = { ...(state.account.eventPrestigeBalanceById ?? {}) }, balance = offer.currency === 'common' ? (common[event.definition.id] ?? 0) : (prestige[event.definition.id] ?? 0);
    if (balance < offer.cost)
        throw new Error(`Requires ${offer.cost} ${offer.currency === 'common' ? event.definition.currencyName : event.definition.prestigeCurrencyName}.`);
    if (offer.currency === 'common')
        common[event.definition.id] = balance - offer.cost;
    else
        prestige[event.definition.id] = balance - offer.cost;
    const rewarded = addReward(state, offer.reward), key = `${event.definition.id}:${offer.id}`;
    return { ...rewarded, account: { ...rewarded.account, eventCurrencyBalanceById: common, eventPrestigeBalanceById: prestige, eventShopPurchaseCounts: { ...(rewarded.account.eventShopPurchaseCounts ?? {}), [key]: count + 1 } } };
}
function chooseEventProject(state, choiceId, nowMs = Date.now()) { const event = activeLiveEvent(state, nowMs); if (!event)
    throw new Error('This event is not active.'); if (!event.definition.choices.some(choice => choice.id === choiceId))
    throw new Error('Unknown winter project.'); const existing = state.account.eventChoiceById?.[event.definition.id]; if (existing && existing !== choiceId)
    throw new Error('Your winter project is already locked for this event.'); return { ...state, account: { ...state.account, eventChoiceById: { ...(state.account.eventChoiceById ?? {}), [event.definition.id]: choiceId } } }; }
function contributeEventCurrency(state, quantity, nowMs = Date.now()) { const event = activeLiveEvent(state, nowMs); if (!event)
    throw new Error('This event is not active.'); if (!state.account.eventChoiceById?.[event.definition.id])
    throw new Error('Choose a winter project first.'); const amount = Math.max(0, Math.floor(quantity)), credited = eventContributionValue(state, event.definition.id, amount), balance = eventCurrencyBalance(state, event.definition.id); if (!amount || balance < amount)
    throw new Error('Not enough event currency.'); return { ...state, account: { ...state.account, eventCurrencyBalanceById: { ...(state.account.eventCurrencyBalanceById ?? {}), [event.definition.id]: balance - amount }, eventContributionById: { ...(state.account.eventContributionById ?? {}), [event.definition.id]: (state.account.eventContributionById?.[event.definition.id] ?? 0) + credited } } }; }
function eventCommunityStage(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    return 0; if (state.account.eventCommunityProgressById)
    return Math.min(100, Math.max(0, state.account.eventCommunityProgressById[event.definition.id] ?? 0)); const span = Math.max(1, event.runtime.endsAtMs - event.runtime.startsAtMs), elapsed = Math.max(0, Math.min(span, eventBoardTime(state, nowMs) - event.runtime.startsAtMs)); return Math.min(100, Math.ceil(elapsed / span * 88) + (state.account.eventContributionById?.[event.definition.id] ?? 0 >= 500 ? 12 : 0)); }
function eventCommunityMilestones(state, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    return []; const stage = eventCommunityStage(state, nowMs); return event.definition.communityMilestones.map(milestone => ({ milestone, ready: stage >= milestone.percent, claimed: (state.account.eventCommunityClaimIds ?? []).includes(`${event.definition.id}:${milestone.percent}`) })); }
function claimEventCommunityMilestone(state, percent, nowMs = Date.now()) { const event = claimableLiveEvent(state, nowMs); if (!event)
    throw new Error('Event rewards are no longer available.'); const status = eventCommunityMilestones(state, nowMs).find(entry => entry.milestone.percent === percent); if (!status)
    throw new Error('Unknown Storehouse milestone.'); if (status.claimed)
    throw new Error('This Storehouse reward was already claimed.'); if (!status.ready)
    throw new Error('The community has not reached this Storehouse stage.'); let rewarded = grantEventCurrencies(state, event.definition.id, status.milestone.rewardCurrency, status.milestone.rewardPrestige); if (status.milestone.reward)
    rewarded = addReward(rewarded, status.milestone.reward); return { ...rewarded, account: { ...rewarded.account, eventCommunityClaimIds: [...(rewarded.account.eventCommunityClaimIds ?? []), `${event.definition.id}:${percent}`].slice(-80) } }; }
/** Development-only local runtime switch. Production uses the Supabase event row. */
function setLocalEventEnabled(state, enabled, nowMs = Date.now()) { const runtime = enabled ? { eventId: 'EVT_ANNUAL_009_2026', enabled: true, startsAtMs: nowMs - 60_000, endsAtMs: nowMs + 21 * 86400_000 } : undefined; return { ...state, account: { ...state.account, liveEvent: runtime } }; }
