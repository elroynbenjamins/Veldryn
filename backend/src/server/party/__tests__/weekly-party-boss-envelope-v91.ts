/**
 * Party Events V91: hidden, NON-BALANCE-CERTIFYING synthetic encounter envelope.
 * This is NOT an EQ2 loadout test, reward entitlement, or approved numeric tune.
 * It expands V90 smoke coverage to party size, event difficulty and tier,
 * without changing the live Day 8 boss factory or any player-facing runtime.
 */
import {simulateCombat} from '../../combat/engine';
import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition} from '../../combat/types';
import type {WeeklyPartyDifficulty,WeeklyPartyFamily} from '../weekly-party-events-v2';
import {
 PARTY_EVENT_BOSS_TRAITS_V90_RELEASED,
 preparePartyEventBossTraitKitV90,
} from '../weekly-party-boss-traits-v90';

function check(ok:unknown,what:string):asserts ok {
 if(!ok)throw Error('party_event_v91_envelope:'+what);
}
check(PARTY_EVENT_BOSS_TRAITS_V90_RELEASED===false,'release_gate_off');

const names:Readonly<Record<WeeklyPartyFamily,string>>={
 broken_caravan:'Roadbreaker Captain',
 nightfall_hunt:'Nightfall Alpha',
 broken_wards:'The Unbound Guardian',
 lost_reliquary:'Reliquary Sentinel',
};
const families:readonly WeeklyPartyFamily[]=[
 'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary',
];
const difficulties:readonly WeeklyPartyDifficulty[]=['standard','veteran','heroic'];
const difficultyScale:Readonly<Record<WeeklyPartyDifficulty,number>>={
 standard:1,veteran:1.2,heroic:1.4,
};
const tiers=[1,4,8,12] as const;
const maxDurationMs=25_000;
const party=[
 launchPlayer('Ironwarden',25), // Tank
 launchPlayer('Dawnkeeper',25), // Support
 launchPlayer('Wayfinder',25), // Damage
 launchPlayer('Ravager',25), // Damage
] as const;

