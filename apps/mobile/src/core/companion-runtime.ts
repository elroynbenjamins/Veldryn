import type {GameState} from './types';
import type {OwnedCompanionProgress,CompanionSanctuaryState,CompanionPhase2ProfileState} from './combat-companion-types';
import {defaultCompanionSanctuary,reconcileCombatCompanionUnlocks,classCompanionRole} from './combat-companions';
import {COMBAT_COMPANIONS,COMPANION_SANCTUARY_TRAINING_XP_PER_DAY} from '../content/combat-companions';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {simulateCombat} from '../../../../backend/src/server/combat/engine';
import {startCompanionTrial,resolveCompanionTrialFloor,abandonCompanionTrial,claimMonthlyCompanionChallenge} from '../../../../backend/src/server/companions/trials';
import {startCompanionAssignment,claimCompanionAssignment,rolloverCompanionAssignmentStatuses} from '../../../../backend/src/server/companions/assignments';
import {awardCompanionXpServer,awardCompanionBondXpServer,selectCompanionTechnique,setCompanionShowcase,grantCombatCompanionOrConvertDuplicate} from '../../../../backend/src/server/companions/progression-v2';
import {claimCompanionCodexMilestone} from '../../../../backend/src/server/companions/codex';
import {projectCompanionCodex,projectCompanionTrial,projectCompanionProvingGrounds} from '../../../../backend/src/server/companions/projection';
import {claimCompanionProvingGroundChallenge,recordCompanionProvingGroundEvent,activeCompanionProvingGroundChallenges,provingGroundEventMatches} from '../../../../backend/src/server/companions/proving-grounds';
import {companionTrialWeekKey} from '../../../../backend/src/server/companions/trial-season';
import {companionTeamPower} from '../../../../backend/src/server/companions/team';
import {companionMission,companionTrialRecommendedPower,companionServerDefinition} from '../../../../backend/src/server/companions/content';
import {resolveSpecialCompanionChallenge} from '../../../../backend/src/server/companions/special-challenges';
import type {CompanionAssignment,CompanionTrialProgress,CompanionProvingGroundState,CompanionOverflowState,OwnedCompanionSnapshot,CompanionEconomyState,CompanionCombatExecutor,CompanionUnlockFacts,CompanionProvingGroundEvent} from '../../../../backend/src/server/companions/domain';

