/**
 * Hidden Party Events v8 -- four materially different finale encounters.
 *
 * ONLY deterministic, non-rewarding preview. Not imported by live routes,
 * Day 8 settlement, database workers, event points or reward calculations.
 * Server-owned family/variation/ballot/loadout input is REQUIRED before any
 * future production integration.
 */
import {simulateCombat} from '../combat/engine';
import type {AbilityDefinition,AbilityEffect,CombatantDefinition,CombatResult,DamageType,BossPhaseDefinition} from '../combat/types';
import {buildHiddenPartyFinaleHazard,type HiddenPartyFinaleHazardInput} from './weekly-party-finale-hazards-v6';
import {deriveHiddenPartyFinaleObjectiveReplay,type HiddenPartyCompanionContribution} from './weekly-party-finale-objectives-v7';
import type {WeeklyPartyFamily} from './weekly-party-events-v2';

export const PARTY_EVENT_DISTINCT_FINALES_V8_RELEASED=false;
export type PartyEventV8Metric='escort_integrity'|'tracking_marks'|'ward_stability'|'seal_pressure';
export interface FamilyChoiceV8{readonly id:string;readonly label:string;readonly tradeoff:string;}
export interface PartyEventFinaleV8{
 readonly kind:'hidden_non_rewarding_family_encounter';
 readonly family:WeeklyPartyFamily;
 readonly variation:string;
 readonly scene:string;
 readonly mechanic:string;
 readonly objective:{metric:PartyEventV8Metric;label:string;startsAt:number;successAt:number;higherIsBetter:boolean};
 readonly stage2:{selected:string;options:readonly [FamilyChoiceV8,FamilyChoiceV8]};
 readonly stage3:{selected:string;options:readonly [FamilyChoiceV8,FamilyChoiceV8]};
 readonly telegraphs:readonly {abilityId:string;castTimeMs:number;warning:string}[];
 readonly boss:CombatantDefinition;
}
interface FamilyDesign{
 scene:string;mechanic:string;metric:PartyEventV8Metric;label:string;successAt:number;higherIsBetter:boolean;
 stage2:readonly [FamilyChoiceV8,FamilyChoiceV8];stage3:readonly [FamilyChoiceV8,FamilyChoiceV8];
 variations:Readonly<Record<string,{tempo:number;pressure:number;defense:number;twist:string}>>;
}
const FAMILIES:Readonly<Record<WeeklyPartyFamily,FamilyDesign>>={
 broken_caravan:{
  scene:'A supply train trapped at a contested crossing',
  mechanic:'Protect cargo integrity while raiders target the wagons; repairs can offset real damage.',
  metric:'escort_integrity',label:'Escort Integrity',successAt:30,higherIsBetter:true,
  stage2:[
   {id:'safe_pass',label:'Safe Pass',tradeoff:'Reinforce the wagons; fewer cargo breaches, but a longer boss fight.'},
   {id:'fast_pass',label:'Fast Pass',tradeoff:'Reach the raider captain sooner; shorter fight, but more breaches.'},
  ],
  stage3:[
   {id:'brace_wagons',label:'Brace Wagons',tradeoff:'Cargo takes less damage; raiders have more time to retaliate.'},
   {id:'disrupt_raiders',label:'Disrupt Raiders',tradeoff:'Raider captain becomes more exposed, at the cost of riskier charges.'},
  ],
  variations:{
   bandits_crossing:{tempo:1,pressure:1,defense:1,twist:'Raider pikes pin the rear wagon'},
   fogbound_trail:{tempo:.96,pressure:1.03,defense:1.02,twist:'The ambush begins in thick fog'},
   collapsed_crossing:{tempo:1.06,pressure:.98,defense:.98,twist:'Loose stones slow the convoy'},
  },
 },
 nightfall_hunt:{
  scene:'A moonlit pursuit through predator territory',
  mechanic:'Land hits to build tracking marks; howl disruptions and short exposure windows decide the chase.',
  metric:'tracking_marks',label:'Tracking Marks',successAt:35,higherIsBetter:true,
  stage2:[
   {id:'clear_trail',label:'Clear Trail',tradeoff:'Better visibility and more reliable hits, but longer pursuit.'},
   {id:'shadow_trail',label:'Shadow Trail',tradeoff:'Close on the prey faster, but stronger shadow howls.'},
  ],
  stage3:[
   {id:'hold_ground',label:'Hold Ground',tradeoff:'Reduce howl pressure while tracking builds steadily.'},
   {id:'hunt_alpha',label:'Hunt the Alpha',tradeoff:'Create stronger exposure windows, but the alpha retaliates harder.'},
  ],
  variations:{
   moonfang_pack:{tempo:1.04,pressure:.98,defense:1,twist:'The pack circles whenever the alpha vanishes'},
   hollow_stag:{tempo:.96,pressure:1.04,defense:1.01,twist:'Phantom tracks make the pursuit deceptive'},
   ashclaw_behemoth:{tempo:1,pressure:1.02,defense:1.04,twist:'A large alpha leaves unmistakable tracks'},
  },
 },
 broken_wards:{
  scene:'A circle of runestones cracking under magical pressure',
  mechanic:'Prevent overload pulses, purge lingering rune burns and break the enemy’s protective barriers.',
  metric:'ward_stability',label:'Ward Stability',successAt:30,higherIsBetter:true,
  stage2:[
   {id:'ground_spires',label:'Ground Spires',tradeoff:'Shorter rune burns and safer pulses, but tougher stone defenses.'},
   {id:'charge_sigils',label:'Charge Sigils',tradeoff:'Expose weak points in the stones, but rune burns last longer.'},
  ],
  stage3:[
   {id:'protect_wards',label:'Protect Wards',tradeoff:'Preserve stability but allow thicker boss barriers.'},
   {id:'overload_wards',label:'Overload Wards',tradeoff:'Shatter barriers sooner while increasing magical backlash.'},
  ],
  variations:{
   overgrown_runestones:{tempo:1.03,pressure:.98,defense:1.03,twist:'Roots insulate unstable stones'},
   stormward_spires:{tempo:.96,pressure:1.04,defense:1,twist:'Storm energy ricochets between spires'},
   blighted_roots:{tempo:1,pressure:1.03,defense:.97,twist:'Blight causes unstable rune burns'},
  },
 },
 lost_reliquary:{
  scene:'An ancient vault with dangerous mirrored seals',
  mechanic:'Keep seal pressure beneath fracture level; breaking seals helps damage but exposes the party to true corruption.',
  metric:'seal_pressure',label:'Seal Pressure',successAt:70,higherIsBetter:false,
  stage2:[
   {id:'quiet_passage',label:'Quiet Passage',tradeoff:'Protect the seals, reducing corruption while taking longer to reach the guardian.'},
   {id:'deep_passage',label:'Deep Passage',tradeoff:'Reach the inner vault quickly, but awaken stronger seal overflow.'},
  ],
  stage3:[
   {id:'preserve_seals',label:'Preserve Seals',tradeoff:'Keep corruption under control, but the guardian resists damage.'},
   {id:'break_seals',label:'Break Seals',tradeoff:'Expose the guardian at the risk of fast-growing seal pressure.'},
  ],
  variations:{
   sunken_archive:{tempo:1.04,pressure:.99,defense:1.02,twist:'Flooded scrolls amplify ancient curses'},
   vault_of_echoes:{tempo:.96,pressure:1.04,defense:1,twist:'The mirrors repeat the guardian’s strikes'},
   starlit_crypt:{tempo:1,pressure:1.02,defense:.98,twist:'Astral light destabilizes the final seal'},
  },
 },
};
export function partyEventFamilyDesignV8(family:WeeklyPartyFamily):FamilyDesign{
 const design=FAMILIES[family];
 if(!design)throw Error('party_finale_invalid_family_variation');
 return design;
}
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
const round=(n:number)=>Math.round(n*100)/100;
const duration=(n:number)=>Math.max(3200,Math.round(n));
function cast(id:string,name:string,type:DamageType,coeff:number,cooldown:number,castMs:number,
 target:'current_target'|'all_enemies',extra:readonly AbilityEffect[]=[]):AbilityDefinition{
 return {id:'PE_V8_'+id,name,cooldownMs:cooldown,castTimeMs:castMs,
  target,priority:92,interruptible:true,
  effects:[{kind:'damage',damageType:type,coeff},...extra],
  tags:['party_event_hidden_v8','counterable_hazard']};
}
function phase(id:string,hpPct:number,target:'self'|'all_enemies',effects:AbilityEffect[]):BossPhaseDefinition{
 return {id:'PE_V8_'+id,hpPct,target,effects};
}
/** Only server-verifiable route IDs and canonical variation can build the encounter. */
export function buildHiddenPartyFamilyEncounterV8(input:HiddenPartyFinaleHazardInput):PartyEventFinaleV8{
 // Reuse v6 validation for trusted family, variation, tier, boss and both ballots.
 buildHiddenPartyFinaleHazard(input);
 const d=partyEventFamilyDesignV8(input.family),variation=d.variations[input.variation];
 if(!variation)throw Error('party_finale_invalid_family_variation');
 const safe2=input.stage2Choice===d.stage2[0].id;
 const safe3=input.stage3Choice===d.stage3[0].id;
 const speed=variation.tempo;
 const strength=variation.pressure;
 const base=structuredClone(input.baseline);
 const stats={...base.stats};
 const damageType:DamageType=input.family==='nightfall_hunt'?'shadow':
  input.family==='broken_wards'?'arcane':input.family==='lost_reliquary'?'nature':'physical';
 let attacks:AbilityDefinition[]=[];
 let phases:BossPhaseDefinition[]=[];
 let attackModifier=1;
 let hpModifier=1;
 let defenseModifier=variation.defense;
 let evasionBonus=0;
 let tags:string[]=[];
 switch(input.family){
 case 'broken_caravan':{
  // Cargo breaches target the convoy even when the players survive.
  const cargoPressure=(safe2?.91:1.10)*(safe3?.88:1.10)*strength;
  hpModifier=(safe2?1.04:.97)*(safe3?1.04:.95);
  attackModifier=safe3?1:1.05;
  attacks=[
   cast('CARAVAN_CHARGE','Raider Charge',damageType,.47*cargoPressure,
    Math.round(15500*speed),3600,'all_enemies'),
   cast('CARAVAN_BREACH','Cargo Breach',damageType,.36*cargoPressure,
    Math.round((safe2?28800:23000)*speed),4200,'current_target',
    [{kind:'debuff',tag:'damage_taken',value:.055,durationMs:4500}]),
  ];
  phases=[phase('CARAVAN_REINFORCEMENTS',.55,'self',[{kind:'buff',tag:'damage_done',value:.08,durationMs:14000}])];
  tags=['escort_cargo','repair_opportunity'];break;
 }
 case 'nightfall_hunt':{
  const howl=(safe2?.92:1.13)*(safe3?.88:1.11)*strength;
  hpModifier=(safe2?1.05:.95)*(safe3?1.02:.96);
  evasionBonus=safe2?-15:24;
  attackModifier=safe3?.98:1.05;
  attacks=[
   cast('HUNT_HOWL','Nightfall Howl','shadow',.42*howl,Math.round(18000*speed),
    4100,'all_enemies',[{kind:'debuff',tag:'healing_received',value:-.08,durationMs:6000}]),
   {id:'PE_V8_HUNT_VANISH',name:'Fade Into the Brush',cooldownMs:Math.round(26000*speed),
    castTimeMs:3500,target:'self',priority:87,interruptible:true,
    effects:[{kind:'buff',tag:'damage_taken',value:-.13,durationMs:6500}],
    tags:['party_event_hidden_v8','counterable_hazard','hunt_concealment']},
  ];
  phases=[
   phase('HUNT_REVEAL_70',.7,'self',[{kind:'debuff',tag:'damage_taken',value:safe3?.10:.18,durationMs:9500}]),
   phase('HUNT_REVEAL_35',.35,'self',[{kind:'debuff',tag:'damage_taken',value:safe3?.10:.18,durationMs:9500}]),
  ];
  tags=['tracking','exposure_window'];break;
 }
 case 'broken_wards':{
  const surge=(safe2?.90:1.12)*(safe3?.89:1.11)*strength;
  hpModifier=(safe2?1.03:.98)*(safe3?1.03:.97);
  defenseModifier*=safe2?1.05:.94;
  const burnDuration=safe2?4000:8000;
  attacks=[
   cast('WARDS_PULSE','Runestone Pulse','arcane',.38*surge,
    Math.round(16500*speed),4300,'all_enemies',
    [{kind:'dot',tag:'rune_burn',damageType:'arcane',coeff:.08*surge,durationMs:burnDuration,tickMs:2000}]),
   cast('WARDS_OVERLOAD','Ward Overload','arcane',.46*surge,
    Math.round(29000*speed),4500,'all_enemies',
    [{kind:'debuff',tag:'damage_taken',value:.06,durationMs:6000}]),
  ];
  const barrier=Math.round(base.stats.maxHp*(safe3?.065:.027));
  phases=[
   phase('WARDS_BARRIER_65',.65,'self',[{kind:'shield',flat:barrier,tag:'ward_barrier'}]),
   phase('WARDS_BARRIER_30',.30,'self',[{kind:'shield',flat:barrier,tag:'ward_barrier'}]),
  ];
  tags=['ward_barriers','rune_burn'];break;
 }
 case 'lost_reliquary':{
  const seal=(safe2?.92:1.13)*(safe3?.86:1.19)*strength;
  hpModifier=(safe2?1.05:.96)*(safe3?1.05:.93);
  defenseModifier*=safe3?1.04:.86;
  attackModifier=safe3?.98:1.07;
  attacks=[
   cast('RELIQUARY_SWEEP','Mirrored Sweep','nature',.42*seal,
    Math.round(17300*speed),3800,'all_enemies',
    [{kind:'debuff',tag:'healing_received',value:-.07,durationMs:4500}]),
   cast('RELIQUARY_OVERFLOW','Seal Overflow','nature',.28*seal,
    Math.round(30000*speed),4500,'all_enemies',
    // True DoT pierces shields in the existing combat engine; healing / timely
    // interruptions are counters. Strength is intentionally very modest.
    [{kind:'dot',tag:'seal_corruption',damageType:'true',coeff:.042*seal,
      durationMs:safe3?4000:6000,tickMs:2000}]),
  ];
  phases=[phase('RELIQUARY_FRACTURE_50',.50,'self',[
   {kind:'buff',tag:'damage_done',value:safe3?.05:.12,durationMs:13000},
   {kind:'debuff',tag:'damage_taken',value:safe3?.05:.15,durationMs:12000},
  ])];
  tags=['seal_corruption','dangerous_shortcut'];break;
 }
 default:throw Error('party_finale_invalid_family_variation');
 }
 if(attacks.some(a=>base.abilities.some(b=>b.id===a.id))
   ||phases.some(p=>base.phases?.some(b=>b.id===p.id)))
  throw Error('party_finale_reserved_ability_collision');
 stats.maxHp=Math.max(1,Math.round(stats.maxHp*hpModifier));
 stats.attackPower=round(stats.attackPower*attackModifier);
 stats.defense=round(stats.defense*defenseModifier);
 stats.evasion+=evasionBonus;
 const boss:CombatantDefinition={...base,stats,
  abilities:[...base.abilities,...attacks],
  phases:[...(base.phases??[]),...phases],
  tags:[...(base.tags??[]),'party_event_hidden_v8',...tags]};
 return {kind:'hidden_non_rewarding_family_encounter',family:input.family,variation:input.variation,
  scene:d.scene+' — '+variation.twist,mechanic:d.mechanic,
  objective:{metric:d.metric,label:d.label,startsAt:d.higherIsBetter?100:0,
   successAt:d.successAt,higherIsBetter:d.higherIsBetter},
  stage2:{selected:input.stage2Choice,options:d.stage2},
  stage3:{selected:input.stage3Choice,options:d.stage3},
  telegraphs:attacks.map(a=>({abilityId:a.id,castTimeMs:a.castTimeMs,warning:a.name})),
  boss};
}
export interface FamilyObjectiveTraceV8{
 readonly kind:'non_rewarding_family_replay';
 readonly family:WeeklyPartyFamily;
 readonly metric:PartyEventV8Metric;
 readonly value:number;
 readonly objectiveMet:boolean;
 readonly hypotheticalClear:boolean;
 readonly bossVictory:boolean;
 readonly bossReason:CombatResult['reason'];
 readonly castCounts:Readonly<Record<string,number>>;
 readonly interrupts:number;
 readonly bossDamage:number;
 readonly healing:number;
 readonly shielding:number;
 readonly companionContributions:readonly HiddenPartyCompanionContribution[];
 readonly cues:readonly {atMs:number;kind:'warning'|'counter'|'impact'|'turning_point';text:string}[];
}
/** Evaluate source combat events; no EP, rewards, points or mutable state. */
export function deriveHiddenPartyFamilyObjectiveV8(input:{
 encounter:PartyEventFinaleV8;players:readonly CombatantDefinition[];combat:CombatResult;
}):FamilyObjectiveTraceV8{
 const {encounter,players,combat}=input,playerIds=new Set(players.map(p=>p.id));
 const bossId=encounter.boss.id,telegraphIds=new Set(encounter.telegraphs.map(t=>t.abilityId));
 if(players.length<2||players.length>4||playerIds.size!==players.length
    ||combat.players.length!==players.length||players.some(p=>p.team!=='players'||p.role==='enemy'))
  throw Error('party_finale_invalid_roster');
 const general=deriveHiddenPartyFinaleObjectiveReplay({
  family:encounter.family,
  hazard:{kind:'non_rewarding_hazard_preview',metric:encounter.objective.metric,
   name:encounter.scene,counterplay:encounter.mechanic,
   telegraphs:encounter.telegraphs,boss:encounter.boss},players,combat});
 const teamHp=Math.max(1,players.reduce((s,p)=>s+p.stats.maxHp,0));
 const bossHp=Math.max(1,encounter.boss.stats.maxHp);
 const castCounts:Record<string,number>={},cues:FamilyObjectiveTraceV8['cues'][number][]=[];
 let hits=0, bossDamage=0, healing=0, shielding=0, interrupts=0,
  hostility=0, dotDamage=0, companionDamage=0, bossShields=0;
 let raidCharges=0,breaches=0,howls=0,vanishes=0,
  pulses=0,overloads=0,sweeps=0,sealOverflows=0,exposures=0;
 const eventCues:Record<WeeklyPartyFamily,string>={
  broken_caravan:'Defend the cargo!',nightfall_hunt:'Keep the trail in sight!',
  broken_wards:'Stabilize the runestones!',lost_reliquary:'Watch the seal pressure!',
 };
 for(const e of combat.events){
  const id=e.abilityId??'';
  if(e.actorId===bossId&&e.type==='cast_start'&&telegraphIds.has(id)){
   cues.push({atMs:e.atMs,kind:'warning',text:eventCues[encounter.family]+' '+(encounter.telegraphs.find(t=>t.abilityId===id)?.warning??'')});
  }
  if(e.type==='interrupt'&&telegraphIds.has(e.interruptedAbilityId??'')){
   interrupts++;
   cues.push({atMs:e.atMs,kind:'counter',text:encounter.family==='nightfall_hunt'?'The trail stays visible':
    encounter.family==='broken_wards'?'Rune surge interrupted':
    encounter.family==='lost_reliquary'?'Seal surge stopped':'Raider charge interrupted'});
  }
  if(e.actorId===bossId&&e.type==='cast_complete'&&telegraphIds.has(id)){
   castCounts[id]=(castCounts[id]??0)+1;
   cues.push({atMs:e.atMs,kind:'impact',text:encounter.family==='broken_caravan'?'The convoy is under attack':
    encounter.family==='nightfall_hunt'?'The quarry attempts to escape':
    encounter.family==='broken_wards'?'The runes pulse with unstable energy':'The guardian fractures the seals'});
   if(id.endsWith('CARAVAN_CHARGE'))raidCharges++;
   if(id.endsWith('CARAVAN_BREACH'))breaches++;
   if(id.endsWith('HUNT_HOWL'))howls++;
   if(id.endsWith('HUNT_VANISH'))vanishes++;
   if(id.endsWith('WARDS_PULSE'))pulses++;
   if(id.endsWith('WARDS_OVERLOAD'))overloads++;
   if(id.endsWith('RELIQUARY_SWEEP'))sweeps++;
   if(id.endsWith('RELIQUARY_OVERFLOW'))sealOverflows++;
  }
  if(e.type==='phase'&&e.actorId===bossId&&id.startsWith('PE_V8_')){
   if(id.includes('HUNT_REVEAL'))exposures++;
   cues.push({atMs:e.atMs,kind:'turning_point',text:id.includes('HUNT_REVEAL')?'The alpha is exposed!':
    id.includes('WARDS_BARRIER')?'The guardian raises a stone barrier':
    id.includes('RELIQUARY_FRACTURE')?'The final seal starts to break':'New raiders enter the crossing'});
  }
  if(e.type==='damage'&&playerIds.has(e.actorId??'')&&e.targetId===bossId){
   bossDamage+=Math.max(0,e.amount??0);hits++;
  }
  if((e.type==='damage'||e.type==='dot_tick')&&e.actorId===bossId&&playerIds.has(e.targetId??'')){
   hostility+=Math.max(0,e.amount??0);
   if(e.type==='dot_tick'&&telegraphIds.has(id))dotDamage+=Math.max(0,e.amount??0);
  }
  if(e.type==='heal'&&playerIds.has(e.actorId??'')&&playerIds.has(e.targetId??''))
   healing+=Math.max(0,e.amount??0);
  if(e.type==='shield'&&playerIds.has(e.actorId??'')&&playerIds.has(e.targetId??''))
   shielding+=Math.max(0,e.amount??0);
  if(e.type==='shield'&&e.actorId===bossId&&e.targetId===bossId)
   bossShields+=Math.max(0,e.amount??0);
 }
 companionDamage=general.companionContributions.reduce((n,c)=>n+c.damage,0);
 // Family-specific rules genuinely differ; values are indicative preview goals,
 // not hidden changes to rewards or server-authoritative boss victory.
 let value:number;
 switch(encounter.family){
  case 'broken_caravan': {
   const reinforced=encounter.stage2.selected==='safe_pass';
   const braced=encounter.stage3.selected==='brace_wagons';
   const loss=(breaches*(reinforced?12:17)+raidCharges*(braced?6:10))
    +hostility/teamHp*25;
   const repair=Math.min(12,healing/teamHp*22)+Math.min(12,shielding/teamHp*22)
    +interrupts*4;
   value=clamp(100-loss+repair);break;
  }
  case 'nightfall_hunt':{
   // Real party hits and alpha exposures are the only sources of tracking.
   // A veil can interrupt tracking even when the party is undamaged.
   value=clamp(bossDamage/bossHp*55+Math.min(30,hits*.9)+exposures*11
    +interrupts*9-howls*5-vanishes*9
    +Math.min(5,companionDamage/bossHp*10));break;
  }
  case 'broken_wards':{
   // The boss ACTUALLY gains shields at phase thresholds; player shields and
   // interruptions are equally real opportunities to maintain ward stability.
   value=clamp(100-pulses*9-overloads*15-dotDamage/teamHp*65
    -bossShields/bossHp*30
    +Math.min(14,shielding/teamHp*26)+Math.min(8,healing/teamHp*12)
    +interrupts*6);break;
  }
  case 'lost_reliquary':{
   const broken=encounter.stage3.selected==='break_seals';
   value=clamp(sealOverflows*(broken?20:13)+sweeps*7
    +dotDamage/teamHp*125
    +bossDamage/bossHp*(broken?26:9)
    -interrupts*8-Math.min(12,healing/teamHp*24));break;
  }
 }
 value=round(value);
 const objectiveMet=encounter.objective.higherIsBetter
  ?value>=encounter.objective.successAt
  :value<=encounter.objective.successAt;
 return {kind:'non_rewarding_family_replay',family:encounter.family,
  metric:encounter.objective.metric,value,objectiveMet,
  hypotheticalClear:combat.victory&&objectiveMet,
  bossVictory:combat.victory,bossReason:combat.reason,castCounts,
  interrupts,bossDamage:round(bossDamage),healing:round(healing),shielding:round(shielding),
  companionContributions:general.companionContributions,cues};
}
/** Full preview: four-player team is exact 1 Tank / 2 Damage / 1 Support. */
export function previewHiddenPartyFamilyFinaleV8(input:{
 encounter:PartyEventFinaleV8;players:readonly CombatantDefinition[];seed:string;maxDurationMs?:number;
}):{kind:'hidden_non_rewarding_family_replay';combat:CombatResult;objective:FamilyObjectiveTraceV8}{
 const {players,encounter}=input;
 const counts={tank:0,damage:0,support:0};
 if(players.length<2||players.length>4||new Set(players.map(p=>p.id)).size!==players.length
   ||players.some(p=>p.team!=='players'||p.role==='enemy'||!(p.role in counts)))
  throw Error('party_finale_invalid_roster');
 for(const p of players)counts[p.role as keyof typeof counts]++;
 if(counts.tank>1||counts.damage>2||counts.support>1
  ||players.length===4&&(counts.tank!==1||counts.damage!==2||counts.support!==1))
  throw Error('party_finale_role_composition_invalid');
 if(!input.seed||input.seed.length>128)throw Error('party_finale_invalid_seed');
 if(input.maxDurationMs!==undefined&&(!Number.isSafeInteger(input.maxDurationMs)
  ||input.maxDurationMs<5000||input.maxDurationMs>180000))
  throw Error('party_finale_invalid_duration');
 const combat=simulateCombat({seed:input.seed,players:players.map(p=>structuredClone(p)),
  enemies:[structuredClone(encounter.boss)],maxDurationMs:input.maxDurationMs??90000});
 return {kind:'hidden_non_rewarding_family_replay',combat,
  objective:deriveHiddenPartyFamilyObjectiveV8({encounter,players,combat})};
}
