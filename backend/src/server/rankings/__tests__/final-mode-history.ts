import {strict as assert} from 'node:assert';
import {PARTY_EVENT_HISTORY_RELEASED,GUILD_PVE_HISTORY_RELEASED,
 FinalModeHistoryApplication,SupabaseFinalModeHistoryRepository} from '../final-mode-history';
const account='11111111-1111-4111-8111-111111111111';
const calls:Array<{name:string;args:Record<string,unknown>}>=[];
const fake={rpc:async <T>(name:string,args:Record<string,unknown>)=>{
 calls.push({name,args});
 return{data:{mode:args.p_mode,eventKey:args.p_event_key,
 metric:args.p_metric,bracket:args.p_bracket,prestigeOnly:true,entries:[]} as T,error:null};
}};
const repo=new SupabaseFinalModeHistoryRepository(fake);
const hidden=new FinalModeHistoryApplication(repo);
assert.equal(PARTY_EVENT_HISTORY_RELEASED,false);
assert.equal(GUILD_PVE_HISTORY_RELEASED,false);
assert.throws(()=>hidden.event(account,{mode:'party_event',eventKey:'event',metric:'damage',bracket:'standard:4'}),/FINAL_MODE_RANKINGS_DISABLED/);
assert.throws(()=>hidden.event(account,{mode:'guild_pve',eventKey:'campaign',metric:'campaign_score',bracket:'tier1'}),/FINAL_MODE_RANKINGS_DISABLED/);
const partyOnly=new FinalModeHistoryApplication(repo,{
 rankingsReleased:true,partyEventReleased:true,guildPveReleased:false
});
assert.throws(()=>partyOnly.event(account,{mode:'guild_pve',eventKey:'campaign',metric:'campaign_score',bracket:'tier1'}),/FINAL_MODE_RANKINGS_DISABLED/);
const enabled=new FinalModeHistoryApplication(repo,{
 rankingsReleased:true,partyEventReleased:true,guildPveReleased:true
});
const test=async()=>{
  const party=await enabled.event(account,{mode:'party_event',eventKey:'event-day8',metric:'damage',bracket:'standard:4',limit:50,offset:0});
  assert.equal(party.mode,'party_event');
  assert.equal(calls[0]?.name,'rankings_final_mode_history_server_v1');
  assert.deepEqual(calls[0]?.args,{
    p_mode:'party_event',p_event_key:'event-day8',p_metric:'damage',
    p_bracket:'standard:4',p_limit:50,p_offset:0
  });
  const guild=await enabled.event(account,{mode:'guild_pve',eventKey:'six-week',metric:'campaign_score',bracket:'tier1'});
  assert.equal(guild.mode,'guild_pve');
  assert.equal(calls.length,2);
  assert.throws(()=>enabled.event(account,{mode:'guild_pve',eventKey:'six-week',metric:'damage',bracket:'tier1'}),/INVALID_FINAL_MODE_RANKING_SCOPE/);
  const bad={rpc:async <T>()=>({data:null as T|null,error:{message:'no authoritative settlement'}})};
  await assert.rejects(()=>new SupabaseFinalModeHistoryRepository(bad).event('guild_pve','event','campaign_score','tier1',50,0),/FINAL_MODE_RANKING_UNAVAILABLE/);
  console.log('Party and Guild six-week finalized archive gates, allowed metrics and fail-closed reads PASS');
};
void test();
