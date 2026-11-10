import type {MonsterDef} from '../content/monsters';
import type {ClassId} from './types';
import {encounterIdentity} from './encounter-identity';

/** Cosmetic-only narration. Never roll combat, alter health, or infer an unrecorded hit. */
export type CombatNarrationTone='accent'|'danger'|'muted';
export interface CombatNarrationFrame {
 key:string;
 params?:{amount:string};
 tone:CombatNarrationTone;
 hit:boolean;
 critical:boolean;
}
type CombatNarrationHit={atMs:number;actor:'player'|'enemy';damage:number;critical:boolean};
export const HUNT_CLASS_NARRATION={
 "IRONWARDEN": {
  "prepare": [
   "You plant your feet behind your shield.",
   "You tighten your grip on the hilt.",
   "You brace for the next exchange.",
   "You raise your shield and size up the foe."
  ],
  "strike": [
   "Steel finds its mark · {amount}",
   "A measured slash lands · {amount}",
   "Your sword cuts through · {amount}"
  ]
 },
 "BASTION": {
  "prepare": [
   "You brace for a guarded strike.",
   "You square your shield against the threat.",
   "You settle into a defensive stance.",
   "You watch the foe from behind your guard."
  ],
  "strike": [
   "Guarded strike · {amount}",
   "A shield-led blow connects · {amount}",
   "Your steady attack lands · {amount}"
  ]
 },
 "DREADGUARD": {
  "prepare": [
   "You ready a crushing slash.",
   "You draw your weapon back for a heavy swing.",
   "You advance with grim resolve.",
   "You lower your stance and prepare to strike."
  ],
  "strike": [
   "Crushing slash · {amount}",
   "A dark blade strikes · {amount}",
   "Your heavy weapon connects · {amount}"
  ]
 },
 "DAWNKEEPER": {
  "prepare": [
   "You channel light into your next strike.",
   "You draw strength from the dawn.",
   "A pale glow gathers around your weapon.",
   "You steady your focus for a radiant blow."
  ],
  "strike": [
   "Radiant blow · {amount}",
   "A flash of light strikes · {amount}",
   "Your blessed weapon lands · {amount}"
  ]
 },
 "WAYFINDER": {
  "prepare": [
   "You draw your bow and take aim.",
   "You steady your breathing behind the bow.",
   "You track the foe through your sights.",
   "You nock another arrow and hold your aim."
  ],
  "strike": [
   "Arrow hits · {amount}",
   "Your shot lands · {amount}",
   "An arrow strikes true · {amount}"
  ]
 },
 "RAVAGER": {
  "prepare": [
   "You lean in for a fierce charge.",
   "You tighten your grip for the next rush.",
   "You set your weight behind the next blow.",
   "You advance without giving ground."
  ],
  "strike": [
   "Fierce strike · {amount}",
   "A savage blow connects · {amount}",
   "Your weapon crashes into the foe · {amount}"
  ]
 },
 "HEXWEAVER": {
  "prepare": [
   "You weave another hex.",
   "You trace a sigil in the air.",
   "You draw a thread of shadow into focus.",
   "You shape a curse beneath your breath."
  ],
  "strike": [
   "Hex strikes · {amount}",
   "Your curse finds its target · {amount}",
   "Shadow magic lashes out · {amount}"
  ]
 },
 "KNIFE_DANCER": {
  "prepare": [
   "You ready a swift flurry.",
   "You shift your blades into position.",
   "You circle, searching for a gap.",
   "Your daggers flash as you close in."
  ],
  "strike": [
   "Blade flurry · {amount}",
   "A quick cut lands · {amount}",
   "Your twin blades connect · {amount}"
  ]
 },
 "STONECALLER": {
  "prepare": [
   "You summon a shard of stone.",
   "You pull fragments of rock into the air.",
   "You steady your stance against the earth.",
   "You shape stone into a striking edge."
  ],
  "strike": [
   "Stone impact · {amount}",
   "A stone shard strikes · {amount}",
   "Your earthen blow connects · {amount}"
  ]
 }
} as const satisfies Record<ClassId,{prepare:readonly string[];strike:readonly string[]}>;
export const HUNT_ENCOUNTER_NARRATION={
 "SWARM": [
  "The swarm shifts, seeking an opening.",
  "Several creatures press closer.",
  "The swarm scatters, then gathers again."
 ],
 "ARCANE_FLICKER": [
  "Wild magic sparks around the foe.",
  "Unstable light dances across the battlefield.",
  "A flicker of magic shivers through the air."
 ],
 "CHARGER": [
  "The beast paws at the ground.",
  "The beast lowers its head.",
  "The creature shifts its weight to charge."
 ],
 "VENOM_AMBUSH": [
  "The foe coils for a venomous strike.",
  "A venomous stinger twitches.",
  "The creature watches for a careless step."
 ],
 "BRAMBLE_GUARD": [
  "Thorned armour creaks as the foe advances.",
  "Bramble-covered limbs tighten.",
  "Thorns scrape against the ground."
 ],
 "BRUTE": [
  "The brute draws back for a heavy blow.",
  "The brute squares its shoulders.",
  "Heavy footsteps shake the ground."
 ],
 "STALKER": [
  "The predator prowls for an opening.",
  "The stalker moves along your flank.",
  "The predator pauses just beyond reach."
 ],
 "BULWARK": [
  "The armoured foe steadies its guard.",
  "Heavy plating shifts into place.",
  "The foe keeps its guard tightly raised."
 ],
 "RUNECASTER": [
  "Runes flicker around the caster.",
  "A rune pulses with unstable light.",
  "The caster traces a pattern in the air."
 ],
 "OATHBOUND": [
  "The soldier raises a disciplined guard.",
  "The soldier adjusts its footing.",
  "The foe watches from behind its guard."
 ],
 "REVENANT": [
  "Echo energy coils around the revenant.",
  "The revenant's armour hums with echoes.",
  "A cold shimmer passes through the undead."
 ],
 "FALLEN_KNIGHT": [
  "Oathglass light gathers around the knight.",
  "The knight's blade glows with an eerie light.",
  "The air hums around the fallen champion."
 ]
} as const satisfies Record<string,readonly string[]>;
export const HUNT_COMMON_NARRATION={
 "focus": [
  "You watch for an opening.",
  "You adjust your footing.",
  "You keep your guard up."
 ],
 "wounded": [
  "You fight to stay standing.",
  "You steady your breathing through the pain.",
  "You hold your ground despite your wounds."
 ],
 "finishing": [
  "Your opponent looks close to falling.",
  "You wait for a clear opening to finish the fight.",
  "The foe is barely holding on."
 ],
 "taken": [
  "You stagger from the impact · {amount}",
  "An enemy strike lands · {amount}",
  "You reel from the blow · {amount}"
 ],
 "critTaken": [
  "You take a critical blow · {amount}",
  "A brutal hit catches you · {amount}",
  "A devastating strike lands · {amount}"
 ],
 "recover": [
  "You regain your footing.",
  "You steady yourself after the blow.",
  "You reset your stance."
 ],
 "critRecover": [
  "You rise after the critical hit.",
  "You push through the pain.",
  "You force yourself upright."
 ]
} as const satisfies Record<string,readonly string[]>;

