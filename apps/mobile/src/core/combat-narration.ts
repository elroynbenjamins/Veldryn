import type {MonsterDef} from '../content/monsters';
import type {ClassId} from './types';
import {encounterIdentity} from './encounter-identity';

/** Cosmetic narration only: it must never calculate, predict or award combat results. */
export type CombatNarrationTone='accent'|'danger'|'muted';
export interface CombatNarrationFrame{
 key:string;
 params?:{amount:string};
 tone:CombatNarrationTone;
 hit:boolean;
 critical:boolean;
}
type CombatNarrationHit={atMs:number;actor:'player'|'enemy';damage:number;critical:boolean};
const CLASS_LINES:Record<ClassId,{prepare:string;strike:string}>={
 IRONWARDEN:{prepare:'You plant your feet behind your shield.',strike:'Steel finds its mark · {amount}'},
 BASTION:{prepare:'You brace for a guarded strike.',strike:'Guarded strike · {amount}'},
 DREADGUARD:{prepare:'You ready a crushing slash.',strike:'Crushing slash · {amount}'},
 DAWNKEEPER:{prepare:'You channel light into your next strike.',strike:'Radiant blow · {amount}'},
 WAYFINDER:{prepare:'You draw your bow and take aim.',strike:'Arrow hits · {amount}'},
 RAVAGER:{prepare:'You lean in for a fierce charge.',strike:'Fierce strike · {amount}'},
 HEXWEAVER:{prepare:'You weave another hex.',strike:'Hex strikes · {amount}'},
 KNIFE_DANCER:{prepare:'You ready a swift flurry.',strike:'Blade flurry · {amount}'},
 STONECALLER:{prepare:'You summon a shard of stone.',strike:'Stone impact · {amount}'},
};
const ENCOUNTER_LINES:Record<string,string>={
 SWARM:'The swarm shifts, seeking an opening.',
 ARCANE_FLICKER:'Wild magic sparks around the foe.',
 CHARGER:'The beast paws at the ground.',
 VENOM_AMBUSH:'The foe coils for a venomous strike.',
 BRAMBLE_GUARD:'Thorned armour creaks as the foe advances.',
 BRUTE:'The brute draws back for a heavy blow.',
 STALKER:'The predator prowls for an opening.',
 BULWARK:'The armoured foe steadies its guard.',
 RUNECASTER:'Runes flicker around the caster.',
 OATHBOUND:'The soldier raises a disciplined guard.',
 REVENANT:'Echo energy coils around the revenant.',
 FALLEN_KNIGHT:'Oathglass light gathers around the knight.',
};
export function liveHuntNarration(input:{
 classId:ClassId;
 monster:MonsterDef;
 nowMs:number;
 startedAtMs:number;
 lastHit?:CombatNarrationHit;
 stoppedReason?:string;
 damageText:(damage:number)=>string;
}):CombatNarrationFrame{
 if(input.stoppedReason)return {key:'Combat stopped',tone:'danger',hit:false,critical:false};
 const age=input.lastHit&&input.nowMs>=input.lastHit.atMs?input.nowMs-input.lastHit.atMs:Infinity;
 if(input.lastHit&&age<3200){
  const {lastHit}=input;
  return {
   key:lastHit.actor==='player'?CLASS_LINES[input.classId].strike:
    lastHit.critical?'You take a critical blow · {amount}':'You stagger from the impact · {amount}',
   params:{amount:input.damageText(lastHit.damage)},
   tone:lastHit.actor==='player'?'accent':'danger',
   hit:true,critical:lastHit.critical,
  };
 }
 if(input.lastHit?.actor==='enemy'&&age<6000){
  return {key:input.lastHit.critical?'You rise after the critical hit.':'You regain your footing.',tone:'muted',hit:false,critical:false};
 }
 // Distinct short phases between *real* hits: class stance, encounter cue, neutral focus.
 const phase=Math.floor(Math.max(0,input.nowMs-input.startedAtMs)/4800)%3;
 const key=phase===0?CLASS_LINES[input.classId].prepare:
  phase===1?ENCOUNTER_LINES[encounterIdentity(input.monster).id]??'You watch for an opening.':
  'You watch for an opening.';
 return {key,tone:'muted',hit:false,critical:false};
}
