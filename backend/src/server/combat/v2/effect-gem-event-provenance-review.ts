/** HIDDEN encounter-local event provenance QA. The caller represents
 * a future trusted combat adapter, NOT a client or executable authority.
 * This module grants no combat authority and never mutates actors. */
import type {reviewFrozenForgeSocketsV2} from './frozen-forge-socket-review';
import {reviewEffectGemResonanceV2} from './effect-gem-resonance-review';
import {FORGE_SOCKET_MECHANICS_REVIEW_V2} from './frozen-forge-socket-review';
export const EFFECT_EVENT_PROVENANCE_REVIEW_V2='effect-event-provenance-review-v2-20261126' as const;
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
type Origin='authored'|'basic'|'companion';
type Output='damage'|'heal'|'barrier'|'buff'|'debuff'|'kill'|'barrier_expiry';
type Family='effect_momentum'|'effect_critical_surge'|'effect_flow'|'effect_shared_resolve'|
 'effect_benediction'|'effect_battle_rhythm'|'effect_mercy'|'effect_renewal'|'effect_guardians_gift'|
 'effect_aegis'|'effect_retaliation'|'effect_sustenance'|'effect_opportunist';
export interface GemRootActionReviewV2{
 readonly id:string;readonly actorId:string;readonly origin:Origin;readonly at:number;
 readonly category:'offense'|'support'|'neutral';
}
export interface GemRootOutputReviewV2{
 readonly id:string;readonly actionId:string;readonly targetId:string;
 readonly kind:Output;readonly timing:'direct'|'periodic';readonly at:number;
 readonly successful:boolean;readonly actual:number;readonly attempted:number;
 readonly critical?:boolean;
}
type Event=GemRootOutputReviewV2 & {actorId:string;origin:Origin|'secondary';depth:0|1;parentId:string|null;familyId:Family|null};
const fail=(why:string):never=>{throw Error('effect_event_provenance_review_'+why);};
const id=(s:string)=>typeof s==='string'&&s.length>0&&s.length<=128;
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
const outputFamilies:Partial<Record<Family,readonly Output[]>>={
 effect_mercy:['barrier'],effect_renewal:['heal'],effect_aegis:['heal'],
 effect_retaliation:['heal'],effect_sustenance:['heal','barrier'],
};
/** Claim scope: per accepted action, target, or output event. Cooldown,
 * stacks, charge reservation and actual magnitude still belong to the
 * individual trigger modules and future authenticated combat adapter. */
