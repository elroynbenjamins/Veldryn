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
 reviewGuardianBarrierV2,reviewUnyieldingDamageV2,reviewLastStandV2,
 type GuardianReductionReviewV2,type UnyieldingReviewStateV2,type LastStandReviewStateV2,
 type EffectStackReviewStateV2,type EffectTriggerReviewGroupV2,type OpeningStrikeReviewStateV2,type PredatorWindowReviewV2} from './effect-gem-trigger-review';
const brand:unique symbol=Symbol('private-effect-gem-damage-review');
export type PrivateDamageGemAuthorityV2=Readonly<{readonly [brand]:true}>;
export const PRIVATE_DAMAGE_GEM_REVIEW_V2='private-damage-gem-review-v2-20261126' as const;
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
type Row={actorId:string;digest:string;worn:readonly string[];groups:readonly EffectTriggerReviewGroupV2[]};
const tokens=new WeakMap<object,{inputDigest:string;row:Row}>();
const supported=new Set(['effect_execution','effect_opening_strike','effect_predator','effect_momentum','effect_critical_surge','effect_flow','effect_ruin','effect_opportunist','effect_retaliation','effect_guardians_gift','effect_unyielding','effect_last_stand']);
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
 let recovery=0;
 let extension:{id:string;tag:string;priorExpiry:number;expiry:number}|undefined;
 const ownStatuses=(target:CombatantState,now:number)=>target.modifiers.filter(r=>r.kind==='debuff'&&
  r.sourceId===row.actorId&&r.expiresAt>now&&statusIds.has(r));
 let action:{id:string;sequence:number;now:number;momentum:number}|undefined;
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
 const defenseFraction=(now:number,target:CombatantState)=>isWearer(target)?
  (groups.get('effect_unyielding')?.totalValue??0)*unyielding.expiries.filter(t=>t>now).length:0;
 return {
  defenseFraction,
  incomingReductions(now:number,target:CombatantState){
   if(!target.alive||target.definition.team!=='players')return [];
   const rows=guardian.filter(x=>x.recipientId===target.definition.id&&x.expiresAt>now)
    .map(x=>({familyId:'effect_guardians_gift',fraction:x.value}));
   const last=groups.get('effect_last_stand');
   if(last&&isWearer(target)&&lastStand.expiresAt>now)rows.push({familyId:last.familyId,fraction:last.totalValue});
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
   action={id:abilityId,sequence:++sequence,now,momentum:read('effect_momentum',now)};
   return abilityId==='BASIC'?[]:advance('effect_flow',now,sequence,'ability',abilityId);
  },
  afterDirectHit(now:number,source:CombatantState,target:CombatantState,abilityId:string,critical:boolean,actualHpDamage:number):StackTrace[]{
   if(!isWearer(source)||target.definition.team!=='enemies'||actualHpDamage<=0||!action||
    action.id!==abilityId||action.now!==now)return [];
   if(abilityId!=='BASIC'&&!isAuthored(source,abilityId))return [];
   return [...advance('effect_momentum',now,action.sequence,'direct_hit',abilityId,critical),
    ...advance('effect_critical_surge',now,action.sequence,'direct_hit',abilityId,critical)];
  },
  haste(now:number,actor:CombatantState){
   if(!isWearer(actor))return [];
   return (['effect_critical_surge','effect_flow'] as const).map(familyId=>({familyId,fraction:read(familyId,now)}))
    .filter(x=>x.fraction>0);
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
   if(direct&&action?.id===abilityId&&action.now===now)put('effect_momentum',action.momentum);
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
