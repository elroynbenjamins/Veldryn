"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_CALENDAR_EPOCH_MS = exports.PARTY_EVENT_ACTIVE_WEEKS = exports.PARTY_EVENT_CADENCE_WEEKS = exports.WEEKLY_PARTY_EVENT_FAMILIES = exports.PARTY_WEEKLY_EVENTS_RELEASED = void 0;
exports.partyEventWeekWindow = partyEventWeekWindow;
exports.partyEventCadenceAt = partyEventCadenceAt;
exports.partyEventFamilyForWeek = partyEventFamilyForWeek;
exports.selectPartyEventVariation = selectPartyEventVariation;
exports.weeklyPartyBudget = weeklyPartyBudget;
exports.creditVerifiedWeeklyActivity = creditVerifiedWeeklyActivity;
exports.buildWeeklyPartySupplyOrders = buildWeeklyPartySupplyOrders;
exports.isEligibleForWeeklyPartyChest = isEligibleForWeeklyPartyChest;
/**
 * Party Events v2: the hidden weekly co-operative adventure model.
 *
 * Do not connect this module to public navigation, the v17 24–72 hour ranked
 * LiveOps party events, or client mutations until the server-side settlement,
 * inventory sink, and reward tests have passed.
 */
exports.PARTY_WEEKLY_EVENTS_RELEASED = false;
const DIFFICULTIES = {
    standard: { requiredMinutesPerMember: 90, optionalMinutesPerMember: 45, finalePowerMultiplier: 1, rewardValueMultiplier: 1, renown: 10 },
    veteran: { requiredMinutesPerMember: 120, optionalMinutesPerMember: 60, finalePowerMultiplier: 1.20, rewardValueMultiplier: 1.2, renown: 12 },
    heroic: { requiredMinutesPerMember: 150, optionalMinutesPerMember: 75, finalePowerMultiplier: 1.40, rewardValueMultiplier: 1.35, renown: 14 },
};
exports.WEEKLY_PARTY_EVENT_FAMILIES = {
    broken_caravan: {
        name: 'The Broken Caravan',
        variations: ['bandits_crossing', 'fogbound_trail', 'collapsed_crossing'],
        categoryShares: { wood: 0.40, ore: 0.35, herb: 0.25 },
    },
    nightfall_hunt: {
        name: 'The Nightfall Hunt',
        variations: ['moonfang_pack', 'hollow_stag', 'ashclaw_behemoth'],
        categoryShares: { wood: 0.30, ore: 0.20, herb: 0.50 },
    },
    broken_wards: {
        name: 'The Broken Wards',
        variations: ['overgrown_runestones', 'stormward_spires', 'blighted_roots'],
        categoryShares: { wood: 0.25, ore: 0.40, herb: 0.35 },
    },
    lost_reliquary: {
        name: 'The Lost Reliquary',
        variations: ['sunken_archive', 'vault_of_echoes', 'starlit_crypt'],
        categoryShares: { wood: 0.35, ore: 0.45, herb: 0.20 },
    },
};
const FAMILIES = [
    'broken_caravan', 'nightfall_hunt', 'broken_wards', 'lost_reliquary',
];
const TIER_SHARES = {
    common: 0.65, uncommon: 0.25, advanced: 0.10,
};
const STAGE_SUPPLY_SHARES = [0.4, 0.4, 0.2];
const CATEGORIES = ['wood', 'ore', 'herb'];
const TIERS = ['common', 'uncommon', 'advanced'];
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
/** One 7-day event, then 14 days without any Party Event. */
exports.PARTY_EVENT_CADENCE_WEEKS = 3;
exports.PARTY_EVENT_ACTIVE_WEEKS = 1;
/** Calendar anchor only, NOT a launch date. Live feature gate remains disabled. */
exports.PARTY_EVENT_CALENDAR_EPOCH_MS = Date.UTC(2026, 10, 9);
/** UTC week boundary, independent of player timezone and daylight-saving time. */
function partyEventWeekWindow(atMs) {
    if (!Number.isFinite(atMs))
        throw new Error('invalid_party_event_time');
    const date = new Date(atMs);
    const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const monday = midnight - ((date.getUTCDay() + 6) % 7) * 86_400_000;
    return { startsAtMs: monday, endsAtMs: monday + MS_PER_WEEK, weekKey: new Date(monday).toISOString().slice(0, 10) };
}
/**
 * Three-week cycle: 7 days active, 14 days off. Calendar alone never exposes
 * or launches the event; the private server gate must also authorize it.
 */
