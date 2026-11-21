/**
 * Server-owned conditional talent execution for Combat 2.0.
 * The 31 passives here are intentionally NOT represented as always-on stats.
 * State belongs to one encounter, and all timers are deterministic tick times.
 *
 * CombatV2LoadoutMeta.passiveRanks is created only after validateBuildV2.
 * Never accept that metadata from an untrusted client combat payload.
 */
import type {AbilityEffect,CombatantState} from '../types';

export const REACTIVE_PASSIVES_V2:Readonly<Record<string,readonly string[]>>={
 IRONWARDEN:['Steady Guard','Last Bastion','Stand Together','Vengeful Rhythm'],
 BASTION:['Immovability','Last Refuge','Seismic Guard','Unbroken Line'],
 DREADGUARD:['Pain Dividend','Scar Pact','Oppressive Gaze','Predator','Unbroken Will'],
 WAYFINDER:['Relentless Arrows','Trail Sense','Second Wind'],
 RAVAGER:['Adrenaline','Relentless','Unchained','Kill Sustain'],
 HEXWEAVER:['Thread Focus','Void Memory','Calm Mind'],
 KNIFE_DANCER:['Endless Dance','Critical Tempo','Countercraft','Exit Wound'],
 DAWNKEEPER:['Last Light','Grace'],
 STONECALLER:['Echo Flow','Harmonic Circle'],
};
export const REACTIVE_PASSIVE_COUNT_V2=Object.values(REACTIVE_PASSIVES_V2).reduce((n,x)=>n+x.length,0);

type Target='self'|'target'|'all_allies';
export interface ReactiveActionV2{
  node:string;target:Target;effect:AbilityEffect;
}
export type ReactiveTriggerV2='hit'|'damage_taken'|'evade'|'taunt'|'interrupt'|
 'gain'|'spend'|'kill'|'cleanse'|'heal'|'shield';
export interface ReactiveContextV2{
 amount?:number;spent?:number;previousHpPct?:number;critical?:boolean;
 abilityName?:string;fromMarkedEnemy?:boolean;targetHpPct?:number;
}
const id=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const nameToClass=(s:string)=>s.toUpperCase().replace(/[^A-Z0-9]+/g,'_');
const clamp=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
const cap=(x:number)=>clamp(x,0,.40);
const pct=(s:CombatantState)=>s.hp/Math.max(1,s.definition.stats.maxHp);
export function passiveRankV2(actor:CombatantState,node:string):number{
  const meta=actor.definition.combatV2;
  if(actor.definition.team!=='players'||!meta||!actor.combatV2)return 0;
  const canonical='v2:passive:'+id(actor.definition.classId??'')+':'+id(node);
  const rank=meta.passiveRanks?.[canonical]??0;
  return Number.isSafeInteger(rank)&&rank>=1&&rank<=3?rank:0;
}
const cdKey=(node:string)=>'passive:'+id(node);
function ready(actor:CombatantState,node:string,now:number,cooldownMs:number):boolean{
  const state=actor.combatV2;
  if(!state)return false;
  return now>=(state.procCooldownAt[cdKey(node)]??-Infinity)+cooldownMs;
}
function use(actor:CombatantState,node:string,now:number):void{
  if(actor.combatV2)actor.combatV2.procCooldownAt[cdKey(node)]=now;
}
function every(actor:CombatantState,node:string,count:number):boolean{
  const state=actor.combatV2;
  if(!state)return false;
  const key='passive_count:'+id(node);
  state.procCounters[key]=(state.procCounters[key]??0)+1;
  return state.procCounters[key]%count===0;
}
const buff=(node:string,tag:string,value:number,durationMs:number,target:Target='self'):ReactiveActionV2=>
 ({node,target,effect:{kind:'buff',tag,value,durationMs}});
const debuff=(node:string,tag:string,value:number,durationMs:number):ReactiveActionV2=>
 ({node,target:'target',effect:{kind:'debuff',tag,value,durationMs}});
const heal=(node:string,flat:number):ReactiveActionV2=>
 ({node,target:'self',effect:{kind:'heal',flat:Math.max(0,flat)}});
const damage=(node:string,coeff:number):ReactiveActionV2=>
 ({node,target:'target',effect:{kind:'damage',coeff,damageType:'physical'}});

/** Safe deterministic event callback. Call only for non-passive/non-capstone
 * original skill events and never on gem or companion proc events.
 */
