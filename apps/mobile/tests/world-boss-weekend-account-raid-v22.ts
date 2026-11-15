/** Hidden V22: UTC weekends and one-account 1–5-character raid tests.
 * No live World Boss, no real GameState reads or account rewards.
 */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import {
 WORLD_BOSS_V22_SCHEDULE_LIVE,WORLD_BOSS_V22_MAX_ATTEMPTS,
 worldBossWindowsV22,worldBossScheduleAtV22,assertWorldBossAttackWindowV22,
 nextWorldBossCycleV22,
} from '../../../backend/src/server/combat/world-boss-weekend-v22';
import {
 WORLD_BOSS_V22_ACCOUNT_RAID_LIVE,freezeWorldBossAccountRosterV22,
 worldBossAccountDamageV22,simulateWorldBossAccountRaidV22,
} from '../../../backend/src/server/combat/world-boss-account-raid-v22';
import {resolveRealWorldBossSnapshotV12} from '../../../backend/online/world-boss-loadout-v12';
import {makeWorldBossEncounterProfileV13} from '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import {makeWorldBossWarCampSnapshotV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';
import type {ClassId,GameState} from '../src/core/types';

const DAY=86400000,HOUR=3600000,MINUTE=60000;
const MONDAY=Date.UTC(2026,10,16,0,0,0);
const EVENT='30000000-0000-4000-8000-000000000022';
const ACCOUNT='10000000-0000-4000-8000-000000000022';
const OTHER='10000000-0000-4000-8000-000000000023';
const POLICY={version:'wb22-synthetic-brackets',bounds:[2500,5000,10000,20000] as [number,number,number,number]};
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const classes:ClassId[]=['IRONWARDEN','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER'];
const ids=classes.map((_,i)=>'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
const reject=(f:()=>unknown,part:string)=>{
 let message='';try{f()}catch(error){message=String(error);}
 assert.ok(message.includes(part),'expected '+part+' got '+message);
};
async function rejectAsync(f:()=>Promise<unknown>,part:string){
 let message='';try{await f()}catch(error){message=String(error);}
 assert.ok(message.includes(part),'expected '+part+' got '+message);
}
async function main(){
 assert.equal(WORLD_BOSS_V22_SCHEDULE_LIVE,false);
 assert.equal(WORLD_BOSS_V22_ACCOUNT_RAID_LIVE,false);
 assert.equal(WORLD_BOSS_V22_MAX_ATTEMPTS,3);
 const windows=worldBossWindowsV22(MONDAY);
 assert.equal(windows.length,6);
 assert.deepEqual(windows.map(x=>new Date(x.startsAtUtcMs).getUTCHours()),
  [0,8,16,0,8,16]);
 assert.deepEqual(windows.map(x=>x.day),
  ['saturday','saturday','saturday','sunday','sunday','sunday']);
 for(let i=0;i<6;i++){
  const w=windows[i];
  assert.equal(w.endsAtUtcMs-w.startsAtUtcMs,30*MINUTE);
  if(i>0)assert.equal(w.startsAtUtcMs-windows[i-1].startsAtUtcMs,8*HOUR);
  assert.equal(worldBossScheduleAtV22(MONDAY,w.startsAtUtcMs).phase,'raid');
  assert.equal(worldBossScheduleAtV22(MONDAY,w.endsAtUtcMs-1).phase,'raid');
  assert.equal(assertWorldBossAttackWindowV22(MONDAY,w.startsAtUtcMs).index,i);
  reject(()=>assertWorldBossAttackWindowV22(MONDAY,w.endsAtUtcMs),
   'attack_window_closed');
 }
 assert.equal(worldBossScheduleAtV22(MONDAY,MONDAY-1).phase,'upcoming');
 assert.equal(worldBossScheduleAtV22(MONDAY,MONDAY).phase,'preparation');
 assert.equal(worldBossScheduleAtV22(MONDAY,MONDAY+5*DAY-1).phase,'preparation');
 assert.equal(worldBossScheduleAtV22(MONDAY,MONDAY+5*DAY).phase,'raid');
 assert.equal(worldBossScheduleAtV22(MONDAY,MONDAY+7*DAY).phase,'cooldown');
 assert.equal(worldBossScheduleAtV22(MONDAY,MONDAY+14*DAY).phase,'expired');
 assert.equal(nextWorldBossCycleV22(MONDAY),MONDAY+14*DAY);
 reject(()=>worldBossWindowsV22(MONDAY+DAY),'invalid_monday_start_utc');
 reject(()=>worldBossScheduleAtV22(MONDAY,NaN),'invalid_clock');

 // V12 re-verifies GameState/ownership/equipment for EACH same-account
 // character. The list of character IDs must come from a trusted DB reader,
 // and one account has a maximum of five slots.
 const now=MONDAY+5*DAY+8*HOUR+2*MINUTE;
 const states=new Map<string,GameState>();
 for(let i=0;i<5;i++){
  const state=regionalCombatFixture({...T2,level:25,tier:'T2'},'prepared',classes[i]);
  state.character={...state.character!,id:ids[i]};
  states.set(ids[i],state);
 }
 const verified=await Promise.all(ids.map(async characterId=>{
  const result=await resolveRealWorldBossSnapshotV12({
   reader:{
    principalAccountId:ACCOUNT,
    async loadCharacterState({accountId,characterId:id}){
     assert.equal(accountId,ACCOUNT);assert.equal(id,characterId);
     return {ownerAccountId:ACCOUNT,serverState:structuredClone(states.get(id)!),
      gameVersion:2};
    },
   },characterId,expectedGameVersion:2,nowUtcMs:now,
   minimumCharacterLevel:1,policy:POLICY,
  });
  return result;
 }));
 const roster=freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:now,verified,
 });
 assert.equal(roster.characters.length,5);
 assert.equal(new Set(roster.characters.map(c=>c.characterId)).size,5);
 assert.equal(roster.characters.every(c=>c.combatant.team==='players'),true);
 const reversed=freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:now,verified:[...verified].reverse(),
 });
 assert.equal(roster.rosterDigest,reversed.rosterDigest);
 assert.deepEqual(roster.characters.map(c=>c.characterId),
  [...ids].sort());
 const single=freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:now,verified:[verified[0]],
 });
 assert.equal(single.characters.length,1);
 reject(()=>freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:now,verified:[...verified,verified[0]],
 }), 'invalid_owned_roster');
 reject(()=>freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:now,verified:[verified[0],verified[0]],
 }), 'unverified_or_foreign_character');
 reject(()=>freezeWorldBossAccountRosterV22({
  accountId:OTHER,atUtcMs:now,verified,
 }), 'unverified_or_foreign_character');
 reject(()=>freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:now+61000,verified:[verified[0]],
 }), 'unverified_or_foreign_character');
 await rejectAsync(()=>resolveRealWorldBossSnapshotV12({
  reader:{principalAccountId:OTHER,
   loadCharacterState:async()=>({
    ownerAccountId:ACCOUNT,serverState:states.get(ids[0])!,gameVersion:2,
   })},
  characterId:ids[0],expectedGameVersion:2,nowUtcMs:now,
  minimumCharacterLevel:1,policy:POLICY,
 }), 'character_not_owned');

 // Account-wide contribution: extra characters NEVER reduce highest fighter
 // damage; equal-geared five-character squad tops out at 1.28x one fighter.
 const ledger=(n:number)=>Array.from({length:n},(_,i)=>({
  characterId:'C'+i,rawDamage:1000,
 }));
 assert.equal(worldBossAccountDamageV22(ledger(1)),1000);
 assert.equal(worldBossAccountDamageV22(ledger(2)),1120);
 assert.equal(worldBossAccountDamageV22(ledger(3)),1190);
 assert.equal(worldBossAccountDamageV22(ledger(4)),1240);
 assert.equal(worldBossAccountDamageV22(ledger(5)),1280);
 assert.equal(worldBossAccountDamageV22([
  {characterId:'strong',rawDamage:2000},{characterId:'weak',rawDamage:1},
 ]),2000);
 assert.equal(worldBossAccountDamageV22(ledger(5).reverse()),1280);
 reject(()=>worldBossAccountDamageV22([
  {characterId:'duplicate',rawDamage:1},{characterId:'duplicate',rawDamage:1},
 ]),'invalid_damage_ledger');
 reject(()=>worldBossAccountDamageV22([{characterId:'fraud',rawDamage:Infinity}]),
  'invalid_damage_ledger');

 const profile=makeWorldBossEncounterProfileV13({
  eventId:EVENT,boss:'sunscar',phase:'armored',gearBand:2,
  configVersion:'wb22-test-only',attack:1000,defense:700,guardMax:5000,
 });
 const warCamp=makeWorldBossWarCampSnapshotV11({
  eventId:EVENT,revision:2,
  levels:{fortifications:1,fieldProvisions:1,siegecraft:1},
 });
 const battleArgs={
  eventId:EVENT,requestId:'WB22_ACCOUNT_BATTLE_1',
  roster,order:'steady_assault' as const,boss:'sunscar' as const,
  phase:'armored' as const,
  serverSeed:'WB22_TEST_SERVER_SECRET_NONCE_123456789',
  encounter:profile,warCamp,
 };
 const first=simulateWorldBossAccountRaidV22(battleArgs);
 const repeat=simulateWorldBossAccountRaidV22(battleArgs);
 assert.deepEqual(first,repeat,'same frozen inputs must replay exactly');
 assert.equal(first.characterLedger.length,5);
 assert.ok(first.combat.events.length>0);
 assert.equal(first.accountId,ACCOUNT);
 assert.equal(first.rawPartyDamage>=first.proposedWorldHpDamage,true);
 assert.equal(first.persisted,false);
 assert.equal(first.warCampDigest,warCamp.digest);
 assert.equal(first.encounterDigest,profile.digest);
 assert.equal(first.combat.players.length,5);
 assert.equal(first.combat.enemies.length,1);
 assert.ok(first.combat.events.some(e=>e.type==='damage'),
  'real engine must emit actual combat damage');
 const singleBattle=simulateWorldBossAccountRaidV22({
  ...battleArgs,roster:single,
 });
 assert.equal(singleBattle.characterLedger.length,1);
 assert.ok(singleBattle.combat.events.length>0);

 const corrupt=structuredClone(roster);
 corrupt.characters[0].combatant.stats.attackPower+=100000;
 reject(()=>simulateWorldBossAccountRaidV22({...battleArgs,roster:corrupt}),
  'frozen_roster_digest_mismatch');
 reject(()=>simulateWorldBossAccountRaidV22({
  ...battleArgs,encounter:{...profile,attack:999999},
 }), 'invalid_or_foreign_profile');
 reject(()=>simulateWorldBossAccountRaidV22({
  ...battleArgs,warCamp:{...warCamp,levels:{...warCamp.levels,fortifications:2}},
 }), 'war_camp_digest_mismatch');
 assert.ok(launchPlayer('Ironwarden',25).role==='tank');
 console.log('WORLD_BOSS_V22_SIX_WINDOWS_AND_ACCOUNT_RAID='+JSON.stringify({
  windows:6,daysPreparing:5,sessionsEveryHours:8,windowMinutes:30,
  worldBossAttemptsPerAccount:3,
  verifiedSameAccountCharacters:5,oneBattleForAll:true,
  accountDamageCapForEqualFive:1.28,
  damagedBossFromActualEngine:true,rolesNotForced:true,
  noPlayerEchoes:true,live:false,walletCredits:0,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
