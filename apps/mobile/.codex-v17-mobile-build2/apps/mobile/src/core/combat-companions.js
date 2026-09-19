"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMBAT_COMPANION_IDS = exports.legacyOwnedCompanionProgress = exports.defaultOwnedCompanionProgress = exports.defaultCompanionSanctuary = exports.usableCompanionRoles = exports.canEquipCompanion = exports.classCompanionRole = exports.CLASS_COMPANION_ROLE = void 0;
exports.companionXpToNextLevel = companionXpToNextLevel;
exports.companionLevelCost = companionLevelCost;
exports.companionCurrentLevelCap = companionCurrentLevelCap;
exports.companionMaxLevel = companionMaxLevel;
exports.requiredAscensionTierForLevel = requiredAscensionTierForLevel;
exports.nextCompanionAscension = nextCompanionAscension;
exports.migrateLegacyCombatCompanionAccount = migrateLegacyCombatCompanionAccount;
exports.legacyEquippedCombatCompanionId = legacyEquippedCombatCompanionId;
exports.sanitizeCombatCompanionState = sanitizeCombatCompanionState;
exports.isCombatCompanionMastered = isCombatCompanionMastered;
exports.companionUnlockRequirementMet = companionUnlockRequirementMet;
exports.reconcileCombatCompanionUnlocks = reconcileCombatCompanionUnlocks;
exports.unlockCombatCompanion = unlockCombatCompanion;
exports.equipCombatCompanion = equipCombatCompanion;
exports.unequipCombatCompanion = unequipCombatCompanion;
exports.purchaseCompanionLevel = purchaseCompanionLevel;
exports.companionAscensionCost = companionAscensionCost;
exports.ascendCombatCompanion = ascendCombatCompanion;
exports.masterPrestigeCompanion = masterPrestigeCompanion;
exports.applyCompanionXp = applyCompanionXp;
exports.applyCompanionBondXp = applyCompanionBondXp;
exports.companionBondXpMultiplier = companionBondXpMultiplier;
exports.grantEquippedCompanionUse = grantEquippedCompanionUse;
exports.grantCompanionBondFromUse = grantCompanionBondFromUse;
exports.companionAbilityValue = companionAbilityValue;
exports.companionCombatContribution = companionCombatContribution;
exports.companionSanctuaryUpgradeCost = companionSanctuaryUpgradeCost;
exports.upgradeCompanionSanctuary = upgradeCompanionSanctuary;
exports.claimSanctuaryTraining = claimSanctuaryTraining;
exports.claimSanctuaryEssence = claimSanctuaryEssence;
exports.isCompanionAvailable = isCompanionAvailable;
exports.canUseOwnedCompanion = canUseOwnedCompanion;
exports.combatCompanionUiModel = combatCompanionUiModel;
exports.grantCompanionEssence = grantCompanionEssence;
exports.grantBondstones = grantBondstones;
const combat_companions_1 = require("../content/combat-companions");
const class_skills_1 = require("./class-skills");
const monster_mastery_1 = require("./monster-mastery");
exports.CLASS_COMPANION_ROLE = {
    IRONWARDEN: 'tank', BASTION: 'tank', DREADGUARD: 'tank',
    DAWNKEEPER: 'support', STONECALLER: 'support',
    WAYFINDER: 'damage', RAVAGER: 'damage', HEXWEAVER: 'damage', KNIFE_DANCER: 'damage',
};
const classCompanionRole = (classId) => exports.CLASS_COMPANION_ROLE[classId];
exports.classCompanionRole = classCompanionRole;
const canEquipCompanion = (characterRole, companionRole) => characterRole !== companionRole;
exports.canEquipCompanion = canEquipCompanion;
const usableCompanionRoles = (companionRole) => ['damage', 'tank', 'support'].filter(role => role !== companionRole);
exports.usableCompanionRoles = usableCompanionRoles;
const defaultCompanionSanctuary = () => ({ trainingGroundLevel: 0, essenceBasinLevel: 0, bondHallLevel: 0, expeditionPensLevel: 0, masteryChamberLevel: 0 });
exports.defaultCompanionSanctuary = defaultCompanionSanctuary;
const defaultOwnedCompanionProgress = (nowMs = Date.now()) => ({ level: 1, xp: 0, ascensionTier: 0, bondLevel: 1, bondXp: 0, bondTraitUnlocked: false, obtainedAtMs: nowMs });
exports.defaultOwnedCompanionProgress = defaultOwnedCompanionProgress;
/** Legacy Combat Units had no level/Bond track. Preserve ownership with a modest head start rather than resetting earned units. */
const legacyOwnedCompanionProgress = () => ({ level: 10, xp: 0, ascensionTier: 0, bondLevel: 2, bondXp: 0, bondTraitUnlocked: false });
exports.legacyOwnedCompanionProgress = legacyOwnedCompanionProgress;
const int = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
const uniqueKnown = (values) => [...new Set(values.filter((id) => typeof id === 'string' && !!(0, combat_companions_1.combatCompanionDef)(id)))];
function companionXpToNextLevel(rarity, level) {
    if (level >= combat_companions_1.COMPANION_RARITY_CONFIG[rarity].maxLevel)
        return 0;
    return Math.max(1, Math.round(combat_companions_1.COMPANION_LEVEL_CURVE.baseXp * Math.pow(combat_companions_1.COMPANION_LEVEL_CURVE.xpGrowth, Math.max(0, level - 1)) * combat_companions_1.COMPANION_RARITY_CONFIG[rarity].xpRequiredMultiplier));
}
function companionLevelCost(rarity, level) {
    const cfg = combat_companions_1.COMPANION_RARITY_CONFIG[rarity], l = Math.max(1, level);
    return {
        gold: Math.round(combat_companions_1.COMPANION_LEVEL_CURVE.goldBase * Math.pow(combat_companions_1.COMPANION_LEVEL_CURVE.goldGrowth, l - 1) * cfg.levelCostMultiplier),
        companionEssence: Math.max(1, Math.round(combat_companions_1.COMPANION_LEVEL_CURVE.essenceBase * Math.pow(combat_companions_1.COMPANION_LEVEL_CURVE.essenceGrowth, l - 1) * cfg.levelCostMultiplier)),
    };
}
function companionCurrentLevelCap(def, progress) {
    return Math.min(combat_companions_1.COMPANION_RARITY_CONFIG[def.rarity].maxLevel, combat_companions_1.COMPANION_STAGE_CAPS[def.rarity][Math.max(0, Math.min(3, progress.ascensionTier))]);
}
function companionMaxLevel(def) { return combat_companions_1.COMPANION_RARITY_CONFIG[def.rarity].maxLevel; }
function requiredAscensionTierForLevel(def, level) {
    const caps = combat_companions_1.COMPANION_STAGE_CAPS[def.rarity];
    for (let tier = 0; tier < 4; tier++)
        if (level <= caps[tier])
            return tier;
    return 3;
}
function nextCompanionAscension(def, progress) {
    if (progress.ascensionTier === 0 && progress.level >= 10)
        return 1;
    if (progress.ascensionTier === 1 && progress.level >= 20)
        return 2;
    if (progress.ascensionTier === 2 && progress.level >= 25 && (def.rarity === 'elite' || def.rarity === 'prestige'))
        return 3;
    return undefined;
}
function normalizeProgress(def, value, fallback) {
    const max = companionMaxLevel(def), level = int(value?.level ?? fallback.level, 1, max);
    const inferred = requiredAscensionTierForLevel(def, level), ascensionTier = Math.max(inferred, int(value?.ascensionTier ?? fallback.ascensionTier, 0, 3));
    let bondLevel = int(value?.bondLevel ?? fallback.bondLevel, 1, combat_companions_1.COMPANION_BOND_CONFIG.maxLevel);
    const rawBondXp = int(value?.bondXp ?? fallback.bondXp), minimumBondXp = combat_companions_1.COMPANION_BOND_CONFIG.xpThresholds[Math.max(0, bondLevel - 1)] ?? 0;
    // v13 and earlier local saves stored Bond XP as progress within the current
    // level, while the authoritative server uses cumulative Bond XP. Detect the
    // residual form and promote it without losing earned progress.
    let normalizedBondXp = bondLevel >= 10 ? (combat_companions_1.COMPANION_BOND_CONFIG.xpThresholds[9] ?? 0) : (rawBondXp < minimumBondXp ? minimumBondXp + rawBondXp : rawBondXp);
    while (bondLevel < 10 && normalizedBondXp >= (combat_companions_1.COMPANION_BOND_CONFIG.xpThresholds[bondLevel] ?? Number.MAX_SAFE_INTEGER))
        bondLevel++;
    if (bondLevel >= 10)
        normalizedBondXp = combat_companions_1.COMPANION_BOND_CONFIG.xpThresholds[9] ?? normalizedBondXp;
    const cap = combat_companions_1.COMPANION_STAGE_CAPS[def.rarity][ascensionTier];
    const safeLevel = Math.min(level, cap, max), nextXp = companionXpToNextLevel(def.rarity, safeLevel);
    return {
        level: safeLevel,
        xp: safeLevel >= Math.min(cap, max) ? 0 : Math.min(int(value?.xp ?? fallback.xp), Math.max(0, nextXp - 1)),
        ascensionTier,
        bondLevel,
        bondXp: normalizedBondXp,
        bondTraitUnlocked: bondLevel >= 10,
        mastered: def.rarity === 'prestige' && safeLevel === 35 && value?.mastered === true,
        obtainedAtMs: Number.isFinite(value?.obtainedAtMs) ? value.obtainedAtMs : fallback.obtainedAtMs,
        originalEventReleaseYear: int(value?.originalEventReleaseYear ?? fallback.originalEventReleaseYear, 0) || undefined,
        veteranCosmeticEligible: value?.veteranCosmeticEligible === true || fallback.veteranCosmeticEligible === true,
        selectedTechniqueId: typeof value?.selectedTechniqueId === 'string' && value.selectedTechniqueId.startsWith(`${def.id}_`) ? value.selectedTechniqueId : undefined,
    };
}
function normalizeSanctuary(value) {
    const out = (0, exports.defaultCompanionSanctuary)();
    for (const key of Object.keys(combat_companions_1.COMPANION_SANCTUARY_CONFIG))
        out[key + 'Level'] = int(value?.[key + 'Level'], 0, combat_companions_1.COMPANION_SANCTUARY_CONFIG[key].maxLevel);
    out.lastTrainingClaimAtMs = Number.isFinite(value?.lastTrainingClaimAtMs) ? Math.max(0, value.lastTrainingClaimAtMs) : undefined;
    out.lastEssenceClaimAtMs = Number.isFinite(value?.lastEssenceClaimAtMs) ? Math.max(0, value.lastEssenceClaimAtMs) : undefined;
    return out;
}
/**
 * Converts known legacy Combat Unit field names. Passive Pet ownership is deliberately NOT considered here.
 */
