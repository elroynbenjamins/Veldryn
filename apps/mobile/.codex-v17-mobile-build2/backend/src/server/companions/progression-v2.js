"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionXpToNextServer = companionXpToNextServer;
exports.techniqueUnlocked = techniqueUnlocked;
exports.selectCompanionTechnique = selectCompanionTechnique;
exports.clearCompanionTechnique = clearCompanionTechnique;
exports.grantCombatCompanionOrConvertDuplicate = grantCombatCompanionOrConvertDuplicate;
exports.awardCompanionXpServer = awardCompanionXpServer;
exports.awardCompanionBondXpServer = awardCompanionBondXpServer;
exports.companionUnlockRequirementSatisfied = companionUnlockRequirementSatisfied;
exports.companionUnlockRequirementsSatisfied = companionUnlockRequirementsSatisfied;
exports.companionCodexEntry = companionCodexEntry;
exports.setCompanionShowcase = setCompanionShowcase;
const content_1 = require("./content");
const policy_1 = require("./policy");
const trial_season_1 = require("./trial-season");
const XP_MULT = { standard: 1, rare: 1.08, elite: 1.16, prestige: 1.25 };
const BOND_THRESHOLDS = [0, 90, 210, 370, 580, 840, 1160, 1540, 1990, 2520];
function companionXpToNextServer(companionId, level) { const def = (0, content_1.companionServerDefinition)(companionId); if (!def)
    throw new Error('unknown_companion'); if (level >= content_1.COMPANION_RARITY_MAX_LEVEL[def.rarity])
    return 0; return Math.max(1, Math.round(65 * Math.pow(1.16, Math.max(0, level - 1)) * XP_MULT[def.rarity])); }
function techniqueUnlocked(progress, techniqueId) { const t = (0, content_1.companionTechnique)(techniqueId); if (!t || t.companionId !== progress.companionId)
    return false; const asc = progress.ascensionTier >= t.unlock.ascensionTier, bond = progress.bondLevel >= t.unlock.bondLevel; return t.unlock.mode === 'all' ? asc && bond : asc || bond; }
function selectCompanionTechnique(progress, techniqueId, economy) {
    const t = (0, content_1.companionTechnique)(techniqueId);
    if (!t || t.companionId !== progress.companionId)
        throw new Error('invalid_companion_technique');
    if (!techniqueUnlocked(progress, techniqueId))
        throw new Error('companion_technique_locked');
    if (progress.selectedTechniqueId === techniqueId)
        return { progress, economy, cost: { gold: 0, companionEssence: 0 } };
    const first = !progress.selectedTechniqueId, cost = first ? { gold: 0, companionEssence: 0 } : content_1.COMPANION_TECHNIQUE_SWITCH_COST;
    if (economy.gold < cost.gold)
        throw new Error('missing_gold');
    if (economy.companionEssence < cost.companionEssence)
        throw new Error('missing_companion_essence');
    return { progress: { ...progress, selectedTechniqueId: techniqueId }, economy: { ...economy, gold: economy.gold - cost.gold, companionEssence: economy.companionEssence - cost.companionEssence }, cost };
}
function clearCompanionTechnique(progress, economy) { if (!progress.selectedTechniqueId)
    return { progress, economy, cost: { gold: 0, companionEssence: 0 } }; const cost = content_1.COMPANION_TECHNIQUE_SWITCH_COST; if (economy.gold < cost.gold || economy.companionEssence < cost.companionEssence)
    throw new Error('missing_technique_switch_resources'); return { progress: { ...progress, selectedTechniqueId: undefined }, economy: { ...economy, gold: economy.gold - cost.gold, companionEssence: economy.companionEssence - cost.companionEssence }, cost }; }
