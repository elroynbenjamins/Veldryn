/** PRIVATE lifecycle adapter for Aegis, Mercy and Renewal. Only
 * exact reviewed worn copies supply magnitude and rank. This is not a
 * mounted combat command or a source of authenticated combat events. */
import type {reviewFrozenForgeSocketsV2} from './frozen-forge-socket-review';
import {FORGE_SOCKET_MECHANICS_REVIEW_V2} from './frozen-forge-socket-review';
import {reviewEffectGemResonanceV2} from './effect-gem-resonance-review';
import {reviewAegisBarrierV2,reviewMercyBarrierV2,reviewGemBarrierAbsorptionV2,reviewGemBarrierExpiryV2,
 reviewGemBarrierRemoveV2,reviewRenewalApplyV2,reviewRenewalTicksV2,
 type GemBarrierSegmentReviewV2,type RenewalReviewApplicationV2} from './effect-gem-trigger-review';
export const EFFECT_LIFECYCLE_REVIEW_V2='effect-owned-lifecycle-review-v2-20261126' as const;
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
const fail=(why:string):never=>{throw Error('effect_lifecycle_review_'+why);};
const id=(s:string)=>typeof s==='string'&&s.length>0&&s.length<=128;
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
export function createEffectLifecycleReviewV2(p:Projection){
 if(p.mechanicsReview!==FORGE_SOCKET_MECHANICS_REVIEW_V2||p.canExecuteCombat!==false||
  p.cpApproved!==false||p.releaseEnabled!==false||!p.effectResonanceReview||
  !id(p.forgeEvidence.actorId))fail('scope');
 const verified=reviewEffectGemResonanceV2(p.deferredEffectSources,p.equippedInstanceIds);
 if(JSON.stringify(verified)!==JSON.stringify(p.effectResonanceReview))fail('source_mismatch');
 const groups=new Map(verified.families.map(g=>[g.familyId,g]));
 const casterId=p.forgeEvidence.actorId;
 let now=0;
 let barriers:GemBarrierSegmentReviewV2[]=[],renewals:RenewalReviewApplicationV2[]=[];
 const actions=new Set<string>(),outputs=new Set<string>(),retired=new Set<string>();
 const key=(...parts:string[])=>JSON.stringify(parts);
 // Advance first at a clock tick: expire barriers, then consume due
 // Renewal ticks (including final tick). Never infer actual HP healing
 // or produce a fresh root event from these terminal requests.
 function advance(at:number){
  if(!finite(at)||at<now)fail('clock');
  const expiry=reviewGemBarrierExpiryV2(barriers,at);
  const ticks=reviewRenewalTicksV2(renewals,at);
  for(const row of expiry.expired)retired.add(row.id);
  for(const row of renewals)if(!ticks.rows.some(r=>r.id===row.id))retired.add(row.id);
  barriers=expiry.rows;renewals=ticks.rows;now=at;
  return {at,expiryHeals:expiry.heals.map(h=>({...h,origin:'secondary' as const})),
   periodicHeals:ticks.heals.map(h=>({...h,origin:'secondary' as const})),
   expiredBarriers:expiry.expired.map(r=>r.id)};
 }
 function checkOutput(a:{actionId:string;outputId:string;targetId:string;origin:'authored'|'secondary'|'companion';direct:boolean}){
  if(!id(a.actionId)||!id(a.outputId)||!id(a.targetId)||outputs.has(a.outputId))fail('output_identity');
  return a.origin==='authored'&&a.direct;
 }
 function grantAuthoredBarrier(a:{actionId:string;outputId:string;targetId:string;origin:'authored'|'secondary'|'companion';
  direct:boolean;amount:number;baseCapacity:number;durationMs:number;externalShield:number}){
  const eligible=checkOutput(a);
  const g=groups.get('effect_aegis');
  if(![a.amount,a.baseCapacity,a.durationMs,a.externalShield].every(finite)||a.durationMs<=0)fail('barrier_input');
  if(!eligible||!g)return {granted:0,tracked:false};
  const actionKey=key('aegis',a.actionId,a.targetId);
  if(actions.has(actionKey))return {granted:0,tracked:false};
  const result=reviewAegisBarrierV2(g,{id:key('aegis',a.outputId),casterId,recipientId:a.targetId,
   now,authoredAmount:a.amount,baseCapacity:a.baseCapacity,durationMs:a.durationMs,
   externalShield:a.externalShield,rows:barriers,authored:true});
  barriers=result.rows;actions.add(actionKey);outputs.add(a.outputId);
  return {granted:result.granted,tracked:result.granted>0,segmentId:key('aegis',a.outputId),cap:result.cap};
 }
 function applyDirectHeal(a:{actionId:string;outputId:string;targetId:string;origin:'authored'|'secondary'|'companion';
  direct:boolean;attempted:number;actual:number;maxHp:number;externalShield:number}){
  const eligible=checkOutput(a);
  if(![a.attempted,a.actual,a.maxHp,a.externalShield].every(finite)||a.actual>a.attempted||a.maxHp<=0||a.actual>a.maxHp)
   fail('heal_input');
  if(!eligible)return {mercy:0,renewal:0};
  const actionKey=key('heal',a.actionId,a.targetId);
  if(actions.has(actionKey))return {mercy:0,renewal:0};
  const mercy=groups.get('effect_mercy'),renewal=groups.get('effect_renewal');
  const mg=mercy?reviewMercyBarrierV2(mercy,{id:key('mercy',a.outputId),casterId,recipientId:a.targetId,now,
   attempted:a.attempted,actual:a.actual,maxHp:a.maxHp,externalShield:a.externalShield,rows:barriers,authoredDirect:true}):null;
  const rg=renewal?reviewRenewalApplyV2(renewal,{id:key('renewal',a.outputId),casterId,targetId:a.targetId,
   now,actualHeal:a.actual,authoredDirect:true,rows:renewals}):null;
  // Commit only after both candidate transitions validate.
  if(mg)barriers=mg.rows;
  if(rg){for(const row of renewals)if(!rg.rows.some(r=>r.id===row.id))retired.add(row.id);renewals=rg.rows;}
  actions.add(actionKey);outputs.add(a.outputId);
  return {mercy:mg?.granted??0,renewal:rg?.total??0};
 }
 function absorb(targetId:string,damage:number){
  const result=reviewGemBarrierAbsorptionV2(barriers,targetId,now,damage);
  for(const row of barriers)if(!result.rows.some(r=>r.id===row.id))retired.add(row.id);
  barriers=result.rows;
  return {absorbed:result.absorbed,remainingDamage:result.remainingDamage};
 }
 function removeBarrier(segmentId:string){
  const row=barriers.find(r=>r.id===segmentId);
  if(!row)return false;
  barriers=reviewGemBarrierRemoveV2(barriers,segmentId).rows;
  retired.add(segmentId);return true;
 }
 return {advance,grantAuthoredBarrier,applyDirectHeal,absorb,removeBarrier,
  inspect:()=>({version:EFFECT_LIFECYCLE_REVIEW_V2,sourceDigest:p.digest,casterId,now,
   barriers:barriers.map(r=>({...r})),renewals:renewals.map(r=>({...r})),
   retiredCount:retired.size,acceptedOutputs:outputs.size,canExecuteEffects:false as const,releaseEnabled:false as const})};
}
