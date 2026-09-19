"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveArena3v3 = resolveArena3v3;
exports.arenaDivision = arenaDivision;
exports.rankedBonusEligible = rankedBonusEligible;
const node_crypto_1 = require("node:crypto");
function pairScore(a, b) {
    const role = (a.role === 'tank' && b.role === 'damage' ? 1.04 : a.role === 'damage' && b.role === 'support' ? 1.04 : a.role === 'support' && b.role === 'tank' ? 1.04 : 1);
    const pos = a.position === 'front' ? 1.02 : a.position === 'back' ? 0.99 : 1;
    return a.normalizedPower * role * pos;
}
function resolveArena3v3(a, b, seed) {
    if (typeof seed !== 'string' || seed.length < 16)
        throw new Error('arena_seed_required');
    if (a.accountId === b.accountId)
        throw new Error('arena_accounts_must_differ');
    if (a.fighters.length !== 3 || b.fighters.length !== 3)
        throw new Error('arena_requires_3v3');
    for (const squad of [a, b]) {
        if (new Set(squad.fighters.map(f => f.characterId)).size !== 3 || new Set(squad.fighters.map(f => f.position)).size !== 3)
            throw new Error('arena_invalid_formation');
        if (!['front', 'middle', 'back'].every(position => squad.fighters.some(f => f.position === position)))
            throw new Error('arena_requires_front_middle_back');
        if (squad.fighters.some(f => !Number.isFinite(f.normalizedPower) || f.normalizedPower <= 0))
            throw new Error('arena_invalid_power');
    }
    const rounds = [];
    let sa = 0, sb = 0;
    const positions = ['front', 'middle', 'back'];
    for (let i = 0; i < 3; i++) {
        const position = positions[i], fa = a.fighters.find(f => f.position === position), fb = b.fighters.find(f => f.position === position);
        const h = (0, node_crypto_1.createHash)('sha256').update(`${seed}:${i}:${fa.characterId}:${fb.characterId}`).digest();
        const varianceA = .97 + (h[0] / 255) * .06, varianceB = .97 + (h[1] / 255) * .06;
        const pa = pairScore(fa, fb) * varianceA, pb = pairScore(fb, fa) * varianceB;
        const aw = pa >= pb;
        if (aw)
            sa++;
        else
            sb++;
        rounds.push({ round: (i + 1), position, winnerCharacterId: aw ? fa.characterId : fb.characterId, loserCharacterId: aw ? fb.characterId : fa.characterId, score: Number((pa / pb).toFixed(4)) });
    }
    if (sa === sb) {
        const ta = a.fighters.reduce((x, f) => x + f.normalizedPower, 0), tb = b.fighters.reduce((x, f) => x + f.normalizedPower, 0);
        if (ta >= tb)
            sa++;
        else
            sb++;
    }
    const winnerAccountId = sa > sb ? a.accountId : b.accountId;
    const digest = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ seed, rounds, winnerAccountId })).digest().toString('hex');
    return { winnerAccountId, rounds, scoreA: sa, scoreB: sb, digest };
}
function arenaDivision(rating) { return rating >= 2000 ? 'Mythic' : rating >= 1750 ? 'Diamond' : rating >= 1500 ? 'Platinum' : rating >= 1250 ? 'Gold' : rating >= 1000 ? 'Silver' : 'Bronze'; }
function rankedBonusEligible(winsToday, winsWeek) { return winsToday < 5 && winsWeek < 25; }
