import {GATHERING,RECIPES,type Recipe} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import type {GameState,SkillId} from './types';
import {PROFESSION_MASTERY_BONUS_RANKS,nextProfessionMasteryBonus,professionMasteryRankProgress,professionMasteryView} from './profession-mastery-v40';
import type {WorkingTowardDestination} from './working-toward';
import {itemDef} from '../content/items';

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

export interface ProfessionMasteryActionView{
id:string;name:string;skillId:SkillId;kind:'gathering'|'crafting';level:number;rank:number;points:number;maxRank:number;progress:number;pointsIntoRank:number;pointsForNextRank:number;mastered:boolean;xpBonusBps:number;yieldBonusBps:number;speedBonusBps:number;yieldRelevant:boolean;speedRelevant:boolean;nextBonus?:typeof PROFESSION_MASTERY_BONUS_RANKS[number];destination:WorkingTowardDestination;
}
function relevantRecipe(state:GameState,recipe:Recipe){return !recipe.noviceSetId&&(!recipe.classId||recipe.classId===state.character?.classId)}
export function professionMasteryActionsForSkill(state:GameState,skillId:SkillId):ProfessionMasteryActionView[]{
 const rows:ProfessionMasteryActionView[]=[];
 for(const node of [...GATHERING,...HERB_NODES].filter(row=>row.skillId===skillId)){
  const progress=professionMasteryRankProgress(node.id,state.account.professionMasteryByAction?.[node.id]);
  rows.push({...progress,id:node.id,name:node.name,skillId,kind:'gathering',level:node.unlockLevel,yieldRelevant:true,speedRelevant:true,nextBonus:nextProfessionMasteryBonus(progress.rank),destination:{kind:'skills',skillId,mode:'gathering',actionId:node.id,regionId:node.zoneId,button:'Open '+node.name,detail:'Repeat '+node.name+' to build action mastery.'}});
 }
 for(const recipe of RECIPES.filter(row=>row.skillId===skillId&&relevantRecipe(state,row))){
  const progress=professionMasteryRankProgress(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
  const output=itemDef(recipe.output.itemId),yieldRelevant=output.type!=='gear'&&output.type!=='tool',speedRelevant=recipe.skillId==='alchemy'||output.type==='gear';
  rows.push({...progress,id:recipe.id,name:recipe.name,skillId,kind:'crafting',level:recipe.level,yieldRelevant,speedRelevant,nextBonus:nextProfessionMasteryBonus(progress.rank),destination:{kind:'skills',skillId,mode:'crafting',recipeId:recipe.id,button:'Open '+recipe.name,detail:'Craft '+recipe.name+' to build recipe mastery.'}});
 }
 return rows.sort((a,b)=>b.rank-a.rank||b.points-a.points||a.level-b.level||a.name.localeCompare(b.name));
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