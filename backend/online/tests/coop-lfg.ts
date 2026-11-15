import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {legacyCharacterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {highestEligibleRegularDungeonTier} from '../../src/server/coop/dungeon-entry-policy';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {coopHandler} from '../coop';

async function main(){
 const account='11111111-1111-4111-8111-111111111111';
 const state=createCharacter(newGame(0),'IRONWARDEN','Board Tank');
 state.character!.xp=legacyCharacterTotalXpAtLevel(40);
 state.character!.level=40;
 state.character!.attack=400;
 state.character!.defense=250;
 state.character!.hp=1000;
 state.defeatedBossIds.push('FALLEN_KNIGHT');
 state.character!.equipment=Object.fromEntries(noviceSetFor('IRONWARDEN').slots.map(slot=>[slot,noviceItemId('IRONWARDEN',slot)]));
 const eligible=deriveOnlineCoopLoadout(account,state,7);
 assert.equal(eligible.combatPower,combatPowerRating(state).total,'LFG uses authoritative character-sheet Combat Power');
 assert.ok(eligible.combatPower>=8500,'fixture can enter both released dungeons at Tier 3');

 const calls:Array<{name:string;args:Record<string,unknown>}>=[];
 const post={id:'33333333-3333-4333-8333-333333333333',dungeonId:'EXP_001',ownerName:'Board Tank',role:'tank',maxTier:3,note:'Starting now',createdAtMs:1000,expiresAtMs:1_801_000,mine:true};
 const sunscarPost={...post,id:'44444444-4444-4444-8444-444444444444',dungeonId:'EXP_003',note:'Sunscar run'};
 let loadedState=state;
 const handler=coopHandler({authenticate:async token=>token==='valid'?account:null,randomId:()=>crypto.randomUUID(),randomRoll:()=>0,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   calls.push({name,args});
   if(name==='load_online_game_server_v1')return {state:loadedState,version:7} as T;
   if(name==='publish_online_coop_lfg_server_v1')return (args.p_dungeon_id==='EXP_003'?sunscarPost:post) as T;
   if(name==='browse_online_coop_lfg_server_v1')return [{...post,id:'retired-listing',dungeonId:'EXP_004'},post,sunscarPost] as T;
   if(name==='close_online_coop_lfg_server_v1')return {closed:true} as T;
   if(name==='read_online_coop_receipt_server_v1')return null as T;
   throw new Error('unexpected_rpc:'+name);
  }});
 const request=(path:string,body?:unknown,token='valid')=>new Request('https://test.invalid/coop/'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal((await handler(request('lfg',undefined,'bad'))).status,401);
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',role:'support'}))).status,400,'client cannot advertise a fake role');
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',maxTier:5}))).status,400,'client cannot advertise a fake tier');
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',note:'x'.repeat(141)}))).status,400);
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_005'}))).status,400,'unreleased Frostmarch dungeon recruitment is blocked');
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_004'}))).status,400,'retired Sunscar dungeon recruitment is blocked');

 const publish=await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',note:'Starting now'}));
 assert.equal(publish.status,200,'qualified Asterfall players can publish LFG');
 const sunscar=await handler(request('lfg',{requestId:'lfg-post-002',dungeonId:'EXP_003',note:'Sunscar run'}));
 assert.equal(sunscar.status,200,'qualified chapter-cleared Sunscar players can publish LFG');
 const writes=calls.filter(row=>row.name==='publish_online_coop_lfg_server_v1');
 assert.equal(writes.length,2);
 for(const [write,definition] of [[writes[0],EXPEDITIONS.EXP_001],[writes[1],EXPEDITIONS.EXP_003]] as const){
  assert.equal(write.args.p_role,'tank');
  assert.equal(write.args.p_max_tier,highestEligibleRegularDungeonTier(definition,eligible.characterLevel,eligible.combatPower),'advertised tier must respect actual Combat Power');
  assert.equal(write.args.p_character_id,state.character!.id);
 }
 assert.equal(writes[0].args.p_note,'Starting now');

 loadedState=structuredClone(state);
 loadedState.defeatedBossIds=[];
 const locked=await handler(request('lfg',{requestId:'lfg-post-003',dungeonId:'EXP_003'}));
 assert.equal(locked.status,400,'Sunscar cannot be advertised before the chapter boss');
 assert.equal((await locked.json()).error,'chapter_one_required');

 loadedState=structuredClone(state);
 loadedState.character!.equipment={};
 loadedState.character!.attack=1;
 loadedState.character!.defense=1;
 loadedState.character!.hp=1;
 assert.ok(combatPowerRating(loadedState).total<2500,'underpowered fixture is below Asterfall Tier 1');
 const underpowered=await handler(request('lfg',{requestId:'lfg-post-004',dungeonId:'EXP_001'}));
 assert.equal(underpowered.status,400,'underpowered players cannot advertise a dungeon they cannot enter');
 assert.equal((await underpowered.json()).error,'dungeon_power_requirement');
 assert.equal(calls.filter(row=>row.name==='publish_online_coop_lfg_server_v1').length,2,'denied LFG requests never reach the write RPC');
 loadedState=state;

 const browse=await handler(request('lfg'));
 assert.equal(browse.status,200);
 assert.deepEqual((await browse.json()).map((row:{id:string})=>row.id),[post.id,sunscarPost.id],'only currently released dungeon recruitment posts are shown');
 const close=await handler(request('lfg/close',{requestId:'lfg-close-001'}));
 assert.equal(close.status,200);
 console.log('PASS co-op LFG authentication, authoritative role/CP tiers, story gates, published dungeons, browse and close boundaries');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
