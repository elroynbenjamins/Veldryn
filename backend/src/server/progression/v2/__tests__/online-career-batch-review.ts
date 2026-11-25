import {
  previewOnlineGameCareerBatchV2,
  type TrustedCareerBatchOriginalResultV2,
} from '../online-career-batch-review';
const account='11111111-1111-4111-8111-111111111111';
const actor='22222222-2222-4222-8222-222222222222';
const alt='33333333-3333-4333-8333-333333333333';
const hash='a'.repeat(64);
const source={
  accountId:account,requestId:'batchclaim001',requestHash:hash,
  commandType:'claim',expectedGameRevision:15,adminQa:false,
  beforeCharacterId:actor,afterCharacterId:actor,
};
const segments=[
  {activity:{kind:'mining',targetId:'COPPER_VEIN',lastClaimAtMs:1000},
   reward:{xp:20,kills:0,elapsedSeconds:30}},
  {activity:{kind:'combat',targetId:'IRONWOOD_WOLF',lastClaimAtMs:31000},
   reward:{xp:150,kills:2,elapsedSeconds:45,
     combatEffort:{startsAtMs:31000,endsAtMs:70000}}},
];
const original:TrustedCareerBatchOriginalResultV2={
  originalClaimSegments:segments,completedInstantCraft:null,
};
const gathering={
  accountId:account,requestId:source.requestId,requestHash:hash,
  expectedVersion:14,commandType:'claim',adminQa:false,
  beforeCharacterId:actor,afterCharacterId:actor,segments,
  nodeCatalogue:[{nodeId:'COPPER_VEIN',skillId:'mining' as const,unlockLevel:1}],
  ownerSkillLevels:{mining:2},
};
const combat={
  accountId:account,requestId:source.requestId,requestHash:hash,
  commandType:'claim',expectedGameRevision:15,adminQa:false,
  originalCharacterId:actor,committedCharacterId:actor,
  combatLevel:10,monsters:[{id:'IRONWOOD_WOLF',level:7}],segments,
};
const command={...source,gathering,combat};
function eq(a:unknown,b:unknown,message:string){
 if(a!==b)throw Error(message+': expected '+String(b)+' got '+String(a));
}
async function reject(fn:()=>Promise<unknown>,code:RegExp,label:string){
 try{await fn();}catch(err){
  if(code.test(String(err)))return;
  throw Error(label+': wrong error '+String(err));
 }
 throw Error(label+': unexpectedly accepted');
}
async function test(){
 const plan=await previewOnlineGameCareerBatchV2(command,original);
 eq(plan.canCommit,false,'never authorizes SQL');
 eq(plan.releaseEnabled,false,'feature flag locked');
 eq(plan.requiresServiceOwnedAtomicTransaction,true,'needs one source of truth');
 eq(plan.wouldWriteProfessionXp,false,'no second copy of profession XP');
 eq(plan.awards.length,2,'mixed claim uses two proofs');
 eq(plan.awards[0].sourceKind,'gathering_claim','gathering is first');
 eq(plan.awards[1].sourceKind,'combat_reward','combat is second');
 eq(plan.awards[0].segmentIndex,0,'first source uses original ordinal');
 eq(plan.awards[1].segmentIndex,1,'second source uses original ordinal');
 eq(plan.awards[0].proposedOverallCharacterXp,15,'30s profession earns 15 overall XP');
 eq(plan.awards[1].proposedOverallCharacterXp,19,'39s combat earns 19 overall XP');
 eq(plan.totalOverallCharacterXp,34,'whole batch XP sum');
 eq(plan.characterId,actor,'award attributed to original character');
 eq(plan.awards[0].sourceFingerprint.length,64,'fingerprint is source-bound SHA');
 eq(plan.awards[0].sourceId.length,64,'source is canonical SHA');
 const repeat=await previewOnlineGameCareerBatchV2(command,original);
 eq(JSON.stringify(repeat),JSON.stringify(plan),'retry yields exactly the same preview');
 const single=await previewOnlineGameCareerBatchV2(
  {...source,gathering:{...gathering,segments:[segments[0]]}},
  {originalClaimSegments:[segments[0]],completedInstantCraft:null},
 );
 eq(single.awards.length,1,'one profession-only proof');
 eq(single.totalOverallCharacterXp,15,'single claim credits only its own proof');
 const combatOnly=await previewOnlineGameCareerBatchV2(
  {...source,combat:{...combat,segments:[segments[1]]}},
  {originalClaimSegments:[segments[1]],completedInstantCraft:null},
 );
 eq(combatOnly.awards.length,1,'one combat-only proof');
 eq(combatOnly.totalOverallCharacterXp,19,'combat-only claim no profession XP');
 const qa=await previewOnlineGameCareerBatchV2({...command,adminQa:true},original);
 eq(qa.awards.length,0,'admin simulation no claim');
 eq(qa.totalOverallCharacterXp,0,'admin simulation no XP');
 const empty=await previewOnlineGameCareerBatchV2(
  {...source,commandType:'bank_transfer'},
  {originalClaimSegments:null,completedInstantCraft:null},
 );
 eq(empty.awards.length,0,'nonreward commands stay empty');

 const craftRequest={...source,commandType:'craft',requestId:'batchcraft001'};
 const instantCraft={
   accountId:account,requestId:'batchcraft001',requestHash:hash,
   commandType:'craft',expectedGameRevision:15,adminQa:false,
   originalCharacterId:actor,committedCharacterId:actor,
   requestedRecipeId:'SMELT_COPPER_INGOT',requestedQuantity:2,
   contributions:[{kind:'crafting',contentId:'SMELT_COPPER_INGOT',units:2}],
   recipes:[{id:'SMELT_COPPER_INGOT',skillId:'smithing' as const,
     level:1,seconds:36,isTimed:false}],
   owningSkillLevel:2,owningSkillXpBefore:0,owningSkillXpAfter:50,
 };
 const originalCraft:TrustedCareerBatchOriginalResultV2={
  originalClaimSegments:null,
  completedInstantCraft:{
   requestedRecipeId:instantCraft.requestedRecipeId,
   requestedQuantity:instantCraft.requestedQuantity,
   owningSkillXpBefore:instantCraft.owningSkillXpBefore,
   owningSkillXpAfter:instantCraft.owningSkillXpAfter,
   contributions:instantCraft.contributions,
  },
 };
 const craft=await previewOnlineGameCareerBatchV2({...craftRequest,instantCraft},originalCraft);
 eq(craft.awards.length,1,'instant craft receives a single proof');
 eq(craft.awards[0].professionId,'smithing','craft profession source preserved');
 eq(craft.totalOverallCharacterXp,36,'72s craft pays 36 overall XP');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,afterCharacterId:alt},original),
   /invalid_command/,'no cross-character settlement');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,
   gathering:{...gathering,requestHash:'b'.repeat(64)}},original),
   /nested_source_mismatch/,'nested request hash mismatch');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,
   combat:{...combat,segments:[segments[1]]}},original),
   /original_queue_mismatch/,'truncated combat queue must not pay');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,
   gathering:{...gathering,segments:[segments[1],segments[0]]},
   combat:{...combat,segments:[segments[1],segments[0]]}},original),
   /original_queue_mismatch/,'projectors agreeing on wrong source order are still denied');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,
   combat:{...combat,segments:[
    segments[0],{...segments[1],reward:{...segments[1].reward,kills:3}},
   ]}},original),
   /original_combat_mismatch/,'changed kill count is not a legitimate independent source');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,
   combat:{...combat,segments:[
    segments[0],{...segments[1],reward:{...segments[1].reward,
      combatEffort:{startsAtMs:31000,endsAtMs:68000}}},
   ]}},original),
   /original_combat_mismatch/,'shortened active interval is not original reward');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,combat:undefined},original),
   /missing_source_projector/,'missing positive combat projector is not silent partial credit');
 await reject(()=>previewOnlineGameCareerBatchV2({...command,gathering:undefined},original),
   /missing_source_projector/,'missing positive gather projector is not silent partial credit');
 await reject(()=>previewOnlineGameCareerBatchV2({...craftRequest,instantCraft:{
   ...instantCraft,requestedQuantity:3,
 }},originalCraft),/original_craft_mismatch/,'bulk crafting quantity cannot drift');
 await reject(()=>previewOnlineGameCareerBatchV2({...command},
   {originalClaimSegments:null,completedInstantCraft:null}),
   /invalid_original_claim/,'missing original simulation is not a valid claim');
 await reject(()=>previewOnlineGameCareerBatchV2({...command},
   {originalClaimSegments:[...segments,{...segments[1]}],completedInstantCraft:null}),
   /original_queue_mismatch/,'extra original source segment cannot be ignored');
 eq(plan.awards.some(x=>x.proposedOverallCharacterXp<0),false,'no negative XP');
 console.log('PASS: original-command-bound career reward batches, mixed/solo/craft XP, replay and hard release fence');
}
void test().catch(err=>{throw err;});
