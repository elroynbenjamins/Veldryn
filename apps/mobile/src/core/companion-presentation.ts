import type {GameState} from './types';
import type {CompanionDefinition} from './combat-companion-types';
import {companionUnlockRequirementMet} from './combat-companions';
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
