"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.individualCompanionPower = individualCompanionPower;
exports.companionTeamViews = companionTeamViews;
exports.companionTeamPower = companionTeamPower;
exports.evaluateCompanionSynergies = evaluateCompanionSynergies;
exports.totalCompanionSynergyMultiplier = totalCompanionSynergyMultiplier;
exports.totalCompanionHasteBonus = totalCompanionHasteBonus;
exports.companionEssenceRewardMultiplier = companionEssenceRewardMultiplier;
exports.restrictionSatisfied = restrictionSatisfied;
exports.validateCompanionTrialTeam = validateCompanionTrialTeam;
const content_1 = require("./content");
const combat_adapter_1 = require("./combat-adapter");
function individualCompanionPower(progress) {
    const def = (0, content_1.companionServerDefinition)(progress.companionId);
    if (!def)
        throw new Error('unknown_companion');
    const max = content_1.COMPANION_RARITY_MAX_LEVEL[def.rarity], fraction = max <= 1 ? 1 : Math.max(0, Math.min(1, (progress.level - 1) / (max - 1))), base = (0, combat_adapter_1.companionBalancedBaseStats)(def);
    const roleAnchor = def.role === 'damage' ? { hp: 180, power: 22, defense: 12 } : def.role === 'tank' ? { hp: 260, power: 14, defense: 24 } : { hp: 150, power: 12, defense: 10 };
    const rawStatIdentity = ((base.hp / roleAnchor.hp) + (base.power / roleAnchor.power) + (base.defense / roleAnchor.defense)) / 3, statIdentity = Math.max(.995, Math.min(1.005, rawStatIdentity));
    const activeIdentity = def.active.effectKind === 'damage' ? 1 + Math.max(-.005, Math.min(.005, (def.active.baseCoeff - 1) * .01)) : 1 + Math.max(-.005, Math.min(.005, (22000 - def.active.cooldownMs) / 400000));
    const levelMultiplier = 1 + .30 * fraction, rarityMultiplier = 1 + (content_1.COMPANION_RARITY_TARGET[def.rarity] - 1) * fraction, ascensionMultiplier = 1 + progress.ascensionTier * .006, bondMultiplier = 1 + .025 * Math.max(0, Math.min(9, progress.bondLevel - 1)) / 9;
    const traitMultiplier = progress.bondTraitUnlocked ? 1.01 : 1, techniqueMultiplier = progress.selectedTechniqueId ? 1.015 : 1;
    // Team Power is guidance, not combat simulation. It mirrors the already-balanced
    // progression budget and keeps role/ability identity to a narrow ±few-percent band.
    return Math.max(1, Math.round(950 * levelMultiplier * rarityMultiplier * ascensionMultiplier * bondMultiplier * traitMultiplier * techniqueMultiplier * statIdentity * activeIdentity));
}
function companionTeamViews(ids, owned) { return ids.map(id => { const def = (0, content_1.companionServerDefinition)(id), p = owned[id]; if (!def || !p)
    throw new Error('companion_not_owned'); return { companionId: id, role: def.role, rarity: def.rarity, originId: def.originId, power: individualCompanionPower(p) }; }); }
function companionTeamPower(ids, owned) { const views = companionTeamViews(ids, owned); return Math.round(views.reduce((sum, x) => sum + x.power, 0)); }
function evaluateCompanionSynergies(members) {
    if (members.length !== 3)
        throw new Error('requires_3_companions');
    const out = [];
    if (new Set(members.map(x => x.originId)).size === 1)
        out.push({ key: 'regional_bond', combatMultiplier: 1.03, hasteBonus: 0, rewardEssenceMultiplier: 1, description: 'Three companions from one origin: +3% companion durability/output budget.' });
    if (new Set(members.map(x => x.originId)).size === 3)
        out.push({ key: 'diverse_origins', combatMultiplier: 1, hasteBonus: .03, rewardEssenceMultiplier: 1, description: 'Three different origins: +3% Haste.' });
    const rarities = new Set(members.map(x => x.rarity));
    if (rarities.has('standard') && rarities.has('rare') && (rarities.has('elite') || rarities.has('prestige')))
        out.push({ key: 'rarity_spectrum', combatMultiplier: 1, hasteBonus: 0, rewardEssenceMultiplier: 1.04, description: 'Standard + Rare + Elite/Prestige: +4% Trial Companion Essence.' });
    out.push({ key: 'balanced_triad', combatMultiplier: 1, hasteBonus: 0, rewardEssenceMultiplier: 1, description: 'Tank + Damage + Support is the normal Companion Trial baseline.' });
    return out;
}
function totalCompanionSynergyMultiplier(s) { return Math.min(content_1.COMPANION_SYNERGY_COMBAT_CAP, s.reduce((v, x) => v * x.combatMultiplier, 1)); }
function totalCompanionHasteBonus(s) { return Math.min(.06, s.reduce((v, x) => v + x.hasteBonus, 0)); }
function companionEssenceRewardMultiplier(s) { return Math.min(1.08, s.reduce((v, x) => v * x.rewardEssenceMultiplier, 1)); }
function restrictionSatisfied(members, r, teamPower = members.reduce((s, x) => s + x.power, 0)) {
    switch (r.type) {
        case 'max_rarity': return members.every(x => r.rarities.includes(x.rarity));
        case 'require_rarity': return members.filter(x => x.rarity === r.rarity).length >= r.count;
        case 'prohibit_rarity': return members.every(x => x.rarity !== r.rarity);
        case 'require_origin': return members.filter(x => x.originId === r.originId).length >= r.count;
        case 'different_origins': return new Set(members.map(x => x.originId)).size >= r.count;
        case 'rarity_mix': return r.rarities.every((rarity, i) => i === r.rarities.length - 1 && rarity === 'elite' ? members.some(x => x.rarity === 'elite' || x.rarity === 'prestige') : members.some(x => x.rarity === rarity));
        case 'max_team_power': return teamPower <= r.value;
        case 'no_defeats': return true; // evaluated from combat result after the clear.
    }
}
function validateCompanionTrialTeam(input) {
    const ids = input.companionIds;
    if (ids.length !== 3)
        return { ok: false, reason: 'trial_requires_exactly_3_companions' };
    if (new Set(ids).size !== 3)
        return { ok: false, reason: 'duplicate_companion' };
    for (const id of ids) {
        if (!input.owned[id] || !(0, content_1.companionServerDefinition)(id))
            return { ok: false, reason: 'companion_not_owned' };
        if (input.busyCompanionIds?.has(id))
            return { ok: false, reason: 'companion_busy' };
    }
    const views = companionTeamViews(ids, input.owned), roles = views.map(x => x.role);
    for (const role of ['tank', 'damage', 'support'])
        if (roles.filter(x => x === role).length !== 1)
            return { ok: false, reason: `trial_requires_exactly_one_${role}` };
    const power = companionTeamPower(ids, input.owned);
    for (const r of input.restrictions ?? [])
        if (!restrictionSatisfied(views, r, power))
            return { ok: false, reason: `trial_restriction_${r.type}` };
    return { ok: true, members: views, power, synergies: evaluateCompanionSynergies(views) };
}
