import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {projectVerifiedCraftingV2BaseEvidence,v2CombatFamilyCompatible} from '../equipment-exact-copy-interop-v1.mjs';

/** Cross-system integration regression: compile the hidden server Equipment 2
 * TypeScript target first, then pass ACTUAL canonical exact copies through
 * Combat 2's fail-closed (combatReady:false) evidence projector.
 */
const require=createRequire(import.meta.url);
const output='../../../../../dist-equipment-v2/server/equipment/';
const {v2ServerRecipeAndPiece,V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION}=require(output+'equipment-crafting-v2-manifest.js');
const {draftEquipmentV2Outcome,EQUIPMENT_V2_SERVER_RULES_VERSION}=require(output+'equipment-crafting-v2-rolls.js');
const {v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent}=require(output+'equipment-crafting-v2-instances.js');
const {V2_EQUIPMENT_FAMILY_CLASSES}=require(output+'equipment-crafting-v2-weapon-families.js');
const roles={
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
 DAWNKEEPER:'support',STONECALLER:'support',
};
function exact(pieceId){
 const matched=v2ServerRecipeAndPiece(pieceId+'_FOUNDATION');
 assert.ok(matched,'Canonical recipe must exist for '+pieceId);
 const {piece,recipe}=matched;
 const outcome=draftEquipmentV2Outcome({
  recipeId:recipe.id,pieceId:piece.id,tier:piece.tier,slot:piece.slot,role:piece.role,
 },()=>0);
 const item=v2ServerCreateExactTemplate(piece,outcome);
 assert.ok(v2ServerExactTemplateConsistent(item));
 return item;
}
function equipped(item,classId,index=1){
 return {
  instanceId:'real-instance-'+classId+'-'+index,
  ownerCharacterId:'hero-'+classId,location:'equipped',
  receiptId:'server-claimed-'+classId+'-'+index,slot:item.slot,template:item,
 };
}
function project(classId,items,receiptApproved=true){
 return projectVerifiedCraftingV2BaseEvidence({
  actor:{characterId:'hero-'+classId,classId,level:50},
  equipped:items.map((item,i)=>equipped(item,classId,i+1)),
  trusted:{
   manifestVersion:V2_SERVER_MANIFEST_VERSION,rulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
   // Server-side only: the production caller must independently load custody
   // and exact receipt from its authoritative account, not from client JSON.
   verifyOwnedReceipt:row=>receiptApproved&&v2ServerExactTemplateConsistent(row.template),
  },
 });
}
const weaponPieces=V2_SERVER_PIECES.filter(p=>p.slot==='weapon'&&p.tier===2&&p.originClass);
assert.equal(weaponPieces.length,9);
for(const weapon of weaponPieces){
 const classId=weapon.originClass;
 assert.ok(classId in roles,'All weapon templates need a playable class');
 assert.equal(weapon.role,roles[classId],classId+' canonical combat role must match the class');
 const item=exact(weapon.id);
 const result=project(classId,[item]);
 assert.equal(result.combatReady,false);
 assert.equal(result.role,roles[classId]);
 assert.equal(result.scaling,'exact-pre-scaled-do-not-reapply-rarity-or-quality');
 assert.equal(result.baseTotals.attackPower,item.baseStats.attack);
 assert.equal(result.baseTotals.defense,item.baseStats.defense);
 assert.equal(result.baseTotals.maxHp,item.baseStats.hp);
 assert.equal(result.sources[0].rarityAndQualityAlreadyApplied,true);
 assert.equal(result.sources[0].unappliedAffixCount,item.affixes.length);
}
const offhandPieces=V2_SERVER_PIECES.filter(p=>p.slot==='offhand'&&p.tier===2);
assert.equal(offhandPieces.length,4);
for(const piece of offhandPieces){
 assert.equal(piece.hands,undefined,'Offhand must not pretend to be a weapon with hand count');
 const hand=exact(piece.id);
 const main=exact('EQ2_WEAPON_T2_'+piece.originClass);
 assert.equal(main.hands,'one','Only one-hand weapon combinations may equip offhand');
 const r=project(piece.originClass,[main,hand]);
 assert.equal(r.sources.length,2);
 assert.equal(r.baseTotals.defense,main.baseStats.defense+hand.baseStats.defense);
}
const general=exact('EQ2_FIELDBORN_GUARD_HELMET');
assert.equal(general.role,'tank');
assert.equal(general.classRestriction,undefined);
assert.equal(project('STONECALLER',[general]).sources.length,1,
 'Support-class Stonecaller can wear general tank-recommended armor; the label is not an equip lock');
const twoHand=exact('EQ2_WEAPON_T2_WAYFINDER');
const unrelatedOffhand=exact('EQ2_OFFHAND_T2_IRONWARDEN');
assert.throws(()=>project('WAYFINDER',[twoHand,unrelatedOffhand]),
 /eq2_cv2_(incompatible_weapon_family|two_hand_offhand_conflict)/);
for(const [family,classes] of Object.entries(V2_EQUIPMENT_FAMILY_CLASSES)){
 for(const classId of Object.keys(roles)){
  assert.equal(v2CombatFamilyCompatible(classId,family),classes.includes(classId),'Combat/Equipment family drift '+family+' '+classId);
 }
}
const genericAxe=exact('EQ2_WEAPON_T2_AXE');
assert.equal(project('IRONWARDEN',[genericAxe]).baseTotals.attackPower,genericAxe.baseStats.attack);
assert.equal(project('RAVAGER',[genericAxe]).sources[0].equipmentFamily,'axe');
const wand=exact('EQ2_WEAPON_T2_HEXWEAVER');
assert.equal(project('DAWNKEEPER',[wand]).baseTotals.attackPower,wand.baseStats.attack);
assert.equal(project('STONECALLER',[wand]).role,'support');
const staff=exact('EQ2_WEAPON_T2_STONECALLER');
assert.equal(project('HEXWEAVER',[staff]).sources[0].equipmentFamily,'staff');
assert.throws(()=>project('IRONWARDEN',[wand]),/eq2_cv2_incompatible_weapon_family/);
assert.throws(()=>project('WAYFINDER',[twoHand],false),/eq2_cv2_receipt_not_verified/);
const tampered={...twoHand,baseStats:{...twoHand.baseStats,attack:9999}};
assert.throws(()=>project('WAYFINDER',[tampered]),/eq2_cv2_receipt_not_verified/);
console.log('PASS: canonical Equipment/Crafting 2.0 real exact copies interoperate with hidden Combat 2.0 for all 9 classes, 4 offhands, neutral armor roles and tamper rejection');