/** Mirrors the provisional V4 baseline for study ONLY; not a production factory. */
function baseline(family:WeeklyPartyFamily,partySize:number,
 difficulty:WeeklyPartyDifficulty,tier:number):CombatantDefinition {
 const scale=difficultyScale[difficulty];
 const levelScale=1; // level 25 / 25, held fixed to isolate the other axes
 return {
  id:'PARTY_EVENT_BOSS',name:names[family],team:'enemies',
  role:'enemy',boss:true,level:25+2*(tier-1),
  stats:{
   maxHp:Math.round(partySize*5400*levelScale*Math.pow(1.42,tier-1)*scale),
   attackPower:Math.round(355*levelScale*Math.pow(1.20,tier-1)*scale),
   healingPower:0,
   defense:Math.round(520*levelScale*Math.pow(1.16,tier-1)*scale),
   accuracy:750,evasion:110,critChance:.045,critMultiplier:1.4,haste:.03,
  },
  basicAttackMs:2700,basicAttackCoeff:.8,
  abilities:[
   {id:'PE_BOSS_SLAM',name:'Overwhelming Strike',cooldownMs:6900,
    castTimeMs:400,target:'current_target',priority:80,
    effects:[{kind:'damage',coeff:1.15}]},
   {id:'PE_BOSS_PULSE',name:'Rising Threat',cooldownMs:12000,
    castTimeMs:900,target:'all_enemies',priority:85,interruptible:true,
    effects:[{kind:'damage',coeff:.38+Math.min(.3,.03*tier)}]},
  ],
  phases:[{id:'ENRAGE',hpPct:.35,target:'self',
   effects:[{kind:'buff',tag:'damage_done',
    value:Math.min(.35,.07+.015*tier),durationMs:90_000}]}],
 };
}
type Summary={
 trials:number;victories:number;wipes:number;timeouts:number;
 phase70:number;phase35:number;totalDurationMs:number;
 totalDamageTaken:number;totalInterrupts:number;
};
const totals=new Map<string,Summary>();
let trials=0;
for(const family of families)for(const difficulty of difficulties)
 for(const partySize of [2,3,4])for(const tier of tiers){
  const original=baseline(family,partySize,difficulty,tier);
  const boss=preparePartyEventBossTraitKitV90(original,family,tier,true);
  const seed='party-v91:'+family+':'+difficulty+':p'+partySize+':t'+tier;
  const input={
   seed,players:party.slice(0,partySize),enemies:[boss],maxDurationMs,
  };
  const result=simulateCombat(input);
  const replay=simulateCombat(input);
  check(JSON.stringify(result)===JSON.stringify(replay),'determinism:'+seed);
  check(result.enemies.length===1&&result.enemies[0]!.definition.name===names[family],
   'boss_family:'+seed);
  check(result.durationMs<=maxDurationMs&&result.durationMs>=0,'duration:'+seed);
  check(result.victory===(result.reason==='victory'),'victory_reason:'+seed);
  check(result.events.every(e=>Number.isFinite(e.atMs)&&
   (e.amount===undefined||Number.isFinite(e.amount))),'event_numbers:'+seed);
  check([...result.players,...result.enemies].every(p=>
   Number.isFinite(p.hp)&&Number.isFinite(p.shield)&&
   Number.isFinite(p.damageDone)&&Number.isFinite(p.damageTaken)),
   'actor_numbers:'+seed);
  const phase70=boss.phases?.[0]?.id;
  const phase35=boss.phases?.[1]?.id;
  check(Boolean(phase70)&&Boolean(phase35),'two_phase_ids:'+seed);
  const triggered=result.enemies[0]!.triggeredPhases;
  const hit70=triggered.includes(phase70!);
  const hit35=triggered.includes(phase35!);
  check(!hit35||hit70,'phase_order:'+seed);
  check(triggered.filter(id=>id===phase70).length<=1&&
   triggered.filter(id=>id===phase35).length<=1,'phase_once:'+seed);
  check(boss.abilities.every(a=>a.interruptible===true&&
   a.effects.every(e=>e.damageType!=='true'&&
    (e.shieldReflectPct??0)===0)),'no_unfair_cast_or_reflect:'+seed);
  const key=family+':'+difficulty;
  const row=totals.get(key)??{
   trials:0,victories:0,wipes:0,timeouts:0,
   phase70:0,phase35:0,totalDurationMs:0,totalDamageTaken:0,totalInterrupts:0,
  };
  row.trials++;
  if(result.reason==='victory')row.victories++;
  if(result.reason==='wipe')row.wipes++;
  if(result.reason==='timeout')row.timeouts++;
  if(hit70)row.phase70++;
  if(hit35)row.phase35++;
  row.totalDurationMs+=result.durationMs;
  row.totalDamageTaken+=result.players.reduce((s,p)=>s+p.damageTaken,0);
  row.totalInterrupts+=result.players.reduce((s,p)=>s+p.interrupts,0);
  totals.set(key,row);
  trials++;
 }
check(trials===144&&totals.size===12,'exact_144_trial_matrix');
for(const [key,row] of totals){
 check(row.trials===12&&row.victories+row.wipes+row.timeouts===12,
  'outcome_counts:'+key);
}
// Machine-readable CI output: *synthetic* observations, no win-rate threshold
// until actual server-owned EQ2 gear, nine classes and both specs are wired.
console.log('PARTY_EVENT_V91_SYNTHETIC_ENVELOPE='+JSON.stringify({
 version:'v91',measurement:'legacy_launch_players_not_eq2',
 releaseReady:false,partySizes:[2,3,4],tiers,
 maxDurationMs,trials,
 rows:[...totals].map(([key,value])=>({key,...value})),
}));
