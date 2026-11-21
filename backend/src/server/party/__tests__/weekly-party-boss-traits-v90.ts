import {
 PARTY_EVENT_BOSS_TRAITS_V90_RELEASED,
 PARTY_EVENT_BOSS_TRAIT_PROFILES_V90,
 preparePartyEventBossTraitKitV90,
 previewPartyEventBossTraitKitV90,
} from '../weekly-party-boss-traits-v90';
import {simulateCombat} from '../../combat/engine';
import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition} from '../../combat/types';
import type {WeeklyPartyFamily} from '../weekly-party-events-v2';

function check(condition:unknown,reason:string):asserts condition{
 if(!condition)throw Error('party_event_v90_qa:'+reason);
}
function reject(fn:()=>unknown,needle:string){
 let denied=false;
 try{fn()}catch(e){denied=String(e).includes(needle)}
 check(denied,'expected_'+needle);
}
const families:WeeklyPartyFamily[]=[
 'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary',
];
const names:Record<WeeklyPartyFamily,string>={
 broken_caravan:'Roadbreaker Captain',nightfall_hunt:'Nightfall Alpha',
 broken_wards:'The Unbound Guardian',
 lost_reliquary:'Reliquary Sentinel',
};
const base=(family:WeeklyPartyFamily,level=25,tier=1):CombatantDefinition=>({
 id:'PARTY_EVENT_BOSS',name:names[family],team:'enemies',
 role:'enemy',boss:true,level:level+2*(tier-1),
 stats:{
  maxHp:Math.round(4*5400*(level/25)*Math.pow(1.42,tier-1)),
  attackPower:Math.round(355*(level/25)*Math.pow(1.20,tier-1)),
  healingPower:0,
  defense:Math.round(520*(level/25)*Math.pow(1.16,tier-1)),
  accuracy:750,evasion:110,critChance:.045,critMultiplier:1.4,haste:.03,
 },
 basicAttackMs:2700,basicAttackCoeff:.8,
 abilities:[
  {id:'PE_BOSS_SLAM',name:'Overwhelming Strike',cooldownMs:6900,
   castTimeMs:400,target:'current_target',priority:80,
   effects:[{kind:'damage',coeff:1.15}]},
  {id:'PE_BOSS_PULSE',name:'Rising Threat',cooldownMs:12000,
   castTimeMs:900,target:'all_enemies',priority:85,interruptible:true,
   effects:[{kind:'damage',coeff:.38}]},
 ],
 phases:[
  {id:'ENRAGE',hpPct:.35,target:'self',
   effects:[{kind:'buff',tag:'damage_done',value:.085,durationMs:90000}]},
 ],
});
check(!PARTY_EVENT_BOSS_TRAITS_V90_RELEASED,'release_gate_off');
check(Object.keys(PARTY_EVENT_BOSS_TRAIT_PROFILES_V90).length===4,
 'exactly_four_family_profiles');
