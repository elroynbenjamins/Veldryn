import type {GameState} from './types';
import type {CombatCompanionRole,CompanionDefinition} from './combat-companion-types';
import {companionCurrentLevelCap,companionMaxLevel,companionUnlockRequirementMet,isCombatCompanionMastered} from './combat-companions';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {ITEMS} from '../content/items';
import {COMBAT_COMPANIONS,COMPANION_STAGE_CAPS} from '../content/combat-companions';
import {characterClassSkills} from './class-skills';
import {monsterMastery} from './monster-mastery';

export function companionMaterialName(id:string){return ITEMS.find(item=>item.id===id)?.name??id.toLowerCase().replace(/_/g,' ').replace(/^./,s=>s.toUpperCase());}
export type CompanionMaterialSourceTarget=
 |{kind:'combat';id:string;label:string;detail:string;monsterId:string;zoneName:string}
 |{kind:'crafting';id:string;label:string;detail:string;skillId:string}
 |{kind:'gathering';id:string;label:string;detail:string;skillId:string;nodeId:string;zoneId:string}
 |{kind:'companion';id:string;label:string;detail:string;section:'Sanctuary'|'Trials'|'Expeditions'}
 |{kind:'events';id:string;label:string;detail:string}
 |{kind:'info';id:string;label:string;detail:string};

function chanceLabel(chance:number){const pct=chance*100;return pct>=10?`${Math.round(pct)}%`:pct>=1?`${pct.toFixed(1)}%`:`${pct.toFixed(2)}%`;}
export function companionMaterialSourceTargets(id:string):CompanionMaterialSourceTarget[]{
 const sources:CompanionMaterialSourceTarget[]=[];
 for(const monster of MONSTERS){
  const drop=monster.drops.find(row=>row.itemId===id);if(!drop)continue;
  sources.push({kind:'combat',id:`combat:${monster.id}`,label:`Hunt ${monster.name}`,detail:`${monster.zone} · ${chanceLabel(drop.chance)} drop chance`,monsterId:monster.id,zoneName:monster.zone});
 }
 for(const recipe of RECIPES.filter(row=>row.output.itemId===id))sources.push({kind:'crafting',id:`craft:${recipe.id}`,label:`Craft ${recipe.name}`,detail:`${recipe.skillId.replace(/_/g,' ')} · level ${recipe.level}`,skillId:recipe.skillId});
 for(const node of GATHERING.filter(row=>row.itemId===id))sources.push({kind:'gathering',id:`gather:${node.id}`,label:`Gather at ${node.name}`,detail:`${node.skillId.replace(/_/g,' ')} · level ${node.unlockLevel}`,skillId:node.skillId,nodeId:node.id,zoneId:node.zoneId});
 if(id==='SUPPLIES')sources.push({kind:'companion',id:'sanctuary:supplies',label:'Buy Sanctuary supplies',detail:'5 Supplies for 250 Gold · Expedition Pens required',section:'Sanctuary'});
 if(id==='TRIAL_SANCTUARY_MATERIAL')sources.push({kind:'companion',id:'trials:first-clear',label:'Clear Companion Trial bosses',detail:'First-clear Trial boss rewards',section:'Trials'});
 if(id==='EVENT_BONDBLOOM'){
  sources.push({kind:'events',id:'events:bondbloom',label:'Open the active event',detail:'Event companion acquisition grants a starter Bondbloom bundle'});
  sources.push({kind:'companion',id:'trials:proving-grounds',label:'Weekly Proving Grounds',detail:'Available while you own an event companion',section:'Trials'});
  sources.push({kind:'events',id:'events:prestige-shop',label:'Event prestige rewards',detail:'Returning events can offer additional Bondbloom'});
 }
 if(!sources.length)sources.push({kind:'companion',id:'expeditions:materials',label:'Check Sanctuary Expeditions',detail:'Assignment rewards or later-region companion content can provide this material',section:'Expeditions'});
 return sources;
}

