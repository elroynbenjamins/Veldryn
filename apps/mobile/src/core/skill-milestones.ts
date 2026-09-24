import {GATHERING,RECIPES,type Recipe} from '../content/skills';
import {HERB_NODES,HERBALISM_METHODS} from '../content/herbalism';
import {GATHERING_TOOLS} from '../content/gathering-tools';
import {MONSTERS} from '../content/monsters';
import {FAITH_BLESSINGS,FAITH_TIERS} from '../content/faith';
import {CROSS_SKILL_DISCOVERIES_V45,crossSkillViews,newCrossSkillState} from './cross-skill-discoveries-v45';
import {faithLevel} from './faith';
import {progressWithinLevel} from './progression';
import type {GameState,SkillId} from './types';
import type {WorkingTowardDestination} from './working-toward';
import {ENCHANTING_EXTRACTION_THRESHOLDS_V1,GEM_COMBINE_COSTS_V1,GEM_REFINE_COSTS_V1,GEM_RESEARCH_V1} from './gem-progression-v1';
import {GEM_GRADE_LABEL_V1,type MobileGemGradeV1} from '../content/gems-v1';

export type SkillMilestoneKind='gathering_node'|'tool'|'recipe'|'method'|'service'|'faith_practice'|'faith_blessing'|'cross_skill';
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
export const skillMilestoneCategory=(kind:SkillMilestoneKind)=>kind==='gathering_node'?'GATHERING':kind==='tool'?'TOOL TIER':kind==='recipe'?'RECIPE':kind==='method'?'METHOD':kind==='service'?'SERVICE':kind==='faith_practice'?'PRACTICE':kind==='faith_blessing'?'BLESSING':'CROSS-SKILL';

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
  for(const tool of GATHERING_TOOLS.filter(row=>row.skillId===skillId)){
   const blueprintSource=tool.blueprint?MONSTERS.find(monster=>monster.id===tool.blueprint!.sourceMonsterId):undefined;
   rows.push({
    id:'tool:'+tool.id,kind:'tool',level:tool.unlockLevel,title:tool.name,category:'TOOL TIER',
    detail:'Tier '+tool.tier+' · Level '+tool.requiredCharacterLevel+' + '+pretty(skillId)+' '+tool.unlockLevel+' · Smithing '+tool.recipe.level+(tool.blueprint?' · blueprint: '+(blueprintSource?.name??tool.blueprint.sourceMonsterId):' · recipe known'),
    destination:{kind:'skills',skillId:'smithing',mode:'crafting',recipeId:'CRAFT_'+tool.id,button:'Craft '+tool.name,detail:'Open the Smithing recipe for '+tool.name+'.'},
   });
  }
 }
 if(skillId==='herbalism'){
  for(const method of HERBALISM_METHODS.filter(row=>row.id!=='balanced'))rows.push({
   id:'herbalism-method:'+method.id,kind:'method',level:method.unlockLevel,title:method.name,category:'HARVEST METHOD',detail:method.description,destination:milestoneDestination('herbalism'),
  });
  for(const [level,bonus] of [[25,10],[50,20],[75,35],[100,50]] as const)rows.push({
   id:'herbalism-insight:'+level,kind:'service',level,title:level===100?'Master Botanist':'Field Insight '+(level===25?'I':level===50?'II':'III'),category:'BOTANICAL INSIGHT',detail:`Rare botanical essence chance +${bonus}% relative from Herbalism knowledge.`,destination:milestoneDestination('herbalism'),
  });
 }
 if(craftingIds.has(skillId)){
  for(const recipe of RECIPES.filter(row=>row.skillId===skillId&&!row.noviceSetId&&classRelevant(state,row)))rows.push({
   id:'recipe:'+recipe.id,kind:'recipe',level:recipe.level,title:recipe.name,category:'RECIPE',
   detail:(recipe.repeatableTraining?'Training recipe':'Crafting recipe')+(recipe.characterLevel?' · character Lv '+recipe.characterLevel:''),
   destination:milestoneDestination(skillId,recipe.id),
  });
 }
 if(skillId==='enchanting'){
  rows.push({id:'enchant-research',kind:'service',level:GEM_RESEARCH_V1.level,title:'Effect Gem Research',category:'RESEARCH',detail:`Study a found unrefined Effect Gem family for ${GEM_RESEARCH_V1.dust} Gem Dust + ${GEM_RESEARCH_V1.gold.toLocaleString()} Gold to permanently discover its combine recipe.`,destination:milestoneDestination('enchanting')});
  for(const tier of ENCHANTING_EXTRACTION_THRESHOLDS_V1)rows.push({id:'enchant-extraction:'+tier.level,kind:'service',level:tier.level,title:tier.label.split(' · ')[0],category:'EXTRACTION',detail:tier.label,destination:milestoneDestination('enchanting')});
  for(const grade of [1,2,3,4,5] as MobileGemGradeV1[]){
   const cost=GEM_REFINE_COSTS_V1[grade];
   rows.push({id:'enchant-refine:g'+grade,kind:'recipe',level:cost.level,title:'Refine Grade '+grade+' gems',category:'REFINEMENT',
    detail:`Unrefined drops can be turned into ${GEM_GRADE_LABEL_V1[grade]} socketable gems · +${cost.xp.toLocaleString()} base XP`,
    destination:milestoneDestination('enchanting')});
  }
  for(const fromGrade of [1,2,3,4] as const){
   const cost=GEM_COMBINE_COSTS_V1[fromGrade];
   rows.push({id:'enchant-combine:g'+fromGrade,kind:'recipe',level:cost.level,title:`Combine G${fromGrade} → G${cost.to}`,category:'GEM COMBINE',
    detail:`Combine three matching ${GEM_GRADE_LABEL_V1[fromGrade]} gems into one ${GEM_GRADE_LABEL_V1[cost.to]} gem · +${cost.xp.toLocaleString()} base XP`,
    destination:milestoneDestination('enchanting')});
  }
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


export interface SkillTrainingFocus{
 skillId:SkillId;
 skillName:string;
 currentLevel:number;
 nextLevel:number;
 levelsAway:number;
 currentLevelProgressPct:number;
 milestoneCount:number;
 milestoneTitles:string[];
}

export function skillTrainingFocus(state:GameState):SkillTrainingFocus|undefined{
 const candidates=state.skills.flatMap(skill=>{
  if(skill.level>=100)return [];
  const overview=skillMilestoneOverview(state,skill.skillId);
  if(overview.nextLevel===undefined||!overview.next.length)return [];
  const progress=progressWithinLevel(skill.xp,skill.level),ratio=Math.min(1,progress.current/Math.max(1,progress.need));
  return [{
   skillId:skill.skillId,
   skillName:pretty(skill.skillId),
   currentLevel:overview.currentLevel,
   nextLevel:overview.nextLevel,
   levelsAway:Math.max(1,overview.nextLevel-overview.currentLevel),
   currentLevelProgressPct:Math.round(ratio*100),
   milestoneCount:overview.next.length,
   milestoneTitles:overview.next.map(row=>row.title),
  }];
 });
 return candidates.sort((a,b)=>a.levelsAway-b.levelsAway||b.currentLevelProgressPct-a.currentLevelProgressPct||a.nextLevel-b.nextLevel||a.skillName.localeCompare(b.skillName))[0];
}
