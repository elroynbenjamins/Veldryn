import {strict as assert} from 'node:assert';
import {ArenaHistoryApplication,SupabaseArenaHistoryRepository,ARENA_HISTORY_RELEASED} from '../arena-history';
import {WorldBossHistoryService,SupabaseWorldBossHistoryRepository} from '../world-boss-history';

const account='11111111-1111-4111-8111-111111111111';
const boss='22222222-2222-4222-8222-222222222222';
const calls:Array<{name:string;args:Record<string,unknown>}>=[];
const fake={
 rpc:async <T>(name:string,args:Record<string,unknown>)=>{
  calls.push({name,args});
  return {data:(name==='rankings_arena_final_history_server_v1'
    ?{board:args.p_metric,seasonId:args.p_season_id,prestigeOnly:true,entries:[]}
    :{bossId:boss,bossName:'Finalized Boss',prestigeOnly:true,entries:[]}) as T,
    error:null};
 }
};
const arenaRepo=new SupabaseArenaHistoryRepository(fake);
const arenaHidden=new ArenaHistoryApplication(arenaRepo);
assert.equal(ARENA_HISTORY_RELEASED,false);
assert.throws(()=>arenaHidden.read(account,{seasonId:'closed-season',metric:'arena_rating'}),/ARENA_HISTORY_DISABLED/);
assert.throws(()=>new ArenaHistoryApplication(arenaRepo,{rankingsReleased:true,arenaHistoryReleased:false})
  .read(account,{seasonId:'closed-season',metric:'arena_rating'}),/ARENA_HISTORY_DISABLED/);
const arena=new ArenaHistoryApplication(arenaRepo,{rankingsReleased:true,arenaHistoryReleased:true});
const worldRepo=new SupabaseWorldBossHistoryRepository(fake);
const worldHidden=new WorldBossHistoryService(worldRepo);
assert.throws(()=>worldHidden.event(account,boss),/WORLD_BOSS_HISTORY_DISABLED/);
const world=new WorldBossHistoryService(worldRepo,{rankingsReleased:true,worldBossHistoryReleased:true});
const test=async()=>{
  await assert.rejects(()=>arena.read('wrong',{seasonId:'closed',metric:'arena_rating'}),/AUTH_REQUIRED/);
  await assert.rejects(()=>arena.read(account,{seasonId:'closed',metric:'unknown'}),/INVALID_ARENA_HISTORY_METRIC/);
  await assert.rejects(()=>arena.read(account,{seasonId:'closed',metric:'arena_wins',offset:-1}),/INVALID_ARENA_HISTORY_PAGE/);
  const a=await arena.read(account,{seasonId:'closed-season',metric:'arena_rating',limit:51,offset:50});
  assert.equal(a.seasonId,'closed-season');
  assert.equal(calls[0]?.name,'rankings_arena_final_history_server_v1');
  assert.deepEqual(calls[0]?.args,{p_requester:account,p_season_id:'closed-season',p_metric:'arena_rating',p_limit:51,p_offset:50});
  const w=await world.event(account,boss,50,0);
  assert.equal(w.bossName,'Finalized Boss');
  assert.equal(calls[1]?.name,'leaderboards_world_boss_event_server_v1');
  const missing={rpc:async <T>()=>({data:null as T|null,error:{message:'missing'}})};
  await assert.rejects(()=>new SupabaseArenaHistoryRepository(missing)
    .read(account,'closed-season','arena_wins',50,0),/ARENA_HISTORY_UNAVAILABLE/);
  console.log('World Boss and Arena final-history independently disabled and authenticated PASS');
};
void test();
