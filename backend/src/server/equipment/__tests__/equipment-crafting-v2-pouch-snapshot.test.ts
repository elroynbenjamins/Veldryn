import assert from 'node:assert/strict';
import {
 V2_LEGACY_POUCH_CAPACITIES,v2ServerLegacyPouchSnapshot,
} from '../equipment-crafting-v2-pouch-snapshot';

// Same six published V33 pouch capacities. Do not invent an EQ2 capacity.
assert.deepEqual(V2_LEGACY_POUCH_CAPACITIES,[30,40,50,60,75,100]);
assert.deepEqual(v2ServerLegacyPouchSnapshot(null),{capacity:30,stacks:[]});
assert.deepEqual(v2ServerLegacyPouchSnapshot({}),{capacity:30,stacks:[]});

for(const capacity of V2_LEGACY_POUCH_CAPACITIES){
 const source={equipmentPouch:{capacity,stacks:[
  {itemId:'LEGACY_HELMET',quantity:1,instanceId:'v33-exact-01'},
  {itemId:'LEGACY_CHEST',quantity:1},
 ]}};
 const old=JSON.stringify(source);
 const current=v2ServerLegacyPouchSnapshot(source);
 assert.equal(current.capacity,capacity);
 assert.deepEqual(current.stacks,source.equipmentPouch.stacks);
 assert.notStrictEqual(current.stacks,source.equipmentPouch.stacks);
 assert.notStrictEqual(current.stacks[0],source.equipmentPouch.stacks[0]);
 current.stacks[0].quantity=2;
 assert.equal(source.equipmentPouch.stacks[0].quantity,1,
  'Read-only snapshots must never mutate actual V33 custody');
 assert.equal(JSON.stringify(source),old);
}
for(const invalid of [-1,0,1,39,80,101,999,NaN]){
 const snapshot=v2ServerLegacyPouchSnapshot({equipmentPouch:{
  capacity:invalid,stacks:[{itemId:'OLD_COPY',quantity:1}],
 }});
 assert.equal(snapshot.capacity,30,'Invalid legacy capacity falls back to its live base');
 assert.equal(snapshot.stacks.length,1,
  'Invalid capacity must NOT silently discard existing equipment');
}
assert.deepEqual(v2ServerLegacyPouchSnapshot({equipmentPouch:{
 capacity:75,stacks:undefined as unknown as [],
}}),{capacity:75,stacks:[]});
console.log('PASS: server-only legacy pouch parity, 6 exact capacities, copy preservation and read isolation');
