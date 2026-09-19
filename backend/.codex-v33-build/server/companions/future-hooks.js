"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FUTURE_COMPANION_RUN_BOONS = void 0;
exports.companionMatchesRunEffectFilter = companionMatchesRunEffectFilter;
exports.buildCompanionArenaSnapshot = buildCompanionArenaSnapshot;
const content_1 = require("./content");
const combat_adapter_1 = require("./combat-adapter");
function companionMatchesRunEffectFilter(progress, filter) { const def = (0, content_1.companionServerDefinition)(progress.companionId); if (!def)
    return false; if (filter.companionId && filter.companionId !== def.id)
    return false; if (filter.companionRole && filter.companionRole !== def.role)
    return false; if (filter.rarity && filter.rarity !== def.rarity)
    return false; if (filter.originId && filter.originId !== def.originId)
    return false; if (filter.tag && !def.tags.includes(filter.tag))
    return false; return true; }
exports.FUTURE_COMPANION_RUN_BOONS = [
    { id: 'SHARPENED_CLAWS', name: 'Sharpened Claws', filter: { companionRole: 'damage' }, effects: [{ kind: 'attack_speed', value: .15 }], runOnly: true },
    { id: 'GUARDIAN_BOND', name: 'Guardian Bond', filter: { companionRole: 'tank' }, effects: [{ kind: 'shield_strength', value: .20 }], runOnly: true },
    { id: 'SHARED_SPIRIT', name: 'Shared Spirit', filter: { companionRole: 'support' }, effects: [{ kind: 'additional_ally_reduced', value: .50 }], runOnly: true },
    { id: 'QUICK_INSTINCT', name: 'Quick Instinct', filter: {}, effects: [{ kind: 'active_cooldown', value: -.10 }], runOnly: true },
    { id: 'LAST_STAND', name: 'Last Stand', filter: {}, effects: [{ kind: 'prevent_death_once', value: 1 }], runOnly: true },
];
function buildCompanionArenaSnapshot(accountId, team, createdAt) { return { accountId, createdAt, companionIds: team.map(x => x.companionId), combatants: team.map(x => (0, combat_adapter_1.buildOwnedCompanionCombatant)(x, { mode: 'companion_arena' })), normalizationVersion: 'raw_pve_identity_v1' }; }
