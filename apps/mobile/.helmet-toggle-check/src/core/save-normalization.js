"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSave = normalizeSave;
const quests_1 = require("../content/quests");
const classes_1 = require("../content/classes");
const customization_1 = require("./customization");
function normalizeSave(input) {
    if (!input || ![4, 5, 6].includes(input.version))
        throw new Error('Unsupported VELDRYN save version');
    const existing = new Map((input.quests || []).map((q) => [q.questId, q]));
    let priorClaimed = true;
    const quests = quests_1.QUESTS.map((def, index) => {
        const old = existing.get(def.id);
        if (old) {
            priorClaimed = old.status === 'claimed';
            return old;
        }
        const status = index === 0 ? 'active' : priorClaimed ? 'active' : 'locked';
        priorClaimed = false;
        return { questId: def.id, status, progress: 0 };
    });
    const classDef = input.character ? classes_1.CLASSES.find(c => c.id === input.character.classId) : undefined;
    const character = input.character ? {
        ...input.character,
        bodyPresentation: input.character.bodyPresentation === 'female' ? 'female' : 'male',
        customization: (0, customization_1.normalizeCustomization)(input.character.customization),
        craftedNoviceItemIds: Array.isArray(input.character.craftedNoviceItemIds) ? [...new Set(input.character.craftedNoviceItemIds.filter((id) => typeof id === 'string'))] : [],
        currentHp: Math.max(1, Number(input.character.currentHp ?? input.character.hp ?? classDef?.hp ?? 100)),
        equippedFoodId: input.character.equippedFoodId,
        profileTitle: typeof input.character.profileTitle === 'string' && input.character.profileTitle.trim() ? input.character.profileTitle.trim() : 'New Adventurer',
        profileBackgroundId: typeof input.character.profileBackgroundId === 'string' && input.character.profileBackgroundId.trim() ? input.character.profileBackgroundId : 'asterfall-night',
        profileAppearanceMode: input.character.profileAppearanceMode === 'showcase' ? 'showcase' : 'live',
        profileEquipmentSnapshot: input.character.profileEquipmentSnapshot && typeof input.character.profileEquipmentSnapshot === 'object' ? input.character.profileEquipmentSnapshot : {}
    } : null;
    return {
        ...input,
        version: 6,
        character,
        inventory: { stacks: Array.isArray(input.inventory?.stacks) ? input.inventory.stacks : [], capacity: Number(input.inventory?.capacity ?? 30) },
        bank: { stacks: Array.isArray(input.bank?.stacks) ? input.bank.stacks : [], capacity: Number(input.bank?.capacity ?? 120) },
        overflow: { stacks: Array.isArray(input.overflow?.stacks) ? input.overflow.stacks : [], expiresAtMs: input.overflow?.expiresAtMs ?? null },
        quests,
        unlockedMonsterIds: Array.isArray(input.unlockedMonsterIds) ? input.unlockedMonsterIds : ['MOSS_RAT'],
        defeatedBossIds: Array.isArray(input.defeatedBossIds) ? input.defeatedBossIds : [],
        account: { createdCharacterCount: Math.max(1, Number(input.account?.createdCharacterCount ?? 1)), guildMember: !!input.account?.guildMember, patronTier: ['bloom', 'crown'].includes(input.account?.patronTier) ? input.account.patronTier : 'none', guildContribution: Math.max(0, Number(input.account?.guildContribution ?? 0)), guildProjectProgress: Math.max(0, Number(input.account?.guildProjectProgress ?? 0)), guildBossHp: Math.max(0, Number(input.account?.guildBossHp ?? 100000)), guildProjectClaimed: !!input.account?.guildProjectClaimed, guildJoinPolicy: ['open', 'apply', 'invite'].includes(input.account?.guildJoinPolicy) ? input.account.guildJoinPolicy : 'open', guildMinimumLevel: Math.max(1, Number(input.account?.guildMinimumLevel ?? 10)), guildApplicationStatus: ['pending', 'accepted', 'declined'].includes(input.account?.guildApplicationStatus) ? input.account.guildApplicationStatus : 'none' },
        settings: {
            language: ['nl', 'de'].includes(input.settings?.language) ? input.settings.language : 'en',
            numberMode: input.settings?.numberMode || 'abbreviated',
            reduceMotion: !!input.settings?.reduceMotion,
            textScale: input.settings?.textScale || 1,
            autoEatThresholdPct: Number(input.settings?.autoEatThresholdPct ?? 40),
            stopCombatWhenOutOfFood: input.settings?.stopCombatWhenOutOfFood !== false,
            autoJoinWorldChat: input.settings?.autoJoinWorldChat !== false,
            defaultWorldChat: [1, 2, 3, 4].includes(Number(input.settings?.defaultWorldChat)) ? Number(input.settings.defaultWorldChat) : 1,
        }
    };
}
