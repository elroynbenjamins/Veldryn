import type {AbilityDefinition,CombatGemEffect,CombatantState} from './types';

const FOREVER=9_000_000_000_000_000;
const directAllowed=(abilityId:string)=>!abilityId.startsWith('COMPANION_')&&abilityId!=='COMPANION_REFLECT';

function gem(state:CombatantState,familyId:string):CombatGemEffect|undefined{return state.definition.effectGems?.find(row=>row.familyId===familyId);}
function active(state:CombatantState,tag:string,now:number,sourceId?:string){return state.modifiers.filter(row=>row.tag===tag&&row.expiresAt>now&&(!sourceId||row.sourceId===sourceId));}
function has(state:CombatantState,tag:string,now:number,sourceId?:string){return active(state,tag,now,sourceId).length>0;}
function clear(state:CombatantState,tag:string,sourceId?:string){state.modifiers=state.modifiers.filter(row=>row.tag!==tag||(sourceId&&row.sourceId!==sourceId));}
function setOne(state:CombatantState,sourceId:string,tag:string,value:number,expiresAt:number,now:number){clear(state,tag,sourceId);state.modifiers.push({sourceId,tag,value,expiresAt,createdAt:now,kind:'gem'});}
function addStack(state:CombatantState,sourceId:string,tag:string,value:number,expiresAt:number,now:number,max:number){
 const rows=active(state,tag,now,sourceId);if(rows.length>=max)return false;
 state.modifiers.push({sourceId,tag,value,expiresAt,createdAt:now,kind:'gem'});return true;
}
function stackValue(state:CombatantState,tag:string,now:number,sourceId?:string){return active(state,tag,now,sourceId).reduce((sum,row)=>sum+row.value,0);}
function stackCount(state:CombatantState,tag:string,now:number,sourceId?:string){return active(state,tag,now,sourceId).length;}
function isEliteTarget(target:CombatantState){return Boolean(target.definition.boss||target.definition.tags?.some(tag=>['elite','champion','miniboss'].includes(tag)));}
function abilityCategory(ability:AbilityDefinition):'offense'|'support'|'neutral'{
 const kinds=new Set(ability.effects.map(effect=>effect.kind));
 if(kinds.has('damage')||kinds.has('dot')||kinds.has('debuff')||kinds.has('interrupt'))return 'offense';
 if(kinds.has('heal')||kinds.has('hot')||kinds.has('shield')||kinds.has('buff')||kinds.has('taunt'))return 'support';
 return 'neutral';
}

export function gemEffectiveHasteV1(state:CombatantState,now:number){
 const surge=gem(state,'effect_critical_surge'),flow=gem(state,'effect_flow');
 return state.definition.stats.haste+
  (surge?stackCount(state,'gem:critical_surge',now,state.definition.id)*surge.totalValue:0)+
  (flow?stackCount(state,'gem:flow',now,state.definition.id)*flow.totalValue:0)+
  stackValue(state,'gem:haste_bonus',now,state.definition.id);
}
export function gemEffectiveDefenseV1(state:CombatantState,now:number){
 const unyielding=gem(state,'effect_unyielding'),stacks=unyielding?stackCount(state,'gem:unyielding',now,state.definition.id):0;
 return state.definition.stats.defense*(1+(unyielding?stacks*unyielding.totalValue:0));
}

