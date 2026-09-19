"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_1 = require("../content");
const projection_1 = require("../projection");
const codex_1 = require("../codex");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const eq = (a, b, m) => { if (a !== b)
    throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`); };
const throws = (f, m) => { let did = false; try {
    f();
}
catch {
    did = true;
} if (!did)
    throw new Error(m); };
const max = (id, bond = 10, mastered = false, year) => { const d = content_1.COMPANION_SERVER_DEFINITIONS.find(x => x.id === id); return { companionId: id, level: content_1.COMPANION_RARITY_MAX_LEVEL[d.rarity], xp: 0, ascensionTier: d.rarity === 'standard' || d.rarity === 'rare' ? 2 : 3, bondLevel: bond, bondXp: 0, bondTraitUnlocked: bond >= 10, mastered, selectedTechniqueId: undefined, originalEventReleaseYear: year }; };
const owned = {};
for (const id of ['UNIT_001', 'UNIT_002', 'UNIT_003', 'UNIT_004', 'UNIT_005'])
    owned[id] = max(id);
let profile = { showcaseCompanionIds: [], showcaseSlotsUnlocked: 1, discoveredCompanionIds: ['UNIT_012'] };
const economy = { gold: 0, companionEssence: 10, bondstones: 0, materials: {} };
// Codex projection tracks every static Combat Companion definition, not only owned entries.
const projection = (0, projection_1.projectCompanionCodex)(owned, profile);
eq(projection.entries.length, content_1.COMPANION_SERVER_DEFINITIONS.length, 'Codex projection omitted locked/unknown definitions');
// 39-40 owned and locked/discovered state.
eq((0, codex_1.companionCodexState)('UNIT_001', owned.UNIT_001, profile), 'mastered', 'Owned fully progressed Standard should be Mastered');
eq((0, codex_1.companionCodexState)('UNIT_012', undefined, profile), 'discovered', 'Explicitly discovered Prestige should use discovered Codex state');
eq((0, codex_1.companionCodexState)('UNIT_004', undefined, { showcaseCompanionIds: [] }), 'locked', 'Known non-Prestige companion should remain locked until owned');
eq((0, codex_1.companionCodexState)('UNIT_016', undefined, { showcaseCompanionIds: [] }), 'unknown', 'Undiscovered Prestige should be hidden');
// 41-45 completion counts for Bond, max level, mastery, origin, rarity.
let summary = (0, codex_1.companionCodexSummary)(owned);
eq(summary.bond10Count, 5, 'Bond 10 count wrong');
eq(summary.maxLevelCount, 5, 'Max-level count wrong');
ok(summary.masteredCount >= 3, 'Mastered count wrong');
eq(summary.byOrigin.REG_001, 5, 'Origin collection wrong');
eq(summary.byRarity.standard, 3, 'Standard rarity collection wrong');
eq(summary.byRarity.rare, 2, 'Rare rarity collection wrong');
// 46 milestone once; Collector I grants Essence/reward once.
const collector = (0, codex_1.availableCompanionCodexMilestones)(owned, profile).find(x => x.definition.id === 'CODEX_COLLECTOR_I');
ok(collector.complete && !collector.claimed, 'Collector milestone unavailable');
const grant = (0, codex_1.claimCompanionCodexMilestone)({ milestoneId: 'CODEX_COLLECTOR_I', owned, profile, economy });
ok(grant.economy.companionEssence > economy.companionEssence, 'Codex Essence reward missing');
throws(() => (0, codex_1.claimCompanionCodexMilestone)({ milestoneId: 'CODEX_COLLECTOR_I', owned, profile: grant.profile, economy: grant.economy }), 'Codex reward granted twice');
profile = grant.profile;
// 47-48 showcase only owned, and invalid/removed is sanitized. One basic slot is always available.
let showcase = (0, codex_1.sanitizeCompanionShowcase)({ ...profile, favoriteCompanionId: 'UNIT_001', showcaseCompanionIds: ['UNIT_001', 'UNIT_012'] }, owned);
eq(showcase.showcaseCompanionIds.length, 1, 'Locked companion remained showcased');
eq(showcase.favoriteCompanionId, 'UNIT_001', 'Owned favorite removed');
const withoutOne = { ...owned };
delete withoutOne.UNIT_001;
showcase = (0, codex_1.sanitizeCompanionShowcase)(showcase, withoutOne);
ok(!showcase.favoriteCompanionId && !showcase.showcaseCompanionIds.includes('UNIT_001'), 'Removed companion remained showcased');
// 49 event-year metadata persists in Codex projection.
const eventOwned = max('UNIT_004', 10, false, 2026);
eq((0, codex_1.companionCodexEntryV2)(eventOwned, 'UNIT_004', profile).originalEventReleaseYear, 2026, 'Event year metadata lost');
// 50-54 rarity visuals, optional asset safety, mastery marker correctness, non-color accessibility, showcase projection data.
for (const id of ['UNIT_001', 'UNIT_004', 'UNIT_007', 'UNIT_012']) {
    const visual = (0, codex_1.resolveCompanionVisualPresentation)(id, undefined);
    ok(!!visual.rarityFrame && !!visual.rarityIcon && !!visual.rarityLabel, `${id} rarity visual metadata incomplete`);
    ok(visual.accessibilityLabel.toLowerCase().includes('companion'), `${id} accessibility metadata missing`);
}
const optional = { ...content_1.COMPANION_SERVER_DEFINITIONS.find(x => x.id === 'UNIT_007').visual };
delete optional.summonEffect;
ok(!!(0, codex_1.resolveCompanionVisualPresentation)('UNIT_007', undefined), 'Missing optional visual asset broke resolution');
const prestige = max('UNIT_012', 10, false);
ok(!(0, codex_1.isCompanionMastered)(prestige), 'Prestige without final Mastery marked Mastered');
ok(!(0, codex_1.resolveCompanionVisualPresentation)('UNIT_012', prestige).masteryMarker, 'Mastery marker appeared too early');
const masteredPrestige = { ...prestige, mastered: true };
ok((0, codex_1.isCompanionMastered)(masteredPrestige), 'Valid Prestige Mastery not recognized');
ok(!!(0, codex_1.resolveCompanionVisualPresentation)('UNIT_012', masteredPrestige).masteryMarker, 'Mastery marker missing');
const entry = (0, codex_1.companionCodexEntryV2)(masteredPrestige, 'UNIT_012', { ...profile, discoveredCompanionIds: ['UNIT_012'] });
eq(entry.rarity, 'prestige', 'Showcase/Codex rarity missing');
ok(entry.mastered, 'Showcase/Codex Mastery missing');
console.log('companion-phase3-codex-prestige: PASS');