export function companionMaterialSources(id:string):string[]{return companionMaterialSourceTargets(id).map(source=>source.label);}
export function companionRequirementProgress(state:GameState,req:CompanionDefinition['unlockRequirements'][number]){
 const target=req.target??req.description,total=Math.max(1,req.amount??1);
 let current=state.account.companionUnlockProgress?.[target]??0;
 if(target==='KNIFE_DANCER_SKILL_TOTAL'&&state.character?.classId==='KNIFE_DANCER')current=characterClassSkills(state.character).reduce((sum,s)=>sum+s.level,0);
 if(req.type==='monster_mastery'&&MONSTERS.some(m=>m.id===target))current=monsterMastery(state,target).rank;
 if(req.type==='quest')current=state.quests.some(q=>q.questId===target&&q.status==='claimed')?1:0;
 if(req.type==='skill_level')current=state.skills.find(s=>s.skillId===target)?.level??0;
 if(req.type==='boss_kills')current=Math.max(state.defeatedBossIds.includes(target)?1:0,state.account.companionBossClears?.[target]??0);
 if(req.type==='meta'&&target.startsWith('COMPANION_BOND:')){
   const companionId=target.slice('COMPANION_BOND:'.length);
   current=state.account.combatCompanionProgress?.[companionId]?.bondLevel??0;
 }
 if(req.type==='meta'&&['REG_SUNSCAR','REG_FROSTMARCH','REG_ASHLANDS'].includes(target)){
   const owned=new Set(state.account.unlockedCombatCompanionIds??[]);
   const regionalNonPrestige=COMBAT_COMPANIONS.filter(def=>def.origin.id===target&&def.rarity!=='prestige');
   current=regionalNonPrestige.filter(def=>owned.has(def.id)).length;
 }
 if(req.type==='event_challenge'&&target.startsWith('CHALLENGE_'))current=state.account.companionSpecialClears?.includes(target)?1:0;
 if(target==='SILVERBROOK_NODES'){
   const nodes=GATHERING.filter(g=>g.zoneId==='SILVERBROOK');
   return {current:nodes.filter(g=>state.account.companionUnlockProgress?.[`node:${g.id}`]).length,total:nodes.length,complete:companionUnlockRequirementMet(state,req)};
 }
 return {current:Math.min(total,current),total,complete:companionUnlockRequirementMet(state,req)};
}
export function companionRecoverySeconds(state:GameState,now:number){return Math.max(0,Math.ceil(((state.account.companionBattleReadyAtMs??0)-now)/1000));}
export function companionAssignmentStatusLabel(assignment:{status:string;endsAt:string;performanceGrade?:string},now:number){
 if(assignment.status==='claimed')return assignment.performanceGrade?`Claimed · Grade ${assignment.performanceGrade}`:'Claimed';
 if(assignment.status==='cancelled')return 'Cancelled';
 const remaining=Math.max(0,Date.parse(assignment.endsAt)-now);
 if(assignment.status==='completed'||remaining<=0)return 'Ready to claim';
 const minutes=Math.max(1,Math.ceil(remaining/60000)),hours=Math.floor(minutes/60),mins=minutes%60;
 return hours?`${hours}h ${mins}m remaining`:`${mins}m remaining`;
}