export function gemOutgoingDamageMultiplierV1(source:CombatantState,target:CombatantState,now:number,abilityId:string,periodic:boolean){
 let bonus=0;
 const execution=gem(source,'effect_execution');if(execution){const threshold=execution.resonance>=2?.35:.30;if(target.hp/Math.max(1,target.definition.stats.maxHp)<threshold){let value=execution.totalValue;if(execution.resonance>=3&&target.hp/Math.max(1,target.definition.stats.maxHp)<.15)value*=1.25;bonus+=value;}}
 const predator=gem(source,'effect_predator');if(predator&&isEliteTarget(target)){const boosted=has(source,'gem:predator_boost',now,source.definition.id);bonus+=predator.totalValue*(boosted?1.25:1);}
 const opening=gem(source,'effect_opening_strike');if(opening){const window=opening.resonance>=2?10000:8000;if(now<=window||has(source,'gem:opening_phase',now,source.definition.id))bonus+=opening.totalValue;}
 const ruin=gem(source,'effect_ruin');if(ruin){const debuffs=target.modifiers.filter(row=>row.kind==='debuff'&&row.sourceId===source.definition.id&&row.expiresAt>now);const unique=new Map(debuffs.map(row=>[row.tag,row]));let count=0;for(const row of unique.values()){count++;if(ruin.resonance>=3&&row.tag.toLowerCase().includes('mark')&&now-(row.createdAt??now)<=4000)count++;}bonus+=ruin.totalValue*Math.min(ruin.resonance>=2?3:2,count);}
 if(!periodic&&directAllowed(abilityId)){
  const momentum=gem(source,'effect_momentum');if(momentum)bonus+=momentum.totalValue*stackCount(source,'gem:momentum',now,source.definition.id);
  const retaliation=gem(source,'effect_retaliation');if(retaliation&&has(source,'gem:retaliation_ready',now,source.definition.id))bonus+=retaliation.totalValue;
  const rhythm=gem(source,'effect_battle_rhythm');if(rhythm&&has(source,'gem:battle_offense_ready',now,source.definition.id))bonus+=rhythm.totalValue;
  const opportunist=gem(source,'effect_opportunist');if(opportunist&&has(target,'gem:opportunist_ready',now,source.definition.id))bonus+=opportunist.totalValue;
 }
 return Math.max(.1,1+bonus);
}
export function gemIncomingDamageMultiplierV1(target:CombatantState,now:number){
 let reduction=stackValue(target,'gem:damage_reduction',now);
 return Math.max(.25,1-Math.min(.75,reduction));
}
export function gemHealingMultiplierV1(source:CombatantState,now:number){
 const shared=gem(source,'effect_shared_resolve');const potency=shared?stackCount(source,'gem:shared_resolve',now,source.definition.id)*shared.totalValue:0;
 const benediction=gem(source,'effect_benediction');const charge=benediction&&has(source,'gem:benediction_charge',now,source.definition.id)?benediction.totalValue:0;
 return 1+potency+charge;
}
export function gemShieldMultiplierV1(source:CombatantState,now:number){
 const aegis=gem(source,'effect_aegis'),shared=gem(source,'effect_shared_resolve'),benediction=gem(source,'effect_benediction');
 const potency=shared?stackCount(source,'gem:shared_resolve',now,source.definition.id)*shared.totalValue:0;
 const charge=benediction&&has(source,'gem:benediction_charge',now,source.definition.id)?benediction.totalValue:0;
 return 1+(aegis?.totalValue??0)+potency+charge;
}

export function gemOnAbilityUsedV1(now:number,actor:CombatantState,ability:AbilityDefinition){
 if(actor.definition.team!=='players')return;
 const category=abilityCategory(ability);
 const bulwark=gem(actor,'effect_bulwark');if(bulwark&&category==='support'){setOne(actor,actor.definition.id,'gem:damage_reduction',bulwark.totalValue,now+(bulwark.resonance>=2?5000:4000),now);}
 const benediction=gem(actor,'effect_benediction');if(benediction&&category==='support'){
  const max=benediction.resonance>=2?2:1;const current=active(actor,'gem:benediction_charge',now,actor.definition.id);if(current.length<max)actor.modifiers.push({sourceId:actor.definition.id,tag:'gem:benediction_charge',value:1,expiresAt:now+10000,createdAt:now,kind:'gem'});
 }
 const flow=gem(actor,'effect_flow');if(flow){
  const last=actor.modifiers.find(row=>row.tag.startsWith('gem:flow_last:'));const same=last?.tag==='gem:flow_last:'+ability.id;
  actor.modifiers=actor.modifiers.filter(row=>!row.tag.startsWith('gem:flow_last:'));actor.modifiers.push({sourceId:actor.definition.id,tag:'gem:flow_last:'+ability.id,value:1,expiresAt:FOREVER,createdAt:now,kind:'gem'});
  const cap=flow.resonance>=2?4:3,rows=active(actor,'gem:flow',now,actor.definition.id);
  if(!same&&rows.length<cap)actor.modifiers.push({sourceId:actor.definition.id,tag:'gem:flow',value:1,expiresAt:now+6000,createdAt:now,kind:'gem'});
  const refreshed=active(actor,'gem:flow',now,actor.definition.id).sort((a,b)=>(a.createdAt??0)-(b.createdAt??0));for(let i=0;i<refreshed.length;i++)refreshed[i].expiresAt=now+6000+(flow.resonance>=3?i*2000:0);
 }
 const rhythm=gem(actor,'effect_battle_rhythm');if(rhythm&&category!=='neutral'){
  const last=actor.modifiers.find(row=>row.tag.startsWith('gem:battle_last:'));const previous=last?.tag.split(':').pop();
  actor.modifiers=actor.modifiers.filter(row=>!row.tag.startsWith('gem:battle_last:'));actor.modifiers.push({sourceId:actor.definition.id,tag:'gem:battle_last:'+category,value:1,expiresAt:FOREVER,createdAt:now,kind:'gem'});
  const window=rhythm.resonance>=2?12000:8000;if(category==='offense')setOne(actor,actor.definition.id,'gem:battle_support_ready',rhythm.totalValue,now+window,now);else setOne(actor,actor.definition.id,'gem:battle_offense_ready',rhythm.totalValue,now+window,now);
  if(previous&&previous!==category&&rhythm.resonance>=3)setOne(actor,actor.definition.id,'gem:haste_bonus',.02,now+4000,now);
 }
}

