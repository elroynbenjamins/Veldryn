import {GATHERING,RECIPES,type Recipe} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import type {GameState,SkillId} from './types';
import {PROFESSION_MASTERY_BONUS_RANKS,masteryPointsForRank,professionMasteryRankProgress,professionMasteryView} from './profession-mastery-v40';
import type {WorkingTowardDestination} from './working-toward';
import {itemDef} from '../content/items';
import {WORLD_ZONES} from '../content/world-map';

export type SkillIdentityTone='accent'|'good'|'info'|'special'|'warning'|'bad';
export interface SkillIdentity{label:string;descriptor:string;tone:SkillIdentityTone}
const IDENTITIES:Partial<Record<SkillId,SkillIdentity>>={
 mining:{label:'EXTRACTION',descriptor:'Ore, seams and heavy-tool progression',tone:'info'},
 woodcutting:{label:'FORESTRY',descriptor:'Timber routes and hatchet progression',tone:'good'},
 fishing:{label:'ANGLING',descriptor:'Regional catches and rod progression',tone:'special'},
 herbalism:{label:'FORAGING',descriptor:'Hand-picked regional herbs and reagents',tone:'good'},
 smithing:{label:'FORGECRAFT',descriptor:'Processing, tools and equipment forging',tone:'accent'},
 cooking:{label:'PROVISIONING',descriptor:'Food batches and restorative preparation',tone:'warning'},
 alchemy:{label:'BREWCRAFT',descriptor:'Reserved batches and combat preparations',tone:'special'},
 hunting:{label:'HUNTSMANSHIP',descriptor:'Combat-linked field mastery',tone:'bad'},
 exploration:{label:'DISCOVERY',descriptor:'Regional routes and encounter discovery',tone:'info'},
 tailoring:{label:'TEXTILECRAFT',descriptor:'Clothwork and cross-skill techniques',tone:'accent'},
 enchanting:{label:'ARCANA',descriptor:'Gem-setting and magical craft knowledge',tone:'special'},
 faith:{label:'DEVOTION',descriptor:'Holy Water practice and active blessings',tone:'special'},
};
export function skillIdentity(skillId:SkillId):SkillIdentity{return IDENTITIES[skillId]??{label:'SKILL',descriptor:'Long-term character progression',tone:'accent'}}

