export type CoopMode='qmode'|'live';
export interface CoopRouteOptionView {nodeId:string;title:string;kind:string;risk:string;reward:string;votes?:number;hidden?:boolean;}
export interface CoopRunMechanicView {label:string;description:string;value:number;maxValue:number;status:'critical'|'steady'|'strong';bossEffect:string;}
export interface CoopRunObjectiveView {label:string;description:string;count:number;maxCount:number;completed:boolean;effectText:string;}
export interface CoopBossPhaseView {id:string;label:string;hpPct:number;objectiveSensitive:boolean;}
export interface CoopBossCastView {id:string;label:string;castMs:number;cooldownMs:number;interruptible:boolean;objectiveSensitive:boolean;}
export interface CoopRunBossMechanicView {
 label:string;
 summary:string;
 tone:'benefit'|'mixed'|'danger';
 telegraph?:{bossName:string;phases:CoopBossPhaseView[];castAbilities:CoopBossCastView[];suppressedAbilities:Array<{id:string;label:string}>};
}
export interface CoopRunBossRecapView {durationMs:number;downs:number;phasesTriggered:string[];abilitiesCast:string[];}
export type CoopCombatReplayCueType='action'|'phase'|'cast'|'interrupt'|'down'|'assist'|'victory'|'wipe'|'timeout';
export interface CoopCombatReplayStateView{ id:string; hp:number; shield:number; }
export interface CoopCombatReplayCombatantView{ id:string; name:string; team:'players'|'enemies'; maxHp:number; startHp:number; startShield:number; boss:boolean; }
export interface CoopCombatReplayStatusView{ targetId:string; sourceId?:string; kind:'buff'|'debuff'|'dot'|'hot'; tag:string; label:string; abilityId?:string; startsAtMs:number; expiresAtMs:number; }
export interface CoopCombatReplayGemStateView{ targetId:string; tag:string; expiriesAtMs:number[]; }
export interface CoopCombatReplayGemSnapshotView{ atMs:number; states:CoopCombatReplayGemStateView[]; }
export interface CoopCombatReplayCueView{
 atMs:number;
 type:CoopCombatReplayCueType;
 actorId?:string;
 actorName?:string;
 targetId?:string;
 targetName?:string;
 abilityId?:string;
 abilityName?:string;
 durationMs?:number;
 actionKind?:'damage'|'heal'|'shield';
 outcome?:'critical'|'miss';
 absorbed?:number;
 gemProc?:boolean;
 amount?:number;
 states?:CoopCombatReplayStateView[];
}
export interface CoopCombatReplayView{
 nodeId:string;
 reason:'victory'|'wipe'|'timeout';
 durationMs:number;
 combatants?:CoopCombatReplayCombatantView[];
 statuses?:CoopCombatReplayStatusView[];
 gemStates?:CoopCombatReplayGemSnapshotView[];
 cues:CoopCombatReplayCueView[];
}
export interface CoopRunView {runId:string;mode:CoopMode;modeLabel?:string;phase:string;syncedLevel:number;roleSlots:Array<{memberId?:string;role:'tank'|'damage'|'support';name:string;echo:boolean;classId?:string;bodyPresentation?:'male'|'female';companionId?:string;currentHp?:number;maximumHp?:number;ready?:boolean}>;options:CoopRouteOptionView[];mechanic?:CoopRunMechanicView;objective?:CoopRunObjectiveView;bossMechanic?:CoopRunBossMechanicView;bossRecap?:CoopRunBossRecapView;lastCombat?:CoopCombatReplayView;rewardText?:string;stateVersion?:number;decisionId?:string;decisionRevision?:number;resolvesAtMs?:number;}
export function validateCoopRunView(view:CoopRunView):void{
 if(view.roleSlots.length!==4||view.roleSlots.filter(slot=>slot.role==='tank').length!==1||view.roleSlots.filter(slot=>slot.role==='damage').length!==2||view.roleSlots.filter(slot=>slot.role==='support').length!==1)throw new Error('invalid_role_slots');
 if(!Number.isInteger(view.syncedLevel)||view.syncedLevel<1||view.roleSlots.some(slot=>!slot.name.trim()))throw new Error('invalid_run_summary');
 const memberIds=view.roleSlots.map(slot=>slot.memberId?.trim()).filter((value):value is string=>Boolean(value));
 if(memberIds.length!==new Set(memberIds).size)throw new Error('invalid_member_ids');
 if(view.roleSlots.some(slot=>slot.memberId!==undefined&&!slot.memberId.trim()))throw new Error('invalid_member_ids');
 if(view.roleSlots.some(slot=>slot.bodyPresentation!==undefined&&slot.bodyPresentation!=='male'&&slot.bodyPresentation!=='female'))throw new Error('invalid_body_presentation');
 if(view.roleSlots.some(slot=>slot.companionId!==undefined&&!slot.companionId.trim()))throw new Error('invalid_companion_assist');
 if(view.roleSlots.some(slot=>slot.currentHp!==undefined&&(!Number.isFinite(slot.currentHp)||slot.currentHp<0)||slot.maximumHp!==undefined&&(!Number.isFinite(slot.maximumHp)||slot.maximumHp<=0)||slot.currentHp!==undefined&&slot.maximumHp!==undefined&&slot.currentHp>slot.maximumHp))throw new Error('invalid_party_health');
 const damageClasses=view.roleSlots.filter(slot=>slot.role==='damage'&&slot.classId?.trim()).map(slot=>slot.classId!.trim().toUpperCase());
 if(damageClasses.length===2&&new Set(damageClasses).size!==2)throw new Error('duplicate_damage_class');
 if(view.options.length>0&&view.options.length<3&&!(view.options.length===1&&view.options[0].kind==='boss'))throw new Error('insufficient_route_options');
 if(new Set(view.options.map(option=>option.nodeId)).size!==view.options.length||view.options.some(option=>!option.nodeId.trim()||!option.title.trim()||!option.kind.trim()||!option.risk.trim()||!option.reward.trim()))throw new Error('invalid_route_options');
 if(view.mode==='qmode'&&view.options.some(option=>option.votes!==undefined))throw new Error('qmode_cannot_show_votes');
 if(view.mechanic&&(!view.mechanic.label.trim()||!view.mechanic.description.trim()||!Number.isFinite(view.mechanic.value)||!Number.isFinite(view.mechanic.maxValue)||view.mechanic.maxValue<=0||view.mechanic.value<0||view.mechanic.value>view.mechanic.maxValue||!['critical','steady','strong'].includes(view.mechanic.status)||!view.mechanic.bossEffect.trim()))throw new Error('invalid_run_mechanic');
 if(view.objective&&(!view.objective.label.trim()||!view.objective.description.trim()||!Number.isInteger(view.objective.count)||!Number.isInteger(view.objective.maxCount)||view.objective.maxCount<1||view.objective.count<0||view.objective.count>view.objective.maxCount||!view.objective.effectText.trim()))throw new Error('invalid_run_objective');
 if(view.bossMechanic&&(!view.bossMechanic.label.trim()||!view.bossMechanic.summary.trim()||!['benefit','mixed','danger'].includes(view.bossMechanic.tone)))throw new Error('invalid_boss_mechanic');
 if(view.bossMechanic?.telegraph){
  const t=view.bossMechanic.telegraph;
  if(!t.bossName.trim()||t.phases.some(phase=>!phase.id.trim()||!phase.label.trim()||!Number.isFinite(phase.hpPct)||phase.hpPct<=0||phase.hpPct>=100)||t.castAbilities.some(ability=>!ability.id.trim()||!ability.label.trim()||!Number.isFinite(ability.castMs)||ability.castMs<0||!Number.isFinite(ability.cooldownMs)||ability.cooldownMs<0)||t.suppressedAbilities.some(ability=>!ability.id.trim()||!ability.label.trim()))throw new Error('invalid_boss_telegraph');
 }
 if(view.bossRecap&&(!Number.isFinite(view.bossRecap.durationMs)||view.bossRecap.durationMs<0||!Number.isInteger(view.bossRecap.downs)||view.bossRecap.downs<0||view.bossRecap.phasesTriggered.some(item=>!item.trim())||view.bossRecap.abilitiesCast.some(item=>!item.trim())))throw new Error('invalid_boss_recap');
 if(view.lastCombat){
  const replay=view.lastCombat,types=new Set<CoopCombatReplayCueType>(['action','phase','cast','interrupt','down','assist','victory','wipe','timeout']);
  if(!replay.nodeId.trim()||!['victory','wipe','timeout'].includes(replay.reason)||!Number.isFinite(replay.durationMs)||replay.durationMs<0||replay.cues.length>48)throw new Error('invalid_combat_replay');
  const combatants=replay.combatants??[],combatantIds=new Set<string>();
  for(const combatant of combatants){if(!combatant.id.trim()||!combatant.name.trim()||!['players','enemies'].includes(combatant.team)||!Number.isFinite(combatant.maxHp)||combatant.maxHp<=0||!Number.isFinite(combatant.startHp)||combatant.startHp<0||combatant.startHp>combatant.maxHp||!Number.isFinite(combatant.startShield)||combatant.startShield<0||combatantIds.has(combatant.id))throw new Error('invalid_combat_replay');combatantIds.add(combatant.id);}
  for(const status of replay.statuses??[]){if(!status.targetId.trim()||combatants.length>0&&!combatantIds.has(status.targetId)||status.sourceId!==undefined&&!status.sourceId.trim()||!['buff','debuff','dot','hot'].includes(status.kind)||!status.tag.trim()||!status.label.trim()||status.abilityId!==undefined&&!status.abilityId.trim()||!Number.isFinite(status.startsAtMs)||status.startsAtMs<0||status.startsAtMs>replay.durationMs||!Number.isFinite(status.expiresAtMs)||status.expiresAtMs<=status.startsAtMs||status.expiresAtMs>replay.durationMs)throw new Error('invalid_combat_replay');}
  let previousGemStateAt=-1;for(const snapshot of replay.gemStates??[]){if(!Number.isFinite(snapshot.atMs)||snapshot.atMs<0||snapshot.atMs>replay.durationMs||snapshot.atMs<previousGemStateAt)throw new Error('invalid_combat_replay');previousGemStateAt=snapshot.atMs;const gemKeys=new Set<string>();for(const state of snapshot.states){const key=`${state.targetId}:${state.tag}`;if(!state.targetId.trim()||combatants.length>0&&!combatantIds.has(state.targetId)||!state.tag.startsWith('gem:')||gemKeys.has(key)||!Array.isArray(state.expiriesAtMs)||state.expiriesAtMs.length<1||state.expiriesAtMs.length>8||state.expiriesAtMs.some(expiry=>!Number.isFinite(expiry)||expiry<=snapshot.atMs||expiry>replay.durationMs))throw new Error('invalid_combat_replay');gemKeys.add(key);}}
  let previous=-1;
  for(const cue of replay.cues){
   if(!Number.isFinite(cue.atMs)||cue.atMs<0||cue.atMs>replay.durationMs||cue.atMs<previous||!types.has(cue.type)||cue.durationMs!==undefined&&(!Number.isFinite(cue.durationMs)||cue.durationMs<0)||cue.amount!==undefined&&(!Number.isFinite(cue.amount)||cue.amount<0)||cue.absorbed!==undefined&&(!Number.isFinite(cue.absorbed)||cue.absorbed<0)||cue.actionKind!==undefined&&!['damage','heal','shield'].includes(cue.actionKind)||cue.outcome!==undefined&&!['critical','miss'].includes(cue.outcome)||cue.gemProc!==undefined&&typeof cue.gemProc!=='boolean')throw new Error('invalid_combat_replay');
   if([cue.actorId,cue.actorName,cue.targetId,cue.targetName,cue.abilityId,cue.abilityName].some(value=>value!==undefined&&!value.trim()))throw new Error('invalid_combat_replay');
   if(cue.states){const seen=new Set<string>();for(const state of cue.states){const combatant=combatants.find(item=>item.id===state.id);if(!state.id.trim()||seen.has(state.id)||!Number.isFinite(state.hp)||state.hp<0||!Number.isFinite(state.shield)||state.shield<0||combatant&&state.hp>combatant.maxHp||combatants.length>0&&!combatant)throw new Error('invalid_combat_replay');seen.add(state.id);}}
   previous=cue.atMs;
  }
 }
}
export function liveAffordances(mode:CoopMode):{ready:boolean;votes:boolean;chat:boolean}{return mode==='live'?{ready:true,votes:true,chat:true}:{ready:false,votes:false,chat:false};}