export function gemOnDirectHitV1(now:number,source:CombatantState,target:CombatantState,abilityId:string,crit:boolean){
 if(source.definition.team!=='players'||!directAllowed(abilityId))return {selfHeal:0};
 const momentum=gem(source,'effect_momentum');if(momentum&&!has(source,'gem:momentum_cd',now,source.definition.id)){
  const cap=momentum.resonance>=2?6:5;addStack(source,source.definition.id,'gem:momentum',1,now+4000,now,cap);
  const rows=active(source,'gem:momentum',now,source.definition.id).sort((a,b)=>(a.createdAt??0)-(b.createdAt??0));for(let i=0;i<rows.length;i++)rows[i].expiresAt=now+4000+(momentum.resonance>=3?i*2000:0);
  setOne(source,source.definition.id,'gem:momentum_cd',1,now+500,now);
 }
 const surge=gem(source,'effect_critical_surge');if(surge&&crit&&!has(source,'gem:critical_surge_cd',now,source.definition.id)){
  const cap=surge.resonance>=2?4:3,rows=active(source,'gem:critical_surge',now,source.definition.id);
  if(rows.length<cap)addStack(source,source.definition.id,'gem:critical_surge',1,now+5000,now,cap);
  else if(surge.resonance>=3){rows.sort((a,b)=>a.expiresAt-b.expiresAt)[0].expiresAt=now+5000;}
  setOne(source,source.definition.id,'gem:critical_surge_cd',1,now+750,now);
 }
 const predator=gem(source,'effect_predator');if(predator&&isEliteTarget(target)&&predator.resonance>=3&&!has(source,'gem:predator_started:'+target.definition.id,now,source.definition.id)){
  setOne(source,source.definition.id,'gem:predator_started:'+target.definition.id,1,FOREVER,now);setOne(source,source.definition.id,'gem:predator_boost',1,now+8000,now);
 }
 const retaliation=gem(source,'effect_retaliation');let selfHeal=0;if(retaliation&&has(source,'gem:retaliation_ready',now,source.definition.id)){clear(source,'gem:retaliation_ready',source.definition.id);if(retaliation.resonance>=3&&!has(source,'gem:retaliation_heal_cd',now,source.definition.id)){selfHeal=.01;setOne(source,source.definition.id,'gem:retaliation_heal_cd',1,now+10000,now);}}
 if(has(source,'gem:battle_offense_ready',now,source.definition.id))clear(source,'gem:battle_offense_ready',source.definition.id);
 if(has(target,'gem:opportunist_ready',now,source.definition.id))clear(target,'gem:opportunist_ready',source.definition.id);
 return {selfHeal};
}

export function gemOnDamageTakenV1(now:number,target:CombatantState,dealt:number){
 if(target.definition.team!=='players'||dealt<=0)return;
 const maxHp=Math.max(1,target.definition.stats.maxHp);
 const unyielding=gem(target,'effect_unyielding');if(unyielding&&!has(target,'gem:unyielding_cd',now,target.definition.id)){addStack(target,target.definition.id,'gem:unyielding',1,now+(unyielding.resonance>=3?7000:5000),now,unyielding.resonance>=2?5:4);setOne(target,target.definition.id,'gem:unyielding_cd',1,now+750,now);}
 const lastStand=gem(target,'effect_last_stand');if(lastStand&&!has(target,'gem:last_stand_used',now,target.definition.id)&&target.hp/maxHp<(lastStand.resonance>=2?.35:.30)){setOne(target,target.definition.id,'gem:last_stand_used',1,FOREVER,now);target.modifiers.push({sourceId:target.definition.id,tag:'gem:damage_reduction',value:lastStand.totalValue,expiresAt:now+(lastStand.resonance>=3?8000:6000),createdAt:now,kind:'gem'});}
 const retaliation=gem(target,'effect_retaliation');if(retaliation&&dealt/maxHp>=(retaliation.resonance>=2?.10:.12)&&!has(target,'gem:retaliation_cd',now,target.definition.id)){setOne(target,target.definition.id,'gem:retaliation_ready',retaliation.totalValue,now+8000,now);setOne(target,target.definition.id,'gem:retaliation_cd',1,now+8000,now);}
}