function migrateLegacyCombatCompanionAccount(input) {
    const account = { ...(input?.account ?? {}), companionPhase2Profile: { ...input?.account?.companionPhase2Profile, showcaseSlotsUnlocked: input?.account?.companionPhase2Profile?.showcaseSlotsUnlocked ?? 1 } };
    const legacyOwned = uniqueKnown([
        ...(Array.isArray(account.unlockedCombatCompanionIds) ? account.unlockedCombatCompanionIds : []),
        ...(Array.isArray(account.ownedCombatUnitIds) ? account.ownedCombatUnitIds : []),
        ...(Array.isArray(account.unlockedCombatUnitIds) ? account.unlockedCombatUnitIds : []),
        ...(Array.isArray(account.ownedCompanionIds) ? account.ownedCompanionIds : []),
        ...(Array.isArray(input?.ownedCombatUnitIds) ? input.ownedCombatUnitIds : []),
    ]);
    const sources = [account.combatCompanionProgress, account.combatUnitProgress, account.companionProgress, input?.combatUnitProgress].filter(Boolean);
    const merged = {};
    for (const source of sources)
        if (source && typeof source === 'object')
            Object.assign(merged, source);
    const progress = {};
    for (const id of legacyOwned) {
        const def = (0, combat_companions_1.combatCompanionDef)(id);
        progress[id] = normalizeProgress(def, merged[id], (0, exports.legacyOwnedCompanionProgress)());
    }
    return {
        unlockedCombatCompanionIds: legacyOwned,
        combatCompanionProgress: progress,
        companionUnlockProgress: Object.fromEntries(Object.entries(account.companionUnlockProgress ?? {}).filter(([, value]) => Number.isFinite(Number(value)) && Number(value) >= 0).map(([key, value]) => [key, Number(value)])),
        companionEssence: int(account.companionEssence),
        bondstones: int(account.bondstones),
        companionSanctuary: normalizeSanctuary(account.companionSanctuary),
        companionTrialProjection: account.companionTrialProjection && typeof account.companionTrialProjection === 'object' ? account.companionTrialProjection : undefined,
        companionAssignments: Array.isArray(account.companionAssignments) ? account.companionAssignments.filter((entry) => entry && typeof entry.assignmentId === 'string' && typeof entry.missionId === 'string').slice(-12) : [],
        companionProvingGroundProjection: account.companionProvingGroundProjection && typeof account.companionProvingGroundProjection === 'object' ? account.companionProvingGroundProjection : undefined,
        companionCodexProjection: account.companionCodexProjection && typeof account.companionCodexProjection === 'object' ? account.companionCodexProjection : undefined,
        companionPhase2Profile: { favoriteCompanionId: typeof account.companionPhase2Profile?.favoriteCompanionId === 'string' ? account.companionPhase2Profile.favoriteCompanionId : undefined, showcaseCompanionIds: Array.isArray(account.companionPhase2Profile?.showcaseCompanionIds) ? uniqueKnown(account.companionPhase2Profile.showcaseCompanionIds).slice(0, 3) : [], showcaseSlotsUnlocked: int(account.companionPhase2Profile?.showcaseSlotsUnlocked ?? (Number(input?.version) === 13 ? 1 : 3), 1, 3) || 1, discoveredCompanionIds: Array.isArray(account.companionPhase2Profile?.discoveredCompanionIds) ? uniqueKnown(account.companionPhase2Profile.discoveredCompanionIds) : [], claimedCodexMilestoneIds: Array.isArray(account.companionPhase2Profile?.claimedCodexMilestoneIds) ? [...new Set(account.companionPhase2Profile.claimedCodexMilestoneIds.filter((id) => typeof id === 'string'))].slice(0, 100) : [], codexRewardIds: Array.isArray(account.companionPhase2Profile?.codexRewardIds) ? [...new Set(account.companionPhase2Profile.codexRewardIds.filter((id) => typeof id === 'string'))].slice(0, 100) : [], bestCompanionTeamPower: int(account.companionPhase2Profile?.bestCompanionTeamPower) || undefined, highestCompanionTrialFloor: int(account.companionPhase2Profile?.highestCompanionTrialFloor) || undefined },
        companionOverflow: typeof account.companionOverflow?.weekKey === 'string' ? { weekKey: account.companionOverflow.weekKey, essenceConvertedThisWeek: int(account.companionOverflow.essenceConvertedThisWeek) } : undefined,
    };
}
function legacyEquippedCombatCompanionId(character) {
    for (const key of ['equippedCombatCompanionId', 'selectedCombatUnitId', 'equippedCombatUnitId', 'combatUnitId', 'equippedCompanionId']) {
        const value = character?.[key];
        if (typeof value === 'string' && value.trim())
            return value;
    }
    return undefined;
}
function sanitizeCombatCompanionState(state) {
    const migrated = migrateLegacyCombatCompanionAccount(state), owned = uniqueKnown(migrated.unlockedCombatCompanionIds);
    const progress = {};
    for (const id of owned) {
        const def = (0, combat_companions_1.combatCompanionDef)(id);
        progress[id] = normalizeProgress(def, migrated.combatCompanionProgress[id], (0, exports.legacyOwnedCompanionProgress)());
    }
    const cleanCharacter = (character) => {
        if (!character)
            return character;
        const id = legacyEquippedCombatCompanionId(character), def = id ? (0, combat_companions_1.combatCompanionDef)(id) : undefined;
        const valid = !!id && !!def && owned.includes(id) && (0, exports.canEquipCompanion)((0, exports.classCompanionRole)(character.classId), def.role);
        return { ...character, equippedCombatCompanionId: valid ? id : undefined };
    };
    return { ...state, character: cleanCharacter(state.character), otherCharacters: (state.otherCharacters ?? []).map(entry => ({ ...entry, character: cleanCharacter(entry.character) })), account: { ...state.account, ...migrated, unlockedCombatCompanionIds: owned, combatCompanionProgress: progress } };
}
function isCombatCompanionMastered(def, progress) { const requiredAscension = (def.rarity === 'standard' || def.rarity === 'rare') ? 2 : 3; const techniqueSystemUnlocked = progress.ascensionTier >= 2 && progress.bondLevel >= 7; return progress.level >= companionMaxLevel(def) && progress.ascensionTier >= requiredAscension && progress.bondLevel >= 10 && progress.bondTraitUnlocked && techniqueSystemUnlocked && (def.rarity !== 'prestige' || progress.mastered === true); }
function companionUnlockRequirementMet(state, requirement) {
    const target = requirement.target ?? requirement.description, amount = Math.max(1, requirement.amount ?? 1);
    if (target === 'KNIFE_DANCER_SKILL_TOTAL' && state.character?.classId === 'KNIFE_DANCER')
        return (0, class_skills_1.normalizeClassSkills)('KNIFE_DANCER', state.character.classSkills).reduce((sum, s) => sum + s.level, 0) >= amount;
    if (requirement.type === 'monster_mastery' && state.character?.monsterMasteryPoints?.[target] !== undefined)
        return Math.floor(((0, monster_mastery_1.normalizeMonsterMastery)(state.character.monsterMasteryPoints)[target] ?? 0) / 25) >= amount;
    if (target === 'ASTERFALL_MASTERY_20_ALL' && state.character?.monsterMasteryPoints)
        return Object.values((0, monster_mastery_1.normalizeMonsterMastery)(state.character.monsterMasteryPoints)).filter(n => n >= 500).length >= amount;
    if (requirement.type === 'quest')
        return (state.quests ?? []).some(entry => entry.questId === target && entry.status === 'claimed');
    if (requirement.type === 'boss_kills')
        return Math.max((state.defeatedBossIds ?? []).includes(target) ? 1 : 0, state.account.companionBossClears?.[target] ?? 0) >= amount;
    if (requirement.type === 'skill_level')
        return (state.skills ?? []).some(skill => skill.skillId === target && skill.level >= amount);
    return (state.account.companionUnlockProgress?.[target] ?? 0) >= amount;
}
function reconcileCombatCompanionUnlocks(state, nowMs = Date.now()) {
    let next = sanitizeCombatCompanionState(state);
    for (const def of combat_companions_1.COMBAT_COMPANIONS) {
        if ((next.account.unlockedCombatCompanionIds ?? []).includes(def.id))
            continue;
        if (def.unlockRequirements.length && def.unlockRequirements.every(requirement => companionUnlockRequirementMet(next, requirement)))
            next = unlockCombatCompanion(next, def.id, nowMs);
    }
    return next;
}
function unlockCombatCompanion(state, id, nowMs = Date.now()) {
    const def = (0, combat_companions_1.combatCompanionDef)(id);
    if (!def)
        throw new Error('Unknown combat companion.');
    const clean = sanitizeCombatCompanionState(state), owned = clean.account.unlockedCombatCompanionIds ?? [];
    if (owned.includes(id))
        return clean;
    return { ...clean, account: { ...clean.account, unlockedCombatCompanionIds: [...owned, id], combatCompanionProgress: { ...(clean.account.combatCompanionProgress ?? {}), [id]: { ...(0, exports.defaultOwnedCompanionProgress)(nowMs), originalEventReleaseYear: def.availability?.originalReleaseYear, veteranCosmeticEligible: def.availability?.veteranCosmeticEligibility } } } };
}
function equipCombatCompanion(state, id) {
    const clean = sanitizeCombatCompanionState(state);
    if (!clean.character)
        throw new Error('Create a character first.');
    const def = (0, combat_companions_1.combatCompanionDef)(id);
    if (!def)
        throw new Error('Unknown combat companion.');
    if (!(clean.account.unlockedCombatCompanionIds ?? []).includes(id))
        throw new Error('This combat companion is locked.');
    if ((clean.account.companionAssignments ?? []).some(a => a.status !== 'claimed' && a.status !== 'cancelled' && a.companionIds?.includes(id)))
        throw new Error('This combat companion is on a Sanctuary Expedition.');
    const characterRole = (0, exports.classCompanionRole)(clean.character.classId);
    if (!(0, exports.canEquipCompanion)(characterRole, def.role))
        throw new Error(`Cannot equip: ${def.role} companions cannot be used by a ${characterRole} character.`);
    return { ...clean, character: { ...clean.character, equippedCombatCompanionId: id } };
}
function unequipCombatCompanion(state) { return !state.character ? state : { ...state, character: { ...state.character, equippedCombatCompanionId: undefined } }; }
function inventoryQty(state, itemId) { if (!itemId)
    return 0; return [...state.inventory.stacks, ...state.bank.stacks].filter(stack => stack.itemId === itemId).reduce((sum, stack) => sum + Math.max(0, stack.quantity), state.account.companionMaterials?.[itemId] ?? 0); }
