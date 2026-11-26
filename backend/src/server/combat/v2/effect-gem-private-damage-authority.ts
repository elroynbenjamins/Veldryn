/** HIDDEN first executable effect-gem review. Only opaque, digest-bound
 * server QA authority; no public adapter, no reward or persistence path.
 * Only three damage families, never use legacy effectGems as input. */
import type {CombatInput,CombatantState,AbilityEffect} from '../types';
import type {reviewFrozenForgeSocketsV2} from './frozen-forge-socket-review';
import type {VerifiedV2EquipmentEffectSource} from './equipment-trait-engine-authority';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {reviewEffectGemResonanceV2} from './effect-gem-resonance-review';
import {reviewExecutionDamageV2,reviewOpeningStrikeV2,reviewPredatorHitV2,
 type EffectTriggerReviewGroupV2,type OpeningStrikeReviewStateV2,type PredatorWindowReviewV2} from './effect-gem-trigger-review';
const brand:unique symbol=Symbol('private-effect-gem-damage-review');
export type PrivateDamageGemAuthorityV2=Readonly<{readonly [brand]:true}>;
export const PRIVATE_DAMAGE_GEM_REVIEW_V2='private-damage-gem-review-v2-20261126' as const;
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
type Row={actorId:string;digest:string;worn:readonly string[];groups:readonly EffectTriggerReviewGroupV2[]};
const tokens=new WeakMap<object,{inputDigest:string;row:Row}>();
const supported=new Set(['effect_execution','effect_opening_strike','effect_predator']);
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
 return {
  onBossPhase(now:number){if(openingGroup)opening=reviewOpeningStrikeV2(openingGroup,now,opening,true,false).state;},
  onSuccessfulHit(now:number,source:CombatantState,target:CombatantState,effect:AbilityEffect,
   abilityId:string,eventType:'damage'|'dot_tick'){
   if(source.definition.id!==row.actorId||source.definition.team!=='players'||target.definition.team!=='enemies'||
    !source.alive||!target.alive)return [];
   const direct=eventType==='damage',basic=direct&&abilityId==='BASIC';
   const authored=abilityId.includes(':v2:')&&!abilityId.startsWith('V2_')&&!abilityId.startsWith('GEM_')&&
    source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(f=>f.kind===(direct?'damage':'dot')));
   if(!basic&&!authored)return [];
   if(direct&&effect.kind!=='damage'||!direct&&effect.kind!=='dot')return [];
   const bonuses:{familyId:string;fraction:number}[]=[];
   const put=(familyId:string,fraction:number)=>{if(fraction>0)bonuses.push({familyId,fraction});};
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