function partyEventCadenceAt(atMs) {
    if (!Number.isFinite(atMs))
        throw new Error('invalid_party_event_time');
    const week = partyEventWeekWindow(atMs);
    const weeksSinceEpoch = Math.floor((week.startsAtMs - exports.PARTY_EVENT_CALENDAR_EPOCH_MS) / MS_PER_WEEK);
    // The initial anchor is a calendar example, not an obligation to launch in 2026.
    const cycleIndex = Math.floor(weeksSinceEpoch / exports.PARTY_EVENT_CADENCE_WEEKS);
    const eventStartsAtMs = exports.PARTY_EVENT_CALENDAR_EPOCH_MS
        + cycleIndex * exports.PARTY_EVENT_CADENCE_WEEKS * MS_PER_WEEK;
    const eventEndsAtMs = eventStartsAtMs + MS_PER_WEEK;
    const active = cycleIndex >= 0 && atMs >= eventStartsAtMs && atMs < eventEndsAtMs;
    const upcoming = cycleIndex < 0 ? exports.PARTY_EVENT_CALENDAR_EPOCH_MS
        : eventStartsAtMs + exports.PARTY_EVENT_CADENCE_WEEKS * MS_PER_WEEK;
    const family = FAMILIES[((Math.max(0, cycleIndex) % FAMILIES.length)
        + FAMILIES.length) % FAMILIES.length];
    return {
        active, eventStartsAtMs, eventEndsAtMs,
        nextEventStartsAtMs: upcoming, cycleIndex, family,
    };
}
/** Never return a live event template during a scheduled rest week. */
function partyEventFamilyForWeek(atMs) {
    const cadence = partyEventCadenceAt(atMs);
    return cadence.active ? cadence.family : null;
}
/** Stable seed should be generated server-side for each party/week and stored immutably. */
function selectPartyEventVariation(family, seed) {
    if (!Number.isSafeInteger(seed) || seed < 0)
        throw new Error('invalid_party_event_seed');
    return exports.WEEKLY_PARTY_EVENT_FAMILIES[family].variations[seed % 3];
}
function weeklyPartyBudget(members, difficulty) {
    if (!Number.isInteger(members) || members < 2 || members > 4)
        throw new Error('invalid_party_event_roster');
    const rules = DIFFICULTIES[difficulty];
    if (!rules)
        throw new Error('invalid_party_event_difficulty');
    const progressTarget = { 2: 100, 3: 135, 4: 170 }[members];
    const first = Math.round(progressTarget * 0.25);
    const second = Math.round(progressTarget * 0.5);
    return {
        members: members, difficulty, progressTarget,
        stageProgressTargets: [first, second, progressTarget - first - second],
        requiredGatherMinutes: rules.requiredMinutesPerMember * members,
        optionalGatherMinutes: rules.optionalMinutesPerMember * members,
        finalePowerMultiplier: rules.finalePowerMultiplier,
        rewardValueMultiplier: rules.rewardValueMultiplier,
        partyRenown: rules.renown,
    };
}
/**
 * Convert trusted eligible activity time into weekly EP.
 * Remainder is carried across separate settlements; no DAILY cap exists.
 * Source event deduplication and account/week locking belong to the repository.
 */
