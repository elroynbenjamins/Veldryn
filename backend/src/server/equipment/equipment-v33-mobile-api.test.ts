import { strict as assert } from 'node:assert';
import { EQUIPMENT_PIECES_V33, EQUIPMENT_SETS_V33 } from './equipment-catalog-v33';
import { craftingScreenPayloadV33, equipmentLoadoutPayloadV33, equipmentSetDetailPayloadV33 } from './equipment-mobile-api-v33';

const firstSet=EQUIPMENT_SETS_V33[0];
assert.ok(firstSet);
const firstPieces=EQUIPMENT_PIECES_V33.filter(piece=>piece.setId===firstSet.id);
assert.equal(firstPieces.length,10);
assert.equal(craftingScreenPayloadV33(firstPieces[0].id).recipe.pieceId,firstPieces[0].id);
assert.equal(equipmentSetDetailPayloadV33(firstSet.id,[]).pieces.length,10);
const loadout=equipmentLoadoutPayloadV33(firstPieces.map(piece=>({pieceId:piece.id,setId:piece.setId,slot:piece.slot})));
assert.deepEqual(loadout.activeSets[0]?.thresholds.map(threshold=>threshold.pieces),[2,4,6,8,10]);
console.log('v33 mobile API payload tests passed');
