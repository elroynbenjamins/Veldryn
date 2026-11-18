import {
 PARTY_EVENT_SOURCE_PACKET_V44_RELEASED,
 preparePartySourcePacketV44,
} from '../party-event-canonical-source-packet-v44';
import type {GameCommandResult} from '../../../apps/mobile/src/core/game-commands';
import type {ActiveActivity} from '../../../apps/mobile/src/core/types';

function check(value:unknown,detail:string):asserts value{
 if(!value)throw Error('party_event_v44_test_'+detail);
}
const accountId='11111111-1111-4111-8111-111111111111';
const characterId='22222222-2222-4222-8222-222222222222';
const requestId='valid_game_request_123';
const now=Date.parse('2026-11-18T13:00:00Z');
const previousActivity={
 kind:'mining',targetId:'GREENFIELDS_COPPER_OUTCROP',
 startedAtMs:now-3600000,lastClaimAtMs:now-900000,
} as ActiveActivity;

function outcome(contributions:unknown[]=[],reward:unknown=undefined,otherChar=characterId){
 return {
  state:{character:{id:otherChar}},contributions,reward,
 } as unknown as GameCommandResult;
}
const good=outcome([
 {kind:'crafting',contentId:'IRONWOOD_BINDING_RESIN',units:1},
 {kind:'crafting',contentId:'IRONWOOD_BINDING_RESIN',units:1},
 {kind:'gathering',contentId:'GREENFIELDS_COPPER_OUTCROP',units:2},
],{xp:45,gold:0,items:[{itemId:'COPPER_ORE',quantity:5}],
 kills:2,elapsedSeconds:900});
const args={
 accountId,characterId,requestId,trustedServerNowMs:now,
 adminQa:false,previousActivity,result:good,
};
function rejected(input:Parameters<typeof preparePartySourcePacketV44>[0],detail:string){
 try{preparePartySourcePacketV44(input);throw Error('unexpected_valid_packet');}
 catch(e){check(String(e).includes('party_event_v44_'),detail);}
}
function run(){
 check(PARTY_EVENT_SOURCE_PACKET_V44_RELEASED===false,'remains_hidden');
 const packet=preparePartySourcePacketV44(args);
 check(packet.kind==='party-event-canonical-source-packet-v44'
  &&packet.accountId===accountId&&packet.characterId===characterId
  &&packet.requestId===requestId,'trusted_receipt_owner_context');
 check(packet.writesAuthorized===false&&packet.eventPointsGranted===0
  &&packet.rewardsGranted===false,'zero_writes_zero_ep');
 check(packet.craft.length===2&&packet.craft.every(x=>x.recipeId==='IRONWOOD_BINDING_RESIN'
  &&x.quantity===1),'multi_craft_action_kept');
 check(packet.craft[0]!.idempotencyKey!==packet.craft[1]!.idempotencyKey,
  'multiple_crafts_do_not_deduplicate_into_one');
 check(packet.idle.length===1
  &&packet.idle[0]!.activityId==='GREENFIELDS_COPPER_OUTCROP'
  &&packet.idle[0]!.resourceAmount===5
  &&packet.idle[0]!.xpAmount===45
  &&packet.idle[0]!.elapsedSec===900,'real_primary_gather_yield');
 const replay=preparePartySourcePacketV44(args);
 check(JSON.stringify(packet)===JSON.stringify(replay),'same_committed_result_same_keys');
 const herbActivity={...previousActivity,kind:'herbalism',targetId:'DEWLEAF_PATCH'} as ActiveActivity;
 const herbs=preparePartySourcePacketV44({...args,previousActivity:herbActivity,
  result:outcome([],{xp:9,gold:0,items:[{itemId:'DEWLEAF',quantity:3}],
   kills:2,elapsedSeconds:60})});
 check(herbs.idle.length===1&&herbs.idle[0]!.activityId==='DEWLEAF_PATCH',
  'verified_greenfields_herb_now_supported');
 const woodActivity={...previousActivity,kind:'woodcutting',targetId:'GREENWOOD_TREE'} as ActiveActivity;
 const wood=preparePartySourcePacketV44({...args,previousActivity:woodActivity,
  result:outcome([],{xp:8,gold:0,items:[{itemId:'GREENWOOD_LOG',quantity:2}],
   kills:1,elapsedSeconds:60})});
 check(wood.idle.length===1,'verified_greenwood_supported');
 const qa=preparePartySourcePacketV44({...args,adminQa:true});
 check(qa.craft.length===0&&qa.idle.length===0,'QA_never_emits_receipts');
 const queue=preparePartySourcePacketV44({...args,
  result:outcome([],{xp:80,gold:0,items:[{itemId:'COPPER_ORE',quantity:2}],
   kills:1,elapsedSeconds:90,activityResults:[{activity:previousActivity,
    reward:{xp:80,gold:0,items:[{itemId:'COPPER_ORE',quantity:2}],kills:1,
      elapsedSeconds:90},goalReached:true}]})});
 check(queue.idle.length===0,'queue_with_unfrozen_segments_cannot_bank_afk');
 const tooShort=preparePartySourcePacketV44({...args,
  result:outcome([],{xp:6,gold:0,items:[{itemId:'COPPER_ORE',quantity:2}],
   kills:1,elapsedSeconds:30})});
 check(tooShort.idle.length===0,'less_than_sixty_seconds_no_credit');
 const noMaterial=preparePartySourcePacketV44({...args,
  result:outcome([],{xp:80,gold:0,items:[{itemId:'OTHER_RARE_DROP',quantity:9}],
   kills:3,elapsedSeconds:900})});
 check(noMaterial.idle.length===0,'rare_drops_cannot_impersonate_main_resource');
 const unsupported=preparePartySourcePacketV44({...args,
  previousActivity:{...previousActivity,targetId:'SOME_UNVERIFIED_TREE'} as ActiveActivity,
 });
 check(unsupported.idle.length===0,'unapproved_nodes_require_audit');
 const noProgress=preparePartySourcePacketV44({...args,
  previousActivity:null,result:outcome([{kind:'crafting',contentId:'SOME_RECIPE',units:1}])});
 check(noProgress.idle.length===0&&noProgress.craft.length===1,'instant_crafts_independent');
 rejected({...args,requestId:'bad'},'request_id_must_match_committed_online_receipt');
 rejected({...args,accountId:'not-a-uuid'},'invalid_account');
 rejected({...args,result:outcome([],undefined,'33333333-3333-4333-8333-333333333333')},'foreign_character');
 rejected({...args,result:outcome([
  ...Array.from({length:5},()=>({kind:'crafting',contentId:'RECIPE_ONE',units:1})),
 ])},'oversized_contributions');
 rejected({...args,result:outcome([{kind:'crafting',contentId:'RECIPE_X',units:-1}])},'negative_crafting_count');
 rejected({...args,result:outcome([{kind:'crafting',contentId:'RECIPE_X',units:1.5}])},'fractional_crafting_count');
 rejected({...args,result:outcome([{kind:'crafting',contentId:'  RECIPE_X',units:1}])},'invalid_recipe_identifier');
 console.log('PARTY_EVENTS_V44_SOURCE_PACKET_OK: canonical craft counts, 3 beginner nodes, no queued AFK, QA/forgery denied, zero writes');
}
run();
