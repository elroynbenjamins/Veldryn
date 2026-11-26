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

/** Private encounter-local stack state. Event sequence is monotonically
 * increasing for each owner; repeated targets/effects from one authored
 * action reuse the same sequence. No live actor state is changed. */
export interface EffectStackReviewStateV2{
 readonly expiries:readonly number[];readonly readyAt:number;
 readonly lastAt:number;readonly lastActionSequence:number;
 readonly previousAbilityId:string|null;
}
export interface EffectStackReviewEventV2{
 readonly now:number;readonly actionSequence:number;
 readonly kind:'direct_hit'|'ability'|'ally_support'|'tick';
 readonly eligible:boolean;readonly successful:boolean;
 readonly critical?:boolean;readonly abilityId?:string;
}
export const emptyEffectStackReviewV2=():EffectStackReviewStateV2=>({
 expiries:[],readyAt:0,lastAt:0,lastActionSequence:-1,previousAbilityId:null,
});
/** Shared refresh families preserve a fixed first expiry and stagger
 * rank-3 decay by two seconds, mirroring the prior authored convention.
 * Repeated or ineligible actions do not extend their lifespan. */
export function reviewEffectStackTransitionV2(g:EffectTriggerReviewGroupV2,
 state:EffectStackReviewStateV2,event:EffectStackReviewEventV2){
 const family=g.familyId;
 if(!['effect_momentum','effect_critical_surge','effect_flow','effect_shared_resolve'].includes(family))
  fail('stack_family');
 group(g,family);
 const {now,actionSequence}=event;
 if(![now,state.lastAt,state.readyAt].every(finite)||now<state.lastAt||
  !Number.isSafeInteger(actionSequence)||actionSequence<0||
  !Number.isSafeInteger(state.lastActionSequence)||state.lastActionSequence< -1||
  state.expiries.some(x=>!finite(x)))fail('stack_input');
 const cap=family==='effect_momentum'?(g.resonance>=2?6:5):
  family==='effect_shared_resolve'?(g.resonance===3?3:2):(g.resonance>=2?4:3);
 if(state.expiries.length>cap)fail('stack_cap');
 let expiries=state.expiries.filter(x=>x>now).sort((a,b)=>a-b);
 let readyAt=state.readyAt,lastActionSequence=state.lastActionSequence;
 let previousAbilityId=state.previousAbilityId,triggered=false;
 const fresh=actionSequence>lastActionSequence;
 // Tick reads never spend an action identity. A failed/ineligible
 // per-target result cannot prevent a later qualifying result of the same
 // action. Only accepted trigger or eligible Flow observation spends it.
 if(fresh&&event.eligible&&event.successful){
  if(family==='effect_momentum'&&event.kind==='direct_hit'&&now>=readyAt){
   if(expiries.length<cap)expiries.push(now+4000);
   expiries=expiries.map((_,i)=>now+4000+(g.resonance===3?i*2000:0));
   readyAt=now+500;lastActionSequence=actionSequence;triggered=true;
  }else if(family==='effect_critical_surge'&&event.kind==='direct_hit'&&event.critical===true&&now>=readyAt){
   if(expiries.length<cap){expiries.push(now+5000);triggered=true;}
   else if(g.resonance===3){expiries[0]=now+5000;triggered=true;}
   readyAt=now+750;lastActionSequence=actionSequence;
  }else if(family==='effect_flow'&&event.kind==='ability'){
   if(!event.abilityId)fail('flow_ability_id');
   const different=previousAbilityId!==null&&previousAbilityId!==event.abilityId;
   previousAbilityId=event.abilityId!;lastActionSequence=actionSequence;
   if(different){
    if(expiries.length<cap)expiries.push(now+6000);
    expiries=expiries.map((_,i)=>now+6000+(g.resonance===3?i*2000:0));
    triggered=true;
   }
  }else if(family==='effect_shared_resolve'&&event.kind==='ally_support'){
   if(expiries.length<cap){expiries.push(now+(g.resonance>=2?8000:6000));triggered=true;}
   lastActionSequence=actionSequence;
  }
 }
 expiries.sort((a,b)=>a-b);
 return {state:{expiries,readyAt,lastAt:now,lastActionSequence,previousAbilityId},
  stacks:expiries.length,bonus:expiries.length*g.totalValue,triggered,
  unit:family==='effect_momentum'?'damage_fraction':family==='effect_shared_resolve'?'support_output_fraction':'haste_fraction',
  releaseEnabled:false as const};
}

/** Execution uses the target's pre-hit HP; exact threshold equality is
 * excluded. Only eligible authored/basic damage, not secondary procs. */