export function triggerReactivePassiveV2(
 actor:CombatantState,trigger:ReactiveTriggerV2,now:number,ctx:ReactiveContextV2={},
):ReactiveActionV2[]{
 if(!actor.combatV2||actor.definition.team!=='players'||!Number.isFinite(now)||now<0)return [];
 const rank=(node:string)=>passiveRankV2(actor,node);
 const stacks=actor.combatV2.stacks;
 const actions:ReactiveActionV2[]=[];
 const send=(node:string,...rows:ReactiveActionV2[])=>actions.push(...rows);
 switch(trigger){
  case 'taunt':
   if(rank('Stand Together'))send('Stand Together',
     buff('Stand Together','damage_taken',-cap(.01*rank('Stand Together')),4000,'all_allies'));
   if(rank('Unbroken Line'))send('Unbroken Line',
     buff('Unbroken Line','damage_taken',-cap(.01*rank('Unbroken Line')),4000));
   break;
  case 'interrupt':
   if(rank('Seismic Guard'))send('Seismic Guard',
     debuff('Seismic Guard','damage_done',-cap(.01*rank('Seismic Guard')),5000));
   if(rank('Unbroken Will'))send('Unbroken Will',
     buff('Unbroken Will','damage_taken',-cap(.01*rank('Unbroken Will')),5000));
   break;
  case 'damage_taken':{
   const damageTaken=Math.max(0,ctx.amount??0);
   const heavy=damageTaken>=actor.definition.stats.maxHp*.12;
   if(heavy&&rank('Pain Dividend')&&ready(actor,'Pain Dividend',now,8000)){
     use(actor,'Pain Dividend',now);
     send('Pain Dividend',buff('Pain Dividend','damage_done',cap(.01*rank('Pain Dividend')),5000));
   }
   if(heavy&&rank('Calm Mind')&&ready(actor,'Calm Mind',now,20000)){
     use(actor,'Calm Mind',now);
     actor.combatV2.pendingDamageBonus=Math.max(actor.combatV2.pendingDamageBonus,.01*rank('Calm Mind'));
     send('Calm Mind'); // a queued boost; no instant effect
   }
   if(rank('Second Wind')&&
     (ctx.previousHpPct??1)>=.35&&pct(actor)<.35&&actor.hp>0&&ready(actor,'Second Wind',now,30000)){
     use(actor,'Second Wind',now);
     send('Second Wind',heal('Second Wind',actor.definition.stats.maxHp*.01*rank('Second Wind')));
   }
   break;
  }
  case 'gain':
   if(rank('Unchained')&&stacks>=actor.combatV2.maxStacks&&ready(actor,'Unchained',now,5000)){
     use(actor,'Unchained',now);
     send('Unchained',buff('Unchained','damage_done',cap(.01*rank('Unchained')),5000));
   }
   break;
  case 'spend':{
   const spent=ctx.spent??0;
   if(spent>=3&&rank('Void Memory')&&ready(actor,'Void Memory',now,5000)){
     use(actor,'Void Memory',now);
     send('Void Memory',buff('Void Memory','haste',cap(.01*rank('Void Memory')),5000));
   }
   if(spent>=4&&rank('Harmonic Circle')&&ready(actor,'Harmonic Circle',now,4000)){
     use(actor,'Harmonic Circle',now);
     send('Harmonic Circle',buff('Harmonic Circle','haste',cap(.008*rank('Harmonic Circle')),4000,'all_allies'));
   }
   break;
  }
  case 'hit':{
   if(rank('Relentless Arrows'))every(actor,'Relentless Arrows',5);
   if(rank('Vengeful Rhythm')&&ctx.abilityName==='Iron Riposte'&&every(actor,'Vengeful Rhythm',3))
     send('Vengeful Rhythm',buff('Vengeful Rhythm','haste',cap(.01*rank('Vengeful Rhythm')),5000));
   if(rank('Critical Tempo')&&ctx.critical)
     send('Critical Tempo',buff('Critical Tempo','haste',cap(.01*rank('Critical Tempo')),3000));
   break;
  }
  case 'evade':
   if(rank('Countercraft')&&ready(actor,'Countercraft',now,8000)){
     use(actor,'Countercraft',now);
     send('Countercraft',damage('Countercraft',.30*(1+.03*rank('Countercraft'))));
   }
   if(rank('Exit Wound'))actor.combatV2.procCounters['passive_ready:exit_wound']=1;
   break;
  case 'kill':{
   if(rank('Kill Sustain')&&ready(actor,'Kill Sustain',now,10000)){
     const totalKey='passive_kills_minute';
     const startedKey='passive_kills_window_at';
     if(now-(actor.combatV2.procCooldownAt[startedKey]??-Infinity)>=60000){
       actor.combatV2.procCooldownAt[startedKey]=now;
       actor.combatV2.procCounters[totalKey]=0;
     }
     if((actor.combatV2.procCounters[totalKey]??0)<4){
       actor.combatV2.procCounters[totalKey]=(actor.combatV2.procCounters[totalKey]??0)+1;
       use(actor,'Kill Sustain',now);
       send('Kill Sustain',heal('Kill Sustain',actor.definition.stats.maxHp*.005*rank('Kill Sustain')));
     }
   }
   break;
  }
  case 'cleanse':
   if(rank('Grace'))send('Grace',
     buff('Grace','damage_taken',-cap(.01*rank('Grace')),4000,'target'));
   break;
  case 'heal':case 'shield':break;
 }
 return actions;
}
/** Conditional damage factors, calculated once per verified v2 attack.
 * Do not call this for miss, periodic effects, gems, companions, or procs.
 */