/** Additive account schema; game schema 6 and the existing atomic online store remain compatible. */
export interface CompanionAccountState {
  guideState?:import('./onboarding').OnboardingGuideState;
  collectionPreferences?:import('./collection-preferences').CollectionPreferences;
  /** Account-owned Arena formation; positions are stored as Front/Middle/Back slots. */
  arenaSquadCharacterIds?:string[];
  companionSchemaVersion?:1;
  unlockedCombatCompanionIds?:string[];
  combatCompanionProgress?:Record<string,OwnedCompanionProgress>;
  companionUnlockProgress?:Record<string,number>;
  companionEssence?:number;bondstones?:number;
  companionSanctuary?:CompanionSanctuaryState;
  companionAssignments?:CompanionAssignment[];
  companionTrialProgress?:CompanionTrialProgress;
  companionProvingGround?:CompanionProvingGroundState;
  companionOverflow?:CompanionOverflowState;
  companionPhase2Profile?:CompanionPhase2ProfileState;
  companionMaterials?:Record<string,number>;
  companionBossClears?:Record<string,number>;
  companionSpecialClears?:string[];
  companionAssignmentBondstoneWeek?:string;
  companionAssignmentBondstones?:number;
  companionRematchBondstoneWeek?:string;
  companionRematchBondstones?:number;
  companionActionSequence?:number;
  companionBondRewardClaims?:string[];
  companionBattleReadyAtMs?:number;
  companionBossRematchReadyAtMs?:number;
  companionLastBattle?:{title:string;won:boolean;durationMs:number;gold:number;essence:number;bondstones:number;atMs:number};
}
export const COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP=2;
export function companionRematchBondstoneStatus(state:GameState,nowMs:number){
  const week=companionTrialWeekKey(nowMs),used=state.account.companionRematchBondstoneWeek===week?Math.min(COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,state.account.companionRematchBondstones??0):0;
  return {week,used,cap:COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,remaining:Math.max(0,COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP-used)};
}
export function awardCompanionRematchBondstone(state:GameState,nowMs:number){
  const status=companionRematchBondstoneStatus(state,nowMs);
  if(status.remaining<=0)return {state,reward:0,status};
  const used=status.used+1;
  return {state:{...state,account:{...state.account,companionRematchBondstoneWeek:status.week,companionRematchBondstones:used}},reward:1,status:{...status,used,remaining:Math.max(0,status.cap-used)}};
}
export const companionCombatExecutor:CompanionCombatExecutor={simulate:input=>simulateCombat(input)};
export function companionOwned(state:GameState):Record<string,OwnedCompanionSnapshot>{
  return Object.fromEntries((state.account.unlockedCombatCompanionIds??[]).flatMap(id=>{
    const p=state.account.combatCompanionProgress?.[id];return p?[[id,{...p,companionId:id}]]:[];
  }));
}
export function companionEconomy(state:GameState):CompanionEconomyState {
  const materials={...(state.account.companionMaterials??{})};
  for(const stack of [...state.inventory.stacks,...state.bank.stacks])materials[stack.itemId]=(materials[stack.itemId]??0)+stack.quantity;
  return {gold:state.character?.gold??0,companionEssence:state.account.companionEssence??0,bondstones:state.account.bondstones??0,materials};
}
/** Apply only material deltas; preserve inventory locations, capacities and unrelated stacks. */
function applyEconomy(state:GameState,economy:CompanionEconomyState):GameState {
  const before=companionEconomy(state),materials={...(state.account.companionMaterials??{})};
  let inventory=state.inventory.stacks.map(x=>({...x})),bank=state.bank.stacks.map(x=>({...x}));
  for(const id of new Set([...Object.keys(before.materials),...Object.keys(economy.materials)])){
    const delta=(economy.materials[id]??0)-(before.materials[id]??0);
    if(delta>=0){if(delta)materials[id]=(materials[id]??0)+delta;continue;}
    let left=-delta;const stored=Math.min(left,materials[id]??0);materials[id]=(materials[id]??0)-stored;left-=stored;
    for(const stacks of [inventory,bank])for(const stack of stacks){if(stack.itemId!==id)continue;const used=Math.min(left,stack.quantity);stack.quantity-=used;left-=used;}
    if(left>0)throw new Error('Missing companion materials.');
  }
  return {...state,inventory:{...state.inventory,stacks:inventory.filter(x=>x.quantity>0)},bank:{...state.bank,stacks:bank.filter(x=>x.quantity>0)},character:state.character?{...state.character,gold:economy.gold}:null,account:{...state.account,companionEssence:economy.companionEssence,bondstones:economy.bondstones,companionMaterials:materials}};
}
function reward(state:GameState,r:{gold?:number;companionEssence?:number;bondstones?:number;materials?:Record<string,number>}):GameState {
  const e=companionEconomy(state);e.gold+=r.gold??0;e.companionEssence+=r.companionEssence??0;e.bondstones+=r.bondstones??0;
  for(const [id,n] of Object.entries(r.materials??{}))e.materials[id]=(e.materials[id]??0)+n;
  return applyEconomy(state,e);
}
function setOwned(state:GameState,owned:Record<string,OwnedCompanionSnapshot>):GameState {
  return {...state,account:{...state.account,unlockedCombatCompanionIds:Object.keys(owned),combatCompanionProgress:Object.fromEntries(Object.entries(owned).map(([id,p])=>[id,{...state.account.combatCompanionProgress?.[id],...p}]))}};
}
function awardUse(state:GameState,ids:string[],xp:number,bond:number,now:number):GameState {
  const owned=companionOwned(state);let essence=state.account.companionEssence??0,overflow=state.account.companionOverflow;
  const earnedBond=Math.round(bond*(1+(state.account.companionSanctuary?.bondHallLevel??0)*.05));
  for(const id of ids){if(!owned[id])continue;const r=awardCompanionXpServer({progress:owned[id],amount:xp,companionEssence:essence,overflow,serverNowMs:now});essence=r.companionEssence;overflow=r.overflow;owned[id]=awardCompanionBondXpServer(r.progress,earnedBond);}
  return {...setOwned(state,owned),account:{...setOwned(state,owned).account,companionEssence:essence,companionOverflow:overflow}};
}
export function refreshCompanions(state:GameState,now:number):GameState {
  let next=reconcileCombatCompanionUnlocks(state,now);
  next={...next,account:{...next.account,companionSchemaVersion:1,companionAssignments:rolloverCompanionAssignmentStatuses(next.account.companionAssignments??[],now),companionTrialProgress:projectCompanionTrial(next.account.companionTrialProgress,now).progress,companionProvingGround:projectCompanionProvingGrounds(next.account.companionProvingGround,now).state}};
  return next;
}
export function companionView(state:GameState,now:number){
  const owned=companionOwned(state),profile=state.account.companionPhase2Profile??{showcaseCompanionIds:[],showcaseSlotsUnlocked:1};
  return {owned,trial:projectCompanionTrial(state.account.companionTrialProgress,now),codex:projectCompanionCodex(owned,profile),weekly:activeCompanionProvingGroundChallenges(now),proving:projectCompanionProvingGrounds(state.account.companionProvingGround,now),assignments:rolloverCompanionAssignmentStatuses(state.account.companionAssignments??[],now)};
}
/** Training shares the capped max-level XP conversion used by real combat. */
export function claimCompanionTraining(input:GameState,now:number):GameState{
 let state=refreshCompanions(input,now);const sanctuary=state.account.companionSanctuary!,level=sanctuary.trainingGroundLevel;
 if(!level)return state;
 const last=sanctuary.lastTrainingClaimAtMs,day=86400000;
 if(last===undefined)return {...state,account:{...state.account,companionSanctuary:{...sanctuary,lastTrainingClaimAtMs:now}}};
 const days=Math.min(7,Math.floor(Math.max(0,now-last)/day));if(days<1)return state;
 const available=Object.keys(companionOwned(state)).filter(id=>{try{assertCompanionIdle(state,id);return true;}catch{return false;}});
 state=awardUse(state,available,COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[level as 1|2|3]*days,0,now);
 return {...state,account:{...state.account,companionSanctuary:{...sanctuary,lastTrainingClaimAtMs:now-Math.max(0,now-last)%day}}};
}
function stringArg(a:Record<string,unknown>,key:string){const v=a[key];if(typeof v!=='string'||!v||v.length>120)throw new Error(`Invalid ${key}.`);return v;}
function idsArg(a:Record<string,unknown>){const v=a.ids;if(!Array.isArray(v)||v.length>3||v.some(x=>typeof x!=='string'||x.length>80)||new Set(v).size!==v.length)throw new Error('Choose unique companions.');return v as string[];}
export function assertCompanionIdle(state:GameState,id:string){
  if((state.account.companionAssignments??[]).some(a=>a.status!=='claimed'&&a.status!=='cancelled'&&a.companionIds.includes(id))||state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id))throw new Error('Companion is busy. Finish or abandon its activity first.');
}
/** Synchronous domain entry point called only inside the existing trusted game transaction online. */
export function executeCompanionActivity(input:GameState,type:string,a:Record<string,unknown>,now:number):GameState {
  let state=refreshCompanions(structuredClone(input),now);if(!state.character)throw new Error('Create a character first.');
  const owned=companionOwned(state),profile=state.account.companionPhase2Profile??{showcaseCompanionIds:[],showcaseSlotsUnlocked:1};
  const assignments=state.account.companionAssignments??[];
  const busy=new Set(assignments.filter(x=>x.status!=='claimed'&&x.status!=='cancelled').flatMap(x=>x.companionIds));
  const sequence=(state.account.companionActionSequence??0)+1,seed=`${state.character.id}:${sequence}:${now}`;
  const trialInput={progress:state.account.companionTrialProgress,owned,busyCompanionIds:busy,trialsUnlocked:['tank','damage','support'].every(role=>Object.keys(owned).some(id=>companionServerDefinition(id)?.role===role)),serverNowMs:now};
  switch(type){
    case 'companion_monthly':{const r=claimMonthlyCompanionChallenge(state.account.companionTrialProgress!,stringArg(a,'id'),now);state=reward(state,r.reward);state.account.companionTrialProgress=r.progress;break;}
    case 'companion_supplies':{
      if(!(state.account.companionSanctuary?.expeditionPensLevel))throw new Error('Build Expedition Pens first.');
      const economy=companionEconomy(state);if(economy.gold<250)throw new Error('Not enough Gold.');
      economy.gold-=250;economy.materials.SUPPLIES=(economy.materials.SUPPLIES??0)+5;state=applyEconomy(state,economy);break;
    }
    case 'companion_bond_reward':{
      const id=stringArg(a,'id'),progress=owned[id];if(!progress)throw new Error('Companion is locked.');
      const rewards:Record<number,number>={2:20,4:35,6:55,8:80},claims=state.account.companionBondRewardClaims??[];
      const requested=a.level===undefined?[8,6,4,2].find(level=>progress.bondLevel>=level&&!claims.includes(`${id}:${level}`)):Number(a.level);
      if(!requested||!rewards[requested])throw new Error('No Bond milestone reward is available.');
      if(progress.bondLevel<requested)throw new Error(`Reach Bond ${requested} first.`);
      const key=`${id}:${requested}`;if(claims.includes(key))throw new Error('Bond reward already claimed.');
      state=reward(state,{companionEssence:rewards[requested]});
      const profileRewards=requested===4?[`COMPANION_PORTRAIT_${id}`]:requested===8?[`COMPANION_TITLE_${id}`]:[];
      if(profileRewards.length){const current=state.account.companionPhase2Profile??{showcaseCompanionIds:[],showcaseSlotsUnlocked:1};state.account.companionPhase2Profile={...current,codexRewardIds:[...new Set([...(current.codexRewardIds??[]),...profileRewards])]};}
      state.account.companionBondRewardClaims=[...claims,key];break;
    }
    case 'companion_trial_start':{
      const r=startCompanionTrial(trialInput,idsArg(a),seed,[],a.floor===undefined?undefined:Number(a.floor));state.account.companionTrialProgress=r.progress;break;
    }
    case 'companion_trial_abandon':{
      if(state.account.companionTrialProgress?.season.activeRun?.runId!==stringArg(a,'id'))throw new Error('Trial run is no longer active.');
      state.account.companionTrialProgress=abandonCompanionTrial(state.account.companionTrialProgress!,now);break;
    }
    case 'companion_trial_floor':{
      if(now<(state.account.companionBattleReadyAtMs??0))throw new Error('Companions are recovering from battle.');
      const run=state.account.companionTrialProgress?.season.activeRun;
      if(!run||a.floor!==run.currentFloor)throw new Error('Trial floor changed. Refresh before continuing.');
      const r=resolveCompanionTrialFloor(trialInput,stringArg(a,'id'),companionCombatExecutor);
      state.account.companionTrialProgress=r.progress;state=reward(state,r.reward);
      if(r.result.victory){state=awardUse(state,run.teamCompanionIds,12+run.currentFloor*2,8+(run.currentFloor%5===0?18:0),now);state.account.companionProvingGround=recordCompanionProvingGroundEvent({state:state.account.companionProvingGround,serverNowMs:now,owned,event:{eventId:`${run.runId}:${run.currentFloor}`,type:run.currentFloor%5===0?'trial_boss_clear':'trial_floor_clear',companionIds:run.teamCompanionIds,trialFloor:run.currentFloor,teamPower:companionTeamPower(run.teamCompanionIds,owned),recommendedPower:companionTrialRecommendedPower(run.currentFloor),noDefeats:r.result.players?.every(p=>p.alive)}}).state;}
      state.account.companionBattleReadyAtMs=now+Math.max(1000,r.result.durationMs);
      state.account.companionLastBattle={title:`Trial Floor ${run.currentFloor}`,won:r.result.victory,durationMs:r.result.durationMs,gold:r.reward.gold,essence:r.reward.companionEssence,bondstones:r.reward.bondstones,atMs:now};break;
    }
    case 'companion_assignment_start':{
      const r=startCompanionAssignment({accountId:state.character.id,missionId:stringArg(a,'id'),companionIds:idsArg(a),owned,assignments:assignments.filter(x=>x.status!=='claimed'&&x.status!=='cancelled'),equippedCompanionIds:new Set(state.character.equippedCombatCompanionId?[state.character.equippedCombatCompanionId]:[]),lockedTrialCompanionIds:new Set(state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds??[]),expeditionPensLevel:state.account.companionSanctuary?.expeditionPensLevel??0,economy:companionEconomy(state),serverNowMs:now,requestId:seed});
      state=applyEconomy(state,r.economy);state.account.companionAssignments=[...assignments.filter(x=>x.status==='claimed'||x.status==='cancelled').slice(-8),...assignments.filter(x=>x.status!=='claimed'&&x.status!=='cancelled'),r.assignment];break;
    }
    case 'companion_assignment_claim':{
      const assignment=assignments.find(x=>x.assignmentId===stringArg(a,'id'));if(!assignment)throw new Error('Assignment not found.');
      const week=companionTrialWeekKey(now),used=state.account.companionAssignmentBondstoneWeek===week?state.account.companionAssignmentBondstones??0:0;
      const r=claimCompanionAssignment({assignment,owned,serverNowMs:now,bondstonesClaimedThisWeek:used});state=reward(state,r.reward);
      for(const id of assignment.companionIds)state=awardUse(state,[id],r.reward.companionXpById?.[id]??0,r.reward.bondXpById?.[id]??0,now);
      const mission=companionMission(assignment.missionId),unlockProgress={...(state.account.companionUnlockProgress??{})};
      if(mission?.originId){const missionKey=`COMPANION_MISSIONS:${mission.originId}`;unlockProgress[missionKey]=(unlockProgress[missionKey]??0)+1;if(r.assignment.performanceGrade==='S'){const gradeKey=`COMPANION_S_GRADE:${mission.originId}`;unlockProgress[gradeKey]=(unlockProgress[gradeKey]??0)+1;}}
      state.account.companionUnlockProgress=unlockProgress;
      state.account.companionAssignments=assignments.map(x=>x.assignmentId===assignment.assignmentId?r.assignment:x);state.account.companionAssignmentBondstoneWeek=week;state.account.companionAssignmentBondstones=used+r.reward.bondstones;break;
    }
    case 'companion_technique':{
      const id=stringArg(a,'id');assertCompanionIdle(state,id);if(!owned[id])throw new Error('Companion is locked.');
      const r=selectCompanionTechnique(owned[id],stringArg(a,'technique'),companionEconomy(state));state=applyEconomy(setOwned(state,{...owned,[id]:r.progress}),r.economy);break;
    }
    case 'companion_codex':{const r=claimCompanionCodexMilestone({milestoneId:stringArg(a,'id'),owned,profile,economy:companionEconomy(state)});state=applyEconomy(state,r.economy);state.account.companionPhase2Profile=r.profile;break;}
    case 'companion_showcase':{state.account.companionPhase2Profile=setCompanionShowcase(profile,new Set(Object.keys(owned)),a.id===undefined?undefined:stringArg(a,'id'),idsArg(a));break;}
    case 'companion_weekly':{const r=claimCompanionProvingGroundChallenge({state:state.account.companionProvingGround,serverNowMs:now,challengeId:stringArg(a,'id')});state=reward(state,r.reward);if(Object.keys(owned).some(id=>companionServerDefinition(id)?.originId.startsWith('EVENT_')))state=reward(state,{materials:{EVENT_BONDBLOOM:1}});state.account.companionProvingGround=r.state;state.account.companionPhase2Profile={...profile,codexRewardIds:[...new Set([...(profile.codexRewardIds??[]),...(r.reward.rewardIds??[])])]};break;}
    case 'companion_special':{
      if(now<(state.account.companionBattleReadyAtMs??0))throw new Error('Companions are recovering from battle.');
      const id=stringArg(a,'id');if(state.account.companionSpecialClears?.includes(id))throw new Error('Special challenge reward already claimed.');
      for(const locked of state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds??[])busy.add(locked);
      const r=resolveSpecialCompanionChallenge({challengeId:id,facts:companionUnlockFacts(state),teamIds:idsArg(a),owned,busyCompanionIds:busy,seed},companionCombatExecutor);
      if(r.unlockedCompanionId){const granted=grantCombatCompanionOrConvertDuplicate({companionId:r.unlockedCompanionId,owned,companionEssence:state.account.companionEssence??0});state=setOwned(state,granted.owned);state.account.companionEssence=granted.companionEssence;state.account.companionSpecialClears=[...(state.account.companionSpecialClears??[]),id];}
      state.account.companionBattleReadyAtMs=now+Math.max(1000,r.result.durationMs);
      state.account.companionLastBattle={title:'Special Companion Challenge',won:r.result.victory,durationMs:r.result.durationMs,gold:0,essence:0,bondstones:0,atMs:now};break;
    }
    default:throw new Error('Unknown companion activity.');
  }
  state.account.companionActionSequence=sequence;return refreshCompanions(state,now);
}
export function companionUnlockFacts(state:GameState):CompanionUnlockFacts {
  const owned=companionOwned(state),ownedByRole={tank:0,damage:0,support:0},bondTotalByOrigin:Record<string,number>={},levelTotalByOrigin:Record<string,number>={};
  for(const [id,p] of Object.entries(owned)){const d=companionServerDefinition(id);if(!d)continue;ownedByRole[d.role]++;bondTotalByOrigin[d.originId]=(bondTotalByOrigin[d.originId]??0)+p.bondLevel;levelTotalByOrigin[d.originId]=(levelTotalByOrigin[d.originId]??0)+p.level;}
  return {highestTrialFloor:state.account.companionTrialProgress?.lifetime.lifetimeHighestFloor??0,specialBossClears:new Set(state.account.companionSpecialClears??[]),bossClearCounts:{...Object.fromEntries(state.defeatedBossIds.map(id=>[id,1])),...state.account.companionBossClears},regionCompletion:new Set(state.quests.some(q=>q.questId==='QST_015'&&q.status==='claimed')?['REG_001']:[]),eventCompletion:new Set(),ownedCompanionIds:new Set(Object.keys(owned)),ownedByRole,bondTotal:Object.values(owned).reduce((s,p)=>s+p.bondLevel,0),levelTotal:Object.values(owned).reduce((s,p)=>s+p.level,0),bondTotalByOrigin,levelTotalByOrigin,achievements:new Set(),mastery:state.account.companionUnlockProgress??{},reputation:{},eventChallenges:new Set(),companionEssence:state.account.companionEssence??0};
}
/** Call only for settled, verified activity. Counts never arrive from a client command. */
export function recordCompanionActivity(state:GameState,source:'combat'|'gathering'|'boss'|'crafting',target:string,units:number,now:number):GameState {
  if(units<=0)return state;
  let next=structuredClone(state);const counters={...(next.account.companionUnlockProgress??{})};
  if(source==='combat'){
    const oldMines=WORLD_ZONES.find(zone=>zone.id==='OLD_MINES');
    if(oldMines&&MONSTERS.find(m=>m.id===target)?.zone===oldMines.name)counters.OLD_MINES_KILLS=(counters.OLD_MINES_KILLS??0)+units;
  }
  if(source==='gathering'){
    const gatheringNodes=[...GATHERING,...HERB_NODES];
    const node=gatheringNodes.find(g=>g.id===target);if(node?.zoneId==='SILVERBROOK')counters[`node:${target}`]=1;
    const nodes=gatheringNodes.filter(g=>g.zoneId==='SILVERBROOK');if(nodes.length&&nodes.every(g=>counters[`node:${g.id}`]))counters.SILVERBROOK_NODES=1;
  }
  if(source==='crafting')counters.EQUIPMENT_CRAFTS=(counters.EQUIPMENT_CRAFTS??0)+units;
  if(source==='boss')next.account.companionBossClears={...next.account.companionBossClears,[target]:(next.account.companionBossClears?.[target]??0)+units};
  next.account.companionUnlockProgress=counters;
  const id=next.character?.equippedCombatCompanionId;
  const available=id&&!next.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id)&&!(next.account.companionAssignments??[]).some(a=>a.status!=='claimed'&&a.status!=='cancelled'&&a.companionIds.includes(id));
  if(id&&available&&(source==='combat'||source==='boss')){
    next=awardUse(next,[id],(source==='boss'?120:9)*units,(source==='boss'?60:4)*units,now);
    const event:CompanionProvingGroundEvent={eventId:`${target}:${now}`,type:source==='boss'?'boss_defeat':'battle_complete',companionIds:[id],characterRole:classCompanionRole(next.character!.classId)};
    const view=projectCompanionProvingGrounds(next.account.companionProvingGround,now),owned=companionOwned(next),progress={...view.state.progress},completed=new Set(view.state.completedIds);
    for(const def of activeCompanionProvingGroundChallenges(now).definitions)if(provingGroundEventMatches(def,event,owned)){progress[def.id]=Math.min(def.targetCount,(progress[def.id]??0)+units);if(progress[def.id]>=def.targetCount)completed.add(def.id);}
    next.account.companionProvingGround={...view.state,progress,completedIds:[...completed]};
  }
  return reconcileCombatCompanionUnlocks(next,now);
}
