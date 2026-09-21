import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {socketGem} from '../../../apps/mobile/src/core/equipment-enhancement';
import type {GameState} from '../../../apps/mobile/src/core/types';
import {regionalCombatHandler} from '../regional-combat';
import type {GameplayServices} from '../gameplay';

async function main(){
 let state=createCharacter(newGame(1),'WAYFINDER','Regional Tester','male');state.character!.level=45;state.currentRegionId='SUNSCAR';
 state={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'gem:effect_opening_strike:g3',quantity:1}]}};
 state=socketGem(state,'basic_bow','gem:effect_opening_strike:g3');
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];let stored:any;
 const services:GameplayServices={
  authenticate:async token=>token==='ok'?'00000000-0000-0000-0000-000000000001':null,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   calls.push({name,args});
   if(name==='load_online_game_server_v1')return {state,version:4,serverNow:10_000,characterId:state.character!.id,walletGold:state.character!.gold,guildMember:false,communityProgress:{}} as T;
   if(name==='start_regional_combat_run_server_v1'){
    const player=args.p_player_definition as any;
    assert.equal(player.effectGems?.[0]?.familyId,'effect_opening_strike','regional combat must freeze canonical Effect Gems');
    stored={runId:'11111111-1111-1111-1111-111111111111',status:'started',encounterId:args.p_encounter_id,sourceId:args.p_source_id,kind:args.p_kind,characterId:args.p_character_id,snapshotHash:args.p_snapshot_hash,serverSeed:args.p_server_seed,playerDefinition:player,expiresAtMs:610000};
    return stored as T;
   }
   if(name==='load_regional_combat_run_server_v1')return stored as T;
   if(name==='finish_regional_combat_run_server_v1'){
    const result=args.p_result as any;assert.equal(result.success,true,'verified Saffron Gate encounter should resolve as a victory in the test snapshot');
    stored={...stored,status:'completed',result,reward:{eligible:true,sourceId:'ZONE_006',gemItemId:'gem:effect_opening_strike:g1'},state,version:5};
    return stored as T;
   }
   throw new Error('unexpected_rpc:'+name);
  },
  randomId:(()=>{const ids=['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222'];let i=0;return()=>ids[i++]??'33333333-3333-3333-3333-333333333333';})(),
  randomRoll:()=>.5,
 };
 const handler=regionalCombatHandler(services);
 const start=await handler(new Request('https://example.test/regional-combat/start',{method:'POST',headers:{authorization:'Bearer ok'},body:JSON.stringify({requestId:'regional-start-001',expectedVersion:4,encounterId:'SUNMON_002'})}));
 assert.equal(start.status,200);const started=await start.json() as any;
 assert.equal(started.sourceId,'ZONE_006');assert.equal(started.kind,'enemy');assert.equal(started.serverSeed,undefined,'server seed must never be exposed');assert.equal(started.playerDefinition,undefined,'frozen player definition must never be exposed');

 const resolve=await handler(new Request('https://example.test/regional-combat/runs/11111111-1111-1111-1111-111111111111/resolve',{method:'POST',headers:{authorization:'Bearer ok'},body:'{}'}));
 assert.equal(resolve.status,200);const finished=await resolve.json() as any;
 assert.equal(finished.status,'completed');assert.equal(finished.result.success,true);assert.equal(finished.reward.sourceId,'ZONE_006');assert.equal(finished.version,5);
 assert.ok(calls.some(row=>row.name==='finish_regional_combat_run_server_v1'),'resolve must finish through the authoritative database boundary');

 const stale=await handler(new Request('https://example.test/regional-combat/start',{method:'POST',headers:{authorization:'Bearer ok'},body:JSON.stringify({requestId:'regional-start-002',expectedVersion:3,encounterId:'SUNMON_002'})}));
 assert.equal(stale.status,409);

 const wrongState:GameState={...state,currentRegionId:'FROSTMARCH'};
 const wrongServices={...services,rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>name==='load_online_game_server_v1'?({state:wrongState,version:4,serverNow:10_000,characterId:wrongState.character!.id,walletGold:wrongState.character!.gold,guildMember:false,communityProgress:{}} as T):services.rpc<T>(name,args)};
 const wrong=await regionalCombatHandler(wrongServices)(new Request('https://example.test/regional-combat/start',{method:'POST',headers:{authorization:'Bearer ok'},body:JSON.stringify({requestId:'regional-start-003',expectedVersion:4,encounterId:'SUNMON_002'})}));
 assert.equal(wrong.status,400);assert.equal((await wrong.json() as any).error,'regional_combat_wrong_region');

 console.log('PASS: authoritative regional combat start/resolve transport and frozen Effect Gem snapshot');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
