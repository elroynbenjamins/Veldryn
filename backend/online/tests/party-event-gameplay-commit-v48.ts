import {
 PARTY_EVENT_GAMEPLAY_COMMIT_V48_RELEASED,
 planHiddenPartyGameCommitV48,
} from '../party-event-gameplay-commit-v48';
import type {GameCommandResult} from '../../../apps/mobile/src/core/game-commands';
import type {ActiveActivity} from '../../../apps/mobile/src/core/types';

function check(value:unknown,message:string):asserts value{
 if(!value)throw Error('party_event_v48_test_'+message);
}
const accountId='11111111-1111-4111-8111-111111111111';
const characterId='22222222-2222-4222-8222-222222222222';
const now=Date.parse('2026-11-18T12:00:00Z');
const activity={
 kind:'mining',targetId:'GREENFIELDS_COPPER_OUTCROP',
 startedAtMs:now-3600000,lastClaimAtMs:now-900000,
} as ActiveActivity;
const contributions=[
 {kind:'crafting',contentId:'IRONWOOD_BINDING_RESIN',units:1,metric:'verified_weighted_crafts',questUnits:1},
 {kind:'gathering',contentId:'GREENFIELDS_COPPER_OUTCROP',units:30,questUnits:2,
  metric:'verified_weighted_gather_actions'},
];
const result={
 state:{character:{id:characterId}},
 contributions:[
  {kind:'crafting',contentId:'IRONWOOD_BINDING_RESIN',units:1},
  {kind:'gathering',contentId:'GREENFIELDS_COPPER_OUTCROP',units:2},
 ],
 reward:{xp:45,gold:0,kills:2,elapsedSeconds:900,
  items:[{itemId:'COPPER_ORE',quantity:5}]},
} as unknown as GameCommandResult;
const normalArgs={
 p_account_id:accountId,p_expected_version:12,p_expected_gold:100,
 p_request_id:'server_game_req_123',p_request_hash:'a'.repeat(64),
 p_response:{state:{character:{id:characterId}}},p_contributions:contributions,
};
const input={
 enableDraftBridge:false,adminQa:false,commandType:'claim',
 trustedServerNowMs:now,previousActivity:activity,result,normalArgs,
};
function run(){
 check(PARTY_EVENT_GAMEPLAY_COMMIT_V48_RELEASED===false,
  'server_gate_stays_off_until_staging_approval');
 const disabled=planHiddenPartyGameCommitV48(input);
 check(disabled.rpc==='commit_online_game_guild_pve_v1'&&disabled.args===normalArgs
  &&disabled.sourceCount===0&&!(Object.hasOwn(disabled.args,'p_packet')),
  'production_default_exact_same_commit_args');
 const eligible=planHiddenPartyGameCommitV48({...input,enableDraftBridge:true});
 check(eligible.rpc==='commit_online_game_party_sources_server_v48'
  &&eligible.sourceCount===2
  &&eligible.args.p_packet?.kind==='party-event-canonical-source-packet-v44'
  &&eligible.args.p_packet.writesAuthorized===false
  &&eligible.args.p_packet.eventPointsGranted===0
  &&eligible.args.p_packet.rewardsGranted===false,
  'only_server_emitted_craft_and_idle_receipts_are_forwarded');
 check(eligible.args.p_packet!.craft[0]!.idempotencyKey==='pe44:server_game_req_123:craft:0'
  &&eligible.args.p_packet!.idle[0]!.activityId==='GREENFIELDS_COPPER_OUTCROP',
  'source_identity_from_authoritative_command_and_existing_material');
 check(normalArgs.p_contributions===eligible.args.p_contributions,
  'existing_guild_party_contributions_not_recalculated');
 const reselected=planHiddenPartyGameCommitV48({...input,enableDraftBridge:true});
 check(JSON.stringify(reselected)===JSON.stringify(eligible),
  'same_online_command_cannot_generate_new_receipt_ids');
 for(const commandType of ['qa_teleport','roster_create','roster_delete','create','delete']){
  const plan=planHiddenPartyGameCommitV48({...input,enableDraftBridge:true,commandType});
  check(plan.rpc==='commit_online_game_guild_pve_v1'&&plan.args===normalArgs,
   'roster_and_qa_maintain_current_commit');
 }
 const qa=planHiddenPartyGameCommitV48({...input,enableDraftBridge:true,adminQa:true});
 check(qa.rpc==='commit_online_game_guild_pve_v1'&&qa.args===normalArgs,
  'admin_cannot_mint_event_receipts');
 const deleting=planHiddenPartyGameCommitV48({...input,enableDraftBridge:true,
  normalArgs:{...normalArgs,p_deleted_character_id:characterId}});
 check(deleting.rpc==='commit_online_game_guild_pve_v1',
  'delete_path_never_enters_unpromoted_writer');
 const empty=planHiddenPartyGameCommitV48({...input,enableDraftBridge:true,
  previousActivity:null,result:{...result,contributions:[],reward:undefined},
  normalArgs:{...normalArgs,p_contributions:[]}}); 
 check(empty.rpc==='commit_online_game_guild_pve_v1'
  &&empty.sourceCount===0&&!empty.args.p_packet,
  'unrelated_commands_do_not_require_v45_schema');
 const queue=planHiddenPartyGameCommitV48({...input,enableDraftBridge:true,
  result:{...result,contributions:[],
   reward:{...result.reward,activityResults:[{activity,reward:result.reward,goalReached:true}]}} as unknown as GameCommandResult,
  normalArgs:{...normalArgs,p_contributions:[]}});
 check(queue.rpc==='commit_online_game_guild_pve_v1',
  'queued_mixed_gathering_cannot_fake_a_single_eligible_interval');
 let rejected=false;
 try{planHiddenPartyGameCommitV48({...input,enableDraftBridge:true,
  normalArgs:{...normalArgs,p_request_id:'INVALID'}});}
 catch(e){rejected=String(e).includes('party_event_v44_untrusted_committed_context');}
 check(rejected,'enabled_invalid_trusted_context_fails_closed_not_silent_fallback');
 console.log('PARTY_EVENTS_V48_COMMIT_SELECTION_OK: normal game RPC identical by default, source packet only in approved preview, no QA/roster/queued receipts');
}
run();
