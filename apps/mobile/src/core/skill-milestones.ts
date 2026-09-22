import {GATHERING,RECIPES,type Recipe} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {GATHERING_TOOLS} from '../content/gathering-tools';
import {FAITH_BLESSINGS,FAITH_TIERS} from '../content/faith';
import {CROSS_SKILL_DISCOVERIES_V45,crossSkillViews,newCrossSkillState} from './cross-skill-discoveries-v45';
import {faithLevel} from './faith';
import type {GameState,SkillId} from './types';
import type {WorkingTowardDestination} from './working-toward';

export type SkillMilestoneKind='gathering_node'|'tool'|'recipe'|'faith_practice'|'faith_blessing'|'cross_skill';
export interface SkillMilestone{
 id:string;
 kind:SkillMilestoneKind;
 level:number;
 title:string;
 detail:string;
 category:string;
 destination?:WorkingTowardDestination;
}
export interface SkillMilestoneOverview{
 currentLevel:number;
 latestLevel?:number;
 latest:SkillMilestone[];
 nextLevel?:number;
 next:SkillMilestone[];
}
const gatheringIds=new Set<SkillId>(['mining','woodcutting','fishing','herbalism']);
const craftingIds=new Set<SkillId>(['smithing','cooking','alchemy','tailoring','enchanting']);
const pretty=(value:string)=>value.replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
const classRelevant=(state:GameState,recipe:Recipe)=>!recipe.classId||recipe.classId===state.character?.classId;
export const skillMilestoneCategory=(kind:SkillMilestoneKind)=>kind==='gathering_node'?'GATHERING':kind==='tool'?'TOOL TIER':kind==='recipe'?'RECIPE':kind==='faith_practice'?'PRACTICE':kind==='faith_blessing'?'BLESSING':'CROSS-SKILL';

function skillMode(skillId:string):'gathering'|'crafting'|'faith'|undefined{
 if(skillId==='faith')return 'faith';
 if(gatheringIds.has(skillId as SkillId))return 'gathering';
 if(craftingIds.has(skillId as SkillId))return 'crafting';
 return undefined;
}
function crossState(state:GameState){
 const accountId=state.account.crossSkillState?.accountId??state.account.journalState?.accountId??('account:'+state.createdAtMs);
 return state.account.crossSkillState??newCrossSkillState(accountId);
}
function milestoneDestination(skillId:SkillId,recipeId?:string):WorkingTowardDestination|undefined{
 const mode=skillMode(skillId);if(!mode)return undefined;
 return {kind:'skills',skillId,mode,...(recipeId?{recipeId}:{}),button:'Open '+pretty(skillId),detail:'Open this skill milestone.'};
}

