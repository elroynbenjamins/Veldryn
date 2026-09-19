"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlockCollectible = unlockCollectible;
exports.selectCollectible = selectCollectible;
exports.collectionBonusBreakdown = collectionBonusBreakdown;
exports.collectibleJournal = collectibleJournal;
const collectibles_1 = require("../content/collectibles");
const ids = (state, kind) => kind === 'pet' ? (state.account.unlockedCosmeticPetIds ?? []) : kind === 'background' ? (state.account.unlockedProfileBackgroundIds ?? []) : (state.account.unlockedProfileBorderIds ?? []);
const selected = (state, kind) => kind === 'pet' ? state.character?.selectedCosmeticPetId : kind === 'background' ? state.character?.profileBackgroundId : state.character?.profileBorderId;
function unlockCollectible(state, id) { const row = collectibles_1.COLLECTIBLES.find(item => item.id === id); if (!row)
    throw new Error('Unknown collectible.'); const key = row.kind === 'pet' ? 'unlockedCosmeticPetIds' : row.kind === 'background' ? 'unlockedProfileBackgroundIds' : 'unlockedProfileBorderIds'; const owned = state.account[key] ?? []; return owned.includes(id) ? state : { ...state, account: { ...state.account, [key]: [...owned, id] } }; }
function selectCollectible(state, kind, id) { if (id && !ids(state, kind).includes(id))
    throw new Error('Collectible is not owned.'); if (kind === 'pet')
    return { ...state, character: state.character ? { ...state.character, selectedCosmeticPetId: id } : state.character }; const key = kind === 'background' ? 'profileBackgroundId' : 'profileBorderId'; return { ...state, character: state.character ? { ...state.character, [key]: id } : state.character }; }
function collectionBonusBreakdown(state, catalog = collectibles_1.COLLECTIBLES) { const rows = new Map(); for (const row of catalog) {
    const owned = ids(state, row.kind).includes(row.id), active = selected(state, row.kind) === row.id;
    if (!owned)
        continue;
    const bucket = rows.get(row.target) ?? { owned: new Set(), active: new Set(), ownedRaw: 0, activeRaw: 0 };
    if (!bucket.owned.has(row.bonusFamilyId)) {
        bucket.owned.add(row.bonusFamilyId);
        bucket.ownedRaw += row.ownedBps;
    }
    if (active && !bucket.active.has(row.bonusFamilyId)) {
        bucket.active.add(row.bonusFamilyId);
        bucket.activeRaw += row.activeBps;
    }
    rows.set(row.target, bucket);
} return [...rows].map(([target, row]) => { const cap = target === 'hp' || target === 'attack' || target === 'defense' ? 500 : 800; const ownedApplied = Math.min(cap, row.ownedRaw), activeApplied = Math.min(cap, row.activeRaw), total = Math.min((target === 'hp' || target === 'attack' || target === 'defense' ? 1000 : 1500), ownedApplied + activeApplied); return { target, ownedRawBps: row.ownedRaw, ownedAppliedBps: ownedApplied, activeRawBps: row.activeRaw, activeAppliedBps: activeApplied, appliedBps: total, suppressedBps: row.ownedRaw + row.activeRaw - total }; }); }
function collectibleJournal(state, catalog = collectibles_1.COLLECTIBLES) { return catalog.map(row => ({ id: row.id, name: row.name, kind: row.kind, target: row.target, source: row.source, owned: ids(state, row.kind).includes(row.id), selected: selected(state, row.kind) === row.id, ownedBps: row.ownedBps, activeBps: row.activeBps })); }
