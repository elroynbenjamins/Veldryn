/** HIDDEN first executable effect-gem review. Only opaque, digest-bound
 * server QA authority; no public adapter, no reward or persistence path.
 * Damage, haste and defensive families, never use legacy effectGems as input. */
import type {CombatInput,CombatantState,AbilityEffect} from '../types';
import type {reviewFrozenForgeSocketsV2} from './frozen-forge-socket-review';
import type {VerifiedV2EquipmentEffectSource} from './equipment-trait-engine-authority';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {reviewEffectGemResonanceV2} from './effect-gem-resonance-review';
import {reviewExecutionDamageV2,reviewOpeningStrikeV2,reviewPredatorHitV2,
 emptyEffectStackReviewV2,reviewEffectStackTransitionV2,
 reviewRuinDamageV2,reviewOpportunistApplicationV2,reviewOpportunistHitV2,
 emptyRetaliationReviewV2,reviewRetaliationTakenV2,reviewRetaliationHitV2,type OpportunistWindowReviewV2,
 reviewGuardianBarrierV2,reviewUnyieldingDamageV2,reviewLastStandV2,reviewBulwarkTriggerV2,
 reviewAegisBarrierV2,reviewMercyBarrierV2,reviewGemBarrierAbsorptionV2,reviewGemBarrierExpiryV2,
 reviewRenewalApplyV2,reviewRenewalTicksV2,emptyBenedictionReviewV2,reviewBenedictionActionV2,
 reviewSustenanceKillV2,emptyBattleRhythmReviewV2,reviewBattleRhythmActionV2,
 type GemBarrierSegmentReviewV2,type RenewalReviewApplicationV2,
 type GuardianReductionReviewV2,type UnyieldingReviewStateV2,type LastStandReviewStateV2,
 type EffectStackReviewStateV2,type EffectTriggerReviewGroupV2,type OpeningStrikeReviewStateV2,type PredatorWindowReviewV2} from './effect-gem-trigger-review';
