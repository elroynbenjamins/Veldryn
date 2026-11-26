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

/** Exact owned barrier segments for private review. External shields are
 * represented separately and are never removed by gem expiry. */
export interface GemBarrierSegmentReviewV2{
 readonly id:string;readonly casterId:string;readonly recipientId:string;
 readonly origin:'aegis_authored'|'mercy';readonly remaining:number;
 readonly expiresAt:number;readonly expiryHealFraction:number;
}
function validateBarrierRows(rows:readonly GemBarrierSegmentReviewV2[]){
 if(new Set(rows.map(r=>r.id)).size!==rows.length||
 rows.some(r=>!r.id||!r.casterId||!r.recipientId||!finite(r.remaining)||r.remaining<=0||
  !finite(r.expiresAt)||![0,.05].includes(r.expiryHealFraction)||
  (r.origin!=='aegis_authored'&&r.origin!=='mercy')||
  (r.origin==='mercy'&&r.expiryHealFraction!==0)))fail('barrier_rows');
}
function grantBarrier(g:EffectTriggerReviewGroupV2,origin:GemBarrierSegmentReviewV2['origin'],
 id:string,casterId:string,recipientId:string,now:number,requested:number,cap:number,duration:number,
 externalShield:number,rows:readonly GemBarrierSegmentReviewV2[],expiryHealFraction:number){
 validateBarrierRows(rows);
 if(!id||!casterId||!recipientId||rows.some(r=>r.id===id)||
  ![now,requested,cap,duration,externalShield].every(finite)||duration<=0||
  rows.some(r=>r.expiresAt<=now))fail('barrier_grant_input');
 const existing=externalShield+rows.filter(r=>r.recipientId===recipientId).reduce((n,r)=>n+r.remaining,0);
 const granted=Math.min(requested,Math.max(0,cap-existing));
 const next=granted>0?[...rows,{id,casterId,recipientId,origin,remaining:granted,
  expiresAt:now+duration,expiryHealFraction}]:[...rows];
 return {requested,cap,granted,rows:next,expiresAt:now+duration};
}
/** Aegis increases authored barrier output once. Rank 3 increases the
 * supplied base barrier capacity relatively by 5% (candidate reading).
 * Rank 2+ naturally expired unused owned barrier heals recipient 5%.
 * Never run these effects for gem-generated, reflected or recursive shields. */
export function reviewAegisBarrierV2(g:EffectTriggerReviewGroupV2,input:{
 id:string;casterId:string;recipientId:string;now:number;authoredAmount:number;
 baseCapacity:number;durationMs:number;externalShield:number;
 rows:readonly GemBarrierSegmentReviewV2[];authored:boolean;
}){
 group(g,'effect_aegis');
 if(!finite(input.authoredAmount)||!finite(input.baseCapacity))fail('aegis_input');
 return grantBarrier(g,'aegis_authored',input.id,input.casterId,input.recipientId,input.now,
  input.authored?input.authoredAmount*(1+g.totalValue):0,
  input.baseCapacity*(g.resonance===3?1.05:1),input.durationMs,input.externalShield,input.rows,
  g.resonance>=2?.05:0);
}
/** Mercy converts only direct authored overheal. Its small cap accounts
 * for existing recipient shields; never shrinks the existing pool.
 * No Aegis multiplier or expiry healing on Mercy-generated shields. */
export function reviewMercyBarrierV2(g:EffectTriggerReviewGroupV2,input:{
 id:string;casterId:string;recipientId:string;now:number;attempted:number;actual:number;
 maxHp:number;externalShield:number;rows:readonly GemBarrierSegmentReviewV2[];authoredDirect:boolean;
}){
 group(g,'effect_mercy');
 if(![input.attempted,input.actual,input.maxHp].every(finite)||input.actual>input.attempted||input.maxHp<=0)
  fail('mercy_input');
 return grantBarrier(g,'mercy',input.id,input.casterId,input.recipientId,input.now,
  input.authoredDirect?(input.attempted-input.actual)*g.totalValue:0,
  input.maxHp*(g.resonance>=2?.04:.03),g.resonance===3?10000:8000,
  input.externalShield,input.rows,0);
}
/** Consume owned segments in expiry order, stable ID tie-break, with
 * explicit recipient scope. Call expire first at the same clock tick. */
