import {projectPendingCombatCareerProofsV2} from '../combat-proof-preview';
const a='11111111-1111-4111-8111-111111111111';
const c='33333333-3333-4333-8333-333333333333';
const alt='44444444-4444-4444-8444-444444444444';
const data={
 accountId:a,requestId:'huntclaim001',requestHash:'a'.repeat(64),
 commandType:'claim',expectedGameRevision:19,adminQa:false,
 originalCharacterId:c,committedCharacterId:c,combatLevel:60,
 monsters:[
  {id:'MOSS_RAT',level:1},{id:'SAND_WYRM',level:54},
  {id:'STORY_BOSS',level:60,boss:true},
 ],
 segments:[
  {activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
   reward:{xp:100,kills:10,elapsedSeconds:60,combatEffort:{startsAtMs:1000,endsAtMs:55000}}},
  {activity:{kind:'mining',targetId:'COPPER_VEIN',lastClaimAtMs:55000},
   reward:{xp:100,kills:5,elapsedSeconds:30}},
  {activity:{kind:'combat',targetId:'SAND_WYRM',lastClaimAtMs:55000},
   reward:{xp:200,kills:2,elapsedSeconds:75,combatEffort:{startsAtMs:55000,endsAtMs:115000}}},
  {activity:{kind:'combat',targetId:'STORY_BOSS',lastClaimAtMs:115000},
   reward:{xp:100,kills:1,elapsedSeconds:20,combatEffort:{startsAtMs:115000,endsAtMs:130000}}},
 ],
};
const eq=(actual:unknown,expected:unknown,label:string)=>{
 if(actual!==expected)throw Error(label+': expected '+String(expected)+' got '+String(actual));
};
const reject=async(work:()=>Promise<unknown>,rx:RegExp,label:string)=>{
 try{await work();}catch(error){
  if(rx.test(String(error)))return;
  throw Error(label+': invalid failure '+String(error));
 }
 throw Error(label+': unexpected accept');
};
async function test(){
 const result=await projectPendingCombatCareerProofsV2(data);
 eq(result.length,2,'only ordinary combat has proof');
 eq(result[0].segmentIndex,0,'source ordinal');
 eq(result[0].baseEffortSeconds,54,'active effort not generic elapsed');
 eq(result[0].difficultyBasisPoints,2500,'anti-trivial-monster XP');
 eq(result[0].professionId,null,'combat does not mint profession XP');
 eq(result[1].baseEffortSeconds,60,'combat stops early before claim elapsed');
 eq(result[1].difficultyBasisPoints,10000,'near level combat full XP');
 eq(result[1].segmentIndex,2,'queue segment index unique');
 eq(result[0].characterId,c,'pre-claim owner');
 eq(result[0].sourceId.length,64,'globally unique hash');
 eq(result[0].sourceCompletedAtMs,null,'DB-owned completion');
 const replay=await projectPendingCombatCareerProofsV2(data);
 eq(replay[0].sourceId,result[0].sourceId,'idempotent retry');
 eq((await projectPendingCombatCareerProofsV2({...data,adminQa:true})).length,0,'QA no credit');
 eq((await projectPendingCombatCareerProofsV2({...data,commandType:'bank_transfer'})).length,0,'nonclaim no credit');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,committedCharacterId:alt}),
  /character_switch/,'cannot credit alt');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,monsters:[...data.monsters,data.monsters[0]]}),
  /invalid_catalogue/,'duplicate canonical monster');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,combatLevel:0}),
  /invalid_context/,'invalid combat level');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'UNKNOWN_MONSTER',lastClaimAtMs:1000},
  reward:{xp:100,kills:1,elapsedSeconds:30,combatEffort:{startsAtMs:1000,endsAtMs:15000}},
 }]}),/unknown_monster/,'source monster must be canonical');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
  reward:{xp:100,kills:1,elapsedSeconds:30,combatEffort:{startsAtMs:1000,endsAtMs:99000}},
 }]}),/invalid_combat_duration/,'cannot earn 98s in 30s claim');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
  reward:{xp:100,kills:1,elapsedSeconds:30},
 }]}),/unverified_combat_effort/,'no active fight window');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
  reward:{xp:100,kills:1,elapsedSeconds:30,
    combatEffort:{startsAtMs:30000,endsAtMs:45000}},
 }]}),/invalid_combat_duration/,'fight window cannot finish after claim elapsed boundary');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
  reward:{xp:100,kills:1,elapsedSeconds:30,
    combatEffort:{startsAtMs:1000,endsAtMs:25000}},
 },{
  activity:{kind:'combat',targetId:'SAND_WYRM',lastClaimAtMs:20000},
  reward:{xp:100,kills:1,elapsedSeconds:30,
    combatEffort:{startsAtMs:20000,endsAtMs:40000}},
 }]}),/overlapping_effort/,'two fight reward segments cannot credit the same seconds');
 const adjacent=await projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
  reward:{xp:100,kills:1,elapsedSeconds:30,
    combatEffort:{startsAtMs:1000,endsAtMs:21000}},
 },{
  activity:{kind:'combat',targetId:'SAND_WYRM',lastClaimAtMs:21000},
  reward:{xp:100,kills:1,elapsedSeconds:30,
    combatEffort:{startsAtMs:21000,endsAtMs:40000}},
 }]});
 eq(adjacent.length,2,'adjacent non-overlapping fights still award both sources');
 await reject(()=>projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:Number.MAX_SAFE_INTEGER-100},
  reward:{xp:100,kills:1,elapsedSeconds:60,
    combatEffort:{startsAtMs:Number.MAX_SAFE_INTEGER-90,endsAtMs:Number.MAX_SAFE_INTEGER-80}},
 }]}),/invalid_combat_duration/,'claim-end timestamp overflow fails closed');
 eq((await projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
  reward:{xp:0,kills:1,elapsedSeconds:30},
 }]})).length,0,'zero combat XP no reward');
 eq((await projectPendingCombatCareerProofsV2({...data,segments:[{
  activity:{kind:'combat',targetId:'MOSS_RAT',lastClaimAtMs:1000},
  reward:{xp:15,kills:0,elapsedSeconds:30},
 }]})).length,0,'no kills no XP credit');
 console.log('PASS: combat career proofs validate claim-bounded, non-overlapping active-fight effort, kills, enemy level, and owner; no QA/boss/zero credit');
}
void test().catch(e=>{throw e;});
