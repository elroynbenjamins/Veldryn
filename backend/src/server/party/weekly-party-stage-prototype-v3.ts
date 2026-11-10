/**
 * Party Events v3 - TEST-ONLY three-stage encounter prototype.
 *
 * Not imported by routes, migrations, reward workers or the live event.
 * This is a deterministic presentation/combat test adapter, not an
 * authoritative stage settlement or Event Point source.
 */
import {simulateCombat} from '../combat/engine';
import type {CombatantDefinition,CombatEvent} from '../combat/types';
import {applyVerifiedPartyPreparation,deriveVerifiedPartyPhaseSupport,type VerifiedOrderProgress} from './weekly-party-boss-v2';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyFamily,type WeeklyPartyDifficulty} from './weekly-party-events-v2';

export const PARTY_EVENT_STAGE_V3_RELEASED=false;
export type PartyEventPreviewStage=1|2|3;
export interface PartyEventPrototypeChoice{ id:string;label:string;counterplay:string; }
const designs:Record<WeeklyPartyFamily,{
 theme:string;threat:string;defense:string;
 stage2:readonly [PartyEventPrototypeChoice,PartyEventPrototypeChoice];
 stage3:readonly [PartyEventPrototypeChoice,PartyEventPrototypeChoice];
 cues:readonly [string,string,string];damageType:'physical'|'shadow'|'arcane'|'nature';
}>={
 broken_caravan:{
  theme:'Escort integrity',threat:'Roadbreaker raider charge',defense:'Brace caravan or clear the charge lane',
  stage2:[{id:'safe_pass',label:'Safe Pass',counterplay:'Braced wagons soften the charge'},
   {id:'fast_pass',label:'Fast Pass',counterplay:'Faster advance opens a brief exposure window'}],
  stage3:[{id:'brace_wagons',label:'Brace Wagons',counterplay:'Protection increases escort stability'},
   {id:'disrupt_raiders',label:'Disrupt Raiders',counterplay:'Early disruption increases boss exposure'}],
  cues:['Scouting the crossing','Raider charge incoming','Cargo breach warning'],damageType:'physical',
 },
 nightfall_hunt:{
  theme:'Tracking marks',threat:'Nightfall howl',defense:'Cover ears or break the hunting circle',
  stage2:[{id:'clear_trail',label:'Clear Trail',counterplay:'Predictable howl timing'},
   {id:'shadow_trail',label:'Shadow Trail',counterplay:'Shorter route with a tighter howl warning'}],
  stage3:[{id:'hold_ground',label:'Hold Ground',counterplay:'Protection against fear pressure'},
   {id:'hunt_alpha',label:'Hunt the Alpha',counterplay:'Longer beast vulnerability window'}],
  cues:['Following fresh tracks','Howl warning','Alpha exposure window'],damageType:'shadow',
 },
 broken_wards:{
  theme:'Ward stability',threat:'Unbound rune pulse',defense:'Ground the sigil or shelter behind a ward',
  stage2:[{id:'ground_spires',label:'Ground Spires',counterplay:'Lower storm pulse pressure'},
   {id:'charge_sigils',label:'Charge Sigils',counterplay:'Trade a harder pulse for a burst opening'}],
  stage3:[{id:'protect_wards',label:'Protect Wards',counterplay:'Stability protection'},
   {id:'overload_wards',label:'Overload Wards',counterplay:'Shorter shield-break cycle'}],
  cues:['Inspecting runestones','Rune charge warning','Ward stability pulse'],damageType:'arcane',
 },
 lost_reliquary:{
  theme:'Seal pressure',threat:'Reliquary seal overload',defense:'Reinforce a seal or break the mirrored glyph',
  stage2:[{id:'quiet_passage',label:'Quiet Passage',counterplay:'Lower seal pressure'},
   {id:'deep_passage',label:'Deep Passage',counterplay:'More exposure with greater risk'}],
  stage3:[{id:'preserve_seals',label:'Preserve Seals',counterplay:'Longer protected period'},
   {id:'break_seals',label:'Break Seals',counterplay:'Faster exposed phase, stronger sweep'}],
  cues:['Surveying the vault','Mirrored sweep warning','Seal overload'],damageType:'nature',
 },
};
const difficultyScale:Record<WeeklyPartyDifficulty,number>={standard:1,veteran:1.2,heroic:1.4};
export interface PartyEventStagePreviewInput{
 family:WeeklyPartyFamily;variation:string;stage:PartyEventPreviewStage;
 difficulty:WeeklyPartyDifficulty;seed:number;
 frozenActors:readonly CombatantDefinition[];orders:readonly VerifiedOrderProgress[];
 choiceId?:string;
}
export interface PartyEventStagePreview{
 kind:'non_rewarding_prototype';stage:PartyEventPreviewStage;family:WeeklyPartyFamily;
 variation:string;scene:string;metric:string;
 choices:PartyEventPrototypeChoice[];selectedChoice:string|null;
 cues:{atMs:number;text:string}[];
 requiredOrdersComplete:number;optionalPreparations:string[];
 combatResult:null|{victory:boolean;reason:'victory'|'wipe'|'timeout';durationMs:number;
  totalDamage:number;totalHealing:number;totalShields:number;interrupts:number;events:CombatEvent[]};
 estimatedObjectiveIntegrity:number;
}
/** Returns a non-rewarding, non-authoritative stage illustration. */
export function simulatePartyEventStagePrototype(input:PartyEventStagePreviewInput):PartyEventStagePreview{
 const family=designs[input.family],reference=WEEKLY_PARTY_EVENT_FAMILIES[input.family];
 if(!family||!reference||!reference.variations.includes(input.variation))
  throw Error('party_stage_unknown_family_variation');
 if(![1,2,3].includes(input.stage)||!difficultyScale[input.difficulty]
  ||!Number.isSafeInteger(input.seed)||input.seed<0)throw Error('party_stage_invalid_input');
 const actors=input.frozenActors;
 if(actors.length<2||actors.length>4||new Set(actors.map(a=>a.id)).size!==actors.length
  ||actors.some(a=>a.team!=='players'||a.role==='enemy'||a.level<1))
  throw Error('party_stage_invalid_verified_roster');
 const choices=input.stage===2?family.stage2:input.stage===3?family.stage3:[] as PartyEventPrototypeChoice[];
 if(input.stage===1&&input.choiceId!==undefined)throw Error('party_stage_early_vote');
 if(input.stage>1&&!choices.some(c=>c.id===input.choiceId))throw Error('party_stage_choice_unresolved');
 const support=deriveVerifiedPartyPhaseSupport(input.orders,input.stage);
 const selected=choices.find(c=>c.id===input.choiceId);
 const cautious=input.stage===2?input.choiceId===family.stage2[0].id:input.stage===3&&input.choiceId===family.stage3[0].id;
 // Preview only. All choices have a counter and differ modestly in pressure.
 const choiceThreatFactor=input.stage===1?1:cautious?.94:1.06;
 const variationIndex=reference.variations.indexOf(input.variation);
 const offsets=input.stage===1?[8000,21000,35000]:input.stage===2?[12000,35000,56000]:[15000,40000,66000];
 const cues=family.cues.map((text,index)=>({
  atMs:offsets[index]!+variationIndex*400,
  text:index===1&&selected?selected.counterplay:text,
 }));
 const base={kind:'non_rewarding_prototype' as const,stage:input.stage,
  family:input.family,variation:input.variation,scene:input.stage===1?'Expedition scouting'
  :input.stage===2?'Confrontation skirmish':'Final defense rehearsal',
  metric:family.theme,choices:[...choices],selectedChoice:selected?.id??null,cues,
  requiredOrdersComplete:support.combat.completedRequiredStages,
  optionalPreparations:[...support.combat.completedOptionalPreparations]};
 if(input.stage===1)return {...base,combatResult:null,estimatedObjectiveIntegrity:Math.min(100,Math.round(80*support.objectiveEffectivenessMultiplier))};
 const levels=actors.map(a=>a.level).sort((a,b)=>a-b);
 const midpoint=(levels[Math.floor((levels.length-1)/2)]!+levels[Math.floor(levels.length/2)]!)/2;
 const levelScale=Math.max(.045,midpoint/25);
 const difficulty=difficultyScale[input.difficulty];
 const enemyHp=Math.max(1,Math.round(actors.length*(input.stage===2?1100:1450)*levelScale*difficulty
   *(cautious?1.04:.96)));
 const enemyAttack=Math.max(1,Math.round((input.stage===2?150:190)*levelScale*difficulty*choiceThreatFactor));
 const enemyDefense=Math.max(1,Math.round((input.stage===2?180:210)*levelScale*difficulty));
 const enemy:CombatantDefinition={
  id:'PARTY_EVENT_STAGE_HAZARD',name:family.threat,team:'enemies',role:'enemy',level:Math.round(midpoint),
  stats:{maxHp:enemyHp,attackPower:enemyAttack,healingPower:0,defense:enemyDefense,
   accuracy:720,evasion:100,critChance:.04,critMultiplier:1.4,haste:.02},
  basicAttackMs:3100,basicAttackCoeff:.65,
  abilities:[{id:'PARTY_STAGE_TELEGRAPH',name:family.threat,cooldownMs:13000,
   castTimeMs:1500,target:'all_enemies',priority:90,interruptible:true,
   effects:[{kind:'damage',coeff:input.stage===2?.33:.41,damageType:family.damageType}]}],
 };
 const prepared=actors.map(a=>applyVerifiedPartyPreparation(structuredClone(a),support.combat));
 const battle=simulateCombat({seed:'party-stage-preview:'+input.seed+':'+input.family+':'+input.variation+':'+input.stage+':'+input.choiceId,
  players:prepared,enemies:[enemy],maxDurationMs:72000});
 const total=(field:'damageDone'|'healingDone'|'interrupts')=>battle.players.reduce((v,p)=>v+Math.max(0,p[field]),0);
 const shields=battle.events.filter(e=>e.type==='shield').reduce((s,e)=>s+Math.max(0,e.amount??0),0);
 const integrity=Math.max(0,Math.min(100,Math.round(
  (100-45*(1-battle.enemies[0]!.hp/enemyHp)-14*(battle.reason==='wipe'?1:0))
  *support.escortIntegrityMultiplier*support.recoveryMultiplier)));
 return {...base,estimatedObjectiveIntegrity:integrity,combatResult:{
  victory:battle.victory,reason:battle.reason,durationMs:battle.durationMs,
  totalDamage:Math.round(total('damageDone')),totalHealing:Math.round(total('healingDone')),
  totalShields:Math.round(shields),interrupts:total('interrupts'),
  events:battle.events.filter(e=>['cast_start','damage','shield','heal','interrupt','combat_end'].includes(e.type)).slice(0,70),
 }};
}