export function reviewGemBarrierAbsorptionV2(rows:readonly GemBarrierSegmentReviewV2[],
 recipientId:string,now:number,damage:number){
 validateBarrierRows(rows);
 if(!recipientId||!finite(now)||!finite(damage)||rows.some(r=>r.expiresAt<=now))fail('barrier_absorb_input');
 let remaining=damage;
 const sorted=[...rows].sort((a,b)=>a.expiresAt-b.expiresAt||a.id.localeCompare(b.id));
 const next:GemBarrierSegmentReviewV2[]=[];
 for(const r of sorted){
  const absorbed=r.recipientId===recipientId?Math.min(r.remaining,remaining):0;
  remaining-=absorbed;
  if(r.remaining>absorbed)next.push({...r,remaining:r.remaining-absorbed});
 }
 return {rows:next,absorbed:damage-remaining,remainingDamage:remaining};
}
/** Natural expiration alone yields a non-proccing heal request. Actual
 * HP clamp/alive checks belong to the future authoritative engine. */
export function reviewGemBarrierExpiryV2(rows:readonly GemBarrierSegmentReviewV2[],now:number){
 validateBarrierRows(rows);if(!finite(now))fail('barrier_expiry_input');
 const expired=rows.filter(r=>r.expiresAt<=now);
 return {rows:rows.filter(r=>r.expiresAt>now),expired,
  heals:expired.filter(r=>r.expiryHealFraction>0).map(r=>({recipientId:r.recipientId,casterId:r.casterId,
   barrierId:r.id,amount:r.remaining*r.expiryHealFraction,mayTriggerEffects:false as const}))};
}
export function reviewGemBarrierRemoveV2(rows:readonly GemBarrierSegmentReviewV2[],id:string){
 validateBarrierRows(rows);return {rows:rows.filter(r=>r.id!==id),heals:[] as const};
}
export interface OpportunistWindowReviewV2{
 readonly casterId:string;readonly targetId:string;readonly effectId:string;
 readonly readyUntil:number;readonly cooldownUntil:number;readonly consumed:boolean;
}
/** Fresh authored effect application only, source/target scoped ICD.
 * Refreshes don't rearm. Effect identity must match at hit time. */
export function reviewOpportunistApplicationV2(g:EffectTriggerReviewGroupV2,
 casterId:string,targetId:string,effectId:string,now:number,freshQualifying:boolean,
 windows:readonly OpportunistWindowReviewV2[]){
 group(g,'effect_opportunist');
 if(!casterId||!targetId||!effectId||!finite(now))fail('opportunist_input');
 const previous=windows.find(w=>w.casterId===casterId&&w.targetId===targetId);
 if(!freshQualifying||(previous&&now<previous.cooldownUntil))return [...windows];
 return [...windows.filter(w=>w!==previous),{casterId,targetId,effectId,readyUntil:now+4000,
  cooldownUntil:now+(g.resonance>=2?3000:4000),consumed:false}];
}
export function reviewOpportunistHitV2(g:EffectTriggerReviewGroupV2,
 casterId:string,targetId:string,now:number,eligibleDirect:boolean,successful:boolean,critical:boolean,
 currentEffectId:string|null,currentEffectExpiry:number,windows:readonly OpportunistWindowReviewV2[]){
 group(g,'effect_opportunist');
 if(!casterId||!targetId||!finite(now)||!finite(currentEffectExpiry))fail('opportunist_hit_input');
 const entry=windows.find(w=>w.casterId===casterId&&w.targetId===targetId);
 const ready=!!entry&&!entry.consumed&&entry.readyUntil>now&&eligibleDirect&&successful;
 const extension=ready&&critical&&g.resonance===3&&entry!.effectId===currentEffectId&&currentEffectExpiry>now?1000:0;
 return {bonus:ready?g.totalValue:0,extension,
  effectExpiry:currentEffectExpiry+extension,
  windows:windows.map(w=>w===entry&&ready?{...w,consumed:true}:w)};
}
/** Defensive action is explicitly qualified by the future engine.
 * Block starts an inactive effect at any rank; rank 3 refreshes active
 * effect on block. Defensive ability use refreshes at every rank. */
export function reviewBulwarkTriggerV2(g:EffectTriggerReviewGroupV2,
 now:number,expiresAt:number,trigger:'defensive_ability'|'successful_block'|'other'){
 group(g,'effect_bulwark');
 if(!finite(now)||!finite(expiresAt))fail('bulwark_input');
 const active=expiresAt>now;
 const refresh=trigger==='defensive_ability'||(trigger==='successful_block'&&(!active||g.resonance===3));
 const next=refresh?now+(g.resonance>=2?5000:4000):expiresAt;
 return {expiresAt:next,reduction:next>now?g.totalValue:0,refreshed:refresh};
}
