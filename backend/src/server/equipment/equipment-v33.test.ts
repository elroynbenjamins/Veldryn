import { strict as assert } from 'node:assert';
import { EQUIPMENT_PIECES_V33, EQUIPMENT_SETS_V33, validateCatalogV33 } from './equipment-catalog-v33';
import { resolveSetBonusesV33 } from './equipment-set-resolver-v33';
import { setCraftProgressV33 } from './equipment-settlement-v33';
import { EQUIPMENT_SLOT_ORDER_V33 } from './equipment-types-v33';

assert.equal(EQUIPMENT_SETS_V33.length, 162);
assert.equal(EQUIPMENT_PIECES_V33.length, 1620);
assert.deepEqual(validateCatalogV33(), []);
const pathsByTierAndClass=new Map<string,string[]>();
for(const set of EQUIPMENT_SETS_V33){
  const key=`${set.tier}|${set.className}`;
  const paths=pathsByTierAndClass.get(key)??[];
  paths.push(set.path);pathsByTierAndClass.set(key,paths);
}
assert.equal(pathsByTierAndClass.size,81);
for(const [key,paths] of pathsByTierAndClass)assert.deepEqual(paths.sort(),['Alternate','Foundation'],`${key} keeps the two intended paths`);

const firstSet = EQUIPMENT_SETS_V33[0];
assert.ok(firstSet);
const firstPieces = EQUIPMENT_PIECES_V33.filter((piece) => piece.setId === firstSet.id);
assert.equal(firstPieces.length, 10);
assert.deepEqual(firstPieces.map((piece) => piece.slot), [...EQUIPMENT_SLOT_ORDER_V33]);

// The server's item detail metadata must match the authored V2 rare-piece
// percent stats consumed by the mobile combat and inspection runtimes.
const signatures:Record<string,Record<string,[string,number]>>={
 T3_001:{Chest:['armor',80],Cape:['maxHp',50]},
 T3_007:{Chest:['ward',70],Gloves:['haste',40]},
 T3_013:{Gloves:['critRate',50],Boots:['evasion',40]},
 T4_001:{Chest:['armor',110],Cape:['maxHp',70]},
 T4_007:{Chest:['ward',100],Gloves:['haste',60]},
 T4_013:{Gloves:['critRate',70],Boots:['evasion',60]},
};
for(const [setId,slots] of Object.entries(signatures)){
 const rows=EQUIPMENT_PIECES_V33.filter(piece=>piece.setId===setId);
 assert.equal(rows.length,10,'Signature set '+setId+' must exist');
 for(const [slot,[stat,basisPoints]] of Object.entries(slots)){
  const piece=rows.find(row=>row.slot===slot);
  assert.ok(piece,'Missing curated piece '+setId+'/'+slot);
  assert.deepEqual(piece.innatePercent,{stat,basisPoints},'Server detail must expose its authored innate modifier');
 }
 assert.equal(rows.filter(piece=>piece.innatePercent).length,2,'Exactly two signature pieces per curated set');
}
assert.equal(EQUIPMENT_PIECES_V33.filter(piece=>piece.innatePercent).length,12,'Rare signature modifier count is bounded');

const equipped = firstPieces.map((piece) => ({ pieceId: piece.id, setId: piece.setId, slot: piece.slot }));
const active = resolveSetBonusesV33(equipped, [firstSet]);
assert.deepEqual(active[0]?.thresholds.map((threshold) => threshold.pieces), [2, 4, 6, 8, 10]);

const history = firstPieces.map((piece) => ({ characterId: 'character-v33', pieceId: piece.id }));
assert.equal(setCraftProgressV33('character-v33', firstSet.id, history).complete, true);
assert.equal(setCraftProgressV33('character-v33', firstSet.id, history.slice(0, 9)).complete, false);

console.log('v33 equipment tests passed');
