"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateThreeCharacterSquad = validateThreeCharacterSquad;
exports.squadPower = squadPower;
function validateThreeCharacterSquad(squad, owned, minLevel = 15) {
    if (squad.members.length !== 3)
        return { ok: false, reason: 'squad_requires_exactly_3_characters' };
    const ids = squad.members.map(x => x.characterId);
    if (new Set(ids).size !== 3)
        return { ok: false, reason: 'duplicate_character' };
    if (new Set(squad.members.map(x => x.slot)).size !== 3)
        return { ok: false, reason: 'duplicate_slot' };
    if (new Set(squad.members.map(x => x.position)).size !== 3)
        return { ok: false, reason: 'positions_must_be_front_middle_back' };
    const map = new Map(owned.map(c => [c.characterId, c]));
    const chars = ids.map(id => map.get(id));
    if (chars.some(x => !x))
        return { ok: false, reason: 'character_not_owned' };
    if (chars.some(x => x.accountId !== squad.accountId))
        return { ok: false, reason: 'character_account_mismatch' };
    if (chars.some(x => x.isDeleted))
        return { ok: false, reason: 'deleted_character' };
    if (chars.some(x => x.level < minLevel))
        return { ok: false, reason: 'character_below_min_level' };
    return { ok: true, averageLevel: chars.reduce((a, c) => a + c.level, 0) / 3, totalPower: chars.reduce((a, c) => a + c.power, 0) };
}
function squadPower(chars) {
    if (chars.length !== 3)
        throw new Error('requires_3_characters');
    const sorted = [...chars].sort((a, b) => b.power - a.power);
    return Math.round(sorted[0].power * 0.38 + sorted[1].power * 0.34 + sorted[2].power * 0.28);
}
