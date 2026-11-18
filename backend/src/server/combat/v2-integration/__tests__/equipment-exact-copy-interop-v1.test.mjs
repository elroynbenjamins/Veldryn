import assert from 'node:assert/strict';
import {projectVerifiedCraftingV2BaseEvidence as project,EQUIPMENT_COMBAT_INTEROP_V1} from '../equipment-exact-copy-interop-v1.mjs';
const item=(id,slot,baseStats,hands)=>({
 instanceId:id,receiptId:'receipt-'+id,ownerCharacterId:'hero-one',location:'equipped',slot,
 template:{pieceId:'EQ2_'+id,slot,tier:2,rarity:'epic',quality:87,role:'tank',
 classRestriction:'IRONWARDEN',...(hands?{hands}:{}),
 manifestVersion:'eq2-manifest-pinned',rulesVersion:'eq2-rolls-pinned',
 baseStats,affixes:[{stat:'critRate',percent:1.5,grade:40}],gemSlots:[],enhancementRank:0}
});
const fixture=()=>({
 actor:{characterId:'hero-one',classId:'IRONWARDEN',level:25},
 equipped:[
  item('sword','weapon',{attack:12,defense:0,hp:30},'one'),
  item('ring','ring',{attack:0,defense:5,hp:0})
 ],
 trusted:{
  manifestVersion:'eq2-manifest-pinned',rulesVersion:'eq2-rolls-pinned',
  verifyOwnedReceipt:()=>true
 }
});
let denied=0;
const rejects=(mutate,reason)=>{
 const f=fixture();mutate(f);
 assert.throws(()=>project(f),new RegExp('eq2_cv2_'+reason));
 denied++;
};
const proof=project(fixture());
assert.equal(proof.schema,EQUIPMENT_COMBAT_INTEROP_V1);
assert.equal(proof.combatReady,false);
assert.equal(proof.scaling,'exact-pre-scaled-do-not-reapply-rarity-or-quality');
assert.deepEqual(proof.baseTotals,{attackPower:12,defense:5,maxHp:30});
assert.deepEqual(proof.sources[0].baseStats,{attackPower:12,maxHp:30});
assert.equal(proof.sources[0].unappliedAffixCount,1);
assert.ok(Object.isFrozen(proof)&&Object.isFrozen(proof.sources[0].baseStats));
rejects(f=>f.trusted.verifyOwnedReceipt=()=>false,'receipt_not_verified');
rejects(f=>f.trusted.verifyOwnedReceipt=()=>{throw Error('private db');},'receipt_not_verified');
rejects(f=>f.trusted.verifyOwnedReceipt=null,'trusted_receipt_verifier_required');
rejects(f=>f.equipped[0].ownerCharacterId='hero-two','invalid_equipped_custody');
rejects(f=>f.equipped[0].location='bank','invalid_equipped_custody');
rejects(f=>f.equipped.push({...f.equipped[0]}),'invalid_equipped_custody');
rejects(f=>f.equipped[1].receiptId=f.equipped[0].receiptId,'invalid_equipped_custody');
rejects(f=>f.equipped[1].slot='weapon','invalid_equipped_custody');
rejects(f=>f.equipped[0].template.pieceId='','invalid_exact_template');
rejects(f=>f.equipped[0].template.manifestVersion='old','invalid_exact_template');
rejects(f=>f.equipped[0].template.rulesVersion='old','invalid_exact_template');
rejects(f=>f.equipped[0].template.slot='offhand','invalid_exact_template');
rejects(f=>f.equipped[0].template.rarity='','invalid_exact_template');
rejects(f=>f.equipped[0].template.quality=101,'invalid_exact_template');
rejects(f=>{f.actor.level=11},'tier_locked');
rejects(f=>f.equipped[0].template.classRestriction='BASTION','wrong_class');
rejects(f=>f.equipped[0].template.role='damage','role_mismatch');
rejects(f=>f.equipped[0].template.hands='triple','invalid_hands');
rejects(f=>f.equipped[1].template.hands='two','hands_on_nonweapon');
rejects(f=>f.equipped[0].template.gemSlots=[{gemId:'g'}],'unmigrated_gems_or_enhancements');
rejects(f=>f.equipped[0].template.enhancementRank=1,'unmigrated_gems_or_enhancements');
rejects(f=>f.equipped[0].template.affixes=[{stat:'critRate',percent:Infinity,grade:5}],'untrusted_affix_snapshot');
rejects(f=>f.equipped[0].template.affixes=[{stat:'critRate',percent:1,grade:5},{stat:'critRate',percent:2,grade:10}],'untrusted_affix_snapshot');
rejects(f=>f.equipped[0].template.baseStats.attack=NaN,'invalid_frozen_base_stats');
rejects(f=>f.equipped[0].template.baseStats.extra=2,'invalid_frozen_base_stats');
rejects(f=>f.equipped[0].template.baseStats={attack:0,defense:0,hp:0},'one_or_two_base_stats_required');
rejects(f=>f.equipped[0].template.baseStats={attack:1,defense:2,hp:3},'one_or_two_base_stats_required');
rejects(f=>{
 f.equipped[0].template.hands='two';
 f.equipped.push(item('shield','offhand',{attack:0,defense:2,hp:0}));
},'two_hand_offhand_conflict');
rejects(f=>f.actor.classId='BARD','unverified_actor');
rejects(f=>f.equipped[0].template.tier=5,'invalid_exact_template');
const knownRoles={
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
 DAWNKEEPER:'support',STONECALLER:'support'
};
for(const [classId,role] of Object.entries(knownRoles)){
 const f=fixture();
 f.actor.classId=classId;
 for(const gear of f.equipped){
  gear.template.role=role;
  gear.template.classRestriction=classId;
 }
 assert.equal(project(f).role,role,'canonical class role must survive the exact-copy bridge');
}
assert.equal(denied,30);
console.log('PASS: Equipment/Crafting V2 frozen copies, all 9 classes and 30 negative guards; combat remains off');
