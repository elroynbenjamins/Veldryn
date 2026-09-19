"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roster_1 = require("../roster");
const arena_1 = require("../arena");
const trials_1 = require("../trials");
const synergy_1 = require("../synergy");
const seasons_1 = require("../seasons");
const arena_api_contracts_1 = require("../arena-api-contracts");
function ok(x, m) { if (!x)
    throw new Error(m); }
const owned = [1, 2, 3].map(i => ({ characterId: `c${i}`, accountId: 'a', level: 25, classId: ['Ironwarden', 'Wayfinder', 'Dawnkeeper'][i - 1], power: 1000 + i * 10 }));
const valid = (0, roster_1.validateThreeCharacterSquad)({ accountId: 'a', mode: 'arena', version: 1, members: [{ characterId: 'c1', slot: 1, position: 'front' }, { characterId: 'c2', slot: 2, position: 'middle' }, { characterId: 'c3', slot: 3, position: 'back' }] }, owned);
ok(valid.ok, 'valid squad');
const A = { accountId: 'a', squadVersion: 1, rating: 1000, fighters: [{ characterId: 'c1', classId: 'Ironwarden', position: 'front', normalizedPower: 1000, role: 'tank' }, { characterId: 'c2', classId: 'Wayfinder', position: 'middle', normalizedPower: 1000, role: 'damage' }, { characterId: 'c3', classId: 'Dawnkeeper', position: 'back', normalizedPower: 1000, role: 'support' }] };
const B = { ...A, accountId: 'b', fighters: A.fighters.map((x, i) => ({ ...x, characterId: `d${i + 1}`, normalizedPower: 990 })) };
const r1 = (0, arena_1.resolveArena3v3)(A, B, 'seed-0123456789abcdef'), r2 = (0, arena_1.resolveArena3v3)(A, B, 'seed-0123456789abcdef');
ok(r1.digest === r2.digest, 'arena deterministic');
const reordered = (0, arena_1.resolveArena3v3)(A, { ...B, fighters: [B.fighters[2], B.fighters[0], B.fighters[1]] }, 'seed-0123456789abcdef');
ok(reordered.digest === r1.digest, 'Arena pairing must be position-based');
ok((0, arena_1.rankedBonusEligible)(4, 24) && !(0, arena_1.rankedBonusEligible)(5, 24), 'rank cap');
let invalid = false;
try {
    (0, arena_1.resolveArena3v3)({ ...A, accountId: 'a' }, A, 'seed');
}
catch {
    invalid = true;
}
ok(invalid, 'same-account Arena duel was accepted');
ok((0, trials_1.generateTrialFloor)(5).boss && (0, trials_1.generateTrialFloor)(21).modifiers.length === 3, 'trial scaling');
ok((0, trials_1.trialCheckpointFloor)(13) === 11, 'checkpoint');
const syn = (0, synergy_1.evaluateSquadSynergies)([{ classId: 'i', role: 'tank', position: 'front' }, { classId: 'w', role: 'damage', position: 'middle' }, { classId: 'd', role: 'support', position: 'back' }]);
ok((0, synergy_1.totalSynergyMultiplier)(syn) <= 1.08 && syn.length >= 3, 'synergy');
const opp = (0, seasons_1.chooseArenaOpponent)({ accountId: 'a', rating: 1200, recentOpponents: ['b'], powerBand: 3 }, [{ accountId: 'b', rating: 1201, recentOpponents: [], powerBand: 3 }, { accountId: 'c', rating: 1220, recentOpponents: [], powerBand: 3 }]);
ok(opp?.accountId === 'c', 'repeat avoidance');
const formation = (0, arena_api_contracts_1.parseArenaFormation)([{ characterId: 'c1', position: 'front' }, { characterId: 'c2', position: 'middle' }, { characterId: 'c3', position: 'back' }]);
ok(formation.length === 3, 'formation parser');
let rejected = false;
try {
    (0, arena_api_contracts_1.parseArenaStartRequest)({ requestId: 'short', opponentKey: 'too-short', formation });
}
catch {
    rejected = true;
}
ok(rejected, 'malformed Arena request must be rejected');
console.log('squad-smoke OK', r1.winnerAccountId, r1.digest.slice(0, 12), syn.map(x => x.key).join(','));