export function reviewExecutionDamageV2(g:EffectTriggerReviewGroupV2,
 hp:number,maxHp:number,eligible:boolean){
 group(g,'effect_execution');
 if(![hp,maxHp].every(finite)||maxHp<=0||hp>maxHp)fail('execution_input');
 const threshold=g.resonance>=2?.35:.30;
 const ratio=hp/maxHp;
 return {threshold,bonus:eligible&&hp>0&&ratio<threshold?
  g.totalValue*(g.resonance===3&&ratio<.15?1.25:1):0};
}
export interface OpeningStrikeReviewStateV2{
 readonly startedAt:number;readonly expiresAt:number;readonly usedPhase:boolean;readonly lastAt:number;
}
/** Encounter-local opening window. Only an authoritative flagged boss
 * phase can refresh once, without stacking two overlapping windows. */
export function reviewOpeningStrikeV2(g:EffectTriggerReviewGroupV2,
 now:number,state:OpeningStrikeReviewStateV2|null,flaggedBossPhase:boolean,eligibleDamage:boolean){
 group(g,'effect_opening_strike');
 if(!finite(now)||(state&&(![state.startedAt,state.expiresAt,state.lastAt].every(finite)||now<state.lastAt)))
  fail('opening_input');
 const duration=g.resonance>=2?10000:8000;
 const prior=state??{startedAt:now,expiresAt:now+duration,usedPhase:false,lastAt:now};
 const refresh=g.resonance===3&&flaggedBossPhase&&!prior.usedPhase;
 const next={...prior,lastAt:now,expiresAt:refresh?Math.max(prior.expiresAt,now+duration):prior.expiresAt,
  usedPhase:prior.usedPhase||refresh};
 return {state:next,bonus:eligibleDamage&&now<next.expiresAt?g.totalValue:0,refreshed:refresh};
}
export interface RuinEffectReviewV2{
 readonly sourceId:string;readonly targetId:string;readonly effectId:string;
 readonly category:string;readonly isMark:boolean;readonly eligible:boolean;
 readonly appliedAt:number;readonly expiresAt:number;
}
/** Distinct qualifying negative-effect categories from the same actor
 * only. Mark freshness is explicit provenance, not a string substring. */
export function reviewRuinDamageV2(g:EffectTriggerReviewGroupV2,
 sourceId:string,targetId:string,now:number,eligibleDamage:boolean,rows:readonly RuinEffectReviewV2[]){
 group(g,'effect_ruin');
 if(!sourceId||!targetId||!finite(now))fail('ruin_input');
 const cap=g.resonance>=2?3:2;
 const unique=new Map<string,boolean>();
 for(const e of rows){
  if(e.sourceId!==sourceId||e.targetId!==targetId||!e.eligible||e.expiresAt<=now)continue;
  if(!e.effectId||!e.category||!finite(e.appliedAt)||!finite(e.expiresAt)||e.appliedAt>now)fail('ruin_effect');
  const freshMark=e.isMark&&now-e.appliedAt<4000;
  unique.set(e.category,(unique.get(e.category)??false)||freshMark);
 }
 const count=Math.min(cap,unique.size+(g.resonance===3?[...unique.values()].filter(Boolean).length:0));
 return {count,cap,bonus:eligibleDamage?g.totalValue*count:0};
}
export interface RetaliationReviewStateV2{
 readonly readyUntil:number;readonly cooldownUntil:number;readonly healCooldownUntil:number;readonly lastAt:number;
}
export const emptyRetaliationReviewV2=():RetaliationReviewStateV2=>({
 readyUntil:0,cooldownUntil:0,healCooldownUntil:0,lastAt:0,
});
/** Only actual HP damage from a qualifying hostile hit can arm it.
 * A miss, basic attack, periodic tick or proc cannot consume it. */
