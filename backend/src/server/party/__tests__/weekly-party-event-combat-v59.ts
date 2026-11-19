import {
 PARTY_EVENT_COMBAT_V59_RELEASED,compileEquippedPartyEventSetsV59,
 previewPartyEventHookV59,
 type TrustedEquippedPartyPieceV59,
} from '../weekly-party-event-combat-v59';
import {PARTY_EVENT_GEAR_SETS_V51,PARTY_EVENT_GEAR_PIECES_V51} from '../weekly-party-event-gear-v51';

function ensure(ok:unknown,label:string):asserts ok{
 if(!ok)throw Error('party_event_combat_v59_test:'+label);
}
function rejects(fn:()=>unknown,message:string){
 let failed=false;try{fn();}catch(e){failed=String(e).includes(message);}
 ensure(failed,'expected_'+message);
}
const id='11111111-1111-4111-8111-111111111111';
const rows=(setId:string,tier:number):TrustedEquippedPartyPieceV59[]=>
 PARTY_EVENT_GEAR_PIECES_V51.filter(x=>x.setId===setId).map((piece,i)=>({
  instanceId:'22222222-2222-4222-8222-'+String(i+1).padStart(12,'0'),
  ownerCharacterId:id,pieceId:piece.id,slot:piece.slot,tier,equipped:true,
 }));
ensure(!PARTY_EVENT_COMBAT_V59_RELEASED,'off');
ensure(compileEquippedPartyEventSetsV59({
 characterId:id,verifiedEquipped:rows('PE_WAYFARERS_PACT',3),combatV2Enabled:true,
}).statEffects.length===0,'disabled_never_changes_stats');
for(const set of PARTY_EVENT_GEAR_SETS_V51){
 const full=rows(set.id,3);
 const resolved=compileEquippedPartyEventSetsV59({
  characterId:id,verifiedEquipped:full,combatV2Enabled:true,
 },true);
 ensure(resolved.activeItemCount===set.size,'count_'+set.id);
 ensure(resolved.activeThresholdIds.length===set.bonuses.length,
  'thresholds_'+set.id);
 ensure(resolved.activeThresholdIds.every(x=>x.includes(':T3:')),
  'tier_is_part_of_set_identity');
 ensure(resolved.statEffects.every(x=>x.value>=0&&x.value<=.05),
  'percent_to_fraction_conversion');
 ensure(resolved.hooks.length===(set.size===3?1:0),
  'reactive_not_permanent_'+set.id);
 const incomplete=compileEquippedPartyEventSetsV59({
  characterId:id,verifiedEquipped:full.slice(0,1),combatV2Enabled:true,
 },true);
 ensure(incomplete.activeThresholdIds.length===0,'requires_equipped_pair');
}
const three=rows('PE_WAYFARERS_PACT',3);
ensure(compileEquippedPartyEventSetsV59({
 characterId:id,verifiedEquipped:[{...three[0]!,tier:3},
  {...three[1]!,tier:4},{...three[2]!,tier:4}],combatV2Enabled:true,
},true).activeThresholdIds.length===1,'mixed_tiers_no_3piece');
rejects(()=>compileEquippedPartyEventSetsV59({
 characterId:id,verifiedEquipped:three,combatV2Enabled:false,
},true),'unverified_v2_build');
rejects(()=>compileEquippedPartyEventSetsV59({
 characterId:id,verifiedEquipped:[{...three[0]!,ownerCharacterId:'other'}],
 combatV2Enabled:true,
},true),'unverified_equipped_item');
rejects(()=>compileEquippedPartyEventSetsV59({
 characterId:id,verifiedEquipped:[three[0]!,three[0]!],combatV2Enabled:true,
},true),'duplicate_equipment');
rejects(()=>compileEquippedPartyEventSetsV59({
 characterId:id,verifiedEquipped:[{...three[0]!,slot:'ring'} as TrustedEquippedPartyPieceV59],
 combatV2Enabled:true,
},true),'unverified_equipped_item');

const compile=(id:string)=>compileEquippedPartyEventSetsV59({
 characterId:'11111111-1111-4111-8111-111111111111',
 verifiedEquipped:rows(id,3),combatV2Enabled:true,
},true).hooks[0]!;
const first={lastProcAtMs:null,activeUntilMs:0};
const momentum=compile('PE_WAYFARERS_PACT');
const m=previewPartyEventHookV59(momentum,first,{trigger:'ability_cast',nowMs:100});
ensure(m.activated&&m.bonusBps===300&&m.durationMs===6000,'momentum_cast');
ensure(!previewPartyEventHookV59(momentum,m.state,{
 trigger:'ability_cast',nowMs:1200,
}).activated,'momentum_cooldown');
ensure(previewPartyEventHookV59(momentum,m.state,{
 trigger:'ability_cast',nowMs:12100,
}).activated,'momentum_cooldown_expired');
const execute=compile('PE_MOONFANG_PURSUIT');
ensure(previewPartyEventHookV59(execute,first,{
 trigger:'direct_damage',nowMs:10,targetIsElite:true,targetHpBps:2999,
}).bonusBps===300,'elite_below_30');
ensure(!previewPartyEventHookV59(execute,first,{
 trigger:'direct_damage',nowMs:10,targetIsElite:true,targetHpBps:3000,
}).activated,'not_at_30');
const barrier=compile('PE_RUNEBOUND_VIGIL');
ensure(previewPartyEventHookV59(barrier,first,{
 trigger:'low_hp_cross',nowMs:200,previousHpBps:5000,currentHpBps:3900,
}).bonusBps===200,'crossing_barrier');
const echo=compile('PE_ECHOHEART_VESTMENT');
ensure(previewPartyEventHookV59(echo,first,{
 trigger:'ability_cast',nowMs:100,serverRoll:799,
}).activated,'echo_chance_hit');
ensure(!previewPartyEventHookV59(echo,first,{
 trigger:'ability_cast',nowMs:100,serverRoll:800,
}).activated,'echo_chance_miss');
rejects(()=>previewPartyEventHookV59(echo,first,{
 trigger:'ability_cast',nowMs:100,serverRoll:10000,
}),'unverified_proc_roll');
console.log('PARTY_EVENT_COMBAT_V59_OK: eight sets, 2/3 thresholds, tier separation, seven stat channels, four conditional hooks, fail-closed ownership');