function consumeStacks(stacks, itemId, amount) { let left = amount; return stacks.map(stack => { if (stack.itemId !== itemId || left <= 0)
    return stack; const used = Math.min(left, stack.quantity); left -= used; return { ...stack, quantity: stack.quantity - used }; }).filter(stack => stack.quantity > 0); }
function consumeMaterial(state, itemId, amount) {
    if (!itemId || amount <= 0)
        return state;
    if (inventoryQty(state, itemId) < amount)
        throw new Error(`Missing ${amount} ${itemId}.`);
    const stored = Math.min(amount, state.account.companionMaterials?.[itemId] ?? 0);
    amount -= stored;
    const fromInventory = Math.min(amount, state.inventory.stacks.filter(stack => stack.itemId === itemId).reduce((sum, stack) => sum + stack.quantity, 0)), remaining = amount - fromInventory;
    return { ...state, account: { ...state.account, companionMaterials: { ...state.account.companionMaterials, [itemId]: (state.account.companionMaterials?.[itemId] ?? 0) - stored } }, inventory: { ...state.inventory, stacks: consumeStacks(state.inventory.stacks, itemId, fromInventory) }, bank: { ...state.bank, stacks: consumeStacks(state.bank.stacks, itemId, remaining) } };
}
function progressFor(state, id) { const progress = state.account.combatCompanionProgress?.[id]; if (!progress)
    throw new Error('Combat companion is not owned.'); return progress; }
