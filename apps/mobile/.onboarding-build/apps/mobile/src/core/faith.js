"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faithPracticeRefund = exports.previewFaithReward = exports.startFaithPractice = exports.faithPracticeAvailability = exports.holyWaterAvailable = exports.selectedFaithBlessing = exports.faithLevel = void 0;
exports.normalizeFaith = normalizeFaith;
exports.blessingRows = blessingRows;
exports.updateFaithPreference = updateFaithPreference;
exports.reserveFaithPractice = reserveFaithPractice;
exports.settleFaithPractice = settleFaithPractice;
exports.cancelFaithPractice = cancelFaithPractice;
const faith_1 = require("../content/faith");
const progression_1 = require("./progression");
const MAX_XP = (0, progression_1.totalXpAtLevel)(100);
function normalizeFaith(raw) {
    const xp = typeof raw?.xp === 'number' && Number.isFinite(raw.xp) ? Math.max(0, Math.min(MAX_XP, Math.floor(raw.xp))) : 0;
    const selected = (0, faith_1.faithBlessingDef)(raw?.selectedBlessingId), p = raw?.practice, tier = faith_1.FAITH_TIERS.find(t => t.id === p?.tierId);
    const practice = tier && Number.isSafeInteger(p.remaining) && p.remaining > 0 && p.remaining <= 1000 && Number.isSafeInteger(p.lastClaimAtMs) && p.lastClaimAtMs >= 0 && Number.isSafeInteger(p.progressMs) && p.progressMs >= 0 && p.progressMs < tier.seconds * 1000 ? { tierId: tier.id, remaining: p.remaining, lastClaimAtMs: p.lastClaimAtMs, progressMs: p.progressMs } : undefined;
    return { xp, selectedBlessingId: selected && selected.level <= (0, progression_1.levelFromXp)(xp) ? selected.id : undefined, favoriteBlessingIds: Array.isArray(raw?.favoriteBlessingIds) ? [...new Set(raw.favoriteBlessingIds.filter((id) => typeof id === 'string' && (0, faith_1.faithBlessingDef)(id)))] : [], hideWeakerBlessings: raw?.hideWeakerBlessings !== false, practice };
}
const faithLevel = (state) => (0, progression_1.levelFromXp)(Array.isArray(state) ? (state.find((s) => s.skillId === 'faith')?.xp ?? 0) : Math.max(normalizeFaith(state.character?.faith).xp, state.skills.find(s => s.skillId === 'faith')?.xp ?? 0));
exports.faithLevel = faithLevel;
const selectedFaithBlessing = (state) => {
    const raw = state.character?.faith, blessing = (0, faith_1.faithBlessingDef)(raw?.selectedBlessingId);
    return blessing && blessing.level <= (0, exports.faithLevel)(state) ? blessing : undefined;
};
exports.selectedFaithBlessing = selectedFaithBlessing;
function blessingRows(state) {
    const faith = normalizeFaith(state.character?.faith), level = (0, exports.faithLevel)(state);
    return faith_1.FAITH_BLESSINGS.filter(b => !faith.hideWeakerBlessings || faith.favoriteBlessingIds.includes(b.id) || faith.selectedBlessingId === b.id || !faith_1.FAITH_BLESSINGS.some(other => other.family === b.family && other.bonus > b.bonus && other.level <= level));
}
function updateFaithPreference(state, kind, id, enabled) {
    if (!state.character)
        throw new Error('Create a character first.');
    const faith = normalizeFaith(state.character.faith);
    if (kind === 'hide')
        faith.hideWeakerBlessings = !!enabled;
    else {
        const blessing = (0, faith_1.faithBlessingDef)(id);
        if (!blessing)
            throw new Error('Unknown blessing.');
        if (kind === 'blessing') {
            if (blessing.level > (0, exports.faithLevel)(state))
                throw new Error('Requires Faith level ' + blessing.level);
            faith.selectedBlessingId = blessing.id;
        }
        else
            faith.favoriteBlessingIds = enabled ? [...new Set([...faith.favoriteBlessingIds, blessing.id])] : faith.favoriteBlessingIds.filter(b => b !== blessing.id);
    }
    return { ...state, character: { ...state.character, faith } };
}
const holyWaterAvailable = (state) => [...state.inventory.stacks, ...state.bank.stacks].filter(s => s.itemId === faith_1.HOLY_WATER_ID).reduce((n, s) => n + s.quantity, 0);
exports.holyWaterAvailable = holyWaterAvailable;
function removeWater(stacks, quantity) { let remaining = quantity; return stacks.map(s => { if (s.itemId !== faith_1.HOLY_WATER_ID)
    return s; const taken = Math.min(remaining, s.quantity); remaining -= taken; return { ...s, quantity: s.quantity - taken }; }).filter(s => s.quantity > 0); }