const brand:unique symbol=Symbol('private-effect-gem-damage-review');
export type PrivateDamageGemAuthorityV2=Readonly<{readonly [brand]:true}>;
export const PRIVATE_DAMAGE_GEM_REVIEW_V2='private-damage-gem-review-v2-20261126' as const;
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
type Row={actorId:string;digest:string;worn:readonly string[];groups:readonly EffectTriggerReviewGroupV2[]};
const tokens=new WeakMap<object,{inputDigest:string;row:Row}>();
const supported=new Set(['effect_execution','effect_opening_strike','effect_predator','effect_momentum','effect_critical_surge','effect_flow','effect_ruin','effect_opportunist','effect_retaliation','effect_guardians_gift','effect_unyielding','effect_last_stand','effect_bulwark','effect_aegis','effect_mercy','effect_renewal','effect_benediction','effect_shared_resolve','effect_sustenance','effect_battle_rhythm']);
const fail=(why:string):never=>{throw Error('private_damage_gem_review_'+why);};
export function issuePrivateDamageGemAuthorityV2(input:CombatInput,p:Projection,
 verifyPersisted:(projection:Projection,inputDigest:string)=>boolean):PrivateDamageGemAuthorityV2{
 if(typeof verifyPersisted!=='function'||input.players.length!==4||input.initialPlayerState!==undefined||
  input.enemyDamageProfile!==undefined||input.players.some(x=>x.team!=='players'||x.combatV2?.version!==2||
   x.effectGems?.length||x.alchemyModifiers)||
  p.scope!=='PRIVATE_EXACT_FORGE_SOCKET_PROJECTION_V1'||p.mechanicsReview!=='forge-socket-mechanics-review-v2-20261126'||
  p.canExecuteCombat!==false||p.cpApproved!==false||p.releaseEnabled!==false||
  !p.effectResonanceReview||p.gemSources.length!==0||!/^[a-f0-9]{64}$/.test(p.digest)||
  !input.players.some(x=>x.id===p.forgeEvidence.actorId))fail('scope');
 const verified=reviewEffectGemResonanceV2(p.deferredEffectSources,p.equippedInstanceIds);
 if(JSON.stringify(verified)!==JSON.stringify(p.effectResonanceReview)||!verified.families.length||
  verified.families.some(g=>!supported.has(g.familyId)))fail('unsupported_or_invalid_family');
 const inputDigest=enemyV2SnapshotDigest(input),projectionDigest=enemyV2SnapshotDigest(p);
 let accepted=false;
 try{accepted=verifyPersisted(p,inputDigest)===true;}catch{accepted=false;}
 if(!accepted||inputDigest!==enemyV2SnapshotDigest(input)||projectionDigest!==enemyV2SnapshotDigest(p))fail('not_verified');
 const row:Row={actorId:p.forgeEvidence.actorId,digest:p.digest,worn:[...p.equippedInstanceIds],
  groups:JSON.parse(JSON.stringify(verified.families)) as EffectTriggerReviewGroupV2[]};
 const token=Object.freeze({[brand]:true}) as PrivateDamageGemAuthorityV2;
 tokens.set(token,{inputDigest,row});return token;
}
export function authorizePrivateDamageGemReviewV2(input:CombatInput,
 authority:PrivateDamageGemAuthorityV2|undefined,gear:ReadonlyMap<string,VerifiedV2EquipmentEffectSource>){
 if(authority===undefined)return undefined;
 const scope=tokens.get(authority);
 if(!scope||scope.inputDigest!==enemyV2SnapshotDigest(input)||gear.size!==4)throw Error('private_damage_gem_review_token_mismatch');
 const source=gear.get(scope.row.actorId);
 if(!source||source.equipmentReceiptDigest!==scope.row.digest||
  JSON.stringify([...source.ownedEquippedInstanceIds].sort())!==JSON.stringify([...scope.row.worn].sort())||
  [...gear.values()].some(g=>g.traits.length||g.basicAttackDamagePct||g.abilityDamagePct||g.reflectDamagePct))
  fail('equipment_binding');
 // State is re-created for every replay, not stored in the token.
 const row=scope.row,groups=new Map(row.groups.map(g=>[g.familyId,g]));
 let opening:OpeningStrikeReviewStateV2|null=null,windows:readonly PredatorWindowReviewV2[]=[];
 const openingGroup=groups.get('effect_opening_strike');
 if(openingGroup)opening=reviewOpeningStrikeV2(openingGroup,0,null,false,false).state;
 const stackFamilies=['effect_momentum','effect_critical_surge','effect_flow'] as const;
 type StackFamily=typeof stackFamilies[number];
 const stacks=new Map<StackFamily,EffectStackReviewStateV2>(stackFamilies.map(f=>[f,emptyEffectStackReviewV2()]));
 type StackTrace={familyId:StackFamily;fraction:number;sequence:number;stacks:number};
 let sequence=0;
 let statusSequence=0;
 type Modifier=CombatantState['modifiers'][number];
 const statusIds=new WeakMap<Modifier,string>();
 let opportunistWindows:readonly OpportunistWindowReviewV2[]=[];
 let retaliation=emptyRetaliationReviewV2();
 let guardian:readonly GuardianReductionReviewV2[]=[];
 let unyielding:UnyieldingReviewStateV2={expiries:[],readyAt:0};
 let lastStand:LastStandReviewStateV2={used:false,expiresAt:0};
 let bulwarkUntil=0;
 let barriers:readonly GemBarrierSegmentReviewV2[]=[];
 let renewals:readonly RenewalReviewApplicationV2[]=[];
 let lifecycleSequence=0;
 let benediction=emptyBenedictionReviewV2();
 let sharedResolve=emptyEffectStackReviewV2();
 let rhythm=emptyBattleRhythmReviewV2();
 let sustenanceReadyAt=0;
 const claimedKills=new Set<string>();
 let recovery=0;
 let extension:{id:string;tag:string;priorExpiry:number;expiry:number}|undefined;
 const ownStatuses=(target:CombatantState,now:number)=>target.modifiers.filter(r=>r.kind==='debuff'&&
  r.sourceId===row.actorId&&r.expiresAt>now&&statusIds.has(r));
 let action:{id:string;sequence:number;now:number;momentum:number;support:boolean;qualifyingOutput:boolean;benediction:number;shared:number;rhythmCategory:'offense'|'support'|'neutral';rhythmBonus:number;rhythmSuccessful:boolean}|undefined;
 const isWearer=(a:CombatantState)=>a.definition.id===row.actorId&&a.definition.team==='players'&&a.alive;
 const isAuthored=(a:CombatantState,id:string)=>id.includes(':v2:')&&!id.startsWith('V2_')&&!id.startsWith('GEM_')&&
  a.definition.abilities.some(x=>x.id===id);
 const read=(family:StackFamily,now:number)=> (groups.get(family)?.totalValue??0)*
  stacks.get(family)!.expiries.filter(t=>t>now).length;
 const advance=(family:StackFamily,now:number,seq:number,kind:'ability'|'direct_hit',abilityId:string,critical=false):StackTrace[]=>{
  const g=groups.get(family);if(!g)return [];
  const result=reviewEffectStackTransitionV2(g,stacks.get(family)!,{
   now,actionSequence:seq,kind,eligible:true,successful:true,critical,abilityId});
  stacks.set(family,result.state);
  return result.triggered?[{familyId:family,fraction:result.bonus,sequence:seq,stacks:result.stacks}]:[];
 };
 const originalEnemyHit=(source:CombatantState,target:CombatantState,abilityId:string)=>
  source.definition.team==='enemies'&&target.definition.team==='players'&&source.alive&&target.alive&&
  !abilityId.startsWith('V2_')&&!abilityId.startsWith('GEM_')&&
  !(source.definition.phases??[]).some(p=>p.id===abilityId)&&
  (abilityId==='BASIC'||source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(e=>e.kind==='damage')));
 const authoredEffect=(now:number,source:CombatantState,target:CombatantState,id:string,kind:AbilityEffect['kind'])=>
  isWearer(source)&&target.alive&&target.definition.team==='players'&&isAuthored(source,id)&&
  action?.id===id&&action.now===now&&source.definition.abilities.some(a=>a.id===id&&a.effects.some(e=>e.kind===kind));
 const ownBarrier=(id:string)=>barriers.filter(x=>x.recipientId===id).reduce((n,x)=>n+x.remaining,0);
 const externalBarrier=(target:CombatantState)=>{
  const external=target.shield-ownBarrier(target.definition.id);
  if(external< -1e-7)fail('barrier_pool_invariant');
  return Math.max(0,external);
 };
 const sharedFraction=(now:number)=>(groups.get('effect_shared_resolve')?.totalValue??0)*sharedResolve.expiries.filter(t=>t>now).length;
 const defenseFraction=(now:number,target:CombatantState)=>isWearer(target)?
  (groups.get('effect_unyielding')?.totalValue??0)*unyielding.expiries.filter(t=>t>now).length:0;
 return {
  defenseFraction,
  onDefensiveAction(now:number,actor:CombatantState,abilityId:string){
   const g=groups.get('effect_bulwark');
   const ability=actor.definition.abilities.find(x=>x.id===abilityId);
   if(!g||!isWearer(actor)||!isAuthored(actor,abilityId)||action?.id!==abilityId||action.now!==now||
    !ability?.effects.some(e=>e.kind==='shield'||(e.kind==='buff'&&
     ((e.tag==='damage_taken'&&(e.value??0)<0)||(e.tag==='defense_pct'&&(e.value??0)>0)))))return undefined;
   const next=reviewBulwarkTriggerV2(g,now,bulwarkUntil,'defensive_ability');
   bulwarkUntil=next.expiresAt;
   return next.refreshed?{familyId:g.familyId,fraction:next.reduction,expiresAt:next.expiresAt}:undefined;
  },
  // No successful-block hook: shared engine has no independently resolved
  // block outcome. Never equate evasion, shield absorption or mitigation to block.
  supportMultiplier(now:number,source:CombatantState,target:CombatantState,abilityId:string,kind:'heal'|'shield'){
   if(!authoredEffect(now,source,target,abilityId,kind))return 1;
   return 1+(action?.benediction??0)+(action?.shared??0)+(action?.rhythmCategory==='support'?action.rhythmBonus:0);
  },
  markSupportOutput(now:number,source:CombatantState,target:CombatantState,abilityId:string,kind:'heal'|'shield',amount:number){
   if(amount>0&&authoredEffect(now,source,target,abilityId,kind)&&action){
    action.qualifyingOutput=true;
    if(action.rhythmCategory==='support')action.rhythmSuccessful=true;
   }
  },
  onAllySupport(now:number,source:CombatantState,target:CombatantState,abilityId:string,kind:'buff'|'shield',amount:number){
   if(amount>0&&authoredEffect(now,source,target,abilityId,kind)&&action?.rhythmCategory==='support')
    action.rhythmSuccessful=true;
   const g=groups.get('effect_shared_resolve');
   if(!g||amount<=0||source.definition.id===target.definition.id||!authoredEffect(now,source,target,abilityId,kind)||!action)return undefined;
   const next=reviewEffectStackTransitionV2(g,sharedResolve,{now,actionSequence:action.sequence,kind:'ally_support',eligible:true,successful:true,abilityId});
   sharedResolve=next.state;
   return next.triggered?{familyId:g.familyId,fraction:next.bonus,stacks:next.stacks,sequence:action.sequence}:undefined;
  },
  finishAction(now:number,actor:CombatantState,abilityId:string){
   if(!isWearer(actor)||!action||action.id!==abilityId||action.now!==now)return undefined;
   const g=groups.get('effect_benediction'),completed=action;
   action=undefined;
   const rhythmGroup=groups.get('effect_battle_rhythm');
   let rhythmTrace:{fraction:number;sequence:number;category:string}|undefined;
   if(rhythmGroup){
    const next=reviewBattleRhythmActionV2(rhythmGroup,now,rhythm,completed.sequence,
     completed.rhythmCategory,completed.rhythmCategory!=='neutral',completed.rhythmSuccessful);
    rhythm=next.state;
    if(next.empowered)rhythmTrace={fraction:next.bonus,sequence:completed.sequence,category:completed.rhythmCategory};
   }
   if(!g)return {rhythmTrace,charge:undefined};
   const next=reviewBenedictionActionV2(g,now,benediction,completed.sequence,completed.support,completed.qualifyingOutput);
   benediction=next.state;
   return {rhythmTrace,charge:next.consumed||next.granted?{familyId:g.familyId,consumed:next.consumed,granted:next.granted,bonus:next.bonus,charges:next.state.expiries.length,sequence:completed.sequence}:undefined};
  },
  // Own the complete authored barrier only where duration is explicit and
  // reflection absent. No guessed timer or ownership of an ordinary pool.
  // Untimed original nonreflective barriers get magnitude only; no invented expiry.
  // MaxHP capacity is a private QA candidate, not an approved global cap.
  aegisBarrier(now:number,source:CombatantState,target:CombatantState,abilityId:string,amount:number,effect:AbilityEffect){
   const g=groups.get('effect_aegis');
   if(!g||!authoredEffect(now,source,target,abilityId,'shield')||effect.shieldReflectPct)return undefined;
   if(!effect.durationMs||effect.durationMs<=0)return {amount:amount*(1+g.totalValue),owned:false};
   const next=reviewAegisBarrierV2(g,{id:'QA_BARRIER_'+(++lifecycleSequence),casterId:row.actorId,recipientId:target.definition.id,now,
    authoredAmount:amount,baseCapacity:target.definition.stats.maxHp,durationMs:effect.durationMs,externalShield:externalBarrier(target),rows:barriers,authored:true});
   barriers=next.rows;
   return {amount:next.granted,owned:true};
  },
  afterHeal(now:number,source:CombatantState,target:CombatantState,abilityId:string,attempted:number,actual:number){
   if(!authoredEffect(now,source,target,abilityId,'heal'))return {mercy:0,renewal:0};
   let mercy=0,renewal=0;
   const m=groups.get('effect_mercy');
   if(m){
    const next=reviewMercyBarrierV2(m,{id:'QA_BARRIER_'+(++lifecycleSequence),casterId:row.actorId,recipientId:target.definition.id,now,
     attempted,actual,maxHp:target.definition.stats.maxHp,externalShield:externalBarrier(target),rows:barriers,authoredDirect:true});
    barriers=next.rows;mercy=next.granted;
   }
   const n=groups.get('effect_renewal');
   if(n){
    const next=reviewRenewalApplyV2(n,{id:'QA_RENEWAL_'+(++lifecycleSequence),casterId:row.actorId,targetId:target.definition.id,now,actualHeal:actual,authoredDirect:true,rows:renewals});
    renewals=next.rows;renewal=next.total;
   }
   return {mercy,renewal};
  },
  absorbOwned(now:number,target:CombatantState,totalAbsorbed:number){
   if(totalAbsorbed<=0||!barriers.length)return 0;
   const residual=Math.max(0,totalAbsorbed-externalBarrier(target));
   if(residual===0)return 0;
   const next=reviewGemBarrierAbsorptionV2(barriers,target.definition.id,now,residual);
   barriers=next.rows;return next.absorbed;
  },
  tickLifecycle(now:number){
   const expired=reviewGemBarrierExpiryV2(barriers,now),due=reviewRenewalTicksV2(renewals,now);
   barriers=expired.rows;renewals=due.rows;
   return {expired:expired.expired,expiryHeals:expired.heals,renewalHeals:due.heals};
  },
  // Terminal only: caller confirms original direct HP loss was lethal before
  // any secondary/reflection path. No periodic, generated or companion kills.
  onOriginalKill(now:number,source:CombatantState,target:CombatantState,abilityId:string,originalLethal:boolean){
   const g=groups.get('effect_sustenance');
   if(!g||!originalLethal||!isWearer(source)||source.hp<=0||target.definition.team!=='enemies'||
    target.hp!==0||!target.alive||claimedKills.has(target.definition.id)||
    action?.id!==abilityId||action.now!==now||
    !(abilityId==='BASIC'||(isAuthored(source,abilityId)&&source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(e=>e.kind==='damage')))))return undefined;
   claimedKills.add(target.definition.id);
   if(now<sustenanceReadyAt)return undefined;
   const elite=(target.definition.tags??[]).some(t=>t==='elite'||t==='champion');
   const next=reviewSustenanceKillV2(g,now,sustenanceReadyAt,source.definition.stats.maxHp,source.hp,source.shield,elite);
   sustenanceReadyAt=next.readyAt;
   return {heal:next.heal,barrier:next.barrier,elite};
  },
  incomingReductions(now:number,target:CombatantState){
   if(!target.alive||target.definition.team!=='players')return [];
   const rows=guardian.filter(x=>x.recipientId===target.definition.id&&x.expiresAt>now)
    .map(x=>({familyId:'effect_guardians_gift',fraction:x.value}));
   const last=groups.get('effect_last_stand');
   if(last&&isWearer(target)&&lastStand.expiresAt>now)rows.push({familyId:last.familyId,fraction:last.totalValue});
   const b=groups.get('effect_bulwark');
   if(b&&isWearer(target)&&bulwarkUntil>now)rows.push({familyId:b.familyId,fraction:b.totalValue});
   return rows;
  },
  afterIncomingDefense(now:number,source:CombatantState,target:CombatantState,abilityId:string,beforeHp:number){
   if(!isWearer(target)||!originalEnemyHit(source,target,abilityId)||target.hp<=0||beforeHp<=target.hp)return [];
   const rows:{familyId:string;fraction:number;expiresAt:number}[]=[];
   const u=groups.get('effect_unyielding');
   if(u){
    const previous=unyielding.expiries.filter(x=>x>now).length;
    const next=reviewUnyieldingDamageV2(u,now,beforeHp-target.hp,unyielding,0,0);
    unyielding=next.state;
    if(next.state.expiries.length>previous)rows.push({familyId:u.familyId,fraction:next.fraction,expiresAt:Math.max(...next.state.expiries)});
   }
   const l=groups.get('effect_last_stand');
   if(l){
    const next=reviewLastStandV2(l,now,lastStand,target.definition.stats.maxHp,beforeHp,target.hp,true);
    lastStand=next.state;
    if(next.triggered)rows.push({familyId:l.familyId,fraction:next.reduction,expiresAt:next.state.expiresAt});
   }
   return rows;
  },
  onBarrier(now:number,source:CombatantState,target:CombatantState,abilityId:string,granted:number){
   const g=groups.get('effect_guardians_gift');
   if(!g||!isWearer(source)||!target.alive||target.definition.team!=='players'||
    source.definition.id===target.definition.id||granted<=0||!isAuthored(source,abilityId)||
    action?.id!==abilityId||action.now!==now||
    !source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(e=>e.kind==='shield')))return [];
   guardian=reviewGuardianBarrierV2(g,row.actorId,target.definition.id,now,granted,guardian);
   return guardian.filter(x=>x.recipientId===target.definition.id||
    (g.resonance===3&&x.recipientId===row.actorId)).map(x=>({familyId:g.familyId,recipientId:x.recipientId,fraction:x.value,expiresAt:x.expiresAt}));
  },
  // Engine calls this once at actual authored execution, not cast start,
  // and once for each basic. No proc or periodic action can register.
  beginAction(now:number,actor:CombatantState,abilityId:string):StackTrace[]{
   if(!isWearer(actor)||!(abilityId==='BASIC'||isAuthored(actor,abilityId)))return [];
   const ability=actor.definition.abilities.find(a=>a.id===abilityId);
   const support=abilityId!=='BASIC'&&!!ability?.effects.some(e=>['heal','shield','hot','buff','cleanse'].includes(e.kind));
   const b=groups.get('effect_benediction');
   const offense=!!ability?.effects.some(e=>e.kind==='damage');
   // Mixed offense/support techniques and periodic-only offense stay neutral
   // until their authored category is explicit. No arbitrary classification.
   const rhythmSupport=!!ability?.effects.some(e=>e.kind==='heal'||e.kind==='shield'||e.kind==='buff');
   const rhythmCategory=abilityId==='BASIC'||(offense&&support)?'neutral':offense?'offense':rhythmSupport?'support':'neutral';
   const g=groups.get('effect_battle_rhythm');
   const rhythmBonus=g&&rhythmCategory!=='neutral'&&rhythm.previous!==null&&rhythm.previous!==rhythmCategory&&
    now<rhythm.windowUntil&&now>=rhythm.readyAt?g.totalValue:0;
   action={id:abilityId,sequence:++sequence,now,momentum:read('effect_momentum',now),support,qualifyingOutput:false,
    benediction:support&&b&&benediction.expiries.some(t=>t>now)?b.totalValue:0,shared:sharedFraction(now),rhythmCategory,rhythmBonus,rhythmSuccessful:false};
   return abilityId==='BASIC'?[]:advance('effect_flow',now,sequence,'ability',abilityId);
  },
  afterDirectHit(now:number,source:CombatantState,target:CombatantState,abilityId:string,critical:boolean,actualHpDamage:number):StackTrace[]{
   if(!isWearer(source)||target.definition.team!=='enemies'||actualHpDamage<=0||!action||
    action.id!==abilityId||action.now!==now)return [];
   if(abilityId!=='BASIC'&&!isAuthored(source,abilityId))return [];
   if(action.rhythmCategory==='offense')action.rhythmSuccessful=true;
   return [...advance('effect_momentum',now,action.sequence,'direct_hit',abilityId,critical),
    ...advance('effect_critical_surge',now,action.sequence,'direct_hit',abilityId,critical)];
  },
  haste(now:number,actor:CombatantState){
   if(!isWearer(actor))return [];
   return [...(['effect_critical_surge','effect_flow'] as const).map(familyId=>({familyId:familyId,fraction:read(familyId,now)})),
    {familyId:'effect_benediction',fraction:benediction.hasteUntil>now?.02:0},
    {familyId:'effect_battle_rhythm',fraction:rhythm.hasteUntil>now?.02:0}].filter(x=>x.fraction>0);
  },
  // Bind identity only to exact modifier objects created by the original
  // authored engine path. Refresh, cleanse or replacement removes identity.
  onDebuff(now:number,actor:CombatantState,target:CombatantState,abilityId:string,entry:Modifier,fresh:boolean){
   if(!isWearer(actor)||target.definition.team!=='enemies'||!isAuthored(actor,abilityId)||
    action?.id!==abilityId||action.now!==now||entry.kind!=='debuff'||
    entry.sourceId!==row.actorId||!target.modifiers.includes(entry)||entry.expiresAt<=now||
    entry.value===0||entry.tag==='generic')return;
   const effectId='QA_STATUS_'+(++statusSequence);
   statusIds.set(entry,effectId);
   const g=groups.get('effect_opportunist');
   if(g)opportunistWindows=reviewOpportunistApplicationV2(g,row.actorId,target.definition.id,effectId,now,fresh,opportunistWindows);
  },
  onIncoming(now:number,attacker:CombatantState,recipient:CombatantState,abilityId:string,damage:number){
   const g=groups.get('effect_retaliation');
   if(!g||!isWearer(recipient)||recipient.hp<=0||attacker.definition.team!=='enemies'||
    damage<=0||abilityId.startsWith('V2_')||(attacker.definition.phases??[]).some(p=>p.id===abilityId)||
    !(abilityId==='BASIC'||attacker.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(e=>e.kind==='damage'))))return false;
   const next=reviewRetaliationTakenV2(g,now,retaliation,recipient.definition.stats.maxHp,damage,true,true);
   retaliation=next.state;return next.armed;
  },
  takeRecovery(){const result=recovery;recovery=0;return result;},
  takeStatusExtension(){const result=extension;extension=undefined;return result;},
  onBossPhase(now:number){if(openingGroup)opening=reviewOpeningStrikeV2(openingGroup,now,opening,true,false).state;},
  onSuccessfulHit(now:number,source:CombatantState,target:CombatantState,effect:AbilityEffect,
   abilityId:string,eventType:'damage'|'dot_tick',critical:boolean){
   recovery=0;extension=undefined;
   if(source.definition.id!==row.actorId||source.definition.team!=='players'||target.definition.team!=='enemies'||
    !source.alive||!target.alive)return [];
   const direct=eventType==='damage',basic=direct&&abilityId==='BASIC';
   const authored=abilityId.includes(':v2:')&&!abilityId.startsWith('V2_')&&!abilityId.startsWith('GEM_')&&
    source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(f=>f.kind===(direct?'damage':'dot')));
   if(!basic&&!authored)return [];
   if(direct&&effect.kind!=='damage'||!direct&&effect.kind!=='dot')return [];
   const bonuses:{familyId:string;fraction:number}[]=[];
   const put=(familyId:string,fraction:number)=>{if(fraction>0)bonuses.push({familyId,fraction});};
   if(direct&&action?.id===abilityId&&action.now===now){
    put('effect_momentum',action.momentum);
    if(!basic&&action.rhythmCategory==='offense')put('effect_battle_rhythm',action.rhythmBonus);
   }
   const ruin=groups.get('effect_ruin');
   const statuses=ownStatuses(target,now);
   if(ruin)put(ruin.familyId,reviewRuinDamageV2(ruin,row.actorId,target.definition.id,now,true,
    statuses.map(s=>({sourceId:s.sourceId,targetId:target.definition.id,effectId:statusIds.get(s)!,
     category:s.tag,isMark:s.tag==='damage_taken',eligible:true,appliedAt:s.createdAt??now,expiresAt:s.expiresAt}))).bonus);
   const opportunist=groups.get('effect_opportunist');
   if(opportunist&&direct&&action?.id===abilityId&&action.now===now){
    const window=opportunistWindows.find(w=>w.targetId===target.definition.id&&w.casterId===row.actorId);
    const current=statuses.find(s=>statusIds.get(s)===window?.effectId);
    const hit=reviewOpportunistHitV2(opportunist,row.actorId,target.definition.id,now,true,true,critical,
     current?statusIds.get(current)!:null,current?.expiresAt??0,opportunistWindows);
    opportunistWindows=hit.windows;
    if(current&&hit.extension){
     extension={id:statusIds.get(current)!,tag:current.tag,priorExpiry:current.expiresAt,expiry:hit.effectExpiry};
     current.expiresAt=hit.effectExpiry;
    }
    put(opportunist.familyId,hit.bonus);
   }
   const retaliate=groups.get('effect_retaliation');
   if(retaliate&&direct&&!basic&&authored&&action?.id===abilityId&&action.now===now){
    const hit=reviewRetaliationHitV2(retaliate,now,retaliation,source.definition.stats.maxHp,source.hp,true,true,true);
    retaliation=hit.state;recovery=hit.heal;put(retaliate.familyId,hit.bonus);
   }
   const execution=groups.get('effect_execution');
   if(execution)put(execution.familyId,reviewExecutionDamageV2(execution,target.hp,target.definition.stats.maxHp,true).bonus);
   if(openingGroup){
    const next=reviewOpeningStrikeV2(openingGroup,now,opening,false,true);
    opening=next.state;put(openingGroup.familyId,next.bonus);
   }
   const predator=groups.get('effect_predator');
   if(predator){
    // Successful original direct hit opens the one target window.
    // Authored periodic damage may benefit, but cannot open the window.
    const next=reviewPredatorHitV2(predator,{id:target.definition.id,boss:!!target.definition.boss,
     tags:target.definition.tags??[]},now,windows,direct);
    windows=next.windows;put(predator.familyId,next.bonus);
   }
   return bonuses;
  },
 };
}