function grantCombatCompanionOrConvertDuplicate(input) {
    const def = (0, content_1.companionServerDefinition)(input.companionId);
    if (!def)
        throw new Error('unknown_companion');
    if (input.owned[input.companionId])
        return { owned: input.owned, companionEssence: input.companionEssence + content_1.COMPANION_DUPLICATE_ESSENCE[def.rarity], duplicate: true, convertedEssence: content_1.COMPANION_DUPLICATE_ESSENCE[def.rarity] };
    const p = input.obtainedProgress ?? { companionId: def.id, level: 1, xp: 0, ascensionTier: 0, bondLevel: 1, bondXp: 0, bondTraitUnlocked: false };
    return { owned: { ...input.owned, [def.id]: p }, companionEssence: input.companionEssence, duplicate: false, convertedEssence: 0 };
}
function awardCompanionXpServer(input) {
    const def = (0, content_1.companionServerDefinition)(input.progress.companionId);
    if (!def)
        throw new Error('unknown_companion');
    let p = { ...input.progress }, remaining = Math.max(0, Math.floor(input.amount));
    const rarityMax = content_1.COMPANION_RARITY_MAX_LEVEL[def.rarity], currentCap = (0, policy_1.companionLevelCap)(def.id, p.ascensionTier);
    while (remaining > 0 && p.level < Math.min(rarityMax, currentCap)) {
        const needed = companionXpToNextServer(def.id, p.level) - p.xp;
        if (remaining < needed) {
            p.xp += remaining;
            remaining = 0;
            break;
        }
        remaining -= needed;
        p.level++;
        p.xp = 0;
    }
    if (p.level >= currentCap && currentCap < rarityMax) {
        p.xp = 0;
        return { progress: p, companionEssence: input.companionEssence, overflow: normalizeOverflow(input.overflow, input.serverNowMs), convertedEssence: 0, droppedXp: remaining };
    }
    if (p.level >= rarityMax && remaining > 0) {
        const overflow = normalizeOverflow(input.overflow, input.serverNowMs), room = Math.max(0, content_1.COMPANION_MAX_XP_WEEKLY_ESSENCE_CAP - overflow.essenceConvertedThisWeek), converted = Math.min(room, Math.floor(remaining * content_1.COMPANION_MAX_XP_ESSENCE_RATE));
        return { progress: { ...p, xp: 0 }, companionEssence: input.companionEssence + converted, overflow: { ...overflow, essenceConvertedThisWeek: overflow.essenceConvertedThisWeek + converted }, convertedEssence: converted, droppedXp: remaining };
    }
    return { progress: p, companionEssence: input.companionEssence, overflow: normalizeOverflow(input.overflow, input.serverNowMs), convertedEssence: 0, droppedXp: 0 };
}
function normalizeOverflow(value, nowMs) { const weekKey = (0, trial_season_1.companionTrialWeekKey)(nowMs); return value?.weekKey === weekKey ? { weekKey, essenceConvertedThisWeek: Math.max(0, Math.floor(value.essenceConvertedThisWeek)) } : { weekKey, essenceConvertedThisWeek: 0 }; }
function awardCompanionBondXpServer(progress, amount) { let total = Math.max(0, progress.bondXp + Math.floor(amount)), level = progress.bondLevel; while (level < 10 && total >= BOND_THRESHOLDS[level])
    level++; if (level >= 10)
    return { ...progress, bondLevel: 10, bondXp: BOND_THRESHOLDS[9], bondTraitUnlocked: true }; return { ...progress, bondLevel: level, bondXp: total, bondTraitUnlocked: progress.bondTraitUnlocked }; }
function companionUnlockRequirementSatisfied(r, f) {
    switch (r.type) {
        case 'trial_floor': return f.highestTrialFloor >= (r.amount ?? 1);
        case 'special_boss_clear': return !!r.target && f.specialBossClears.has(r.target);
        case 'boss_clear_count': return !!r.target && (f.bossClearCounts[r.target] ?? 0) >= (r.amount ?? 1);
        case 'region_completion': return !!r.target && f.regionCompletion.has(r.target);
        case 'event_completion': return !!r.target && f.eventCompletion.has(r.target);
        case 'companion_owned': return !!r.target && f.ownedCompanionIds.has(r.target);
        case 'companion_role_owned': return !!r.target && (f.ownedByRole[r.target] ?? 0) >= (r.amount ?? 1);
        case 'companion_bond_total': return (r.originId ? (f.bondTotalByOrigin?.[r.originId] ?? 0) : f.bondTotal) >= (r.amount ?? 1);
        case 'companion_level_total': return (r.originId ? (f.levelTotalByOrigin?.[r.originId] ?? 0) : f.levelTotal) >= (r.amount ?? 1);
        case 'achievement': return !!r.target && f.achievements.has(r.target);
        case 'currency_cost': return f.companionEssence >= (r.amount ?? 0);
        case 'mastery': return !!r.target && (f.mastery[r.target] ?? 0) >= (r.amount ?? 1);
        case 'reputation': return !!r.target && (f.reputation[r.target] ?? 0) >= (r.amount ?? 1);
        case 'event_challenge': return !!r.target && f.eventChallenges.has(r.target);
        default: return false;
    }
}
function companionUnlockRequirementsSatisfied(requirements, facts) { return requirements.every(r => companionUnlockRequirementSatisfied(r, facts)); }
function companionCodexEntry(progress, companionId) { const def = (0, content_1.companionServerDefinition)(companionId); if (!def)
    throw new Error('unknown_companion'); return { companionId, name: def.name, owned: !!progress, discovered: true, rarity: def.rarity, originId: def.originId, role: def.role, level: progress?.level ?? 0, maxLevel: content_1.COMPANION_RARITY_MAX_LEVEL[def.rarity], ascensionTier: progress?.ascensionTier ?? 0, bondLevel: progress?.bondLevel ?? 0, selectedTechniqueId: progress?.selectedTechniqueId, bondTraitUnlocked: progress?.bondTraitUnlocked ?? false, mastered: progress?.mastered ?? false, techniques: (0, content_1.companionTechniques)(companionId).map(x => ({ id: x.id, name: x.name, unlocked: progress ? techniqueUnlocked(progress, x.id) : false })) }; }
function setCompanionShowcase(state, ownedIds, favoriteCompanionId, showcaseCompanionIds) { if (favoriteCompanionId && !ownedIds.has(favoriteCompanionId))
    throw new Error('favorite_companion_not_owned'); const unique = [...new Set(showcaseCompanionIds)], slots = Math.max(1, Math.min(3, state.showcaseSlotsUnlocked ?? 3)); if (unique.length > slots)
    throw new Error('companion_showcase_slots_locked'); if (unique.some(id => !ownedIds.has(id)))
    throw new Error('showcase_companion_not_owned'); return { ...state, favoriteCompanionId, showcaseCompanionIds: unique, showcaseSlotsUnlocked: slots, discoveredCompanionIds: [...new Set([...(state.discoveredCompanionIds ?? []), ...ownedIds])] }; }
