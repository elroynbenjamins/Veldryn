/** HIDDEN pure candidate trigger calculations. No active engine import,
 * command, actor mutation, or runtime authority. Validated resonance
 * groups are used by the private QA harness only. */
import type {reviewEffectGemResonanceV2} from './effect-gem-resonance-review';
export type EffectTriggerReviewGroupV2=ReturnType<typeof reviewEffectGemResonanceV2>['families'][number];
export const EFFECT_TRIGGER_REVIEW_V2='effect-trigger-boundaries-review-v2-20261126' as const;
const fail=(why:string):never=>{throw Error('effect_trigger_review_'+why);};
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
function group(g:EffectTriggerReviewGroupV2,family:string){
 if(g.familyId!==family||g.runtimeEnabled!==false||![1,2,3].includes(g.resonance)||
   g.copies!==g.resonance||!finite(g.totalValue)||g.totalValue<=0)fail('scope');
 return g;
}
export interface PredatorTargetReviewV2{readonly id:string;readonly boss:boolean;readonly tags:readonly string[];}
export interface PredatorWindowReviewV2{readonly targetId:string;readonly expiresAt:number;}
/** Eligibility is resonance-specific; first successful hit opens a
 * target-scoped window for subsequent hits. One window per target. */
export function reviewPredatorHitV2(g:EffectTriggerReviewGroupV2,target:PredatorTargetReviewV2,
 now:number,windows:readonly PredatorWindowReviewV2[],successful:boolean){
 group(g,'effect_predator');
 if(!target.id||!finite(now))fail('predator_input');
 const eligible=target.boss||target.tags.includes('elite')||
   (g.resonance>=2&&target.tags.some(t=>t==='miniboss'||t==='champion'));
 const existing=windows.find(w=>w.targetId===target.id);
 const boosted=eligible&&g.resonance===3&&!!existing&&existing.expiresAt>now;
 const next=eligible&&successful&&g.resonance===3&&!existing?
  [...windows,{targetId:target.id,expiresAt:now+8000}]:[...windows];
 return {eligible,bonus:eligible?g.totalValue*(boosted?1.25:1):0,windows:next,boosted};
}
export interface GuardianReductionReviewV2{readonly casterId:string;readonly recipientId:string;readonly value:number;readonly expiresAt:number;}
/** One contribution per caster/recipient, including caster's shared
 * reduction. Refresh on successful nonzero ally barrier. Different
 * sources remain distinct; no unbounded repeated same-source stacking. */
export function reviewGuardianBarrierV2(g:EffectTriggerReviewGroupV2,casterId:string,recipientId:string,
 now:number,granted:number,entries:readonly GuardianReductionReviewV2[]){
 group(g,'effect_guardians_gift');
 if(!casterId||!recipientId||!finite(now)||!finite(granted))fail('guardian_input');
 const active=entries.filter(e=>e.expiresAt>now);
 if(casterId===recipientId||granted===0)return active;
 const put=(recipient:string,value:number)=>{
  const prior=active.findIndex(e=>e.casterId===casterId&&e.recipientId===recipient);
  const next={casterId,recipientId:recipient,value,expiresAt:now+(g.resonance>=2?6000:4000)};
  if(prior>=0)active[prior]=next;else active.push(next);
 };
 put(recipientId,g.totalValue);
 if(g.resonance===3)put(casterId,g.totalValue*.5);
 return active;
}
/** Unyielding buffs base armor and ward relatively, not a second flat
 * Ward contribution. Track stack expiries independently with 750ms ICD. */
export interface UnyieldingReviewStateV2{readonly expiries:readonly number[];readonly readyAt:number;}
export function reviewUnyieldingDamageV2(g:EffectTriggerReviewGroupV2,now:number,
 damage:number,state:UnyieldingReviewStateV2,armor:number,ward:number){
 group(g,'effect_unyielding');
 if(![now,damage,armor,ward,state.readyAt].every(finite))fail('unyielding_input');
 const expiries=state.expiries.filter(t=>t>now);
 let readyAt=state.readyAt;
 if(damage>0&&now>=readyAt){
  if(expiries.length<(g.resonance>=2?5:4))expiries.push(now+(g.resonance===3?7000:5000));
  readyAt=now+750;
 }
 const fraction=expiries.length*g.totalValue;
 return {state:{expiries,readyAt},fraction,armor:armor*(1+fraction),ward:ward*(1+fraction)};
}
/** Sustenance must not reduce an already larger barrier pool. The cap
 * limits this gem's added barrier, not the preexisting shield. */
export function reviewSustenanceKillV2(g:EffectTriggerReviewGroupV2,now:number,
 readyAt:number,maxHp:number,hp:number,shield:number,eligibleElite:boolean){
 group(g,'effect_sustenance');
 if(![now,readyAt,maxHp,hp,shield].every(finite)||maxHp<=0||hp>maxHp)fail('sustenance_input');
 if(now<readyAt)return {hp,shield,readyAt,heal:0,barrier:0};
 const amount=maxHp*g.totalValue*(g.resonance>=2&&eligibleElite?3:1);
 const heal=Math.min(maxHp-hp,amount);
 const barrier=g.resonance===3?Math.min(Math.max(0,maxHp*.02-shield),(amount-heal)*.25):0;
 return {hp:hp+heal,shield:shield+barrier,readyAt:now+3000,heal,barrier};
}
