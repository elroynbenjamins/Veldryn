import {projectCombinedGameCareerProofsV2} from '../combined-game-proofs-v2';

const account='11111111-1111-4111-8111-111111111111';
const actor='22222222-2222-4222-8222-222222222222';
const another='33333333-3333-4333-8333-333333333333';
const hash='a'.repeat(64);
const common={
  accountId:account,requestId:'command00001',requestHash:hash,
  commandType:'claim',expectedGameRevision:10,adminQa:false,
  beforeCharacterId:actor,afterCharacterId:actor,
};
const segments=[
  {activity:{kind:'mining',targetId:'COPPER_VEIN',lastClaimAtMs:1000},
   reward:{xp:10,kills:1,elapsedSeconds:30}},
  {activity:{kind:'combat',targetId:'IRONWOOD_WOLF',lastClaimAtMs:31000},
   reward:{xp:140,kills:3,elapsedSeconds:45,
     combatEffort:{startsAtMs:31000,endsAtMs:70000}}},
];
const gathering={
  accountId:account,requestId:common.requestId,requestHash:hash,
  commandType:'claim',expectedVersion:9,adminQa:false,
  beforeCharacterId:actor,afterCharacterId:actor,
  segments,nodeCatalogue:[{nodeId:'COPPER_VEIN',skillId:'mining' as const,unlockLevel:1}],
  ownerSkillLevels:{mining:10},
};
const combat={
  accountId:account,requestId:common.requestId,requestHash:hash,
  commandType:'claim',expectedGameRevision:10,adminQa:false,
  originalCharacterId:actor,committedCharacterId:actor,
  combatLevel:14,monsters:[{id:'IRONWOOD_WOLF',level:7}],
  segments,
};
function eq(a:unknown,b:unknown,label:string){
 if(a!==b)throw Error(label+': expected '+String(b)+', got '+String(a));
}
async function reject(work:()=>Promise<unknown>,pattern:RegExp,label:string){
 try{await work();}catch(e){
  if(pattern.test(String(e)))return;
  throw Error(label+': unexpected '+String(e));
 }
 throw Error(label+': expected rejection');
}
async function test(){
  const mixed=await projectCombinedGameCareerProofsV2({...common,gathering,combat});
  eq(mixed.length,2,'mixed queue yields two distinct settlement proofs');
  eq(mixed[0].sourceKind,'gathering_claim','gathering mapped first');
  eq(mixed[1].sourceKind,'combat_reward','combat mapped second');
  eq(mixed[0].segmentIndex,0,'gathering ordinal');
  eq(mixed[1].segmentIndex,1,'combat ordinal');
  eq(mixed[0].claimedElapsedSeconds,30,'gathering elapsed');
  eq(mixed[1].claimedElapsedSeconds,0,'combat is not an idle claim');
  eq(mixed[1].professionId,null,'combat never mints profession XP');
  eq(mixed[0].characterId,actor,'original character');
  eq(mixed[1].characterId,actor,'combat attributed same character');
  const replay=await projectCombinedGameCareerProofsV2({...common,gathering,combat});
  eq(mixed[1].sourceId,replay[1].sourceId,'deterministic receipt replay');
  if(mixed[0].sourceId===mixed[1].sourceId)throw Error('segment source IDs must be distinct');
  eq((await projectCombinedGameCareerProofsV2({...common,adminQa:true,gathering,combat})).length,
    0,'QA no career XP');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering:{...gathering,accountId:another}}),
    /nested_source_mismatch/,'nested source cannot spoof another account');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,combat:{...combat,originalCharacterId:another}}),
    /nested_source_mismatch/,'nested source cannot credit another character');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering:{...gathering,expectedVersion:8}}),
    /nested_source_mismatch/,'wrong game revision');
  const overlap={
    ...combat,segments:[{activity:{kind:'combat',targetId:'IRONWOOD_WOLF',lastClaimAtMs:1000},
      reward:{xp:20,kills:1,elapsedSeconds:30,
        combatEffort:{startsAtMs:1000,endsAtMs:25000}}}],
  };
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering,combat:overlap}),
    /inconsistent_segments/,'mixed queues must use one authoritative activity segment stream');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering,combat:{
    ...combat,segments:[
      {...segments[0],reward:{...segments[0].reward,xp:11}},
      segments[1],
    ],
  }}),/inconsistent_segments/,'same ordinal cannot carry changed earned XP');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering,combat:{
    ...combat,segments:[
      segments[0],
      {...segments[1],activity:{...segments[1].activity,targetId:'OTHER_WOLF'}},
    ],
  }}),/inconsistent_segments/,'combat target must match canonical queue');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering,combat:{
    ...combat,segments:[
      {...segments[0],activity:{...segments[0].activity,lastClaimAtMs:2000}},
      segments[1],
    ],
  }}),/inconsistent_segments/,'claim timestamp cannot diverge');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering:{
    ...gathering,segments:[segments[0]],
  },combat}),/inconsistent_segments/,'gathering cannot omit combat queue segment');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering:{
    ...gathering,segments:null as unknown as typeof gathering.segments,
  },combat}),/inconsistent_segments/,'malformed gathering queue cannot enter proof projector');
  await reject(()=>projectCombinedGameCareerProofsV2({...common,gathering,combat:{
    ...combat,segments:[null,segments[1]] as unknown as typeof combat.segments,
  }}),/inconsistent_segments/,'missing combat queue activity must fail closed');

  const craftBase={
    ...common,commandType:'craft',requestId:'command00002',
    instantCraft:{
      accountId:account,requestId:'command00002',requestHash:hash,
      commandType:'craft',expectedGameRevision:10,adminQa:false,
      originalCharacterId:actor,committedCharacterId:actor,
      requestedRecipeId:'SMELT_COPPER_INGOT',requestedQuantity:2,
      contributions:[{kind:'crafting',contentId:'SMELT_COPPER_INGOT',units:2}],
      recipes:[{id:'SMELT_COPPER_INGOT',skillId:'smithing' as const,
        level:1,seconds:36,isTimed:false}],
      owningSkillLevel:10,owningSkillXpBefore:200,owningSkillXpAfter:400,
    },
  };
  const finished=await projectCombinedGameCareerProofsV2(craftBase);
  eq(finished.length,1,'instant craft produces one proof');
  eq(finished[0].sourceKind,'craft_claim','proper source kind');
  eq(finished[0].professionId,'smithing','craft skill');
  eq(finished[0].baseEffortSeconds,72,'two actual crafts work units');
  eq(finished[0].claimedElapsedSeconds,0,'instant craft has no idle time');
  await reject(()=>projectCombinedGameCareerProofsV2({...craftBase,
    instantCraft:{...craftBase.instantCraft,commandType:'craft_cancel'}}),
    /nested_source_mismatch/,'nested command tampering cannot award');
  console.log('PASS: combined career proof audit prevents cross-character, cross-revision, malformed-source denial and mixed-queue double credit');
}
void test().catch(e=>{throw e;});
