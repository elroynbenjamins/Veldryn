import {projectPendingOnlineGameCareerProofsV2} from '../online-game-proof-preview';

const account='11111111-1111-4111-8111-111111111111';
const anotherAccount='22222222-2222-4222-8222-222222222222';
const actor='33333333-3333-4333-8333-333333333333';
const alt='44444444-4444-4444-8444-444444444444';
const original={
  accountId:account,requestId:'claim0000001',requestHash:'a'.repeat(64),
  expectedVersion:15,commandType:'claim',beforeCharacterId:actor,afterCharacterId:actor,
  adminQa:false,
  nodeCatalogue:[
    {nodeId:'COPPER_VEIN',skillId:'mining' as const,unlockLevel:1},
    {nodeId:'WHITEPINE_TREE',skillId:'woodcutting' as const,unlockLevel:46},
  ],
  ownerSkillLevels:{mining:95,woodcutting:48},
  segments:[
    {activity:{kind:'mining',targetId:'COPPER_VEIN',lastClaimAtMs:1000},reward:{elapsedSeconds:240,xp:80}},
    {activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},reward:{elapsedSeconds:300,xp:200}},
    {activity:{kind:'woodcutting',targetId:'WHITEPINE_TREE',lastClaimAtMs:1500},reward:{elapsedSeconds:600,xp:300}},
    {activity:{kind:'fishing',targetId:'POOL',lastClaimAtMs:2000},reward:{elapsedSeconds:60,xp:0}},
  ],
};
const eq=(actual:unknown,expected:unknown,label:string)=>{
  if(actual!==expected)throw Error(label+' expected '+String(expected)+' got '+String(actual));
};
async function reject(work:()=>Promise<unknown>,pattern:RegExp,label:string){
  try{await work();}catch(e){
    if(pattern.test(String(e)))return;
    throw Error(label+' wrong error: '+String(e));
  }
  throw Error(label+' unexpectedly passed');
}
async function test(){
  const proof=await projectPendingOnlineGameCareerProofsV2(original);
  eq(proof.proofs.length,2,'2 verified nonzero gathering segments');
  eq(proof.excludedSegments,2,'combat/zero XP excluded');
  eq(proof.noncombatOnly,true,'proof generator is limited to gathering');
  const [mine,wood]=proof.proofs;
  eq(mine.sourceKind,'gathering_claim','mining source class');
  eq(mine.professionId,'mining','correct skill');
  eq(mine.characterId,actor,'pre-command character attribution');
  eq(mine.expectedGameRevision,16,'source tied to version commit');
  eq(mine.difficultyBasisPoints,2500,'95 mining vs node level 1 is trivial');
  eq(mine.claimedElapsedSeconds,240,'server elapsed credit');
  eq(mine.sourceCompletedAtMs,null,'DB must assign committedAt timestamp');
  eq(mine.sourceId.length,64,'collision-resistant canonical source');
  eq(wood.professionId,'woodcutting','second segment different skill');
  eq(wood.difficultyBasisPoints,10000,'appropriate-level work rewarded fully');
  eq(wood.segmentIndex,2,'segment ordinals include excluded segments');
  const retry=await projectPendingOnlineGameCareerProofsV2(original);
  eq(retry.proofs[0].sourceId,mine.sourceId,'deterministic retry');
  eq(retry.proofs[1].sourceId,wood.sourceId,'deterministic multi-segment replay');
  const otherKey=await projectPendingOnlineGameCareerProofsV2({...original,requestId:'claim0000002'});
  if(otherKey.proofs[0].sourceId===mine.sourceId)throw Error('different request must have different source');
  const otherAccount=await projectPendingOnlineGameCareerProofsV2({...original,accountId:anotherAccount});
  if(otherAccount.proofs[0].sourceId===mine.sourceId)throw Error('cross-account source collision');
  const qa=await projectPendingOnlineGameCareerProofsV2({...original,adminQa:true});
  eq(qa.proofs.length,0,'QA simulation never gains character XP');
  const bank=await projectPendingOnlineGameCareerProofsV2({...original,commandType:'bank_transfer'});
  eq(bank.proofs.length,0,'non-claim action cannot gain character XP');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,afterCharacterId:alt}),
    /character_switch_or_missing/,'switch to alt');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,beforeCharacterId:null}),
    /character_switch_or_missing/,'claim without active character');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,requestHash:'foo'}),
    /invalid_command_evidence/,'unverified command hash');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,
    nodeCatalogue:[...original.nodeCatalogue,original.nodeCatalogue[0]]}),
    /invalid_node_catalogue/,'conflicting duplicate content ID');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,
    ownerSkillLevels:{mining:0,woodcutting:48}}),
    /skill_not_authorized/,'fake mining rank');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,
    ownerSkillLevels:{mining:95,woodcutting:25}}),
    /skill_not_authorized/,'insufficient skill tier');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,
    segments:[{activity:{kind:'mining',targetId:'WHITEPINE_TREE',lastClaimAtMs:1000},reward:{elapsedSeconds:200,xp:30}}]}),
    /unknown_or_wrong_node/,'misattributed wood to mining');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,
    segments:[{activity:{kind:'mining',targetId:'COPPER_VEIN',lastClaimAtMs:1000},reward:{elapsedSeconds:108000,xp:300}}]}),
    /invalid_gathering_reward/,'30 hour claim must not bypass 24h claim cap');
  await reject(()=>projectPendingOnlineGameCareerProofsV2({...original,
    segments:[{activity:{kind:'mining',targetId:'COPPER_VEIN',lastClaimAtMs:1000},reward:{elapsedSeconds:60,xp:1.2}}]}),
    /invalid_gathering_reward/,'invalid fractional XP');
  console.log('PASS: hidden career proof builder is deterministic, character-bound, evidence-only, and rejects ambiguous sources');
}
void test().catch(e=>{throw e;});