function setProgress(state, id, progress) { return { ...state, account: { ...state.account, combatCompanionProgress: { ...(state.account.combatCompanionProgress ?? {}), [id]: progress } } }; }
function purchaseCompanionLevel(state, id) {
    let clean = sanitizeCombatCompanionState(state);
    if (!clean.character)
        throw new Error('Create a character first.');
    const def = (0, combat_companions_1.combatCompanionDef)(id);
    if (!def || !(clean.account.unlockedCombatCompanionIds ?? []).includes(id))
        throw new Error('Combat companion is locked.');
    const p = progressFor(clean, id), cap = companionCurrentLevelCap(def, p), max = companionMaxLevel(def);
    if (p.level >= max)
        throw new Error('Maximum companion level reached.');
    if (p.level >= cap)
        throw new Error('Ascension required before further leveling.');
    const cost = companionLevelCost(def.rarity, p.level);
    if (clean.character.gold < cost.gold)
        throw new Error('Not enough Gold.');
    if ((clean.account.companionEssence ?? 0) < cost.companionEssence)
        throw new Error('Not enough Companion Essence.');
    clean = { ...clean, character: { ...clean.character, gold: clean.character.gold - cost.gold }, account: { ...clean.account, companionEssence: (clean.account.companionEssence ?? 0) - cost.companionEssence } };
    return setProgress(clean, id, { ...p, level: p.level + 1, xp: 0 });
}
function companionAscensionCost(def, tier) {
    const base = combat_companions_1.COMPANION_ASCENSION_BASE_COST[tier], mult = combat_companions_1.COMPANION_RARITY_CONFIG[def.rarity].levelCostMultiplier;
    const override = def.ascensionMaterialCosts?.find(entry => entry.tier === tier);
    return { gold: Math.round(base.gold * mult), companionEssence: Math.round(base.companionEssence * mult), bondstones: Math.max(1, Math.round(base.bondstones * Math.sqrt(mult))), materialId: override?.itemId ?? def.ascensionMaterialId, materialQuantity: override?.quantity ?? base.materialQuantity };
}
function ascendCombatCompanion(state, id) {
    let clean = sanitizeCombatCompanionState(state);
    if (!clean.character)
        throw new Error('Create a character first.');
    const def = (0, combat_companions_1.combatCompanionDef)(id);
    if (!def || !(clean.account.unlockedCombatCompanionIds ?? []).includes(id))
        throw new Error('Combat companion is locked.');
    const p = progressFor(clean, id), tier = nextCompanionAscension(def, p);
    if (!tier)
        throw new Error('Ascension is not available at the current level.');
    if (tier === 3 && (clean.account.companionSanctuary?.masteryChamberLevel ?? 0) < 1)
        throw new Error('Mastery Chamber is required for Ascension III.');
    const cost = companionAscensionCost(def, tier);
    if (clean.character.gold < cost.gold)
        throw new Error('Not enough Gold.');
    if ((clean.account.companionEssence ?? 0) < cost.companionEssence)
        throw new Error('Not enough Companion Essence.');
    if ((clean.account.bondstones ?? 0) < cost.bondstones)
        throw new Error('Not enough Bondstones.');
    if (cost.materialId && inventoryQty(clean, cost.materialId) < (cost.materialQuantity ?? 0))
        throw new Error(`Missing regional material: ${cost.materialId}.`);
    // All validation happens before the first deduction so failures are atomic.
    clean = { ...clean, character: { ...clean.character, gold: clean.character.gold - cost.gold }, account: { ...clean.account, companionEssence: (clean.account.companionEssence ?? 0) - cost.companionEssence, bondstones: (clean.account.bondstones ?? 0) - cost.bondstones } };
    clean = consumeMaterial(clean, cost.materialId, cost.materialQuantity ?? 0);
    return setProgress(clean, id, { ...p, ascensionTier: tier });
}
function masterPrestigeCompanion(state, id) {
    let clean = sanitizeCombatCompanionState(state);
    if (!clean.character)
        throw new Error('Create a character first.');
    const def = (0, combat_companions_1.combatCompanionDef)(id);
    if (!def || def.rarity !== 'prestige')
        throw new Error('Prestige Mastery is only available to Prestige companions.');
    const p = progressFor(clean, id);
    if (p.level !== 35 || p.ascensionTier < 3)
        throw new Error('Reach Prestige Level 35 first.');
    if (p.mastered)
        return clean;
    if ((clean.account.companionSanctuary?.masteryChamberLevel ?? 0) < 1)
        throw new Error('Mastery Chamber is required.');
    const cost = companionAscensionCost(def, 'mastery');
    if (clean.character.gold < cost.gold || (clean.account.companionEssence ?? 0) < cost.companionEssence || (clean.account.bondstones ?? 0) < cost.bondstones || inventoryQty(clean, cost.materialId) < (cost.materialQuantity ?? 0))
        throw new Error('Missing Prestige Mastery resources.');
    clean = { ...clean, character: { ...clean.character, gold: clean.character.gold - cost.gold }, account: { ...clean.account, companionEssence: (clean.account.companionEssence ?? 0) - cost.companionEssence, bondstones: (clean.account.bondstones ?? 0) - cost.bondstones } };
    clean = consumeMaterial(clean, cost.materialId, cost.materialQuantity ?? 0);
    return setProgress(clean, id, { ...p, mastered: true });
}
function applyCompanionXp(progress, def, amount) {
    let p = { ...progress, xp: Math.max(0, progress.xp) }, remaining = Math.max(0, Math.floor(amount)), cap = companionCurrentLevelCap(def, p), max = companionMaxLevel(def);
    while (remaining > 0 && p.level < cap && p.level < max) {
        const need = companionXpToNextLevel(def.rarity, p.level) - p.xp;
        if (remaining < need) {
            p.xp += remaining;
            remaining = 0;
            break;
        }
        remaining -= need;
        p.level++;
        p.xp = 0;
        cap = companionCurrentLevelCap(def, p);
    }
    if (p.level >= cap || p.level >= max)
        p.xp = 0;
    return p;
}
function bondThreshold(level) { return combat_companions_1.COMPANION_BOND_CONFIG.xpThresholds[Math.max(0, Math.min(9, level - 1))] ?? Number.MAX_SAFE_INTEGER; }
function applyCompanionBondXp(progress, amount) {
    let level = progress.bondLevel, xp = Math.max(bondThreshold(level), progress.bondXp) + Math.max(0, Math.floor(amount));
    while (level < 10 && xp >= bondThreshold(level + 1))
        level++;
    if (level >= 10)
        xp = bondThreshold(10);
    return { ...progress, bondLevel: level, bondXp: xp, bondTraitUnlocked: level >= 10 || progress.bondTraitUnlocked };
}
function companionBondXpMultiplier(state) { const level = int(state.account.companionSanctuary?.bondHallLevel, 0, 3); return 1 + combat_companions_1.COMPANION_SANCTUARY_BOND_BONUS[level]; }
function bondSourceXp(source) { const value = combat_companions_1.COMPANION_BOND_CONFIG.sourceXp[source]; if (!Number.isFinite(value))
    throw new Error('Invalid Companion Bond source.'); return value; }
