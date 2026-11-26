import {legacyCharacterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {coopEntryHandler} from '../coop-entry';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';

async function main(){
 const state=createCharacter(newGame(1000),'IRONWARDEN','Entry Test');state.character!.level=50;state.character!.xp=legacyCharacterTotalXpAtLevel(50);state.character!.equipment=Object.fromEntries(noviceSetFor('IRONWARDEN').slots.map(slot=>[slot,noviceItemId('IRONWARDEN',slot)]));
 state.defeatedBossIds.push('FALLEN_KNIGHT');
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];
 const handler=coopEntryHandler({authenticate:async token=>token==='valid'?'owned-account':null,rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  calls.push({name,args});
  if(name==='record_player_activity_server_v1')return null as T;
  if(name==='load_online_game_server_v1')return {state,version:7,serverNow:1000,liveEvent:{eventId:'EVT_ANNUAL_006_2026',enabled:true,startsAtMs:0,endsAtMs:10_000}} as T;
  if(name==='online_coop_entry_state_server_v1')return {activeRunProjection:null} as T;
  if(name==='browse_online_coop_lfg_server_v1')return [] as T;
  throw new Error('unexpected_rpc');
 }});
 const request=(path:string,body?:unknown,token='valid')=>new Request('https://test.invalid/coop/'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal((await handler(request('entry',undefined,'invalid'))).status,401);
 assert.equal(calls.length,0);
 const entry=await handler(request('entry')),projection=await entry.json();
 assert.equal(entry.status,200);assert.equal(projection.gameVersion,7);assert.equal(projection.serverNow,1000);
 assert.equal(projection.loadouts[0].characterId,state.character!.id);assert.equal(projection.loadouts[0].role,'tank');
 assert.equal(projection.dungeons[0].available,combatPowerRating(state).total>=2500);assert.equal(projection.dungeons[2].available,false);
 for(const dungeon of projection.dungeons){
  assert.deepEqual(dungeon.difficulties,[1,2,3],'Only the three published tiers are offered');
  assert.deepEqual(Object.keys(dungeon.expectedMarksByTier),['1','2','3'],'Reward previews must only include selectable tiers');
  assert.deepEqual(dungeon.itemDropRates,[],'No permanent item drop rates may be invented before server settlement supports them');
  assert.ok(Array.isArray(dungeon.companionCounterIds)&&dungeon.companionCounterIds.length>0,'Possible companion counters must come from the server-published encounter catalog');
 }
 const first=projection.dungeons.find((row:{id:string})=>row.id==='EXP_003');
 assert.deepEqual(first?.expectedMarksByTier,{1:72,2:79,3:90},'Sunscar previews use rebalanced base Marks with unchanged tier multipliers');
 assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id==='EXP_001')?.expectedMarksByTier,{1:50,2:55,3:63},'Entry dungeon starts at 50 Marks');
 assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id==='EXP_005')?.expectedMarksByTier,{1:84,2:92,3:105},'Frostmarch endpoint stays at its existing rewards');
 assert.deepEqual(projection.dungeons.map((row:{id:string})=>row.id),['EXP_001','EXP_003','EXP_005','EXP_007'],'Two active regional dungeons plus Frostmarch and Ashlands development previews are listed');
 assert.equal(projection.dungeons.find((row:{id:string})=>row.id==='EXP_001')?.minLevel,10,'Restored Asterfall begins at Level 10');
 assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id==='EXP_001')?.tierMinLevels,{1:10,2:10,3:10},'Asterfall tiers are determined by Combat Power, not additional level offsets');
 assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id==='EXP_001')?.tierMinPower,{1:2500,2:3750,3:5000});
 assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id==='EXP_003')?.tierMinPower,{1:6000,2:7250,3:8500});
 for(const id of ['EXP_001','EXP_003'])assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id===id)?.bossVariants.map((row:{chancePercent:number})=>row.chancePercent),[50,50],'Each active dungeon must expose two equally likely bosses');
 assert.equal(projection.dungeons.find((row:{id:string})=>row.id==='EXP_005')?.lockedReason,'In Development','Frostmarch is preview-only');
 assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id==='EXP_005')?.bossVariants,[],'Do not advertise unpublished Frostmarch boss-specific gem rewards before settlement support');
 assert.deepEqual(projection.dungeons.find((row:{id:string})=>row.id==='EXP_007')?.bossVariants,[],'Do not advertise unfinished Ashlands boss-specific reward odds');
 assert.equal(projection.dungeons.find((row:{id:string})=>row.id==='EXP_007')?.lockedReason,'In Development','Ashlands preview is visible but unplayable');
 assert.ok(!projection.dungeons.some((dungeon:{id:string})=>dungeon.id==='EXP_008'),'Second Ashlands dungeon remains out of the playable catalog');
 const suncrest=projection.eventExpeditions.find((item:{id:string})=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES'),starfall=projection.eventExpeditions.find((item:{id:string})=>item.id==='EVENT_STARFALL_ASTRAL_RIFT');
 assert.equal(suncrest.status,'available');assert.equal(suncrest.liveEventId,'EVT_ANNUAL_006_2026');assert.equal(starfall.status,'preview');
 assert.equal(calls.length,5);assert.equal(calls[0].name,'record_player_activity_server_v1');assert.equal(calls[0].args.p_account_id,'owned-account');assert.deepEqual(projection.liveRecruitment,[]);
 // No user-controlled publication or sharing endpoint remains.
 assert.equal((await handler(request('echo',{requestId:'legacy-sharing',expectedVersion:7,share:true}))).status,404);
 assert.equal((await handler(request('echo',{requestId:'legacy-sharing',expectedVersion:7,share:false}))).status,404);
 assert.equal((await handler(request('entry',{requestId:'legacy-sharing',share:true}))).status,405);
 assert.equal(calls.length,5,'Opening Dungeons must not publish any public Echo automatically.');
 assert.equal(calls.some(row=>row.name==='publish_online_coop_loadout_server_v1'),false);
 assert.equal((await handler(request('queue',{}))).status,404);
 // A stale/invalid companion must disable dungeon entry, not the whole catalog.
 const previousCompanion=state.character!.equippedCombatCompanionId;
 state.character!.equippedCombatCompanionId='missing-companion';
 const browsing=await handler(request('entry'));
 assert.equal(browsing.status,200);
 const browsingProjection=await browsing.json();
 assert.ok(browsingProjection.dungeons.length>0);
 assert.deepEqual(browsingProjection.loadouts,[]);
 state.character!.equippedCombatCompanionId=previousCompanion;
 state.defeatedBossIds=state.defeatedBossIds.filter(id=>id!=='FALLEN_KNIGHT');
 const beforeBoss=await (await handler(request('entry'))).json();
 assert.equal(beforeBoss.dungeons.find((row:{id:string})=>row.id==='EXP_001')?.available,combatPowerRating(state).total>=2500,'Asterfall requires Combat Power, but not Chapter I');
 assert.equal(beforeBoss.dungeons.find((row:{id:string})=>row.id==='EXP_003')?.available,false,'Sunscar remains chapter-locked');
 assert.equal(beforeBoss.dungeons.find((row:{id:string})=>row.id==='EXP_003')?.lockedReason,'Defeat the Fallen Knight (Chapter I) to unlock Sunscar dungeons.');

 console.log('PASS co-op entry authorization, read-only catalog and retired Echo sharing controls');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