export function gemConsumeSupportChargeV1(now:number,source:CombatantState){
 const benediction=gem(source,'effect_benediction');if(!benediction)return;
 const charges=active(source,'gem:benediction_charge',now,source.definition.id);if(!charges.length)return;
 const oldest=charges.sort((a,b)=>(a.createdAt??0)-(b.createdAt??0))[0];source.modifiers=source.modifiers.filter(row=>row!==oldest);
 if(benediction.resonance>=3)setOne(source,source.definition.id,'gem:haste_bonus',.02,now+4000,now);
 if(has(source,'gem:battle_support_ready',now,source.definition.id))clear(source,'gem:battle_support_ready',source.definition.id);
}

export function gemOnDirectHealV1(now:number,source:CombatantState,target:CombatantState,attempted:number,actual:number){
 const result:{mercyBarrier:number;renewalTotal:number;renewalDuration:number;renewalMax:number}={mercyBarrier:0,renewalTotal:0,renewalDuration:0,renewalMax:1};
 const mercy=gem(source,'effect_mercy');if(mercy&&attempted>actual){const cap=target.definition.stats.maxHp*(mercy.resonance>=2?.04:.03),room=Math.max(0,cap-target.shield);result.mercyBarrier=Math.min(room,(attempted-actual)*mercy.totalValue);}
 const renewal=gem(source,'effect_renewal');if(renewal&&actual>0){result.renewalDuration=renewal.resonance>=2?6000:4000;result.renewalTotal=actual*renewal.totalValue*(renewal.resonance>=2?1.2:1);result.renewalMax=renewal.resonance>=3?2:1;}
 return result;
}
export function gemOnShieldAppliedV1(now:number,source:CombatantState,target:CombatantState){
 const guardian=gem(source,'effect_guardians_gift');if(guardian&&source!==target){target.modifiers.push({sourceId:source.definition.id,tag:'gem:damage_reduction',value:guardian.totalValue,expiresAt:now+(guardian.resonance>=2?6000:4000),createdAt:now,kind:'gem'});if(guardian.resonance>=3)source.modifiers.push({sourceId:source.definition.id,tag:'gem:damage_reduction',value:guardian.totalValue*.5,expiresAt:now+6000,createdAt:now,kind:'gem'});}
 const shared=gem(source,'effect_shared_resolve');if(shared&&source!==target){addStack(source,source.definition.id,'gem:shared_resolve',1,now+(shared.resonance>=2?8000:6000),now,shared.resonance>=3?3:2);}
}
export function gemOnBuffAppliedV1(now:number,source:CombatantState,target:CombatantState){
 const shared=gem(source,'effect_shared_resolve');if(shared&&source!==target)addStack(source,source.definition.id,'gem:shared_resolve',1,now+(shared.resonance>=2?8000:6000),now,shared.resonance>=3?3:2);
}
export function gemOnDebuffAppliedV1(now:number,source:CombatantState,target:CombatantState){
 const opportunist=gem(source,'effect_opportunist');if(!opportunist)return;
 const cd=opportunist.resonance>=2?3000:4000;if(has(target,'gem:opportunist_cd',now,source.definition.id))return;
 setOne(target,source.definition.id,'gem:opportunist_ready',opportunist.totalValue,now+4000,now);setOne(target,source.definition.id,'gem:opportunist_cd',1,now+cd,now);
}
export function gemOnKillV1(now:number,source:CombatantState,target:CombatantState){
 const sustain=gem(source,'effect_sustenance');if(!sustain||has(source,'gem:sustenance_cd',now,source.definition.id))return;
 const multiplier=sustain.resonance>=2&&isEliteTarget(target)?3:1,amount=source.definition.stats.maxHp*sustain.totalValue*multiplier,missing=source.definition.stats.maxHp-source.hp,healed=Math.min(missing,amount);source.hp+=healed;
 if(sustain.resonance>=3&&amount>healed)source.shield=Math.min(source.definition.stats.maxHp*.02,source.shield+(amount-healed)*.25);
 setOne(source,source.definition.id,'gem:sustenance_cd',1,now+3000,now);
}
export function gemOnBossPhaseV1(now:number,players:readonly CombatantState[]){
 for(const player of players){const opening=gem(player,'effect_opening_strike');if(!opening||opening.resonance<3||has(player,'gem:opening_phase_used',now,player.definition.id))continue;setOne(player,player.definition.id,'gem:opening_phase_used',1,FOREVER,now);setOne(player,player.definition.id,'gem:opening_phase',1,now+(opening.resonance>=2?10000:8000),now);}
}