function reserveFaithPractice(state, tierId, count, now) {
    if (!state.character)
        throw new Error('Create a character first.');
    const faith = normalizeFaith(state.character.faith), tier = faith_1.FAITH_TIERS.find(t => t.id === tierId);
    if (faith.practice)
        throw new Error('Stop the current practice first.');
    if (!tier || tier.level > (0, exports.faithLevel)(state))
        throw new Error('Faith tier is locked.');
    if (faith.xp >= MAX_XP)
        throw new Error('Faith is mastered.');
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000)
        throw new Error('Choose 1–1000 practices.');
    const cost = tier.water * count;
    if ((0, exports.holyWaterAvailable)(state) < cost)
        throw new Error('Not enough Holy Water in Inventory and Bank.');
    const inv = Math.min(cost, state.inventory.stacks.filter(s => s.itemId === faith_1.HOLY_WATER_ID).reduce((n, s) => n + s.quantity, 0));
    return { ...state, inventory: { ...state.inventory, stacks: removeWater(state.inventory.stacks, inv) }, bank: { ...state.bank, stacks: removeWater(state.bank.stacks, cost - inv) }, activity: { kind: 'faith', targetId: tierId, startedAtMs: now, lastClaimAtMs: now, faithPractice: { tierId, remainingPractices: count, lastClaimAtMs: now, progressFraction: 0 } }, character: { ...state.character, classTraining: undefined, faith } };
}
function settleFaithPractice(state, now, capSeconds) {
    const empty = { xp: 0, gold: 0, kills: 0, items: [], elapsedSeconds: 0, faithActions: 0, faithXp: 0, holyWaterConsumed: 0 };
    const normalized = normalizeFaith(state.character?.faith), skillXp = state.skills.find(s => s.skillId === 'faith')?.xp ?? 0, faith = { ...normalized, xp: Math.max(normalized.xp, skillXp) }, reservation = state.activity?.faithPractice, p = faith.practice ?? (reservation ? { tierId: reservation.tierId, remaining: reservation.remainingPractices, lastClaimAtMs: reservation.lastClaimAtMs, progressMs: Math.floor(reservation.progressFraction * 60000) } : undefined), tier = faith_1.FAITH_TIERS.find(t => t.id === p?.tierId);
    if (!state.character || !p || !tier || now < p.lastClaimAtMs)
        return { state, reward: empty, refund: 0 };
    const elapsed = Math.min(capSeconds * 1000, now - p.lastClaimAtMs), total = p.progressMs + elapsed;
    const actions = Math.min(p.remaining, Math.floor(total / (tier.seconds * 1000)), Math.ceil((MAX_XP - faith.xp) / tier.xp)), xp = Math.min(MAX_XP - faith.xp, actions * tier.xp);
    const remaining = p.remaining - actions, mastered = faith.xp + xp === MAX_XP, refund = mastered ? remaining * tier.water : 0;
    const nextPractice = remaining && !mastered ? { ...p, remaining, lastClaimAtMs: now, progressMs: total % (tier.seconds * 1000) } : undefined;
    const nextActivity = nextPractice && state.activity ? { ...state.activity, lastClaimAtMs: now, faithPractice: { tierId: nextPractice.tierId, remainingPractices: nextPractice.remaining, lastClaimAtMs: now, progressFraction: nextPractice.progressMs / (tier.seconds * 1000) } } : null;
    return { state: { ...state, activity: nextActivity, character: { ...state.character, faith: { ...faith, xp: faith.xp + xp, practice: nextPractice } } }, refund, reward: { ...empty, xp, elapsedSeconds: Math.floor(elapsed / 1000), faithActions: actions, faithXp: xp, holyWaterConsumed: actions * tier.water, faithWaterRefund: refund } };
}
function cancelFaithPractice(state) {
    const faith = normalizeFaith(state.character?.faith), reservation = state.activity?.faithPractice, p = faith.practice ?? (reservation ? { tierId: reservation.tierId, remaining: reservation.remainingPractices, lastClaimAtMs: reservation.lastClaimAtMs, progressMs: 0 } : undefined), tier = faith_1.FAITH_TIERS.find(t => t.id === p?.tierId);
    if (!state.character || !p || !tier)
        return { state, refund: 0 };
    return { state: { ...state, character: { ...state.character, faith: { ...faith, practice: undefined } } }, refund: p.remaining * tier.water };
}
const faithPracticeAvailability = (state, tierId, count) => { const tier = faith_1.FAITH_TIERS.find(t => t.id === tierId); const level = (0, exports.faithLevel)(state); const cost = (tier?.water ?? 0) * count; return { ready: !!tier && tier.level <= level && count >= 1 && count <= 1000 && (0, exports.holyWaterAvailable)(state) >= cost, reason: !tier ? 'Unknown tier' : tier.level > level ? 'Faith tier is locked.' : (0, exports.holyWaterAvailable)(state) < cost ? 'Not enough Holy Water.' : 'Ready' }; };
exports.faithPracticeAvailability = faithPracticeAvailability;
exports.startFaithPractice = reserveFaithPractice;
const previewFaithReward = (state, elapsedSeconds) => settleFaithPractice(state, (state.activity?.lastClaimAtMs ?? 0) + elapsedSeconds * 1000, elapsedSeconds).reward;
exports.previewFaithReward = previewFaithReward;
const faithPracticeRefund = (p) => { const tier = faith_1.FAITH_TIERS.find(t => t.id === p?.tierId); return tier && Number.isSafeInteger(p?.remainingPractices ?? p?.remaining) ? tier.water * (p.remainingPractices ?? p.remaining) : 0; };
exports.faithPracticeRefund = faithPracticeRefund;
