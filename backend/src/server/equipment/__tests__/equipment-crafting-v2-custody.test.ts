import assert from 'node:assert/strict';
import {v2ServerRecipeAndPiece} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome} from '../equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate} from '../equipment-crafting-v2-instances';
import {v2ServerCustodyPreflight,type V2CustodyState,type V2CustodyCopy} from '../equipment-crafting-v2-custody';

function minted(recipeId:string){
 const manifest=v2ServerRecipeAndPiece(recipeId);
 assert.ok(manifest);
 const {piece,recipe}=manifest;
 return v2ServerCreateExactTemplate(piece,draftEquipmentV2Outcome({
  recipeId:recipe.id,pieceId:piece.id,tier:piece.tier,slot:piece.slot,role:piece.role,
 },()=>0));
}
const ironSword=minted('EQ2_WEAPON_T2_IRONWARDEN_FOUNDATION');
const ironShield=minted('EQ2_OFFHAND_T2_IRONWARDEN_FOUNDATION');
const wayfinderBow=minted('EQ2_WEAPON_T2_WAYFINDER_FOUNDATION');
const copy=(instanceId:string,item:V2CustodyCopy['item'],ownerCharacterId:string|null,
 location:V2CustodyCopy['location'],equippedSlot?:V2CustodyCopy['equippedSlot']):V2CustodyCopy=>({
 instanceId,accountId:'acct-1',item,ownerCharacterId,location,equippedSlot,locked:true,favorite:true,
});
const initial:V2CustodyState={accountId:'acct-1',characters:[
 {id:'iron-1',classId:'IRONWARDEN',level:30},
 {id:'wayfinder-2',classId:'WAYFINDER',level:30},
],copies:[
 copy('iron-sword',ironSword,'iron-1','pouch'),
 copy('iron-shield',ironShield,'iron-1','pouch'),
 copy('bow',wayfinderBow,'wayfinder-2','pouch'),
]};
const before=JSON.stringify(initial);
const deposit=v2ServerCustodyPreflight(initial,{kind:'deposit_bank',actorCharacterId:'iron-1',instanceId:'iron-sword'});
assert.equal(deposit.allowed,true);
assert.equal(deposit.nextLocation,'bank');
assert.equal(deposit.nextOwnerCharacterId,null,'Bank deposit is account-wide, not a second character grant');
assert.equal(JSON.stringify(initial),before,'Every custody proposal must be side-effect-free');
const inBank:V2CustodyState={...initial,copies:initial.copies.map(row=>row.instanceId==='iron-sword'
 ?{...row,location:'bank',ownerCharacterId:null}:row)};
const withdraw=v2ServerCustodyPreflight(inBank,{kind:'withdraw_bank',actorCharacterId:'wayfinder-2',instanceId:'iron-sword'});
assert.equal(withdraw.allowed,true);
assert.equal(withdraw.nextOwnerCharacterId,'wayfinder-2');
assert.equal(withdraw.nextLocation,'pouch',
 'Bank transfers allow crafting equipment for another character even when that class cannot equip it');
const wrongClass:V2CustodyState={...initial,copies:initial.copies.map(row=>row.instanceId==='iron-sword'
 ?{...row,ownerCharacterId:'wayfinder-2'}:row)};
assert.equal(v2ServerCustodyPreflight(wrongClass,{kind:'equip',actorCharacterId:'wayfinder-2',
 instanceId:'iron-sword'}).reason,'wrong_class','Crafting or withdrawing must never bypass equip class rules');
assert.equal(v2ServerCustodyPreflight(initial,{kind:'equip',actorCharacterId:'iron-1',
 instanceId:'iron-sword'}).allowed,true);
assert.equal(v2ServerCustodyPreflight(initial,{kind:'deposit_bank',actorCharacterId:'wayfinder-2',
 instanceId:'iron-sword'}).reason,'wrong_owner','One account character cannot directly move another\'s gear out of pouch');
const swordWorn:V2CustodyState={...initial,copies:initial.copies.map(row=>row.instanceId==='iron-sword'
 ?{...row,location:'equipped',equippedSlot:'weapon'}:row)};
assert.equal(v2ServerCustodyPreflight(swordWorn,{kind:'deposit_bank',actorCharacterId:'iron-1',
 instanceId:'iron-sword'}).reason,'wrong_location',
 'Equipped gear must be deliberately unequipped, never silently banked');
const unequip=v2ServerCustodyPreflight(swordWorn,{kind:'unequip',actorCharacterId:'iron-1',instanceId:'iron-sword'});
assert.equal(unequip.allowed,true);
assert.equal(unequip.nextLocation,'pouch');
const allWorn:V2CustodyState={...initial,copies:initial.copies.map(row=>row.instanceId==='iron-sword'
 ?{...row,location:'equipped',equippedSlot:'weapon'}:row)};
assert.equal(v2ServerCustodyPreflight(allWorn,{kind:'equip',actorCharacterId:'iron-1',
 instanceId:'iron-shield'}).allowed,true,'One-hand weapon and offhand can coexist');
const shieldWorn:V2CustodyState={...initial,copies:initial.copies.map(row=>row.instanceId==='iron-shield'
 ?{...row,location:'equipped',equippedSlot:'offhand'}:row)};
assert.equal(v2ServerCustodyPreflight(shieldWorn,{kind:'equip',actorCharacterId:'iron-1',
 instanceId:'iron-shield'}).reason,'wrong_location');
const duplicate:V2CustodyState={...initial,copies:[...initial.copies,initial.copies[0]]};
assert.equal(v2ServerCustodyPreflight(duplicate,{kind:'equip',actorCharacterId:'iron-1',
 instanceId:'iron-sword'}).reason,'duplicate_instance',
 'The same physical gear instance may not occupy two storage locations');
const forged:V2CustodyState={...initial,copies:initial.copies.map(row=>row.instanceId==='iron-sword'
 ?{...row,item:{...row.item,gemSlots:[{socketId:'stat',gemInstanceId:'free-gem',gemId:'UNAUTHORIZED'}]}}:row)};
assert.equal(v2ServerCustodyPreflight(forged,{kind:'deposit_bank',actorCharacterId:'iron-1',
 instanceId:'iron-sword'}).reason,'invalid_item_snapshot',
 'New gem sockets must not be injected during a Bank move');
assert.equal(v2ServerCustodyPreflight(initial,{kind:'withdraw_bank',actorCharacterId:'iron-1',
 instanceId:'iron-sword'}).reason,'wrong_location');
assert.equal(v2ServerCustodyPreflight(initial,{kind:'equip',actorCharacterId:'outsider',
 instanceId:'iron-sword'}).reason,'unknown_character');
assert.equal(v2ServerCustodyPreflight(initial,{kind:'equip',actorCharacterId:'iron-1',
 instanceId:'nonexistent'}).reason,'unknown_item');
console.log('PASS: hidden exact-copy custody preflight protects per-instance Bank, cross-character transfer, class rules and gem identity');
