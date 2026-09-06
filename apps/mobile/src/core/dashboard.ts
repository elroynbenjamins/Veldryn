import {MONSTERS} from '../content/monsters';
import {QUESTS} from '../content/quests';
import {GATHERING} from '../content/skills';
import {GameState} from './types';
import {effectiveStats} from './game';
import {classCombatStyle} from './class-combat';

export type DashboardDestination='World'|'Skills'|'Inventory'|'Quests'|'Character';
export interface DashboardRecommendation{title:string;detail:string;button:string;destination:DashboardDestination;zoneId?:string;priority:'urgent'|'progress'|'upgrade'}

/** A single, deterministic next-step recommendation for the home screen. */
export function dashboardRecommendation(state:GameState):DashboardRecommendation{
  const c=state.character;
  if(!c)return {title:'Create your hero',detail:'Choose a class to begin.',button:'Create character',destination:'Character',priority:'progress'};
  if(state.overflow.stacks.length)return {title:'Overflow needs attention',detail:`${state.overflow.stacks.length} reward stack${state.overflow.stacks.length===1?' is':'s are'} waiting. Move them before the 72-hour hold expires.`,button:'Manage rewards',destination:'Inventory',priority:'urgent'};
  if(c.currentHp<=Math.max(5,Math.floor(c.hp*.35)))return {title:'Recover before hunting',detail:'Your health is low. Eat food or equip a stronger ration before continuing combat.',button:'Open food & gear',destination:'Inventory',priority:'urgent'};
  const ready=state.quests.find(q=>q.status==='complete');
  if(ready){const def=QUESTS.find(q=>q.id===ready.questId);return {title:'Chapter reward ready',detail:def?`${def.name} is complete. Claim it to unlock the next chapter.`:'A journal reward is ready.',button:'Claim reward',destination:'Quests',priority:'progress'}}
  const active=state.quests.find(q=>q.status==='active'),def=QUESTS.find(q=>q.id===active?.questId);
  if(def?.kind==='kills'&&def.targetId){const monster=MONSTERS.find(m=>m.id===def.targetId);if(monster&&state.unlockedMonsterIds.includes(monster.id))return {title:`Continue: ${def.name}`,detail:`Hunt ${monster.name} in ${monster.zone} · ${Math.max(0,def.required-(active?.progress??0))} remaining.`,button:'Open hunting ground',destination:'World',zoneId:monster.zone,priority:'progress'}}
  if(def?.kind==='item')return {title:`Continue: ${def.name}`,detail:def.description,button:'Gather materials',destination:'Skills',priority:'progress'};
  if(def?.kind==='skillLevel')return {title:`Continue: ${def.name}`,detail:def.description,button:'Train a skill',destination:'Skills',priority:'progress'};
  if(def?.kind==='equip')return {title:`Continue: ${def.name}`,detail:def.description,button:'Review equipment',destination:'Inventory',priority:'upgrade'};
  if(def?.kind==='boss')return {title:'Prepare for the Fallen Knight',detail:'Improve your equipment, food, and mastery before the milestone battle.',button:'Review character',destination:'Character',priority:'upgrade'};
  const next=MONSTERS.filter(m=>!m.boss&&state.unlockedMonsterIds.includes(m.id)).sort((a,b)=>b.level-a.level)[0];
  return next?{title:'Push your combat level',detail:`${next.name} is your strongest unlocked target in ${next.zone}.`,button:'Choose a hunt',destination:'World',zoneId:next.zone,priority:'progress'}:{title:'Build your first supplies',detail:'Gather materials and craft your first upgrade.',button:'Open skills',destination:'Skills',priority:'upgrade'};
}

export function activityCycleSeconds(state:GameState){
  const target=state.activity?.targetId;
  const monster=MONSTERS.find(m=>m.id===target),gathering=GATHERING.find(g=>g.id===target);
  if(!monster)return gathering?.seconds??1;
  const stats=effectiveStats(state),expected=monster.attack*1.2+monster.defense*.8+monster.level*2.2;
  const speed=Math.max(.72,Math.min(1.5,stats.power/Math.max(1,expected)))*classCombatStyle(state.character!.classId).speedMultiplier;
  return monster.secondsPerKill/speed;
}
export function activityRate(state:GameState){
  const target=state.activity?.targetId;
  const monster=MONSTERS.find(m=>m.id===target),gathering=GATHERING.find(g=>g.id===target);
  const seconds=activityCycleSeconds(state);
  const actions=Math.floor(3600/seconds);
  return {actionsPerHour:actions,xpPerHour:actions*(monster?.xp??gathering?.xp??0),goldPerHour:monster?actions*monster.gold:0};
}
