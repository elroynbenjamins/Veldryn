import type {AbilityDefinition,CombatEvent,CombatantDefinition,CombatantState,GemCombatRuntimeV34} from './types';
import type {EffectGemIdV34,EffectGemSummaryV34} from '../equipment/gem-system-v34';

type AbilityCategoryV34='offense'|'defense_support';
export interface PreparedGemDamageV34 {multiplier:number;retaliationHeal:number;opportunity?:{modifierTag?:string;modifierSourceId?:string};}
export interface PreparedGemSupportV34 {multiplier:number;}

export function effectGemV34(state:CombatantState,id:EffectGemIdV34):EffectGemSummaryV34|undefined{
 return state.definition.effectGemsV34?.find(row=>row.familyId===id);
}
export function initGemCombatRuntimeV34(def:CombatantDefinition):GemCombatRuntimeV34|undefined{
 if(!def.effectGemsV34?.length)return undefined;
 const opening=def.effectGemsV34.find(row=>row.familyId==='effect_opening_strike');
 return {
  momentumStacks:0,momentumLastGainAt:0,momentumNextTriggerAt:0,momentumDecayNextAt:0,
  criticalSurgeExpiries:[],criticalSurgeNextTriggerAt:0,unyieldingExpiries:[],unyieldingNextTriggerAt:0,sharedResolveExpiries:[],
  openingUntil:opening?(opening.resonance>=2?10000:8000):0,openingPhaseRefreshUsed:false,
  predatorTriggeredTargets:{},predatorBoostUntilByTarget:{},lastStandUsed:false,lastStandUntil:0,retaliationUntil:0,retaliationHealReadyAt:0,
  bulwarkUntil:0,benedictionCharges:0,benedictionExpiresAt:0,battleLastAt:0,battleHasteUntil:0,battleHasteReadyAt:0,
  flowStacks:0,flowExpiresAt:0,flowDecayStartedAt:undefined,opportunityByTarget:{},opportunityReadyAtByTarget:{},sustenanceReadyAt:0,
 };
}
function rt(state:CombatantState){return state.gemRuntimeV34;}
function liveCount(expiries:number[],now:number){return expiries.filter(t=>t>now).length;}
function isElite(target:CombatantState,includeExtended=false){
 if(target.definition.boss)return true;
 const tags=new Set(target.definition.tags??[]);
 return tags.has('elite')||(includeExtended&&(tags.has('champion')||tags.has('miniboss')));
}
function abilityCategory(ability:AbilityDefinition):AbilityCategoryV34{
 const support=ability.effects.some(e=>['heal','hot','shield','buff','taunt'].includes(e.kind))||ability.tags?.some(tag=>['support','defensive','guard','block','tank'].includes(tag));
 return support?'defense_support':'offense';
}
export function tickGemCombatRuntimeV34(state:CombatantState,now:number){
 const runtime=rt(state);if(!runtime)return;
 runtime.criticalSurgeExpiries=runtime.criticalSurgeExpiries.filter(t=>t>now);
 runtime.unyieldingExpiries=runtime.unyieldingExpiries.filter(t=>t>now);
 runtime.sharedResolveExpiries=runtime.sharedResolveExpiries.filter(t=>t>now);
 if(runtime.benedictionExpiresAt<=now){runtime.benedictionCharges=0;runtime.benedictionAbilityKey=undefined;runtime.benedictionAbilityMultiplier=undefined;}
 const momentum=effectGemV34(state,'effect_momentum');
 if(momentum&&runtime.momentumStacks>0&&now>=runtime.momentumLastGainAt+4000){
  if(momentum.resonance>=3){
   if(!runtime.momentumDecayNextAt)runtime.momentumDecayNextAt=runtime.momentumLastGainAt+6000;
   while(runtime.momentumStacks>0&&now>=runtime.momentumDecayNextAt){runtime.momentumStacks--;runtime.momentumDecayNextAt+=2000;}
  }else runtime.momentumStacks=0;
 }
 const flow=effectGemV34(state,'effect_flow');
 if(flow&&runtime.flowStacks>0&&now>=runtime.flowExpiresAt){
  if(flow.resonance>=3){if(runtime.flowDecayStartedAt===undefined){runtime.flowDecayStartedAt=now;runtime.flowExpiresAt=now+2000;}else{runtime.flowStacks--;runtime.flowExpiresAt=runtime.flowStacks>0?now+2000:0;}}else runtime.flowStacks=0;
 }
 for(const [targetId,opportunity] of Object.entries(runtime.opportunityByTarget))if(opportunity.until<=now)delete runtime.opportunityByTarget[targetId];
}
export function gemHasteBonusV34(state:CombatantState,now:number):number{
 const runtime=rt(state);if(!runtime)return 0;tickGemCombatRuntimeV34(state,now);
 let bonus=0;
 const surge=effectGemV34(state,'effect_critical_surge');if(surge)bonus+=surge.totalValue*liveCount(runtime.criticalSurgeExpiries,now);
 const flow=effectGemV34(state,'effect_flow');if(flow)bonus+=flow.totalValue*runtime.flowStacks;
 const rhythm=effectGemV34(state,'effect_battle_rhythm');if(rhythm?.resonance===3&&runtime.battleHasteUntil>now)bonus+=.02;
 return bonus;
}
export function gemDefenseMultiplierV34(state:CombatantState,now:number):number{
 const runtime=rt(state),unyielding=effectGemV34(state,'effect_unyielding');if(!runtime||!unyielding)return 1;
 tickGemCombatRuntimeV34(state,now);return 1+unyielding.totalValue*liveCount(runtime.unyieldingExpiries,now);
}
export function gemIncomingDamageMultiplierV34(state:CombatantState,now:number):number{
 const runtime=rt(state);if(!runtime)return 1;let reduction=0;
 const bulwark=effectGemV34(state,'effect_bulwark');if(bulwark&&runtime.bulwarkUntil>now)reduction+=bulwark.totalValue;
 const last=effectGemV34(state,'effect_last_stand');if(last&&runtime.lastStandUntil>now)reduction+=last.totalValue;
 return Math.max(.10,1-reduction);
}
function ruinBonus(actor:CombatantState,target:CombatantState,now:number){
 const ruin=effectGemV34(actor,'effect_ruin');if(!ruin)return 0;
 const debuffs=target.modifiers.filter(m=>m.kind==='debuff'&&m.expiresAt>now);
 const unique=new Set(debuffs.map(m=>m.tag));let count=Math.min(ruin.resonance>=2?3:2,unique.size);
 if(ruin.resonance>=3&&debuffs.some(m=>m.sourceId===actor.definition.id&&/mark/i.test(m.tag)&&now-(m.appliedAt??-Infinity)<=4000))count=Math.min(ruin.resonance>=2?3:2,count+1);
 return ruin.totalValue*count;
}
function battleRhythmMultiplier(actor:CombatantState,abilityId:string,now:number){
 const gem=effectGemV34(actor,'effect_battle_rhythm'),runtime=rt(actor);if(!gem||!runtime)return 1;
 const ability=actor.definition.abilities.find(a=>a.id===abilityId);if(!ability)return 1;
 const category=abilityCategory(ability),window=gem.resonance>=2?12000:8000;
 return runtime.battleLastCategory&&runtime.battleLastCategory!==category&&now-runtime.battleLastAt<=window?1+gem.totalValue:1;
}
export function prepareGemDamageV34(actor:CombatantState,target:CombatantState,now:number,eventType:'damage'|'dot_tick',abilityId:string):PreparedGemDamageV34{
 const runtime=rt(actor);if(!runtime)return{multiplier:1,retaliationHeal:0};
 tickGemCombatRuntimeV34(actor,now);let multiplier=1,retaliationHeal=0;let opportunity:PreparedGemDamageV34['opportunity'];
 const direct=eventType==='damage';
 const momentum=effectGemV34(actor,'effect_momentum');if(momentum&&direct&&runtime.momentumStacks)multiplier*=1+momentum.totalValue*runtime.momentumStacks;
 const execution=effectGemV34(actor,'effect_execution');if(execution){const threshold=execution.resonance>=2?.35:.30;if(target.hp/Math.max(1,target.definition.stats.maxHp)<threshold){let bonus=execution.totalValue;if(execution.resonance>=3&&target.hp/Math.max(1,target.definition.stats.maxHp)<.15)bonus*=1.25;multiplier*=1+bonus;}}
 const opening=effectGemV34(actor,'effect_opening_strike');if(opening&&runtime.openingUntil>now)multiplier*=1+opening.totalValue;
 const predator=effectGemV34(actor,'effect_predator');if(predator&&isElite(target,predator.resonance>=2)){const boosted=(runtime.predatorBoostUntilByTarget[target.definition.id]??0)>now;multiplier*=1+predator.totalValue*(boosted?1.25:1);}
 const ruin=ruinBonus(actor,target,now);if(ruin)multiplier*=1+ruin;
 if(direct&&abilityId!=='BASIC')multiplier*=battleRhythmMultiplier(actor,abilityId,now);
 const retaliation=effectGemV34(actor,'effect_retaliation');if(direct&&abilityId!=='BASIC'&&retaliation&&runtime.retaliationUntil>now){multiplier*=1+retaliation.totalValue;runtime.retaliationUntil=0;if(retaliation.resonance>=3&&runtime.retaliationHealReadyAt<=now){retaliationHeal=actor.definition.stats.maxHp*.01;runtime.retaliationHealReadyAt=now+10000;}}
 const opportunist=effectGemV34(actor,'effect_opportunist'),pending=runtime.opportunityByTarget[target.definition.id];
 if(direct&&opportunist&&pending&&pending.until>now){multiplier*=1+opportunist.totalValue;opportunity={modifierTag:pending.modifierTag,modifierSourceId:pending.modifierSourceId};delete runtime.opportunityByTarget[target.definition.id];}
 return{multiplier,retaliationHeal,opportunity};
}
export function afterGemDamageV34(input:{actor:CombatantState;target:CombatantState;now:number;eventType:'damage'|'dot_tick';abilityId:string;crit:boolean;dealt:number;prepared:PreparedGemDamageV34}){
 const {actor,target,now,eventType,abilityId,crit,dealt,prepared}=input,runtime=rt(actor);if(!runtime||dealt<=0)return;
 const direct=eventType==='damage';
 const momentum=effectGemV34(actor,'effect_momentum');if(direct&&momentum&&runtime.momentumNextTriggerAt<=now){runtime.momentumStacks=Math.min(momentum.resonance>=2?6:5,runtime.momentumStacks+1);runtime.momentumLastGainAt=now;runtime.momentumDecayNextAt=0;runtime.momentumNextTriggerAt=now+500;}
 const surge=effectGemV34(actor,'effect_critical_surge');if(direct&&crit&&surge&&runtime.criticalSurgeNextTriggerAt<=now){const cap=surge.resonance>=2?4:3;runtime.criticalSurgeExpiries=runtime.criticalSurgeExpiries.filter(t=>t>now);if(runtime.criticalSurgeExpiries.length<cap)runtime.criticalSurgeExpiries.push(now+5000);else if(surge.resonance>=3){runtime.criticalSurgeExpiries.sort((a,b)=>a-b);runtime.criticalSurgeExpiries[0]=now+5000;}runtime.criticalSurgeNextTriggerAt=now+750;}
 const predator=effectGemV34(actor,'effect_predator');if(direct&&predator?.resonance===3&&isElite(target,true)&&!runtime.predatorTriggeredTargets[target.definition.id]){runtime.predatorTriggeredTargets[target.definition.id]=true;runtime.predatorBoostUntilByTarget[target.definition.id]=now+8000;}
 if(direct&&crit&&prepared.opportunity){const opp=effectGemV34(actor,'effect_opportunist');if(opp?.resonance===3&&prepared.opportunity.modifierTag){const mod=target.modifiers.find(m=>m.tag===prepared.opportunity!.modifierTag&&(!prepared.opportunity!.modifierSourceId||m.sourceId===prepared.opportunity!.modifierSourceId)&&m.expiresAt>now);if(mod)mod.expiresAt+=1000;}}
}
export function onGemDamageTakenV34(target:CombatantState,now:number,dealt:number,eventType:'damage'|'dot_tick',abilityId:string){
 const runtime=rt(target);if(!runtime||dealt<=0)return;
 const hp=target.hp/Math.max(1,target.definition.stats.maxHp),last=effectGemV34(target,'effect_last_stand');
 if(last&&!runtime.lastStandUsed&&hp<(last.resonance>=2?.35:.30)){runtime.lastStandUsed=true;runtime.lastStandUntil=now+(last.resonance>=3?8000:6000);}
 if(eventType==='damage'&&abilityId!=='COMPANION_REFLECT'){
  const retaliation=effectGemV34(target,'effect_retaliation');if(retaliation&&dealt>=target.definition.stats.maxHp*(retaliation.resonance>=2?.10:.12))runtime.retaliationUntil=now+8000;
 }
 const unyielding=effectGemV34(target,'effect_unyielding');if(unyielding&&runtime.unyieldingNextTriggerAt<=now){runtime.unyieldingExpiries=runtime.unyieldingExpiries.filter(t=>t>now);const cap=unyielding.resonance>=2?5:4;if(runtime.unyieldingExpiries.length<cap)runtime.unyieldingExpiries.push(now+(unyielding.resonance>=3?7000:5000));runtime.unyieldingNextTriggerAt=now+750;}
}
export function prepareGemSupportOutputV34(actor:CombatantState,now:number,abilityId:string,kind:'heal'|'shield'):PreparedGemSupportV34{
 const runtime=rt(actor);if(!runtime)return{multiplier:1};tickGemCombatRuntimeV34(actor,now);let multiplier=battleRhythmMultiplier(actor,abilityId,now);
 const resolve=effectGemV34(actor,'effect_shared_resolve');if(resolve)multiplier*=1+resolve.totalValue*liveCount(runtime.sharedResolveExpiries,now);
 const benediction=effectGemV34(actor,'effect_benediction');if(benediction&&runtime.benedictionExpiresAt>now){
  const key=`${now}:${abilityId}:${kind}`;
  if(runtime.benedictionAbilityKey===key&&runtime.benedictionAbilityMultiplier)multiplier*=runtime.benedictionAbilityMultiplier;
  else if(runtime.benedictionCharges>0){runtime.benedictionAbilityKey=key;runtime.benedictionAbilityMultiplier=1+benediction.totalValue;runtime.benedictionCharges--;multiplier*=runtime.benedictionAbilityMultiplier;if(benediction.resonance>=3)actor.modifiers.push({sourceId:actor.definition.id,tag:'haste',kind:'buff',value:.02,expiresAt:now+4000,appliedAt:now});}
 }
 if(kind==='shield'){const aegis=effectGemV34(actor,'effect_aegis');if(aegis)multiplier*=1+aegis.totalValue;}
 return{multiplier};
}
export function onGemDirectHealV34(source:CombatantState,target:CombatantState,now:number,raw:number,actual:number){
 const mercy=effectGemV34(source,'effect_mercy');if(mercy&&raw>actual){const amount=(raw-actual)*mercy.totalValue,cap=target.definition.stats.maxHp*(mercy.resonance>=2?.04:.03),grant=Math.max(0,Math.min(amount,cap-target.shield));if(grant>0){target.shield+=grant;(target.timedShieldsV34??=[]).push({sourceId:source.definition.id,remaining:grant,expiresAt:now+(mercy.resonance>=3?10000:8000),expireHealRate:(()=>{const aegis=effectGemV34(source,'effect_aegis');return aegis&&aegis.resonance>=2?.05:undefined;})()});}}
 const renewal=effectGemV34(source,'effect_renewal');if(renewal&&actual>0){const duration=renewal.resonance>=2?6000:4000,total=actual*renewal.totalValue*(renewal.resonance>=2?1.2:1),tickMs=1000,flat=total/(duration/tickMs),existing=target.periodic.filter(p=>p.kind==='hot'&&p.effectId==='GEM_RENEWAL'&&p.sourceId===source.definition.id),cap=renewal.resonance>=3?2:1;if(existing.length>=cap){const oldest=existing.sort((a,b)=>a.expiresAt-b.expiresAt)[0];target.periodic=target.periodic.filter(p=>p!==oldest);}target.periodic.push({sourceId:source.definition.id,effectId:'GEM_RENEWAL',kind:'hot',coeff:0,flat,nextTickAt:now+tickMs,expiresAt:now+duration,tickMs});}
}
function grantSharedResolveV34(source:CombatantState,target:CombatantState,now:number){
 if(source===target)return;const resolve=effectGemV34(source,'effect_shared_resolve'),runtime=rt(source);if(resolve&&runtime){runtime.sharedResolveExpiries=runtime.sharedResolveExpiries.filter(t=>t>now);const cap=resolve.resonance>=3?3:2;if(runtime.sharedResolveExpiries.length<cap)runtime.sharedResolveExpiries.push(now+(resolve.resonance>=2?8000:6000));}
}
export function onGemBuffAppliedV34(source:CombatantState,target:CombatantState,now:number){grantSharedResolveV34(source,target,now);}
export function onGemBarrierV34(source:CombatantState,target:CombatantState,now:number,amount:number,durationMs?:number){
 if(amount<=0)return;const aegis=effectGemV34(source,'effect_aegis');if(durationMs){(target.timedShieldsV34??=[]).push({sourceId:source.definition.id,remaining:amount,expiresAt:now+durationMs,expireHealRate:aegis?.resonance&&aegis.resonance>=2?.05:undefined});}
 if(source!==target){const gift=effectGemV34(source,'effect_guardians_gift');if(gift){const duration=gift.resonance>=2?6000:4000;target.modifiers.push({sourceId:source.definition.id,tag:'damage_taken',kind:'buff',value:-gift.totalValue,expiresAt:now+duration,appliedAt:now});if(gift.resonance>=3)source.modifiers.push({sourceId:source.definition.id,tag:'damage_taken',kind:'buff',value:-gift.totalValue*.5,expiresAt:now+duration,appliedAt:now});}
  grantSharedResolveV34(source,target,now);
 }
}
export function onGemDebuffAppliedV34(source:CombatantState,target:CombatantState,now:number,tag:string){
 const opportunist=effectGemV34(source,'effect_opportunist'),runtime=rt(source);if(!opportunist||!runtime)return;
 if((runtime.opportunityReadyAtByTarget[target.definition.id]??0)>now)return;
 runtime.opportunityByTarget[target.definition.id]={until:now+4000,modifierTag:tag,modifierSourceId:source.definition.id};
 runtime.opportunityReadyAtByTarget[target.definition.id]=now+(opportunist.resonance>=2?3000:4000);
}
export function onGemAbilityUsedV34(actor:CombatantState,ability:AbilityDefinition,now:number){
 const runtime=rt(actor);if(!runtime)return;const category=abilityCategory(ability);
 const rhythm=effectGemV34(actor,'effect_battle_rhythm');if(rhythm){const window=rhythm.resonance>=2?12000:8000,alternated=runtime.battleLastCategory&&runtime.battleLastCategory!==category&&now-runtime.battleLastAt<=window;if(alternated&&rhythm.resonance>=3&&runtime.battleHasteReadyAt<=now){runtime.battleHasteUntil=now+4000;runtime.battleHasteReadyAt=now+6000;}runtime.battleLastCategory=category;runtime.battleLastAt=now;}
 const flow=effectGemV34(actor,'effect_flow');if(flow){if(runtime.flowLastAbilityId!==ability.id)runtime.flowStacks=Math.min(flow.resonance>=2?4:3,runtime.flowStacks+1);runtime.flowLastAbilityId=ability.id;runtime.flowExpiresAt=now+6000;runtime.flowDecayStartedAt=undefined;}
 const bulwark=effectGemV34(actor,'effect_bulwark');if(bulwark&&category==='defense_support')runtime.bulwarkUntil=now+(bulwark.resonance>=2?5000:4000);
 const benediction=effectGemV34(actor,'effect_benediction');if(benediction&&category==='defense_support'){runtime.benedictionCharges=Math.min(benediction.resonance>=2?2:1,runtime.benedictionCharges+1);runtime.benedictionExpiresAt=now+10000;runtime.benedictionAbilityKey=undefined;runtime.benedictionAbilityMultiplier=undefined;}
}
export function onGemBossPhaseV34(player:CombatantState,now:number){
 const opening=effectGemV34(player,'effect_opening_strike'),runtime=rt(player);if(!opening||!runtime||opening.resonance<3||runtime.openingPhaseRefreshUsed)return;
 runtime.openingPhaseRefreshUsed=true;runtime.openingUntil=now+(opening.resonance>=2?10000:8000);
}
export function onGemKillV34(source:CombatantState,target:CombatantState,now:number){
 const gem=effectGemV34(source,'effect_sustenance'),runtime=rt(source);if(!gem||!runtime||runtime.sustenanceReadyAt>now)return;
 if((target.definition.tags??[]).includes('trivial_summon'))return;runtime.sustenanceReadyAt=now+3000;
 const amount=source.definition.stats.maxHp*gem.totalValue*(gem.resonance>=2&&isElite(target,true)?3:1),missing=Math.max(0,source.definition.stats.maxHp-source.hp),actual=Math.min(missing,amount);source.hp+=actual;
 if(gem.resonance>=3&&amount>actual){const grant=Math.min((amount-actual)*.25,source.definition.stats.maxHp*.02);source.shield+=grant;if(grant>0)(source.timedShieldsV34??=[]).push({sourceId:source.definition.id,remaining:grant,expiresAt:now+8000});}
}
export function consumeTimedShieldDamageV34(target:CombatantState,absorbed:number){
 let remaining=absorbed;for(const segment of target.timedShieldsV34??[]){if(remaining<=0)break;const used=Math.min(segment.remaining,remaining);segment.remaining-=used;remaining-=used;}target.timedShieldsV34=(target.timedShieldsV34??[]).filter(s=>s.remaining>0);
}
export function expireTimedShieldsV34(state:CombatantState,all:CombatantState[],now:number,events:CombatEvent[]){
 for(const segment of [...(state.timedShieldsV34??[])]){if(segment.expiresAt>now)continue;const remaining=Math.min(segment.remaining,state.shield);state.shield=Math.max(0,state.shield-remaining);segment.remaining=0;if(remaining>0&&segment.expireHealRate){const source=all.find(x=>x.definition.id===segment.sourceId);if(source?.alive&&state.alive){const raw=remaining*segment.expireHealRate,actual=Math.min(raw,state.definition.stats.maxHp-state.hp);state.hp+=actual;source.healingDone+=actual;events.push({atMs:now,type:'heal',actorId:source.definition.id,targetId:state.definition.id,abilityId:'GEM_AEGIS_EXPIRE',amount:Number(actual.toFixed(2))});}}}state.timedShieldsV34=(state.timedShieldsV34??[]).filter(s=>s.remaining>0&&s.expiresAt>now);
}
