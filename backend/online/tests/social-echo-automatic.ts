import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {legacyCharacterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {prepareSocialEchoCandidates} from '../coop-social-echoes';
import {OnlineQModeRuntime} from '../qmode-runtime';
import {assessOnlineCoopLoadout,deriveOnlineCoopLoadout} from '../coop-loadout';
import {validateSocialEchoCandidates} from '../../../apps/mobile/src/core/coop-social-echoes';

function makeHero(classId:'IRONWARDEN'|'WAYFINDER',name:string){
 const state=createCharacter(newGame(0),classId,name);
 // Online social candidates use UUIDs; generated offline fixture IDs are local-only.
 state.character!.id=classId==='IRONWARDEN'?'00000000-0000-4000-8000-000000000001':'00000000-0000-4000-8000-000000000002';
 state.character!.level=50;state.character!.xp=legacyCharacterTotalXpAtLevel(50);
 state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 for(let i=0;i<40&&combatPowerRating(state).total<10_000;i++){
  state.character!.attack=Math.ceil(state.character!.attack*1.4+1);
  state.character!.defense=Math.ceil(state.character!.defense*1.4+1);
  state.character!.hp=Math.ceil(state.character!.hp*1.4+1);
 }
 assert.ok(combatPowerRating(state).total>=2500);
 return state;
}
async function main(){
 const owner=makeHero('IRONWARDEN','Dungeon Host'),friend=makeHero('WAYFINDER','Trusted Friend');
 const sourceRow={accountId:'friend-account',characterId:friend.character!.id,revision:23,state:friend,relationship:'friend' as const};
 // Lower-power donors are welcome if level, role and equipment are valid.
 // Only the host's Live dungeon entry retains a Combat Power gate.
 const modest=createCharacter(newGame(0),'WAYFINDER','Modest Ally');
 // Contact candidates are persisted online UUIDs, never LOCAL_CHAR_1 fixture IDs.
 modest.character!.id='00000000-0000-4000-8000-000000000003';
 // Level 15 rebases to a legal >=10 dungeon level; the old level-10 fixture
 // rebased to 8, correctly failing the server's minimum-level eligibility.
 modest.character!.level=15;
 modest.character!.xp=legacyCharacterTotalXpAtLevel(15);
 modest.character!.equipment=Object.fromEntries(noviceSetFor('WAYFINDER').slots.map(slot=>[slot,noviceItemId('WAYFINDER',slot)]));
 const modestRecord=deriveOnlineCoopLoadout('modest-account',modest,22);
 assert.ok(modestRecord.characterLevel>=10,'Low-power fixture must survive the actual level-10 dungeon entry gate');
 assert.ok((modestRecord.combatPower??0)<2500,'Fixture must be below the removed 2,500 CP restriction');
 assert.equal(assessOnlineCoopLoadout(modestRecord).readiness.ready,true,'Modest contact still meets the independent equipment/role floor');
 const modestRow={accountId:'modest-account',characterId:modest.character!.id,revision:22,state:modest,relationship:'guild' as const};
 const sourceCalls:string[]=[];
 const listing=await prepareSocialEchoCandidates({rpc:async<T>(name:string):Promise<T>=>{
  sourceCalls.push(name);
  if(name==='coop_social_echo_sources_server_v1')return [sourceRow,modestRow] as T;
  throw new Error('unexpected_rpc:'+name);
 }},'host-account',10);
 assert.equal(sourceCalls.length,1,'Browsing must never publish another player automatically');
 if(listing.length!==2){
  const diagnostic=[sourceRow,modestRow].map(source=>{
   try{
    const record=deriveOnlineCoopLoadout(source.accountId,source.state,source.revision);
    const eligibility=assessOnlineCoopLoadout(record);
    return {accountId:source.accountId,characterId:source.characterId,recordId:record.characterId,
     level:record.characterLevel,legalEquipment:record.legalEquipment,
     ready:eligibility.readiness.ready,failures:eligibility.readiness.failures};
   }catch(error){return {accountId:source.accountId,error:String(error)};}
  });
  assert.equal(listing.length,2,'Valid friends/guildmates must not require publication or 2,500 Combat Power: '+JSON.stringify(diagnostic));
 }
 assert.ok(listing.some(x=>x.candidate.characterId===modest.character!.id));
 assert.equal(listing[0].candidate.characterId,friend.character!.id);
 assert.equal(listing[0].candidate.relationship,'friend');
 assert.equal(validateSocialEchoCandidates(listing.map(x=>x.candidate)).length,2);
 const profileId='00000000-0000-4000-8000-000000000099';
 let publishedCount=0,runMembers:unknown[]=[];
 let serial=0;
 const runtime=new OnlineQModeRuntime({
  randomId:()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   if(name==='read_online_coop_receipt_server_v1')return null as T;
   if(name==='load_online_game_server_v1')return {state:owner,version:21,serverNow:1000} as T;
   if(name==='coop_social_echo_sources_server_v1')return [sourceRow] as T;
   if(name==='publish_online_coop_loadout_server_v1'){
    publishedCount++;
    assert.equal(args.p_account_id,'friend-account');
    assert.equal(args.p_share_echo,true,'Trusted server freezes the contact with no user sharing control');
    assert.equal(args.p_game_version,23);
    assert.equal((args.p_record as {characterId:string}).characterId,friend.character!.id);
    return {echoProfileId:profileId} as T;
   }
   if(name==='eligible_online_coop_echoes_server_v1'){
    return [{profileId,sourceAccountId:'friend-account',publishedAtMs:1000,
     record:deriveOnlineCoopLoadout('friend-account',friend,23)}] as T;
   }
   if(name==='start_online_qmode_server_v1'){
    runMembers=args.p_members as unknown[];
    return args.p_client_projection as T;
   }
   throw new Error('unexpected_rpc:'+name);
  },
 });
 const result=await runtime.start('host-account',{
  mode:'qmode',requestId:'auto-friend-test-1',dungeonId:'EXP_001',tier:1,
  characterId:owner.character!.id,loadoutId:'current',loadoutRevision:21,
  preferredEchoCharacterIds:[friend.character!.id],
 });
 assert.ok(result&&typeof result==='object');
 assert.equal(publishedCount,1,'Only selected contacts are snapshotted on run start');
 assert.equal(runMembers.length,4);
 const frozen=runMembers as {memberKind:string;snapshot:{characterLevel:number;normalized:{effectiveLevel:number;snapshot:{level:number};normalizationVersion:string}}}[];
 const ownerLevel=deriveOnlineCoopLoadout('host-account',owner,21).characterLevel;
 const donorLevel=deriveOnlineCoopLoadout('friend-account',friend,23).characterLevel;
 assert.equal(frozen[0].snapshot.normalized.effectiveLevel,ownerLevel,'Host keeps authoritative visible level');
 assert.equal(frozen[0].snapshot.normalized.snapshot.level,ownerLevel);
 assert.equal(frozen[0].snapshot.normalized.normalizationVersion,'coop-host-level-v1');
 assert.equal(frozen.find(row=>row.memberKind==='echo')?.snapshot.normalized.effectiveLevel,Math.min(ownerLevel,donorLevel));
 const echo=runMembers.map(v=>v as {memberKind:string;profileId?:string}).find(v=>v.memberKind==='echo');
 assert.equal(echo?.profileId,profileId,'The committed seat uses the authoritative publication ID, never client stats');
 assert.equal(runMembers.filter(v=>(v as {memberKind:string}).memberKind==='npc').length,2,'Missing roles still use NPCs');
 console.log('PASS automatic friend Echo candidate, no share toggle, server-only publication and NPC role fallback');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
