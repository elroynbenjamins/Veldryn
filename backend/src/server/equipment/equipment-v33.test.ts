import { strict as assert } from 'node:assert';
import { EQUIPMENT_PIECES_V33, EQUIPMENT_SETS_V33, validateCatalogV33 } from './equipment-catalog-v33';
import { resolveSetBonusesV33 } from './equipment-set-resolver-v33';
import { setSkinProgressV33 } from './equipment-settlement-v33';
import { EQUIPMENT_SLOT_ORDER_V33 } from './equipment-types-v33';

assert.equal(EQUIPMENT_SETS_V33.length, 243);
assert.equal(EQUIPMENT_PIECES_V33.length, 2430);
assert.deepEqual(validateCatalogV33(), []);

const firstSet = EQUIPMENT_SETS_V33[0];
assert.ok(firstSet);
const firstPieces = EQUIPMENT_PIECES_V33.filter((piece) => piece.setId === firstSet.id);
assert.equal(firstPieces.length, 10);
assert.deepEqual(firstPieces.map((piece) => piece.slot), [...EQUIPMENT_SLOT_ORDER_V33]);

const equipped = firstPieces.map((piece) => ({ pieceId: piece.id, setId: piece.setId, slot: piece.slot }));
const active = resolveSetBonusesV33(equipped, [firstSet]);
assert.deepEqual(active[0]?.thresholds.map((threshold) => threshold.pieces), [2, 4, 6, 8, 10]);

const history = firstPieces.map((piece) => ({ characterId: 'character-v33', pieceId: piece.id }));
assert.equal(setSkinProgressV33('character-v33', firstSet.id, history).complete, true);
assert.equal(setSkinProgressV33('character-v33', firstSet.id, history.slice(0, 9)).complete, false);

console.log('v33 equipment tests passed');