function grantEquippedCompanionUse(state, source, units = 1) {
    const clean = sanitizeCombatCompanionState(state), id = clean.character?.equippedCombatCompanionId;
    if (!id || units <= 0)
        return clean;
    const def = (0, combat_companions_1.combatCompanionDef)(id);
    let p = progressFor(clean, id);
    const count = Math.max(1, Math.floor(units));
    const xpPerUnit = source === 'boss' ? 120 : source === 'dungeon' ? 55 : source === 'companion_objective' ? 70 : source === 'future_activity' ? 20 : 9;
    p = applyCompanionXp(p, def, xpPerUnit * count);
    const bondBase = bondSourceXp(source) * count;
    p = applyCompanionBondXp(p, Math.round(bondBase * companionBondXpMultiplier(clean)));
    return setProgress(clean, id, p);
}
/** Bond XP has no generic resource-purchase entry point: callers must supply an allowed real-use source. */
function grantCompanionBondFromUse(state, id, source, units = 1) {
    const clean = sanitizeCombatCompanionState(state);
    if (!(clean.account.unlockedCombatCompanionIds ?? []).includes(id))
        throw new Error('Combat companion is locked.');
    const p = progressFor(clean, id), gain = Math.round(bondSourceXp(source) * Math.max(1, Math.floor(units)) * companionBondXpMultiplier(clean));
    return setProgress(clean, id, applyCompanionBondXp(p, gain));
}
function companionAbilityValue(def, progress) { const scaling = def.activeAbility.scaling, value = scaling.baseValue + scaling.perLevel * Math.max(0, progress.level - 1); return Math.min(scaling.maxValue ?? Number.POSITIVE_INFINITY, value); }
function companionCombatContribution(state) {
    const clean = sanitizeCombatCompanionState(state), id = clean.character?.equippedCombatCompanionId;
    if (!id)
        return { outputMultiplier: 1, incomingDamageMultiplier: 1, recoveryMultiplier: 1, contributionPct: 0 };
    if (clean.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id) || (clean.account.companionAssignments ?? []).some(a => a.status !== 'claimed' && a.status !== 'cancelled' && a.companionIds.includes(id)))
        return { outputMultiplier: 1, incomingDamageMultiplier: 1, recoveryMultiplier: 1, contributionPct: 0 };
    const def = (0, combat_companions_1.combatCompanionDef)(id), p = progressFor(clean, id), rarity = combat_companions_1.COMPANION_RARITY_CONFIG[def.rarity];
    // Rarity target is deliberately applied exactly once here. Level/Bond only move toward that budget.
    const investment = .55 + .35 * (p.level / rarity.maxLevel) + .10 * (p.bondLevel / 10), base = .07, contribution = Math.min(.12, base * rarity.targetPowerMultiplier * investment);
    if (def.role === 'damage')
        return { outputMultiplier: 1 + contribution, incomingDamageMultiplier: 1, recoveryMultiplier: 1, contributionPct: contribution };
    if (def.role === 'tank')
        return { outputMultiplier: 1 + contribution * .12, incomingDamageMultiplier: 1 - contribution * .78, recoveryMultiplier: 1 + contribution * .25, contributionPct: contribution };
    return { outputMultiplier: 1 + contribution * .42, incomingDamageMultiplier: 1 - contribution * .12, recoveryMultiplier: 1 + contribution * .72, contributionPct: contribution };
}
function companionSanctuaryUpgradeCost(state, upgrade) { const clean = sanitizeCombatCompanionState(state), cfg = combat_companions_1.COMPANION_SANCTUARY_CONFIG[upgrade], level = int(clean.account.companionSanctuary?.[`${upgrade}Level`], 0, cfg.maxLevel); if (level >= cfg.maxLevel)
    return undefined; return { gold: cfg.goldCosts[level], companionEssence: cfg.essenceCosts[level], materialId: cfg.materialId, materialQuantity: cfg.materialCosts?.[level] ?? 0 }; }