function creditVerifiedWeeklyActivity(verifiedSeconds, carriedSeconds, previouslyCreditedPoints, weeklyLimit = 40) {
    if (![verifiedSeconds, carriedSeconds, previouslyCreditedPoints, weeklyLimit].every(Number.isFinite)
        || verifiedSeconds < 0 || carriedSeconds < 0 || previouslyCreditedPoints < 0
        || !Number.isInteger(previouslyCreditedPoints) || !Number.isInteger(weeklyLimit) || weeklyLimit < 1) {
        throw new Error('invalid_weekly_party_activity');
    }
    const available = Math.max(0, weeklyLimit - previouslyCreditedPoints);
    if (available === 0)
        return { points: 0, carriedSeconds: 0, capped: true };
    const seconds = verifiedSeconds + carriedSeconds;
    const points = Math.min(available, Math.floor(seconds / 900));
    const capped = points >= available;
    return { points, carriedSeconds: capped ? 0 : seconds - points * 900, capped };
}
function chooseItem(items, seed, label) {
    const sorted = [...items].sort((a, b) => a.itemId.localeCompare(b.itemId));
    let hash = seed >>> 0;
    for (const char of label)
        hash = (Math.imul(hash ^ char.charCodeAt(0), 16777619)) >>> 0;
    return sorted[hash % sorted.length];
}
/**
 * Build a week's substantial resource sink using actual server-side production
 * times and only unlocked canonical resource IDs. Basic resources stay relevant
 * at advanced tiers; no player-supplied rates or market prices are involved.
 */
function buildWeeklyPartySupplyOrders(family, budget, trustedCatalog, seed) {
    if (!Number.isSafeInteger(seed) || seed < 0)
        throw new Error('invalid_party_event_seed');
    const definition = exports.WEEKLY_PARTY_EVENT_FAMILIES[family];
    if (!definition)
        throw new Error('invalid_party_event_family');
    const seen = new Set();
    const eligible = trustedCatalog.filter(item => {
        if (!item.unlocked)
            return false;
        if (!item.itemId || !CATEGORIES.includes(item.category) || !TIERS.includes(item.tier)
            || !Number.isFinite(item.secondsPerUnit) || item.secondsPerUnit <= 0) {
            throw new Error('invalid_party_event_resource_catalog');
        }
        if (seen.has(item.itemId))
            throw new Error('duplicate_party_event_resource');
        seen.add(item.itemId);
        return true;
    });
    // Missing categories cannot silently be replaced by arbitrary inaccessible materials.
    for (const category of CATEGORIES) {
        if (!eligible.some(item => item.category === category))
            throw new Error('party_event_resource_category_unavailable:' + category);
    }
    const orders = [];
    const addOrder = (stage, kind, category, seconds, label, preparation) => {
        const grouped = TIERS.map(tier => ({
            tier, items: eligible.filter(item => item.category === category && item.tier === tier),
        })).filter(group => group.items.length > 0);
        const weight = grouped.reduce((sum, group) => sum + TIER_SHARES[group.tier], 0);
        for (const group of grouped) {
            const item = chooseItem(group.items, seed, label + ':' + group.tier);
            const allocation = seconds * TIER_SHARES[group.tier] / weight;
            const quantity = Math.max(1, Math.round(allocation / item.secondsPerUnit));
            orders.push({
                stage, kind, ...(preparation ? { preparation } : {}),
                itemId: item.itemId, category, tier: group.tier,
                quantity, estimatedGatherSeconds: quantity * item.secondsPerUnit,
            });
        }
    };
    const requiredSeconds = budget.requiredGatherMinutes * 60;
    STAGE_SUPPLY_SHARES.forEach((stageShare, index) => {
        const stage = (index + 1);
        for (const category of CATEGORIES) {
            addOrder(stage, 'required', category, requiredSeconds * stageShare * definition.categoryShares[category], 'required:' + stage + ':' + category);
        }
    });
    // Exactly three independently optional preparations; none can block completion.
    const optionalSeconds = budget.optionalGatherMinutes * 60;
    const optional = [
        { key: 'reinforced', category: 'ore' },
        { key: 'provisions', category: 'herb' },
        { key: 'specialist', category: 'wood' },
    ];
    for (const item of optional) {
        addOrder(2, 'optional', item.category, optionalSeconds / optional.length, 'optional:' + item.key, item.key);
    }
    return orders;
}
function isEligibleForWeeklyPartyChest(personalPoints, eventCompleted) {
    return eventCompleted && Number.isFinite(personalPoints) && personalPoints >= 15;
}
