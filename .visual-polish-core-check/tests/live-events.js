"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const live_events_1 = require("../src/core/live-events");
function ok(condition, message) { if (!condition)
    throw new Error(message); }
const t0 = 2000000;
let state = (0, game_1.createCharacter)((0, game_1.newGame)(t0), 'IRONWARDEN', 'EventTester');
state = (0, game_1.startCombat)(state, 'MOSS_RAT', t0);
ok(!(0, live_events_1.activeLiveEvent)(state, t0), 'Events must be inactive by default');
ok(((0, game_1.previewActivityReward)(state, t0 + 3600000).eventDrops?.length ?? 0) === 0, 'Inactive events cannot add drops');
let scheduled = { ...state, account: { ...state.account, liveEvent: { eventId: 'EVT_ANNUAL_009_2026', enabled: true, startsAtMs: t0 + 86400000, endsAtMs: t0 + 8 * 86400000 } } };
ok((0, live_events_1.eventLifecycle)(scheduled, t0)?.phase === 'upcoming', 'Scheduled events should be visible before they begin');
state = (0, live_events_1.setLocalEventEnabled)(state, true, t0);
ok((0, live_events_1.activeLiveEvent)(state, t0)?.definition.name === 'Harvestwake', 'Developer switch should enable Harvestwake');
const gift = (0, live_events_1.eventDailyGift)(state, t0);
const giftProgressBefore = (0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026');
state = (0, live_events_1.claimEventDailyGift)(state, t0);
ok((0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026') === giftProgressBefore + gift.gift.rewardCurrency, 'Daily festival gift should grant reputation and spendable currency');
let duplicateGiftRejected = false;
try {
    (0, live_events_1.claimEventDailyGift)(state, t0);
}
catch {
    duplicateGiftRejected = true;
}
ok(duplicateGiftRejected, 'Festival gift can only be claimed once per UTC day');
ok((0, live_events_1.eventDailyGift)(state, t0 + 86400000)?.claimed === false, 'The next UTC day should offer a fresh festival gift');
state = (0, live_events_1.applyEventDiscoveries)(state, [{ eventId: 'EVT_ANNUAL_009_2026', discoveryId: 'golden_field_feather', name: 'Golden Field Feather', quantity: 5 }]);
ok((0, live_events_1.eventDiscoveryBoard)(state, t0).find(entry => entry.discovery.id === 'golden_field_feather')?.ready === true, 'Discovery fragments should accumulate to their collection target');
state = (0, live_events_1.claimEventDiscovery)(state, 'golden_field_feather', t0);
ok(state.account.unlockedCosmeticPetIds?.includes('pet_straw_sparrow') === true, 'Completed folklore discovery should grant its permanent cosmetic');
let duplicateDiscoveryRejected = false;
try {
    (0, live_events_1.claimEventDiscovery)(state, 'golden_field_feather', t0);
}
catch {
    duplicateDiscoveryRejected = true;
}
ok(duplicateDiscoveryRejected, 'Discovery rewards cannot be claimed twice');
state = (0, live_events_1.applyEventDrops)(state, [{ eventId: 'EVT_ANNUAL_009_2026', currencyId: 'HARVEST_MARK', name: 'Harvest Marks', quantity: 0, source: 'combat', units: 3, recordedAtMs: t0 }]);
ok(state.account.eventActivityById?.EVT_ANNUAL_009_2026?.combat === 3, 'Activity must count even when its currency roll awards zero');
const preview = (0, game_1.previewActivityReward)(state, t0 + 3600000);
ok((preview.eventDrops?.[0]?.quantity ?? 0) > 0, 'Active combat should produce event currency');
state = (0, live_events_1.applyEventDrops)(state, preview.eventDrops ?? []);
const afterCombat = (0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026');
ok(afterCombat > 0, 'Collected event currency should persist as progress');
state = (0, live_events_1.grantEventActivity)(state, 'crafting', t0 + 1);
ok((0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026') === afterCombat + 30, 'Crafting should grant configured marks');
state = (0, live_events_1.applyEventDrops)(state, [{ eventId: 'EVT_ANNUAL_009_2026', currencyId: 'HARVEST_MARK', name: 'Harvest Marks', quantity: 10000 }]);
state = (0, live_events_1.claimEventReward)(state, 'emote_harvest_cheer', t0 + 2);
ok(state.account.unlockedEmoteIds?.includes('emote_harvest_cheer') === true, 'Claimed emote should enter the account collection');
ok((0, live_events_1.eventRewardClaimed)(state, 'EVT_ANNUAL_009_2026', 'emote_harvest_cheer'), 'Claim receipt should persist');
let duplicateRejected = false;
try {
    (0, live_events_1.claimEventReward)(state, 'emote_harvest_cheer', t0 + 2);
}
catch {
    duplicateRejected = true;
}
ok(duplicateRejected, 'A milestone cannot be claimed twice');
state = (0, live_events_1.claimEventReward)(state, 'skin_harvestwake_ironwarden', t0 + 2);
ok(state.account.unlockedEventSkinIds?.includes('skin_harvestwake_ironwarden') === true, 'Class event skin should unlock permanently');
state = (0, live_events_1.claimAllEventMilestones)(state, t0 + 2);
ok(state.account.unlockedCosmeticPetIds?.includes('pet_harvest_fox') === true, 'Claim all should collect every available milestone');
const weekly = (0, live_events_1.eventWeeklyBoard)(state, t0 + 2)[0];
state = (0, live_events_1.applyEventDrops)(state, [{ eventId: 'EVT_ANNUAL_009_2026', currencyId: 'HARVEST_MARK', name: 'Harvest Marks', quantity: 0, source: weekly.objective.source, units: weekly.objective.required, recordedAtMs: t0 + 2 }]);
state = (0, live_events_1.claimEventWeeklyObjective)(state, weekly.objective.id, t0 + 2);
ok((0, live_events_1.eventWeeklyBoard)(state, t0 + 2)[0].claimed, 'Weekly challenge claim should be scoped to its UTC week');
const offered = (0, live_events_1.eventContractBoard)(state, t0 + 2)[0];
state = (0, live_events_1.acceptEventContract)(state, offered.objective.id, t0 + 2);
ok((0, live_events_1.eventContractBoard)(state, t0 + 2)[0].progress === 0, 'Contract progress must start from its acceptance baseline');
const prestigeBeforeContract = (0, live_events_1.eventPrestigeBalance)(state, 'EVT_ANNUAL_009_2026');
const priorTotal = state.account.eventActivityById?.EVT_ANNUAL_009_2026?.[offered.objective.source] ?? 0;
state = { ...state, account: { ...state.account, eventActivityById: { ...(state.account.eventActivityById ?? {}), EVT_ANNUAL_009_2026: { ...(state.account.eventActivityById?.EVT_ANNUAL_009_2026 ?? {}), [offered.objective.source]: priorTotal + offered.objective.required } } } };
state = (0, live_events_1.claimEventObjective)(state, offered.objective.id, t0 + 2);
ok((0, live_events_1.eventObjectiveClaimed)(state, 'EVT_ANNUAL_009_2026', offered.objective.id, t0 + 2), 'Completed daily contract should persist its dated claim');
ok((0, live_events_1.eventPrestigeBalance)(state, 'EVT_ANNUAL_009_2026') === prestigeBeforeContract + offered.objective.rewardPrestige, 'Contracts should award their configured prestige currency');
const remainingContracts = (0, live_events_1.eventContractBoard)(state, t0 + 2).slice(1);
state = (0, live_events_1.acceptEventContract)(state, remainingContracts[0].objective.id, t0 + 2);
let thirdRejected = false;
try {
    (0, live_events_1.acceptEventContract)(state, remainingContracts[1].objective.id, t0 + 2);
}
catch {
    thirdRejected = true;
}
ok(thirdRejected, 'Daily board must enforce its two-contract acceptance limit');
ok((0, live_events_1.eventContractBoard)(state, t0 + 86400000 + 2).every(contract => !contract.accepted), 'A new UTC day should provide fresh contract acceptance slots');
const progressBeforePurchase = (0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026');
const market = (0, live_events_1.eventMarketOffers)(state, t0 + 2);
ok(market.length === 3, 'Market should show two rotating common offers plus prestige stock');
const purchaseOffer = market.find(offer => offer.currency === 'common');
state = (0, live_events_1.purchaseEventOffer)(state, purchaseOffer.id, t0 + 2);
ok((0, live_events_1.eventOfferPurchaseCount)(state, 'EVT_ANNUAL_009_2026', purchaseOffer.id) === 1, 'Market purchase limit should persist');
const cosmeticIds = [...(state.account.unlockedProfileBackgroundIds ?? []), ...(state.account.unlockedProfileBorderIds ?? []), ...(state.account.unlockedCosmeticPetIds ?? [])];
ok(cosmeticIds.includes(purchaseOffer.reward.id), 'Market reward should enter the matching cosmetic collection');
ok((0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026') === progressBeforePurchase, 'Spending currency must not reduce reputation');
let bonusState = (0, live_events_1.chooseEventProject)(state, 'guild_pantry', t0 + 2);
const bonusProgressBefore = (0, live_events_1.eventProgress)(bonusState, 'EVT_ANNUAL_009_2026');
bonusState = (0, live_events_1.grantEventActivity)(bonusState, 'boss', t0 + 3);
ok((0, live_events_1.eventProgress)(bonusState, 'EVT_ANNUAL_009_2026') === bonusProgressBefore + 300, 'Guild Pantry should apply its 20% boss-currency bonus');
bonusState = (0, live_events_1.applyEventDrops)(bonusState, [{ eventId: 'EVT_ANNUAL_009_2026', currencyId: 'HARVEST_MARK', name: 'Harvest Marks', quantity: 100 }]);
const creditedBefore = bonusState.account.eventContributionById?.EVT_ANNUAL_009_2026 ?? 0;
bonusState = (0, live_events_1.contributeEventCurrency)(bonusState, 100, t0 + 3);
ok((bonusState.account.eventContributionById?.EVT_ANNUAL_009_2026 ?? 0) === creditedBefore + 125, 'Guild Pantry should convert 100 spent marks into 125 Storehouse contribution value');
state = (0, live_events_1.chooseEventProject)(state, 'preserved_supplies', t0 + 2);
const balanceBeforeContribution = (0, live_events_1.eventCurrencyBalance)(state, 'EVT_ANNUAL_009_2026');
state = (0, live_events_1.contributeEventCurrency)(state, 100, t0 + 2);
ok((0, live_events_1.eventCurrencyBalance)(state, 'EVT_ANNUAL_009_2026') === balanceBeforeContribution - 100, 'Storehouse contribution should spend marks');
let choiceLocked = false;
try {
    (0, live_events_1.chooseEventProject)(state, 'guild_pantry', t0 + 2);
}
catch {
    choiceLocked = true;
}
ok(choiceLocked, 'Winter project choice should lock for the event');
state = { ...state, account: { ...state.account, liveEvent: { eventId: 'EVT_ANNUAL_009_2026', enabled: true, startsAtMs: t0 - 10 * 86400000, endsAtMs: t0 + 3600000 }, eventContributionById: { ...(state.account.eventContributionById ?? {}), EVT_ANNUAL_009_2026: 500 } } };
ok((0, live_events_1.eventCommunityMilestones)(state, t0 + 2).every(entry => entry.ready), 'A near-complete Storehouse plus personal contribution should reach every community tier');
state = (0, live_events_1.claimEventCommunityMilestone)(state, 100, t0 + 2);
ok(state.account.unlockedTitleIds?.includes('title_storehouse_builder') === true, 'Final Storehouse tier should unlock its permanent title');
ok((0, live_events_1.eventCollectionJournal)(state, t0 + 2).some(entry => entry.reward.id === 'title_storehouse_builder' && entry.owned), 'Collection journal should reflect owned community cosmetics');
let duplicateCommunityRejected = false;
try {
    (0, live_events_1.claimEventCommunityMilestone)(state, 100, t0 + 2);
}
catch {
    duplicateCommunityRejected = true;
}
ok(duplicateCommunityRejected, 'Storehouse milestone rewards cannot be claimed twice');
const cachesBeforeThreshold = (0, live_events_1.availableEventRepeatCaches)(state, 'EVT_ANNUAL_009_2026');
const reputationBeforeThreshold = (0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026');
const nextCacheThreshold = 10000 + (Math.floor(Math.max(0, reputationBeforeThreshold - 10000) / 1000) + 1) * 1000;
state = (0, live_events_1.applyEventDrops)(state, [{ eventId: 'EVT_ANNUAL_009_2026', currencyId: 'HARVEST_MARK', name: 'Harvest Marks', quantity: nextCacheThreshold - reputationBeforeThreshold }]);
ok((0, live_events_1.availableEventRepeatCaches)(state, 'EVT_ANNUAL_009_2026') === cachesBeforeThreshold + 1, 'Post-cap reputation should unlock repeat caches every 1,000 points');
const prestigeBeforeCache = (0, live_events_1.eventPrestigeBalance)(state, 'EVT_ANNUAL_009_2026');
state = (0, live_events_1.claimEventRepeatCache)(state, t0 + 2);
ok((0, live_events_1.eventPrestigeBalance)(state, 'EVT_ANNUAL_009_2026') === prestigeBeforeCache + 1, 'Repeat cache should grant prestige currency');
const eventEnd = state.account.liveEvent.endsAtMs, graceTime = eventEnd + 60000;
ok((0, live_events_1.eventLifecycle)(state, graceTime)?.phase === 'claiming', 'Ended events should enter their reward-claim grace period');
ok(!(0, live_events_1.activeLiveEvent)(state, graceTime), 'Claim-period events must not generate new activity drops');
ok((0, live_events_1.eventMarketOffers)(state, graceTime).map(offer => offer.id).join(',') === (0, live_events_1.eventMarketOffers)(state, eventEnd - 1).map(offer => offer.id).join(','), 'Market stock should freeze to the final event-day rotation during grace');
let graceContributionRejected = false;
try {
    (0, live_events_1.contributeEventCurrency)(state, 100, graceTime);
}
catch {
    graceContributionRejected = true;
}
ok(graceContributionRejected, 'Storehouse contributions must close when event earning ends');
ok((0, live_events_1.eventLifecycle)(state, eventEnd + 8 * 86400000) === null, 'Event should archive after the seven-day claim period');
state = (0, live_events_1.setLocalEventEnabled)(state, false, t0 + 3);
ok(!(0, live_events_1.activeLiveEvent)(state, t0 + 3), 'Developer switch should fully disable event drops and claims');
console.log(JSON.stringify({ status: 'PASS', afterCombat, finalProgress: (0, live_events_1.eventProgress)(state, 'EVT_ANNUAL_009_2026') }, null, 2));
