"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCharacterCompanionAssist = applyCharacterCompanionAssist;
const content_1 = require("./content");
const combat_adapter_1 = require("./combat-adapter");
const policy_1 = require("./policy");
/** Keep four player slots; each owner's frozen companion casts a budgeted assist. */
function applyCharacterCompanionAssist(owner, progress) {
    if (!progress)
        return owner;
    const policy = (0, policy_1.validateCompanionLoadout)({ classId: owner.classId, companionId: progress.companionId, ownedCompanionIds: [progress.companionId] });
    if (!policy.ok)
        throw new Error(policy.reason);
    const safe = (0, policy_1.validateProgressionSnapshot)(progress.companionId, progress);
    if (safe.level !== progress.level || safe.ascensionTier !== progress.ascensionTier || safe.bondLevel !== progress.bondLevel)
        throw new Error('invalid_companion_snapshot');
    const def = (0, content_1.companionServerDefinition)(progress.companionId);
    const unit = (0, combat_adapter_1.buildOwnedCompanionCombatant)(progress, { mode: 'character_assist', ownerId: owner.id }), active = unit.abilities[0];
    const technique = progress.selectedTechniqueId ? (0, content_1.companionTechnique)(progress.selectedTechniqueId) : undefined;
    const value = (kind) => technique?.companionId === def.id ? technique.effects.filter(e => e.kind === kind).reduce((sum, e) => sum + e.value, 0) : 0;
    const budget = Math.min(.12, .07 * content_1.COMPANION_RARITY_TARGET[def.rarity] * (.55 + .35 * progress.level / content_1.COMPANION_RARITY_MAX_LEVEL[def.rarity] + .1 * progress.bondLevel / 10) * (1 + value('damage')) * def.active.cooldownMs / active.cooldownMs);
    const damageCoeff = budget * owner.basicAttackCoeff * active.cooldownMs / owner.basicAttackMs;
    const ability = { ...active, id: `${owner.id}:${def.id}:assist`, name: `${def.name}: ${active.name}`, target: def.role === 'damage' ? 'current_target' : 'self', aiCondition: def.role === 'damage' ? 'always' : 'self_below_50', effects: def.role === 'damage' ? [{ kind: 'damage', coeff: damageCoeff, executeBelowHpPct: .30, executeBonus: value('execute'), tag: 'companion_assist' }] : def.role === 'tank' ? [{ kind: 'shield', flat: owner.stats.maxHp * budget * .5 * (1 + value('shield_strength')), shieldReflectPct: value('reflect'), tag: 'companion_assist' }] : [{ kind: 'heal', flat: owner.stats.maxHp * budget * .35 * (1 + value('heal_strength')), tag: 'companion_assist' }], tags: ['combat_companion', def.id, def.role] };
    return { ...owner, abilities: [...owner.abilities, ability], tags: [...(owner.tags ?? []), `companion:${def.id}`] };
}