function upgradeCompanionSanctuary(state, upgrade) {
    let clean = sanitizeCombatCompanionState(state);
    if (!clean.character)
        throw new Error('Create a character first.');
    const cost = companionSanctuaryUpgradeCost(clean, upgrade);
    if (!cost)
        throw new Error('Sanctuary upgrade is already at maximum level.');
    if (clean.character.gold < cost.gold)
        throw new Error('Not enough Gold.');
    if ((clean.account.companionEssence ?? 0) < cost.companionEssence)
        throw new Error('Not enough Companion Essence.');
    if (cost.materialId && inventoryQty(clean, cost.materialId) < cost.materialQuantity)
        throw new Error(`Missing Sanctuary material: ${cost.materialId}.`);
    const sanctuary = clean.account.companionSanctuary ?? (0, exports.defaultCompanionSanctuary)(), key = `${upgrade}Level`;
    clean = { ...clean, character: { ...clean.character, gold: clean.character.gold - cost.gold }, account: { ...clean.account, companionEssence: (clean.account.companionEssence ?? 0) - cost.companionEssence, companionSanctuary: { ...sanctuary, [key]: Number(sanctuary[key] ?? 0) + 1 } } };
    return consumeMaterial(clean, cost.materialId, cost.materialQuantity);
}
function claimSanctuaryTraining(state, nowMs) {
    let clean = sanitizeCombatCompanionState(state), sanctuary = clean.account.companionSanctuary ?? (0, exports.defaultCompanionSanctuary)(), level = int(sanctuary.trainingGroundLevel, 0, 3);
    if (!level)
        return clean;
    const day = 86400000, last = sanctuary.lastTrainingClaimAtMs;
    if (last === undefined)
        return { ...clean, account: { ...clean.account, companionSanctuary: { ...sanctuary, lastTrainingClaimAtMs: nowMs } } };
    const days = Math.min(7, Math.floor(Math.max(0, nowMs - last) / day));
    if (days < 1)
        return clean;
    const gain = combat_companions_1.COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[level] * days, progress = { ...(clean.account.combatCompanionProgress ?? {}) };
    for (const id of clean.account.unlockedCombatCompanionIds ?? []) {
        const def = (0, combat_companions_1.combatCompanionDef)(id);
        const busy = (clean.account.companionAssignments ?? []).some(a => a.status !== 'claimed' && a.status !== 'cancelled' && a.companionIds.includes(id)) || clean.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id);
        if (def && progress[id] && !busy)
            progress[id] = applyCompanionXp(progress[id], def, gain);
    }
    return { ...clean, account: { ...clean.account, combatCompanionProgress: progress, companionSanctuary: { ...sanctuary, lastTrainingClaimAtMs: nowMs - Math.max(0, nowMs - last) % day } } };
}
function claimSanctuaryEssence(state, nowMs) {
    const clean = sanitizeCombatCompanionState(state), sanctuary = clean.account.companionSanctuary ?? (0, exports.defaultCompanionSanctuary)(), level = int(sanctuary.essenceBasinLevel, 0, 3);
    if (!level)
        return clean;
    const week = 7 * 86400000, last = sanctuary.lastEssenceClaimAtMs;
    if (last === undefined)
        return { ...clean, account: { ...clean.account, companionSanctuary: { ...sanctuary, lastEssenceClaimAtMs: nowMs } } };
    const periods = Math.min(2, Math.floor(Math.max(0, nowMs - last) / week));
    if (periods < 1)
        return clean;
    return { ...clean, account: { ...clean.account, companionEssence: (clean.account.companionEssence ?? 0) + combat_companions_1.COMPANION_SANCTUARY_WEEKLY_ESSENCE[level] * periods, companionSanctuary: { ...sanctuary, lastEssenceClaimAtMs: nowMs - Math.max(0, nowMs - last) % week } } };
}
function isCompanionAvailable(def, context = {}) {
    const availability = def.availability;
    if (!availability?.eventSource)
        return true;
    if (availability.recurringAvailability === 'permanent')
        return true;
    return (context.activeEventIds ?? []).includes(availability.eventSource);
}
/** Previously obtained event companions remain owned/equippable even when the event is not currently active. */
function canUseOwnedCompanion(state, id) { return (state.account.unlockedCombatCompanionIds ?? []).includes(id) && !!(0, combat_companions_1.combatCompanionDef)(id); }
function combatCompanionUiModel(state, id) {
    const clean = sanitizeCombatCompanionState(state), def = (0, combat_companions_1.combatCompanionDef)(id);
    if (!def)
        return undefined;
    const owned = (clean.account.unlockedCombatCompanionIds ?? []).includes(id), p = owned ? clean.account.combatCompanionProgress?.[id] : undefined, characterRole = clean.character ? (0, exports.classCompanionRole)(clean.character.classId) : undefined;
    const compatible = !!characterRole && (0, exports.canEquipCompanion)(characterRole, def.role), cap = p ? companionCurrentLevelCap(def, p) : 10, max = companionMaxLevel(def), cost = p && p.level < cap ? companionLevelCost(def.rarity, p.level) : undefined, tier = p ? nextCompanionAscension(def, p) : undefined;
    return { def, owned, progress: p, compatible, equipped: clean.character?.equippedCombatCompanionId === id, usableRoles: (0, exports.usableCompanionRoles)(def.role), levelCap: cap, maxLevel: max, nextLevelCost: cost, nextAscensionTier: tier, nextAscensionCost: tier ? companionAscensionCost(def, tier) : undefined, abilityValue: p ? companionAbilityValue(def, p) : def.activeAbility.scaling.baseValue };
}
exports.COMBAT_COMPANION_IDS = combat_companions_1.COMBAT_COMPANIONS.map(entry => entry.id);
/** Reward hooks for dungeons, achievements, events, daily/weekly objectives and future companion content. */
function grantCompanionEssence(state, amount) {
    const gain = Math.max(0, Math.floor(amount));
    if (!gain)
        return state;
    return { ...state, account: { ...state.account, companionEssence: (state.account.companionEssence ?? 0) + gain } };
}
function grantBondstones(state, amount) {
    const gain = Math.max(0, Math.floor(amount));
    if (!gain)
        return state;
    return { ...state, account: { ...state.account, bondstones: (state.account.bondstones ?? 0) + gain } };
}