/** Cycle through every line in a lane before repeating; no random/flickering text on re-render. */
function idleLine(lines:readonly string[],round:number){return lines[round%lines.length];}
function stableHitIndex(hit:CombatNarrationHit,classId:ClassId,monsterId:string){
 const seed=classId+':'+monsterId+':'+hit.actor+':'+hit.atMs;
 let hash=2166136261;
 for(let i=0;i<seed.length;i++)hash=Math.imul(hash^seed.charCodeAt(i),16777619);
 return hash>>>0;
}
export function liveHuntNarration(input:{
 classId:ClassId;
 monster:MonsterDef;
 nowMs:number;
 startedAtMs:number;
 lastHit?:CombatNarrationHit;
 stoppedReason?:string;
 playerHp?:number;
 playerMaxHp?:number;
 enemyHp?:number;
 enemyMaxHp?:number;
 damageText:(damage:number)=>string;
}):CombatNarrationFrame{
 if(input.stoppedReason)return {key:'Combat stopped',tone:'danger',hit:false,critical:false};
 const hit=input.lastHit&&input.lastHit.atMs>=input.startedAtMs&&input.lastHit.atMs<=input.nowMs?input.lastHit:undefined;
 const age=hit?input.nowMs-hit.atMs:Infinity;
 const classLines=HUNT_CLASS_NARRATION[input.classId];
 if(hit&&age<2600){
  const variants=hit.actor==='player'?classLines.strike:hit.critical?HUNT_COMMON_NARRATION.critTaken:HUNT_COMMON_NARRATION.taken;
  return {key:variants[stableHitIndex(hit,input.classId,input.monster.id)%variants.length],
   params:{amount:input.damageText(hit.damage)},
   tone:hit.actor==='player'?'accent':'danger',hit:true,critical:hit.critical};
 }
 if(hit?.actor==='enemy'&&age<5300){
  const variants=hit.critical?HUNT_COMMON_NARRATION.critRecover:HUNT_COMMON_NARRATION.recover;
  return {key:variants[stableHitIndex(hit,input.classId,input.monster.id)%variants.length],tone:'muted',hit:false,critical:false};
 }
 const slot=Math.floor(Math.max(0,input.nowMs-input.startedAtMs)/4800);
 const round=Math.floor(slot/3);
 const lane=slot%3;
 if(lane===0)return {key:idleLine(classLines.prepare,round),tone:'muted',hit:false,critical:false};
 if(lane===1){
  const cues=(HUNT_ENCOUNTER_NARRATION as Readonly<Record<string,readonly string[]>>)[encounterIdentity(input.monster).id]??HUNT_COMMON_NARRATION.focus;
  return {key:idleLine(cues,round),tone:'muted',hit:false,critical:false};
 }
 const hpRatio=(input.playerHp??0)/Math.max(1,input.playerMaxHp??0);
 const enemyRatio=(input.enemyHp??0)/Math.max(1,input.enemyMaxHp??0);
 const wounded=(input.playerMaxHp??0)>0&&hpRatio>0&&hpRatio<=.25;
 const finishing=(input.enemyMaxHp??0)>0&&enemyRatio>0&&enemyRatio<=.2;
 const options=wounded?HUNT_COMMON_NARRATION.wounded:finishing?HUNT_COMMON_NARRATION.finishing:HUNT_COMMON_NARRATION.focus;
 return {key:idleLine(options,round),tone:wounded?'danger':'muted',hit:false,critical:false};
}