export function companionUnlockCompletion(state:GameState,def:CompanionDefinition){
 const requirements=def.unlockRequirements.map(req=>companionRequirementProgress(state,req));
 const ratio=requirements.length?requirements.reduce((sum,p)=>sum+(p.total?Math.min(1,p.current/p.total):0),0)/requirements.length:0;
 return {requirements,ratio,completeCount:requirements.filter(p=>p.complete).length,totalCount:requirements.length};
}
const rarityPriority:Record<CompanionDefinition['rarity'],number>={standard:0,rare:1,elite:2,prestige:3};
export function companionUnlockRequirementGuidance(req:CompanionDefinition['unlockRequirements'][number]){
 const target=req.target??'',amount=Math.max(1,req.amount??1);
 if(req.type==='quest')return {label:'Continue the campaign',detail:req.description};
 if(req.type==='monster_mastery')return {label:`Hunt ${MONSTERS.find(m=>m.id===target)?.name??target.replace(/_/g,' ')}`,detail:`Raise Monster Mastery to ${amount}.`};
 if(req.type==='skill_level')return {label:`Train ${target.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`,detail:`Reach skill level ${amount}.`};
 if(req.type==='collection'&&target==='SILVERBROOK_NODES')return {label:'Explore Silverbrook fishing spots',detail:'Fish each Silverbrook node at least once; the final pool unlocks at Fishing 16.'};
 if(req.type==='boss_kills')return {label:`Challenge ${MONSTERS.find(m=>m.id===target)?.name??target.replace(/_/g,' ')}`,detail:`Defeat it ${amount} time${amount===1?'':'s'}.`};
 if(req.type==='achievement'&&target.startsWith('COMPANION_MISSIONS:'))return {label:'Run Sanctuary Expeditions',detail:`Complete ${amount} assignments in ${target.split(':')[1].replace('REG_','').replace(/_/g,' ').toLowerCase()}.`};
 if(req.type==='achievement'&&target.startsWith('COMPANION_S_GRADE:'))return {label:'Improve Expedition teams',detail:`Earn S grade on ${amount} regional Sanctuary assignments.`};
 if(req.type==='meta'&&target.startsWith('COMPANION_BOND:')){const id=target.slice('COMPANION_BOND:'.length),name=COMBAT_COMPANIONS.find(def=>def.id===id)?.name??id;return {label:`Raise ${name} Bond`,detail:`Reach Bond ${amount} with ${name}.`};}
 if(req.type==='event_challenge'&&target.startsWith('CHALLENGE_'))return {label:'Complete its Special Companion Challenge',detail:req.description};
 return {label:req.description,detail:`Progress ${amount} required.`};
}
export function companionUnlockGuidance(state:GameState,def:CompanionDefinition){
 const progress=companionUnlockCompletion(state,def),incomplete=def.unlockRequirements.map((req,index)=>({req,index,p:progress.requirements[index]})).filter(row=>!row.p.complete);
 if(!incomplete.length)return {ready:true,label:'Ready to recruit',detail:'All unlock requirements are complete.',requirement:undefined as CompanionDefinition['unlockRequirements'][number]|undefined,progress};
 incomplete.sort((a,b)=>{
   const ar=a.p.total?Math.min(1,a.p.current/a.p.total):0,br=b.p.total?Math.min(1,b.p.current/b.p.total):0;
   return br-ar||a.index-b.index;
 });
 const requirement=incomplete[0].req,copy=companionUnlockRequirementGuidance(requirement);
 return {ready:false,...copy,requirement,progress};
}
export function companionStarterTeamProgress(state:GameState){
 const owned=new Set(state.account.unlockedCombatCompanionIds??[]),roles=(['tank','damage','support'] as CombatCompanionRole[]).map(role=>({role,owned:COMBAT_COMPANIONS.some(def=>def.role===role&&owned.has(def.id))}));
 const missingRoles=roles.filter(row=>!row.owned).map(row=>row.role);
 const candidates=COMBAT_COMPANIONS.filter(def=>def.origin.type!=='event'&&!owned.has(def.id)&&missingRoles.includes(def.role)).map(def=>({def,guidance:companionUnlockGuidance(state,def)})).sort((a,b)=>rarityPriority[a.def.rarity]-rarityPriority[b.def.rarity]||b.guidance.progress.ratio-a.guidance.progress.ratio||a.def.name.localeCompare(b.def.name));
 return {ready:missingRoles.length===0,roles,missingRoles,next:candidates[0]};
}
export function companionNextUnlockTargets(state:GameState,limit=3){
 const owned=new Set(state.account.unlockedCombatCompanionIds??[]);
 return COMBAT_COMPANIONS.filter(def=>!owned.has(def.id)&&def.origin.type!=='event'&&def.unlockRequirements.length>0)
  .map(def=>({def,progress:companionUnlockCompletion(state,def)}))
  .sort((a,b)=>{
    const ownedRoles=new Set((state.account.unlockedCombatCompanionIds??[]).map(id=>COMBAT_COMPANIONS.find(def=>def.id===id)?.role).filter(Boolean));
    const aRoleNeed=ownedRoles.has(a.def.role)?1:0,bRoleNeed=ownedRoles.has(b.def.role)?1:0;
    return aRoleNeed-bRoleNeed||rarityPriority[a.def.rarity]-rarityPriority[b.def.rarity]||b.progress.ratio-a.progress.ratio||b.progress.completeCount-a.progress.completeCount||a.def.name.localeCompare(b.def.name);
  })
  .slice(0,Math.max(0,limit));
}
export function companionMasteryGuidance(state:GameState,id:string){
 const def=COMBAT_COMPANIONS.find(row=>row.id===id),progress=state.account.combatCompanionProgress?.[id];if(!def||!progress)return undefined;
 const maxLevel=companionMaxLevel(def),requiredAscension=def.rarity==='standard'||def.rarity==='rare'?2:3,levelCap=companionCurrentLevelCap(def,progress),mastered=isCombatCompanionMastered(def,progress);
 let nextStep='Mastered';
 if(!mastered){
   if(progress.level<maxLevel&&progress.level>=levelCap&&progress.ascensionTier<requiredAscension)nextStep=`Ascend to Tier ${progress.ascensionTier+1}`;
   else if(progress.level<maxLevel)nextStep=`Train to Level ${Math.min(maxLevel,progress.level+1)}`;
   else if(progress.ascensionTier<requiredAscension)nextStep=`Ascend to Tier ${progress.ascensionTier+1}`;
   else if(progress.bondLevel<10)nextStep=`Raise Bond to ${progress.bondLevel+1}`;
   else if(def.rarity==='prestige'&&!progress.mastered)nextStep='Complete Prestige Mastery';
   else nextStep='Complete mastery requirements';
 }
 const score=.45*(progress.level/maxLevel)+.30*(progress.bondLevel/10)+.20*Math.min(1,progress.ascensionTier/requiredAscension)+.05*(def.rarity!=='prestige'||progress.mastered?1:0);
 return {def,progress,maxLevel,requiredAscension,mastered,nextStep,score};
}
export type CompanionRoadmapStatus='complete'|'ready'|'current'|'future';
export interface CompanionRoadmapStep{id:string;label:string;detail:string;reward:string;status:CompanionRoadmapStatus}
export function companionProgressionRoadmap(state:GameState,id:string){
 const def=COMBAT_COMPANIONS.find(row=>row.id===id);if(!def)return undefined;
 const progress=state.account.combatCompanionProgress?.[id];
 if(!progress){
  const unlock=companionUnlockCompletion(state,def),guidance=companionUnlockGuidance(state,def);
  return {owned:false,nextStep:guidance.label,power:[{id:'recruit',label:'Recruit companion',detail:`${unlock.completeCount}/${unlock.totalCount} requirements complete`,reward:`${Math.round(unlock.ratio*100)}% recruitment progress`,status:(guidance.ready?'ready':'current') as CompanionRoadmapStatus}],bond:[] as CompanionRoadmapStep[]};
 }
 const requiredAscension=def.rarity==='standard'||def.rarity==='rare'?2:3;
 const gates:{tier:1|2|3;level:number}[]=[{tier:1,level:10},{tier:2,level:20},...(requiredAscension===3?[{tier:3 as const,level:25}]:[])];
 const power:CompanionRoadmapStep[]=[{id:'recruit',label:'Recruited',detail:def.origin.name,reward:'Permanent account unlock',status:'complete'}];
 for(const gate of gates){
  const complete=progress.ascensionTier>=gate.tier,ready=!complete&&progress.ascensionTier===gate.tier-1&&progress.level>=gate.level,current=!complete&&progress.ascensionTier===gate.tier-1;
  const cap=COMPANION_STAGE_CAPS[def.rarity][gate.tier],previousCap=COMPANION_STAGE_CAPS[def.rarity][gate.tier-1];
  const capReward=cap>previousCap?`Level cap ${cap}`:'Final rarity ascension';
  const technique=gate.tier===2?' · Technique choice unlock':'';
  power.push({id:`ascension-${gate.tier}`,label:`Ascension ${['','I','II','III'][gate.tier]}`,detail:`Reach Level ${gate.level}, then Ascend`,reward:`${capReward}${technique}`,status:complete?'complete':ready?'ready':current?'current':'future'});
 }
 if(def.rarity==='prestige'){
  const complete=progress.mastered===true,ready=!complete&&progress.ascensionTier>=3&&progress.level>=35,current=!complete&&progress.ascensionTier>=3;
  power.push({id:'prestige-mastery',label:'Prestige Mastery',detail:'Reach Level 35 after Ascension III',reward:'Final Prestige mastery marker',status:complete?'complete':ready?'ready':current?'current':'future'});
 }
 const bondRewards:Record<number,{reward:string;detail:string}>={
  2:{reward:'20 Essence',detail:'First Bond reward'},
  4:{reward:'35 Essence + portrait',detail:'Profile identity reward'},
  6:{reward:'55 Essence + Bond Resonance',detail:'Passive improvement milestone'},
  8:{reward:'80 Essence + title',detail:'Profile title milestone'},
  10:{reward:`Bond Trait · ${def.bondTrait.name}`,detail:def.bondTrait.description},
 };
 const bondLevels=[2,4,6,8,10] as const,nextBond=bondLevels.find(level=>progress.bondLevel<level);
 const claims=new Set(state.account.companionBondRewardClaims??[]);
 const bond:CompanionRoadmapStep[]=bondLevels.map(level=>{
  const reached=progress.bondLevel>=level,claimable=level<10,rewardClaimed=!claimable||claims.has(`${id}:${level}`);
  const status:CompanionRoadmapStatus=reached&&!rewardClaimed?'ready':reached?'complete':level===nextBond?'current':'future';
  return {id:`bond-${level}`,label:`Bond ${level}`,detail:bondRewards[level].detail,reward:bondRewards[level].reward,status};
 });
 const readyBond=bond.find(step=>step.status==='ready'),mastery=companionMasteryGuidance(state,id);
 return {owned:true,nextStep:readyBond?`Claim ${readyBond.label} reward`:mastery?.nextStep??'Continue companion progression',power,bond};
}