export function reviewRetaliationTakenV2(g:EffectTriggerReviewGroupV2,now:number,
 state:RetaliationReviewStateV2,maxHp:number,hpDamage:number,eligibleHostileHit:boolean,alive:boolean){
 group(g,'effect_retaliation');
 if(![now,maxHp,hpDamage,state.lastAt,state.readyUntil,state.cooldownUntil,state.healCooldownUntil].every(finite)||
  now<state.lastAt||maxHp<=0)fail('retaliation_input');
 const threshold=g.resonance>=2?.10:.12;
 const armed=eligibleHostileHit&&alive&&hpDamage/maxHp>=threshold&&now>=state.cooldownUntil;
 return {state:{...state,lastAt:now,readyUntil:armed?now+8000:state.readyUntil,
  cooldownUntil:armed?now+8000:state.cooldownUntil},armed,threshold};
}
export function reviewRetaliationHitV2(g:EffectTriggerReviewGroupV2,now:number,
 state:RetaliationReviewStateV2,maxHp:number,hp:number,eligibleAuthoredDirect:boolean,successful:boolean,alive:boolean){
 group(g,'effect_retaliation');
 if(![now,maxHp,hp,state.lastAt,state.readyUntil,state.cooldownUntil,state.healCooldownUntil].every(finite)||
  now<state.lastAt||maxHp<=0||hp>maxHp)fail('retaliation_input');
 const consumed=alive&&eligibleAuthoredDirect&&successful&&state.readyUntil>now;
 const healReady=consumed&&g.resonance===3&&now>=state.healCooldownUntil;
 const heal=healReady?Math.min(maxHp-hp,maxHp*.01):0;
 return {state:{...state,lastAt:now,readyUntil:consumed?0:state.readyUntil,
  healCooldownUntil:healReady?now+10000:state.healCooldownUntil},
  consumed,bonus:consumed?g.totalValue:0,heal,mayTriggerEffects:false as const};
}

/** Last Stand is a once-per-encounter threshold crossing, not a
 * persistent low-HP condition. Cannot rescue an already downed actor. */
export interface LastStandReviewStateV2{readonly used:boolean;readonly expiresAt:number;}
export function reviewLastStandV2(g:EffectTriggerReviewGroupV2,now:number,
 state:LastStandReviewStateV2,maxHp:number,beforeHp:number,afterHp:number,eligibleHostileDamage:boolean){
 group(g,'effect_last_stand');
 if(![now,maxHp,beforeHp,afterHp,state.expiresAt].every(finite)||maxHp<=0||beforeHp>maxHp||afterHp>maxHp)
  fail('last_stand_input');
 const threshold=g.resonance>=2?.35:.30;
 const triggered=!state.used&&eligibleHostileDamage&&afterHp>0&&afterHp<beforeHp&&
  beforeHp/maxHp>=threshold&&afterHp/maxHp<threshold;
 const next={used:state.used||triggered,expiresAt:triggered?now+(g.resonance===3?8000:6000):state.expiresAt};
 return {state:next,threshold,triggered,reduction:afterHp>0&&next.expiresAt>now?g.totalValue:0};
}
export interface BenedictionReviewStateV2{
 readonly expiries:readonly number[];readonly hasteUntil:number;readonly lastActionSequence:number;readonly lastAt:number;
}
export const emptyBenedictionReviewV2=():BenedictionReviewStateV2=>({
 expiries:[],hasteUntil:0,lastActionSequence:-1,lastAt:0,
});
/** Complete one authored action atomically. Consume at most one prior
 * charge for all qualifying outputs; grant new charge only afterward.
 * Future engine must reserve that charge before resolving the action. */
export function reviewBenedictionActionV2(g:EffectTriggerReviewGroupV2,now:number,
 state:BenedictionReviewStateV2,actionSequence:number,eligibleSupport:boolean,qualifyingHealOrBarrier:boolean){
 group(g,'effect_benediction');
 const cap=g.resonance>=2?2:1;
 if(![now,state.lastAt,state.hasteUntil].every(finite)||now<state.lastAt||
  !Number.isSafeInteger(actionSequence)||actionSequence<0||
  !Number.isSafeInteger(state.lastActionSequence)||state.lastActionSequence< -1||
  state.expiries.length>cap||state.expiries.some(x=>!finite(x)))fail('benediction_input');
 const expiries=state.expiries.filter(x=>x>now).sort((a,b)=>a-b);
 const fresh=actionSequence>state.lastActionSequence;
 const consumed=fresh&&eligibleSupport&&qualifyingHealOrBarrier&&expiries.length>0;
 if(consumed)expiries.shift();
 const granted=fresh&&eligibleSupport&&expiries.length<cap;
 if(granted)expiries.push(now+10000);
 const hasteUntil=consumed&&g.resonance===3?now+4000:state.hasteUntil;
 return {state:{expiries,hasteUntil,lastAt:now,lastActionSequence:fresh?actionSequence:state.lastActionSequence},
  consumed,granted,bonus:consumed?g.totalValue:0,haste:hasteUntil>now?.02:0};
}
export interface RenewalReviewApplicationV2{
 readonly id:string;readonly casterId:string;readonly targetId:string;
 readonly nextTickAt:number;readonly expiresAt:number;readonly perTick:number;
}
function validateRenewalRows(rows:readonly RenewalReviewApplicationV2[]){
 if(new Set(rows.map(r=>r.id)).size!==rows.length||
  rows.some(r=>!r.id||!r.casterId||!r.targetId||![r.nextTickAt,r.expiresAt,r.perTick].every(finite)||
   r.nextTickAt>r.expiresAt||r.perTick<=0))fail('renewal_rows');
}
/** Each successful authored direct heal generates its own exact
 * periodic request. Cap per caster/target; oldest replacement forfeits
 * remaining ticks, never refreshes or multiplies other caster's HoT. */