export function skillMilestones(state:GameState,skillId:SkillId):SkillMilestone[]{
 const rows:SkillMilestone[]=[];
 if(gatheringIds.has(skillId)){
  for(const node of [...GATHERING,...HERB_NODES].filter(row=>row.skillId===skillId))rows.push({
   id:'node:'+node.id,kind:'gathering_node',level:node.unlockLevel,title:node.name,category:'GATHERING',
   detail:'New '+pretty(skillId)+' activity · '+node.zoneId.replace(/_/g,' '),
   destination:{kind:'skills',skillId,mode:'gathering',actionId:node.id,regionId:node.zoneId,button:'Open '+node.name,detail:'Train at '+node.name+'.'},
  });
  for(const tool of GATHERING_TOOLS.filter(row=>row.skillId===skillId))rows.push({
   id:'tool:'+tool.id,kind:'tool',level:tool.unlockLevel,title:tool.name,category:'TOOL TIER',
   detail:'Tier '+tool.tier+' tool can now be equipped · craft at Smithing '+tool.recipe.level,
   destination:{kind:'skills',skillId:'smithing',mode:'crafting',recipeId:'CRAFT_'+tool.id,button:'Craft '+tool.name,detail:'Open the Smithing recipe for '+tool.name+'.'},
  });
 }
 if(craftingIds.has(skillId)){
  for(const recipe of RECIPES.filter(row=>row.skillId===skillId&&!row.noviceSetId&&classRelevant(state,row)))rows.push({
   id:'recipe:'+recipe.id,kind:'recipe',level:recipe.level,title:recipe.name,category:'RECIPE',
   detail:(recipe.repeatableTraining?'Training recipe':'Crafting recipe')+(recipe.characterLevel?' · character Lv '+recipe.characterLevel:''),
   destination:milestoneDestination(skillId,recipe.id),
  });
 }
 if(skillId==='faith'){
  for(const tier of FAITH_TIERS)rows.push({id:'faith-tier:'+tier.id,kind:'faith_practice',level:tier.level,title:tier.name,category:'PRACTICE',detail:tier.water+' Holy Water · '+tier.xp.toLocaleString()+' base Faith XP',destination:milestoneDestination('faith')});
  for(const blessing of FAITH_BLESSINGS)rows.push({id:'faith-blessing:'+blessing.id,kind:'faith_blessing',level:blessing.level,title:blessing.name,category:'BLESSING',detail:'+'+Math.round(blessing.bonus*100)+'% '+pretty(blessing.family),destination:milestoneDestination('faith')});
 }
 if(state.character){
  const levels=Object.fromEntries(state.skills.map(row=>[row.skillId,row.skillId==='faith'?faithLevel(state):row.level]));
  const views=crossSkillViews(crossState(state),state.character.id,{skillLevels:levels});
  for(const view of views){
   const requirement=view.requirements.find(row=>row.skillId===skillId);if(!requirement)continue;
   const other=view.requirements.filter(row=>row.skillId!==skillId);
   const nextOther=other.find(row=>!row.complete);
   const destination=nextOther?milestoneDestination(nextOther.skillId as SkillId):milestoneDestination(skillId);
   rows.push({
    id:'cross:'+view.definition.id,kind:'cross_skill',level:requirement.level,title:view.definition.name,category:'CROSS-SKILL',
    detail:(view.unlocked?'Discovered · ':view.complete?'Ready to discover · ':nextOther?'Needs '+nextOther.skillName+' '+nextOther.level+' · ':'')+'Unlock: '+view.definition.reward.label,
    destination,
   });
  }
 }
 return rows.sort((a,b)=>a.level-b.level||a.category.localeCompare(b.category)||a.title.localeCompare(b.title));
}

export function skillMilestoneOverview(state:GameState,skillId:SkillId):SkillMilestoneOverview{
 const currentLevel=skillId==='faith'?faithLevel(state):(state.skills.find(row=>row.skillId===skillId)?.level??1),rows=skillMilestones(state,skillId);
 const past=rows.filter(row=>row.level<=currentLevel),future=rows.filter(row=>row.level>currentLevel);
 const latestLevel=past.length?Math.max(...past.map(row=>row.level)):undefined,nextLevel=future.length?Math.min(...future.map(row=>row.level)):undefined;
 return {currentLevel,latestLevel,latest:latestLevel===undefined?[]:past.filter(row=>row.level===latestLevel),nextLevel,next:nextLevel===undefined?[]:future.filter(row=>row.level===nextLevel)};
}
export function skillMilestonesBetween(state:GameState,skillId:SkillId,beforeLevel:number,afterLevel:number){
 return skillMilestones(state,skillId).filter(row=>row.level>beforeLevel&&row.level<=afterLevel);
}
export function newlyUnlockedCrossSkillNames(before:GameState,after:GameState,skillId:SkillId){
 if(!before.character||!after.character||before.character.id!==after.character.id)return [];
 const relevant=new Set(CROSS_SKILL_DISCOVERIES_V45.filter(row=>row.requirements.some(req=>req.skillId===skillId)).map(row=>row.id));
 const beforeMap=before.account.crossSkillState?.unlockedByCharacter[before.character.id]??{},afterMap=after.account.crossSkillState?.unlockedByCharacter[after.character.id]??{};
 return CROSS_SKILL_DISCOVERIES_V45.filter(row=>relevant.has(row.id)&&beforeMap[row.id]===undefined&&afterMap[row.id]!==undefined).map(row=>row.name);
}