export function companionNextMasteryTargets(state:GameState,limit=3){
 return Object.keys(state.account.combatCompanionProgress??{})
  .map(id=>companionMasteryGuidance(state,id))
  .filter((entry):entry is NonNullable<typeof entry>=>!!entry&&!entry.mastered)
  .sort((a,b)=>b.score-a.score||a.def.name.localeCompare(b.def.name))
  .slice(0,Math.max(0,limit));
}

export function companionRewardLabel(id:string){
 const companionFrom=(prefix:string)=>COMBAT_COMPANIONS.find(row=>row.id===id.slice(prefix.length))?.name;
 if(id.startsWith('COMPANION_PORTRAIT_'))return `Companion portrait · ${companionFrom('COMPANION_PORTRAIT_')??'Companion'}`;
 if(id.startsWith('COMPANION_TITLE_'))return `Companion title · ${companionFrom('COMPANION_TITLE_')??'Companion'}`;
 const prefixes:[string,string][]=[['PROFILE_BADGE_','Profile badge'],['PROFILE_BACKGROUND_','Profile background'],['PROFILE_BORDER_','Profile border'],['TITLE_','Title']];
 for(const [prefix,label] of prefixes)if(id.startsWith(prefix))return `${label} · ${id.slice(prefix.length).toLowerCase().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`;
 return id.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