export function reviewRenewalApplyV2(g:EffectTriggerReviewGroupV2,input:{
 id:string;casterId:string;targetId:string;now:number;actualHeal:number;authoredDirect:boolean;
 rows:readonly RenewalReviewApplicationV2[];
}){
 group(g,'effect_renewal');validateRenewalRows(input.rows);
 const {id,casterId,targetId,now,actualHeal,rows}=input;
 if(!id||!casterId||!targetId||![now,actualHeal].every(finite)||
  rows.some(r=>r.nextTickAt<=now))fail('renewal_input');
 const duration=g.resonance>=2?6000:4000,cap=g.resonance===3?2:1;
 if(!input.authoredDirect||actualHeal===0||rows.some(r=>r.id===id))
  return {rows:[...rows],total:0,granted:false};
 const total=actualHeal*g.totalValue*(g.resonance>=2?1.2:1);
 const owned=rows.filter(r=>r.casterId===casterId&&r.targetId===targetId)
  .sort((a,b)=>a.expiresAt-b.expiresAt||a.id.localeCompare(b.id));
 const remove=new Set(owned.slice(0,Math.max(0,owned.length-cap+1)).map(r=>r.id));
 return {rows:[...rows.filter(r=>!remove.has(r.id)),{id,casterId,targetId,nextTickAt:now+2000,
  expiresAt:now+duration,perTick:total/(duration/2000)}],total,granted:true};
}
/** Inclusive final tick; consume due ticks once. Engine applies only
 * to living recipients and clamps actual healing to missing HP. */
export function reviewRenewalTicksV2(rows:readonly RenewalReviewApplicationV2[],now:number){
 validateRenewalRows(rows);if(!finite(now))fail('renewal_tick_input');
 const next:RenewalReviewApplicationV2[]=[],heals:{id:string;casterId:string;targetId:string;at:number;amount:number;mayTriggerEffects:false}[]=[];
 for(const r of rows){
  let at=r.nextTickAt;
  while(at<=now&&at<=r.expiresAt){
   heals.push({id:r.id,casterId:r.casterId,targetId:r.targetId,at,amount:r.perTick,mayTriggerEffects:false});
   at+=2000;
  }
  if(at<=r.expiresAt)next.push({...r,nextTickAt:at});
 }
 heals.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 return {rows:next,heals};
}
export interface BattleRhythmReviewStateV2{
 readonly previous:'offense'|'support'|null;readonly windowUntil:number;readonly readyAt:number;
 readonly hasteUntil:number;readonly lastActionSequence:number;readonly lastAt:number;
}
export const emptyBattleRhythmReviewV2=():BattleRhythmReviewStateV2=>({
 previous:null,windowUntil:0,readyAt:0,hasteUntil:0,lastActionSequence:-1,lastAt:0,
});
/** One bonus per qualifying authored opposite-category action, not per
 * target/hit. Neutral/basic/proc actions do not arm or consume. Apply
 * catalogue 6s trigger cooldown to empowered alternations. */
export function reviewBattleRhythmActionV2(g:EffectTriggerReviewGroupV2,now:number,
 state:BattleRhythmReviewStateV2,actionSequence:number,category:'offense'|'support'|'neutral',
 eligible:boolean,successful:boolean){
 group(g,'effect_battle_rhythm');
 if(![now,state.lastAt,state.windowUntil,state.readyAt,state.hasteUntil].every(finite)||now<state.lastAt||
  !Number.isSafeInteger(actionSequence)||actionSequence<0||
  !Number.isSafeInteger(state.lastActionSequence)||state.lastActionSequence< -1)fail('rhythm_input');
 const fresh=actionSequence>state.lastActionSequence;
 const qualifies=fresh&&eligible&&successful&&category!=='neutral';
 const empowered=qualifies&&state.previous!==null&&state.previous!==category&&
  now<state.windowUntil&&now>=state.readyAt;
 const hasteUntil=empowered&&g.resonance===3?now+4000:state.hasteUntil;
 return {state:{previous:qualifies?category:state.previous,windowUntil:qualifies?now+(g.resonance>=2?12000:8000):state.windowUntil,
  readyAt:empowered?now+6000:state.readyAt,hasteUntil,lastAt:now,lastActionSequence:fresh?actionSequence:state.lastActionSequence},
  empowered,bonus:empowered?g.totalValue:0,haste:hasteUntil>now?.02:0};
}