export function outgoingReactiveMultiplierV2(
 actor:CombatantState,target:CombatantState,now:number,
):number{
 if(!actor.combatV2)return 1;
 let result=1;
 const r=(node:string)=>passiveRankV2(actor,node);
 if(r('Endless Dance')&&actor.combatV2.stacks>=4)result*=1+.01*r('Endless Dance');
 if(r('Predator')&&(target.threat[actor.definition.id]??0)>0)result*=1+.015*r('Predator');
 if(r('Relentless Arrows')&&
   ((actor.combatV2.procCounters['passive_count:relentless_arrows']??0)+1)%5===0)
     result*=1+.03*r('Relentless Arrows');
 if(r('Exit Wound')&&actor.combatV2.procCounters['passive_ready:exit_wound']){
   result*=1+.02*r('Exit Wound');
   actor.combatV2.procCounters['passive_ready:exit_wound']=0;
 }
 return clamp(result,1,1.30);
}
export function incomingReactiveMultiplierV2(
 target:CombatantState,source:CombatantState,now:number,
):number{
 if(!target.combatV2)return 1;
 const r=(node:string)=>passiveRankV2(target,node);
 let mult=1;
 if(r('Steady Guard')&&target.shield>0)mult*=1-.01*r('Steady Guard');
 if(r('Immovability')&&pct(target)>.60)mult*=1-.007*r('Immovability');
 if(r('Trail Sense')&&source.modifiers.some(m=>m.kind==='debuff'&&m.sourceId===target.definition.id&&m.tag==='damage_taken'&&m.expiresAt>now))
   mult*=1-.01*r('Trail Sense');
 if(r('Oppressive Gaze')&&target.combatV2.stacks>=4)mult*=1-.01*r('Oppressive Gaze');
 return clamp(mult,.70,1);
}
export function reactiveDamageFlatReductionV2(target:CombatantState,raw:number):number{
 const r=passiveRankV2(target,'Scar Pact');
 return r&&pct(target)<.40?Math.min(Math.max(0,raw),target.definition.stats.maxHp*.01*r):0;
}
export function reactiveHasteV2(actor:CombatantState):number{
 const r=passiveRankV2(actor,'Adrenaline');
 return r&&actor.combatV2&&actor.combatV2.stacks>0?Math.min(.03,.01*r):0;
}
export function reactiveResourceSpendMultiplierV2(actor:CombatantState):number{
 const r=(name:string)=>passiveRankV2(actor,name);
 return clamp(1+.02*r('Relentless')+.02*r('Thread Focus')+.02*r('Echo Flow'),1,1.18);
}
/** Last Light modifies only a real heal directed at an injured ally, with
 * one internal cooldown per support character (not per recipient).
 */
export function reactiveHealingMultiplierV2(actor:CombatantState,target:CombatantState,now:number):number{
 const rank=passiveRankV2(actor,'Last Light');
 if(!rank||actor===target||pct(target)>=.30||!ready(actor,'Last Light',now,15000))return 1;
 use(actor,'Last Light',now);
 return 1+.03*rank;
}
/** Once per encounter threshold crossing: shielded burst and lowest-HP wards
 * are handled through the event callback, rather than an always-on modifier.
 */
export function defensiveReactiveTriggerV2(target:CombatantState,now:number):ReactiveActionV2[]{
 const rank=passiveRankV2(target,'Last Bastion');
 if(!rank||target.hp<=0||pct(target)>=.35||!ready(target,'Last Bastion',now,30000))return [];
 use(target,'Last Bastion',now);
 return [buff('Last Bastion','damage_taken',-cap(.02*rank),5000)];
}
export function reactiveShieldMultiplierV2(actor:CombatantState,target:CombatantState,now:number):number{
 const rank=passiveRankV2(actor,'Last Refuge');
 if(!rank||actor===target||pct(target)>=.30||!ready(actor,'Last Refuge',now,25000))return 1;
 use(actor,'Last Refuge',now);
 return 1+.04*rank;
}