for(const family of families){
 const initial=base(family);
 check(preparePartyEventBossTraitKitV90(initial,family,1)===initial,
  'legacy_not_modified_by_default_'+family);
 const ready=preparePartyEventBossTraitKitV90(initial,family,1,true);
 check(ready!==initial&&ready.name===initial.name&&
  ready.id===initial.id&&ready.stats.maxHp===initial.stats.maxHp&&
  ready.stats.attackPower===initial.stats.attackPower&&
  ready.stats.defense===initial.stats.defense,
  'never_mutate_existing_hp_attack_defense_'+family);
 check(ready.abilities.length===2&&ready.phases?.length===2,
  'no_double_generic_kit_'+family);
 check(ready.phases?.[0]?.hpPct===.7&&ready.phases?.[1]?.hpPct===.35,
  'two_distinct_phase_thresholds_'+family);
 check(ready.abilities.every(a=>a.interruptible&&a.castTimeMs>=800)&&
  ready.abilities.some(a=>a.target==='all_enemies'),
  'visible_interruptible_aoe_'+family);
 check(ready.abilities.flatMap(a=>a.effects).every(e=>
  e.kind!=='damage'||(e.damageType!=='true'&&(e.coeff??0)<=1.1)),
  'no_unbounded_direct_burst_'+family);
 check(ready.abilities.flatMap(a=>a.effects).every(e=>
  e.shieldReflectPct===undefined),
  'no_boss_cast_reflect_recursion_'+family);
 check(ready.phases?.every(p=>p.effects.every(e=>e.shieldReflectPct===undefined)),
  'no_boss_phase_reflection_'+family);
 check(ready.phases?.every(p=>p.effects.every(e=>
  e.kind!=='shield'||(e.flat??0)<=Math.round(ready.stats.maxHp*.04))),
  'bounded_single_phase_shields_'+family);
 check(ready.tags?.includes('party-event:boss-traits:v90'),
  'one_authored_kit_marker_'+family);
 const profile=previewPartyEventBossTraitKitV90(family);
 check(profile.family===family&&profile.counterplay.length>=3,
  'counterplay_'+family);
 reject(()=>preparePartyEventBossTraitKitV90(ready,family,1,true),
  'party_event_v90_untrusted_or_already_compiled_boss');
 reject(()=>preparePartyEventBossTraitKitV90(
  {...initial,name:'Injected Boss'},family,1,true),
  'party_event_v90_untrusted_or_already_compiled_boss');
 reject(()=>preparePartyEventBossTraitKitV90(
  {...initial,tags:['enemy-v2:kit:v1']},family,1,true),
  'party_event_v90_untrusted_or_already_compiled_boss');
 reject(()=>preparePartyEventBossTraitKitV90(
  {...initial,abilities:[...initial.abilities,...initial.abilities]},
  family,1,true),
  'party_event_v90_untrusted_or_already_compiled_boss');

 for(const tier of [1,3,6,9,12]){
  const boss=base(family,25,tier);
  const authored=preparePartyEventBossTraitKitV90(boss,family,tier,true);
  check(authored.phases?.every(p=>
   p.effects.every(e=>!Number.isNaN(e.flat??0)&&
    !Number.isNaN(e.value??0)))&&
   authored.abilities.every(a=>a.effects.every(e=>
    !Number.isNaN(e.coeff??0))),
   'all_tiers_finite_'+family+':'+tier);
 }
}
// Source and family are immutable; no arbitrary party-controlled enemy IDs.
reject(()=>preparePartyEventBossTraitKitV90(base('broken_caravan'),
 'nightfall_hunt',1,true),'party_event_v90_untrusted_or_already_compiled_boss');
for(const tier of [0,13,1.5,NaN])
 reject(()=>preparePartyEventBossTraitKitV90(base('broken_caravan'),
  'broken_caravan',tier,true),
  'party_event_v90_untrusted_or_already_compiled_boss');

const oldEnvironment=process.env.NODE_ENV;
try{
 process.env.NODE_ENV='production';
 reject(()=>preparePartyEventBossTraitKitV90(
  base('broken_caravan'),'broken_caravan',1,true),
  'party_event_v90_unreleased');
}finally{process.env.NODE_ENV=oldEnvironment}

// Existing deterministic engine must process these emitted effect kinds.
// This is a synthetic smoke check, NOT tuned equipment / class win rates.
const attackers=[
 launchPlayer('Ironwarden',25),
 launchPlayer('Wayfinder',25),
 launchPlayer('Dawnkeeper',25),
 launchPlayer('Ravager',25),
];
let scenarios=0;
for(const family of families){
 for(const tier of [1,4,8,12]){
  const authored=preparePartyEventBossTraitKitV90(
   base(family,25,tier),family,tier,true);
  const input={
   seed:'v90-hidden:family:'+family+':tier:'+tier,
   players:attackers,enemies:[authored],maxDurationMs:12000,
  };
  const first=simulateCombat(input);
  const replay=simulateCombat(input);
  check(JSON.stringify(first)===JSON.stringify(replay),
   'deterministic_replay_'+family+':'+tier);
  check(first.events.every(e=>
   Number.isFinite(e.atMs)&&
   (e.amount===undefined||Number.isFinite(e.amount))),
   'no_nonfinite_combat_events_'+family+':'+tier);
  check(first.enemies.length===1&&
   first.enemies[0]!.definition.name===authored.name,
   'real_engine_retains_boss_identity_'+family+':'+tier);
  scenarios++;
 }
}
check(scenarios===16,'synthetic_engine_smoke_count');
console.log('PARTY_EVENT_BOSS_TRAITS_V90_OK: 4 unique families, two phase thresholds, no double-enrage/reflect, 16 deterministic engine smoke replays (NOT EQ2 player balance)');
