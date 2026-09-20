import type {GameState} from './types';
import type {CompanionDefinition} from './combat-companion-types';
import {companionCurrentLevelCap,companionMaxLevel,companionUnlockRequirementMet,isCombatCompanionMastered} from './combat-companions';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {ITEMS} from '../content/items';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {characterClassSkills} from './class-skills';
import {monsterMastery} from './monster-mastery';

export function companionMaterialName(id:string){return ITEMS.find(item=>item.id===id)?.name??id.toLowerCase().replace(/_/g,' ').replace(/^./,s=>s.toUpperCase());}
export function companionMaterialSources(id:string):string[]{
 const sources=[...MONSTERS.filter(m=>m.drops.some(d=>d.itemId===id)).map(m=>`Hunt ${m.name}`),...RECIPES.filter(r=>r.output.itemId===id).map(r=>`Craft ${r.name}`)];
 if(id==='SUPPLIES')sources.push('Buy at the Sanctuary: 5 for 250 Gold');
 sources.push(...GATHERING.filter(g=>g.itemId===id).map(g=>`Gather at ${g.name}`));
 if(id==='TRIAL_SANCTUARY_MATERIAL')sources.push('First-clear Trial boss rewards');
 if(id==='EVENT_BONDBLOOM')sources.push('Earn an event companion for a starter bundle','Weekly Proving Grounds while you own an event companion','Future event prestige shops');
 return sources.length?sources:['Companion assignment rewards or later-region content'];
}
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


export function companionUnlockCompletion(state:GameState,def:CompanionDefinition){
 const requirements=def.unlockRequirements.map(req=>companionRequirementProgress(state,req));
 const ratio=requirements.length?requirements.reduce((sum,p)=>sum+(p.total?Math.min(1,p.current/p.total):0),0)/requirements.length:0;
 return {requirements,ratio,completeCount:requirements.filter(p=>p.complete).length,totalCount:requirements.length};
}
export function companionNextUnlockTargets(state:GameState,limit=3){
 const owned=new Set(state.account.unlockedCombatCompanionIds??[]);
 return COMBAT_COMPANIONS.filter(def=>!owned.has(def.id)&&def.origin.type!=='event'&&def.unlockRequirements.length>0)
  .map(def=>({def,progress:companionUnlockCompletion(state,def)}))
  .sort((a,b)=>b.progress.ratio-a.progress.ratio||b.progress.completeCount-a.progress.completeCount||a.def.name.localeCompare(b.def.name))
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
export function companionNextMasteryTargets(state:GameState,limit=3){
 return Object.keys(state.account.combatCompanionProgress??{})
  .map(id=>companionMasteryGuidance(state,id))
  .filter((entry):entry is NonNullable<typeof entry>=>!!entry&&!entry.mastered)
  .sort((a,b)=>b.score-a.score||a.def.name.localeCompare(b.def.name))
  .slice(0,Math.max(0,limit));
}