export interface ProfessionMasteryActionDefinition{actionId:string;name:string;skillId:SkillId;kind:'gathering'|'crafting';yieldRelevant:boolean;speedRelevant:boolean;regionId?:string;regionLabel?:string;destination:WorkingTowardDestination}
function masteryRegionLabel(regionId:string){return WORLD_ZONES.find(row=>row.id===regionId)?.name??regionId}
export function professionMasteryActionDefinition(actionId:string):ProfessionMasteryActionDefinition|undefined{
 const node=[...GATHERING,...HERB_NODES].find(row=>row.id===actionId);
 if(node)return {actionId,name:node.name,skillId:node.skillId as SkillId,kind:'gathering',yieldRelevant:true,speedRelevant:true,regionId:node.zoneId,regionLabel:masteryRegionLabel(node.zoneId),destination:{kind:'skills',skillId:node.skillId as SkillId,mode:'gathering',actionId:node.id,regionId:node.zoneId,button:'Open '+node.name,detail:'Repeat '+node.name+' to build action mastery.'}};
 const recipe=RECIPES.find(row=>row.id===actionId);
 if(!recipe)return undefined;
 const output=itemDef(recipe.output.itemId),recipeRegion=recipe.v33Region?.trim()||undefined;
 return {actionId,name:recipe.name,skillId:recipe.skillId as SkillId,kind:'crafting',yieldRelevant:output.type!=='gear'&&output.type!=='tool',speedRelevant:recipe.skillId==='alchemy'||output.type==='gear',regionId:recipeRegion,regionLabel:recipeRegion?masteryRegionLabel(recipeRegion):undefined,destination:{kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',recipeId:recipe.id,button:'Open '+recipe.name,detail:'Craft '+recipe.name+' to build recipe mastery.'}};
}
export function professionMasteryRelevantBonusSteps(actionId:string){
 const definition=professionMasteryActionDefinition(actionId);if(!definition)return [];
 return PROFESSION_MASTERY_BONUS_RANKS.filter(row=>row.kind==='xp'||row.kind==='yield'&&definition.yieldRelevant||row.kind==='speed'&&definition.speedRelevant);
}

export interface ProfessionMasteryActionView{
id:string;name:string;skillId:SkillId;kind:'gathering'|'crafting';level:number;rank:number;points:number;maxRank:number;progress:number;pointsIntoRank:number;pointsForNextRank:number;mastered:boolean;xpBonusBps:number;yieldBonusBps:number;speedBonusBps:number;yieldRelevant:boolean;speedRelevant:boolean;nextBonus?:typeof PROFESSION_MASTERY_BONUS_RANKS[number];destination:WorkingTowardDestination;
}
function relevantRecipe(state:GameState,recipe:Recipe){return !recipe.noviceSetId&&(!recipe.classId||recipe.classId===state.character?.classId)}
function nextRelevantBonus(rank:number,yieldRelevant:boolean,speedRelevant:boolean){return PROFESSION_MASTERY_BONUS_RANKS.find(row=>row.rank>rank&&(row.kind==='xp'||row.kind==='yield'&&yieldRelevant||row.kind==='speed'&&speedRelevant))}
export function professionMasteryActionsForSkill(state:GameState,skillId:SkillId):ProfessionMasteryActionView[]{
 const rows:ProfessionMasteryActionView[]=[];
 for(const node of [...GATHERING,...HERB_NODES].filter(row=>row.skillId===skillId)){
  const progress=professionMasteryRankProgress(node.id,state.account.professionMasteryByAction?.[node.id]);
  rows.push({...progress,id:node.id,name:node.name,skillId,kind:'gathering',level:node.unlockLevel,yieldRelevant:true,speedRelevant:true,nextBonus:nextRelevantBonus(progress.rank,true,true),destination:{kind:'skills',skillId,mode:'gathering',actionId:node.id,regionId:node.zoneId,button:'Open '+node.name,detail:'Repeat '+node.name+' to build action mastery.'}});
 }
 for(const recipe of RECIPES.filter(row=>row.skillId===skillId&&relevantRecipe(state,row))){
  const progress=professionMasteryRankProgress(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
  const output=itemDef(recipe.output.itemId),yieldRelevant=output.type!=='gear'&&output.type!=='tool',speedRelevant=recipe.skillId==='alchemy'||output.type==='gear';
  rows.push({...progress,id:recipe.id,name:recipe.name,skillId,kind:'crafting',level:recipe.level,yieldRelevant,speedRelevant,nextBonus:nextRelevantBonus(progress.rank,yieldRelevant,speedRelevant),destination:{kind:'skills',skillId,mode:'crafting',recipeId:recipe.id,button:'Open '+recipe.name,detail:'Craft '+recipe.name+' to build recipe mastery.'}});
 }
 return rows.sort((a,b)=>b.rank-a.rank||b.points-a.points||a.level-b.level||a.name.localeCompare(b.name));
}
export interface ProfessionMasteryAccountRecord extends ProfessionMasteryActionDefinition{
 points:number;rank:number;mastered:boolean;progress:number;xpBonusBps:number;yieldBonusBps:number;speedBonusBps:number;
}
export function professionMasteryAccountRecords(state:GameState):ProfessionMasteryAccountRecord[]{
 const rows:ProfessionMasteryAccountRecord[]=[];
 for(const [actionId,record] of Object.entries(state.account.professionMasteryByAction??{})){
  if(!record.points)continue;
  const definition=professionMasteryActionDefinition(actionId);if(!definition)continue;
  const view=professionMasteryRankProgress(actionId,record);
  rows.push({...definition,points:view.points,rank:view.rank,mastered:view.mastered,progress:view.progress,xpBonusBps:view.xpBonusBps,yieldBonusBps:view.yieldBonusBps,speedBonusBps:view.speedBonusBps});
 }
 return rows.sort((a,b)=>b.rank-a.rank||b.points-a.points||a.name.localeCompare(b.name));
}
export function professionMasteryMasteredRecords(state:GameState,skillId?:SkillId):ProfessionMasteryAccountRecord[]{
 const rows=professionMasteryAccountRecords(state).filter(row=>row.mastered&&(!skillId||row.skillId===skillId));
 return rows.sort((a,b)=>a.name.localeCompare(b.name));
}
export type ProfessionMasteryDiscoverySort='closest_r50'|'highest_rank'|'name';
export type ProfessionMasteryDiscoveryStatus='all'|'bonus_left'|'mastered';
export interface ProfessionMasteryDiscoveryOptions{sort?:ProfessionMasteryDiscoverySort;status?:ProfessionMasteryDiscoveryStatus;skillId?:SkillId;regionId?:string}
export interface ProfessionMasteryDiscoveryRecord extends ProfessionMasteryAccountRecord{
 pointsToR50:number;r50Progress:number;remainingBonusCount:number;pointsToNextBonus:number;nextBonus?:typeof PROFESSION_MASTERY_BONUS_RANKS[number];
}
function masteryDiscoveryRecord(row:ProfessionMasteryAccountRecord):ProfessionMasteryDiscoveryRecord{
 const remaining=professionMasteryRelevantBonusSteps(row.actionId).filter(step=>step.rank>row.rank),nextBonus=remaining[0],r50Target=masteryPointsForRank(50);
 return {...row,pointsToR50:Math.max(0,r50Target-row.points),r50Progress:Math.max(0,Math.min(1,row.points/Math.max(1,r50Target))),remainingBonusCount:remaining.length,pointsToNextBonus:nextBonus?Math.max(0,masteryPointsForRank(nextBonus.rank)-row.points):0,nextBonus};
}
export function professionMasteryDiscoveryRecords(state:GameState,options:ProfessionMasteryDiscoveryOptions={}):ProfessionMasteryDiscoveryRecord[]{
 const {sort='closest_r50',status='all',skillId,regionId}=options;
 const rows=professionMasteryAccountRecords(state).map(masteryDiscoveryRecord).filter(row=>(status==='bonus_left'?row.remainingBonusCount>0:status==='mastered'?row.mastered:true)&&(!skillId||row.skillId===skillId)&&(!regionId||row.regionId===regionId));
 if(sort==='highest_rank')return rows.sort((a,b)=>b.rank-a.rank||b.points-a.points||a.name.localeCompare(b.name));
 if(sort==='name')return rows.sort((a,b)=>a.name.localeCompare(b.name)||b.rank-a.rank);
 return rows.sort((a,b)=>Number(a.mastered)-Number(b.mastered)||a.pointsToR50-b.pointsToR50||b.rank-a.rank||a.name.localeCompare(b.name));
}
export function professionMasteryDiscoveryFilters(state:GameState){
 const rows=professionMasteryAccountRecords(state),skills=new Map<SkillId,string>(),regions=new Map<string,string>();
 for(const row of rows){skills.set(row.skillId,skillIdentity(row.skillId).label);if(row.regionId)regions.set(row.regionId,row.regionLabel??row.regionId)}
 return {skills:[...skills.entries()].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label)),regions:[...regions.entries()].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label))};
}
export function professionMasteryRecommendedTarget(state:GameState){
 const candidates=professionMasteryDiscoveryRecords(state,{status:'all'}).filter(row=>!row.mastered);
 if(!candidates.length)return undefined;
 const ranked=[...candidates].sort((a,b)=>{const aNeed=a.nextBonus?a.pointsToNextBonus:a.pointsToR50,bNeed=b.nextBonus?b.pointsToNextBonus:b.pointsToR50;return aNeed-bNeed||b.rank-a.rank||b.points-a.points||a.name.localeCompare(b.name)});
 const row=ranked[0],targetRank=row.nextBonus?.rank??50,pointsToTarget=row.nextBonus?row.pointsToNextBonus:row.pointsToR50;
 return {...row,targetRank,pointsToTarget,targetLabel:row.nextBonus?.label??'R50 Mastered Record',reason:row.nextBonus?'Nearest meaningful bonus from your existing mastery progress.':'Nearest R50 prestige finish from your existing mastery progress.'};
}
export function professionMasteryHallSummary(state:GameState){
 const rows=professionMasteryAccountRecords(state),bySkill=new Map<SkillId,{skillId:SkillId;label:string;mastered:number;trained:number;bestRank:number}>();
 for(const row of rows){const current=bySkill.get(row.skillId)??{skillId:row.skillId,label:skillIdentity(row.skillId).label,mastered:0,trained:0,bestRank:0};current.trained++;current.bestRank=Math.max(current.bestRank,row.rank);if(row.mastered)current.mastered++;bySkill.set(row.skillId,current)}
 return {rows,trained:rows.length,rank10:rows.filter(row=>row.rank>=10).length,rank30:rows.filter(row=>row.rank>=30).length,mastered:rows.filter(row=>row.mastered).length,totalPoints:rows.reduce((sum,row)=>sum+row.points,0),bestRank:rows.reduce((max,row)=>Math.max(max,row.rank),0),skills:[...bySkill.values()].sort((a,b)=>b.mastered-a.mastered||b.bestRank-a.bestRank||a.label.localeCompare(b.label))};
}
export function professionMasterySkillSummary(state:GameState,skillId:SkillId){
 const rows=professionMasteryActionsForSkill(state,skillId),totalPoints=rows.reduce((sum,row)=>sum+row.points,0),highestRank=rows.reduce((max,row)=>Math.max(max,row.rank),0),mastered=rows.filter(row=>row.mastered).length,trained=rows.filter(row=>row.points>0).length;
 return {rows,totalPoints,highestRank,mastered,trained,total:rows.length,roadmap:PROFESSION_MASTERY_BONUS_RANKS};
}
export function professionMasteryActiveBonusText(state:GameState,actionId:string,options:{yieldRelevant?:boolean;speedRelevant?:boolean}={}){
 const view=professionMasteryView(actionId,state.account.professionMasteryByAction?.[actionId]),parts:string[]=[],yieldRelevant=options.yieldRelevant!==false,speedRelevant=options.speedRelevant!==false;
 if(view.xpBonusBps)parts.push('+'+(view.xpBonusBps/100).toFixed(0)+'% XP');
 if(view.yieldBonusBps&&yieldRelevant)parts.push('+'+(view.yieldBonusBps/100).toFixed(0)+'% yield');
 if(view.speedBonusBps&&speedRelevant)parts.push('+'+(view.speedBonusBps/100).toFixed(0)+'% speed');
 return parts.length?parts.join(' · '):'No active mastery bonus yet';
}