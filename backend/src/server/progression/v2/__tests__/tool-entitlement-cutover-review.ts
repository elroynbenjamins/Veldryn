import {
  previewLegacyToolEntitlementCutoverV2,
  TOOL_TEMPLATES_CUTOVER_REVIEW_V2,
  type TrustedToolCutoverSnapshotV2,
} from '../tool-entitlement-cutover-review';
import {professionTotalXpForLevelV2} from '../character-progression';

const account='11111111-1111-4111-8111-111111111111';
const actor='22222222-2222-4222-8222-222222222222';
const alt='33333333-3333-4333-8333-333333333333';
const cutoverAtMs=1763850000000;
const copyMining={
 instanceId:'MINING_COPY_001',itemId:'ASTER_IRON_PICKAXE',ownerCharacterId:actor,
 custody:'equipped' as const,grantReceiptId:'RECEIPT_MINING_001',
};
const copyWood={
 instanceId:'WOODCUT_COPY_001',itemId:'FROSTIRON_HATCHET',ownerCharacterId:actor,
 custody:'market_escrow' as const,grantReceiptId:'RECEIPT_WOODCUT_001',
};
const knowledge={
 knowledgeId:'tool_recipe:OATHSTONE_PICKAXE',ownerCharacterId:actor,
 grantReceiptId:'RECEIPT_BLUEPRINT_001',
};
const receipts=[
 {receiptId:copyMining.grantReceiptId,accountId:account,characterId:actor,
  kind:'tool_copy' as const,itemId:copyMining.itemId,objectId:copyMining.instanceId,
  committedAtMs:cutoverAtMs-5000,gameRevision:90,committed:true as const},
 {receiptId:copyWood.grantReceiptId,accountId:account,characterId:actor,
  kind:'tool_copy' as const,itemId:copyWood.itemId,objectId:copyWood.instanceId,
  committedAtMs:cutoverAtMs-4000,gameRevision:91,committed:true as const},
 {receiptId:knowledge.grantReceiptId,accountId:account,characterId:actor,
  kind:'blueprint_knowledge' as const,itemId:'OATHSTONE_PICKAXE',
  objectId:knowledge.knowledgeId,
  committedAtMs:cutoverAtMs-3000,gameRevision:92,committed:true as const},
];
const progress=(levels:{mining?:number;woodcutting?:number;smithing?:number})=>({
 combatLevel:1,overallCharacterXp:0,professionXp:Object.fromEntries(
   Object.entries(levels).map(([skill,lv])=>[skill,professionTotalXpForLevelV2(lv)])
 ),
});
const snapshot:TrustedToolCutoverSnapshotV2={
 accountId:account,characterId:actor,expectedGameRevision:100,cutoverAtMs,
 progression:progress({mining:10,woodcutting:35,smithing:22}),
 copies:[copyMining,copyWood],learnedKnowledge:[knowledge],
 sourceProofs:receipts,
};
function eq(a:unknown,b:unknown,label:string){
 if(a!==b)throw Error(label+': expected '+String(b)+', got '+String(a));
}
function reject(fn:()=>unknown,rx:RegExp,label:string){
 try{fn();}catch(err){
   if(rx.test(String(err)))return;
   throw Error(label+': unexpected '+String(err));
 }
 throw Error(label+': was unexpectedly accepted');
}
function test(){
 eq(TOOL_TEMPLATES_CUTOVER_REVIEW_V2.length,12,
   'exact T1-T4 hidden tool template snapshot, not T5-T9');
 const plan=previewLegacyToolEntitlementCutoverV2(snapshot);
 eq(plan.accountId,account,'account stable');
 eq(plan.characterId,actor,'actor stable');
 eq(plan.proposals.length,3,'two owned copies and a learned blueprint need review');
 eq(plan.evidenceMissingCount,0,'all grandfather candidates have evidence');
 eq(plan.canAuthorizeEquipOrCraft,false,'no authorization');
 eq(plan.canWriteEntitlements,false,'no migration write');
 eq(plan.releaseEnabled,false,'no launch');
 eq(plan.requiresOwnerApproval,true,'UI/economy review still required');
 eq(plan.observedConflictingTierCount,3,'only T2-T4 authored tool risks inspected');
 eq(plan.proposals.filter(p=>p.kind==='preserve_exact_copy').length,2,
   'preserves individual physical copies, not generic tiers');
 eq(plan.proposals.filter(p=>p.kind==='preserve_learned_knowledge').length,1,
   'exact learned T3 blueprint knowledge only');
 const mining=plan.proposals.find(x=>x.itemId==='ASTER_IRON_PICKAXE');
 eq(mining?.objectId,copyMining.instanceId,'exact original pickaxe instance');
 eq(mining?.profession,'mining','pickaxe equip depends mining alone');
 eq(mining?.oldFloor,10,'old T2 boundary');
 eq(mining?.proposedFloor,12,'proposed T2 boundary');
 eq(mining?.existingProfessionLevel,10,'level 10 user eligible under older hidden policy');
 eq(mining?.grantsNewItem,false,'cannot create a second physical tool');
 eq(mining?.grantsGeneralTierAccess,false,'cannot hand out T2 license');
 const wood=plan.proposals.find(x=>x.itemId==='FROSTIRON_HATCHET');
 eq(wood?.currentCustody,'market_escrow','escrow remains non-equippable');
 eq(wood?.proposedFloor,36,'T4 new floor 36');
 const smith=plan.proposals.find(x=>x.kind==='preserve_learned_knowledge');
 eq(smith?.profession,'smithing','blueprint knowledge tied to smithing, not mining');
 eq(smith?.objectId,knowledge.knowledgeId,'exact already learned blueprint');
 eq(smith?.oldFloor,22,'old T3 floor');
 eq(smith?.proposedFloor,24,'new T3 floor');

 const above=previewLegacyToolEntitlementCutoverV2({...snapshot,
   progression:progress({mining:12,woodcutting:36,smithing:24})});
 eq(above.proposals.length,0,'already licensed after new floor needs no grandfathering');
 const below=previewLegacyToolEntitlementCutoverV2({...snapshot,
   progression:progress({mining:9,woodcutting:34,smithing:21})});
 eq(below.proposals.length,0,'owning item or knowledge never grants unrelated below-old-tier skill');
 const missing=previewLegacyToolEntitlementCutoverV2({
   ...snapshot,sourceProofs:receipts.slice(1),
 });
 eq(missing.evidenceMissingCount,1,'missing proof cannot mint legacy licence');
 eq(missing.proposals.length,2,'independent valid evidence still reported');
 const noEvidence=previewLegacyToolEntitlementCutoverV2({
   ...snapshot,sourceProofs:[],
 });
 eq(noEvidence.proposals.length,0,'claimed tool level alone is insufficient');
 eq(noEvidence.evidenceMissingCount,3,'all unproved legacy access reported as gaps');
 const bank=previewLegacyToolEntitlementCutoverV2({
  ...snapshot,copies:[{...copyMining,custody:'bank'}],
 });
 eq(bank.proposals[0].currentCustody,'bank','bank-held copy stays bank-held');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,copies:[{...copyMining,itemId:'UNAUTHORED_T9_TOOL'},copyWood],
 }),/copy_proof_mismatch/,'unissued T9 tool cannot masquerade as an already-owned T2 physical copy');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,copies:[{...copyMining,itemId:'UNAUTHORED_T9_TOOL',
    grantReceiptId:'UNKNOWN_SOURCE_001'},copyWood],
 }),/unsupported_tool_snapshot/,'unissued T9 tool without matching evidence fails closed');

 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,copies:[{...copyMining,ownerCharacterId:alt},copyWood],
 }),/copy_owner_mismatch/,'other character tool');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,learnedKnowledge:[{...knowledge,ownerCharacterId:alt}],
 }),/knowledge_owner_mismatch/,'other character blueprint');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,sourceProofs:[{...receipts[0],characterId:alt},...receipts.slice(1)],
 }),/untrusted_proof_provenance/,'alternate character receipt');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,sourceProofs:[{...receipts[0],accountId:alt},...receipts.slice(1)],
 }),/untrusted_proof_provenance/,'alternate account receipt');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,sourceProofs:[{...receipts[0],committedAtMs:cutoverAtMs+1},
    ...receipts.slice(1)],
 }),/untrusted_proof_provenance/,'postcutover copied entitlement is not grandfathered');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,sourceProofs:[{...receipts[0],gameRevision:101},...receipts.slice(1)],
 }),/untrusted_proof_provenance/,'future grant revision');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,sourceProofs:[...receipts,receipts[0]],
 }),/invalid_or_duplicate_proof/,'receipt replay is not two sources');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,copies:[copyMining,copyMining,copyWood],
 }),/invalid_copy_snapshot/,'same physical copy twice');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,learnedKnowledge:[knowledge,knowledge],
 }),/invalid_knowledge_snapshot/,'same blueprint twice');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,copies:[{...copyMining,itemId:'IRONWOOD_ROD'},copyWood],
 }),/copy_proof_mismatch/,'matching receipt must describe same exact item');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,learnedKnowledge:[{
    ...knowledge,knowledgeId:'tool_recipe:OATHSCALE_ROD',
  }],
 }),/knowledge_proof_mismatch/,'receipt may not be moved between recipe knowledge');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,sourceProofs:[{...receipts[2],objectId:'tool_recipe:OATHSCALE_ROD'},
    ...receipts.slice(0,2)],
 }),/invalid_knowledge_proof/,'mismatched tool blueprint receipt');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,expectedGameRevision:-1,
 }),/invalid_snapshot/,'invalid negative revision');
 reject(()=>previewLegacyToolEntitlementCutoverV2({
  ...snapshot,progression:progress({mining:101}),
 }),/overall_v2_invalid_level/,'bad profession level (test helper)');
 console.log('PASS: 12 tool templates; exact pre-cutover receipt-backed copy and blueprint access; bank/escrow, alt, postcutover, replay, T9 and non-authorizing fences');
}
test();