function scope(family:Family,event:Event,action:GemRootActionReviewV2){
 if(event.depth!==0||event.origin==='companion'||!event.successful)return null;
 const authored=event.origin==='authored',direct=event.timing==='direct';
 const hit=event.kind==='damage'&&direct&&event.actual>0;
 switch(family){
  case 'effect_momentum':return hit?'action':null;
  case 'effect_critical_surge':return hit&&event.critical===true?'action':null;
  case 'effect_flow':return authored&&direct?'action':null;
  case 'effect_shared_resolve':return authored&&direct&&event.targetId!==event.actorId&&
   (event.kind==='barrier'||event.kind==='buff')&&event.actual>0?'action':null;
  case 'effect_benediction':return authored&&direct&&action.category==='support'&&
   (event.kind==='heal'||event.kind==='barrier')&&event.attempted>0?'action':null;
  case 'effect_battle_rhythm':return authored&&direct&&action.category!=='neutral'&&
   ['damage','heal','barrier','buff','debuff'].includes(event.kind)?'action':null;
  case 'effect_mercy':return authored&&direct&&event.kind==='heal'&&event.attempted>event.actual?'target':null;
  case 'effect_renewal':return authored&&direct&&event.kind==='heal'&&event.actual>0?'target':null;
  case 'effect_guardians_gift':return authored&&direct&&event.kind==='barrier'&&event.actual>0&&
   event.targetId!==event.actorId?'target':null;
  // Expiry provenance must be bound to the exact owned barrier in the
  // future engine. Here the registered authored expiry output is a QA input.
  case 'effect_aegis':return authored&&event.kind==='barrier_expiry'&&event.actual>0?'event':null;
  case 'effect_retaliation':return authored&&hit?'action':null;
  case 'effect_sustenance':return event.kind==='kill'&&event.actual>0?'event':null;
  case 'effect_opportunist':return authored&&direct&&event.kind==='debuff'?'target':null;
 }
}
export function createEffectEventProvenanceReviewV2(projections:readonly {actorId:string;projection:Projection}[]){
 const equipped=new Map<string,Set<string>>();
 for(const {actorId,projection:p} of projections){
  if(!id(actorId)||equipped.has(actorId)||p.mechanicsReview!==FORGE_SOCKET_MECHANICS_REVIEW_V2||
   p.canExecuteCombat!==false||p.cpApproved!==false||p.releaseEnabled!==false||!p.effectResonanceReview)
   fail('projection_scope');
  const verified=reviewEffectGemResonanceV2(p.deferredEffectSources,p.equippedInstanceIds);
  if(JSON.stringify(verified)!==JSON.stringify(p.effectResonanceReview))fail('source_mismatch');
  equipped.set(actorId,new Set(verified.families.map(g=>g.familyId)));
 }
 const actions=new Map<string,GemRootActionReviewV2>(),events=new Map<string,Event>();
 const claims=new Set<string>(),emissions=new Set<string>();
 const key=(...parts:string[])=>JSON.stringify(parts);
 function registerAction(a:GemRootActionReviewV2){
  if(!id(a.id)||!equipped.has(a.actorId)||!finite(a.at)||
   !['authored','basic','companion'].includes(a.origin)||!['offense','support','neutral'].includes(a.category)||
   actions.has(a.id)||events.has(a.id))fail('action');
  actions.set(a.id,{...a});
 }
 function registerOutput(o:GemRootOutputReviewV2){
  const a=actions.get(o.actionId);
  if(!a||!id(o.id)||!id(o.targetId)||events.has(o.id)||actions.has(o.id)||
   ![o.at,o.actual,o.attempted].every(finite)||o.actual>o.attempted||o.at<a.at||
   !['direct','periodic'].includes(o.timing)||
   !['damage','heal','barrier','buff','debuff','kill','barrier_expiry'].includes(o.kind))fail('output');
  events.set(o.id,{...o,actorId:a!.actorId,origin:a!.origin,depth:0,parentId:null,familyId:null});
 }
 function claim(family:Family,eventId:string){
  const e=events.get(eventId);
  if(!e)throw Error('effect_event_provenance_review_unknown_event');
  if(!equipped.get(e.actorId)?.has(family))return {accepted:false,reason:'unequipped' as const};
  const a=actions.get(e.actionId)!;
  const s=scope(family,e,a);
  if(!s)return {accepted:false,reason:'ineligible_or_terminal' as const};
  const k=key(e.actorId,family,s,s==='event'?e.id:e.actionId,s==='target'?e.targetId:'');
  if(claims.has(k))return {accepted:false,reason:'duplicate_scope' as const};
  claims.add(k);
  // Bind emission authorization to the exact claimed parent, not a
  // different event sharing an action or target.
  emissions.add(key('authorized',family,eventId));
  return {accepted:true,reason:'accepted' as const};
 }
 function emitSecondary(family:Family,parentId:string,childId:string,kind:Output,at:number,
  targetId:string,amount:number,tickIndex=0){
  const parent=events.get(parentId);
  if(!parent||parent.depth!==0||!emissions.has(key('authorized',family,parentId))||
   !outputFamilies[family]?.includes(kind)||!id(childId)||!id(targetId)||events.has(childId)||actions.has(childId)||
   !finite(at)||at<parent.at||!finite(amount)||amount<=0||!Number.isSafeInteger(tickIndex)||tickIndex<0)
   fail('secondary');
  const parentEvent=parent!;
  if(family==='effect_renewal'){
   if(tickIndex<1||tickIndex>3||at!==parentEvent.at+tickIndex*2000||targetId!==parentEvent.targetId)fail('renewal_tick');
  }else if(tickIndex!==0||at!==parentEvent.at)fail('secondary_clock');
  const expectedTarget=family==='effect_retaliation'||family==='effect_sustenance'?parentEvent.actorId:parentEvent.targetId;
  if(targetId!==expectedTarget)fail('secondary_target');
  const emissionKey=key('emitted',family,parentId,kind,String(tickIndex));
  if(emissions.has(emissionKey))fail('duplicate_secondary');
  emissions.add(emissionKey);
  const event:Event={id:childId,actionId:parentEvent.actionId,targetId,kind,at,timing:family==='effect_renewal'?'periodic':'direct',
   successful:true,actual:amount,attempted:amount,actorId:parentEvent.actorId,origin:'secondary',depth:1,
   parentId,familyId:family};
  events.set(childId,event);
  return {...event,mayTriggerEffects:false as const};
 }
 return {registerAction,registerOutput,claim,emitSecondary,
  inspect:()=>({version:EFFECT_EVENT_PROVENANCE_REVIEW_V2,actions:actions.size,events:events.size,
   terminalEvents:[...events.values()].filter(e=>e.depth===1).length,acceptedClaims:claims.size,
   canExecuteEffects:false as const,releaseEnabled:false as const})};
}
