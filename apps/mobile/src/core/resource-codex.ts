import {ITEMS} from '../content/items';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {COMBAT_COMPANIONS,COMPANION_SANCTUARY_CONFIG} from '../content/combat-companions';
import {COMPANION_MISSIONS,COMPANION_WEEKLY_CHALLENGES,COMPANION_MONTHLY_COMPLETION_REWARD} from '../../../../backend/src/server/companions/content';
import {itemInspectModel} from './item-inspect';
import {itemRarity,type ItemRarity} from './item-rarity';
import type {GameState} from './types';
import type {WorkingTowardDestination} from './working-toward';

export type ResourceCategory='All'|'Companions'|'Mining'|'Woodcutting'|'Fishing'|'Herbalism'|'Hunting'|'Gems'|'Combat'|'Crafting'|'Other';
export const RESOURCE_CATEGORIES:ResourceCategory[]=['All','Companions','Mining','Woodcutting','Fishing','Herbalism','Hunting','Gems','Combat','Crafting','Other'];
export type ResourceCodexEntry={id:string;name:string;category:Exclude<ResourceCategory,'All'>;rarity:ItemRarity;virtual:boolean;companionRelated:boolean};
export type ResourceCodexSource={title:string;detail:string;kind:'item'|'companion';destination?:WorkingTowardDestination;available?:boolean};
const SPECIAL_RESOURCES:ResourceCodexEntry[]=[
 {id:'essence',name:'Companion Essence',category:'Companions',rarity:'rare',virtual:true,companionRelated:true},
 {id:'bondstones',name:'Bondstones',category:'Companions',rarity:'epic',virtual:true,companionRelated:true},
 {id:'TRIAL_SANCTUARY_MATERIAL',name:'Trial Sanctuary Material',category:'Companions',rarity:'rare',virtual:true,companionRelated:true},
];
const resourceNames=new Map(ITEMS.map(item=>[item.id,item.name]));
const knownIds=new Set(resourceNames.keys());
const companionMaterialIds=(()=>{
 const ids=new Set<string>(['EVENT_BONDBLOOM','TRIAL_SANCTUARY_MATERIAL']);
 for(const companion of COMBAT_COMPANIONS){
  if(companion.ascensionMaterialId)ids.add(companion.ascensionMaterialId);
  for(const cost of companion.ascensionMaterialCosts??[])ids.add(cost.itemId);
 }
 for(const config of Object.values(COMPANION_SANCTUARY_CONFIG))if(config.materialId)ids.add(config.materialId);
 for(const mission of COMPANION_MISSIONS){
  for(const source of [mission.costs?.materials,mission.baseRewards?.materials,mission.bonusRewards?.materials]){
   for(const id of Object.keys(source??{}))ids.add(id);
  }
 }
 for(const challenge of COMPANION_WEEKLY_CHALLENGES)for(const id of Object.keys(challenge.rewards.materials??{}))ids.add(id);
 for(const id of Object.keys(COMPANION_MONTHLY_COMPLETION_REWARD.materials))ids.add(id);
 return ids;
})();
const gatheringSkill=new Map<string,string>();
for(const node of [...GATHERING,...HERB_NODES])if(!gatheringSkill.has(node.itemId))gatheringSkill.set(node.itemId,node.skillId);
const monsterItems=new Set(MONSTERS.flatMap(monster=>monster.drops.map(drop=>drop.itemId)));
const craftItems=new Set(RECIPES.map(recipe=>recipe.output.itemId));
function categoryFor(id:string,type:string):ResourceCodexEntry['category']{
 if(companionMaterialIds.has(id))return 'Companions';
 if(type==='gem')return 'Gems';
 const skill=gatheringSkill.get(id);
 if(skill==='mining'||skill==='woodcutting'||skill==='fishing'||skill==='herbalism'||skill==='hunting')return skill[0].toUpperCase()+skill.slice(1) as ResourceCodexEntry['category'];
 if(monsterItems.has(id))return 'Combat';
 if(craftItems.has(id))return 'Crafting';
 return 'Other';
}
const titleFromId=(id:string)=>id.toLowerCase().split('_').map(part=>part?part[0].toUpperCase()+part.slice(1):part).join(' ');
/** Single catalog for Inventory materials, gems, and companion-only currencies. No extra inventory slots. */
export function resourceCodexEntries():ResourceCodexEntry[]{
 const entries:ResourceCodexEntry[]=ITEMS.filter(item=>item.type==='material'||item.type==='gem').map(item=>({
  id:item.id,name:item.name,category:categoryFor(item.id,item.type),rarity:itemRarity(item),virtual:false,companionRelated:companionMaterialIds.has(item.id),
 }));
 for(const special of SPECIAL_RESOURCES)entries.push(special);
 // Backend companion reward materials may not yet be regular Inventory items.
 for(const id of companionMaterialIds)if(!knownIds.has(id)&&!SPECIAL_RESOURCES.some(row=>row.id===id))
  entries.push({id,name:titleFromId(id),category:'Companions',rarity:'common',virtual:true,companionRelated:true});
 return entries.sort((a,b)=>a.name.localeCompare(b.name));
}
export function resourceCodexQuantity(state:GameState,entry:ResourceCodexEntry){
 if(entry.id==='essence')return state.account.companionEssence??0;
 if(entry.id==='bondstones')return state.account.bondstones??0;
 const inventory=[...state.inventory.stacks,...state.bank.stacks].reduce((count,stack)=>count+(stack.itemId===entry.id?stack.quantity:0),0);
 return inventory+(state.account.companionMaterials?.[entry.id]??0);
}
export function resourceCodexUse(entry:ResourceCodexEntry){
 if(entry.id==='essence')return 'Companion training, ascension, techniques and Sanctuary upgrades.';
 if(entry.id==='bondstones')return 'Companion ascensions and Prestige Mastery.';
 if(entry.id==='TRIAL_SANCTUARY_MATERIAL')return 'Higher-tier companion ascensions and Sanctuary progression.';
 if(entry.companionRelated)return 'Companion ascensions, Sanctuary upgrades or expedition provisions. Check the relevant companion upgrade for exact costs.';
 if(entry.category==='Gems')return 'Equipment gem sockets and gem progression.';
 return 'Crafting, equipment upgrades, recipes or other progression.';
}
function companionSourcesFor(id:string):ResourceCodexSource[]{
 const sources:ResourceCodexSource[]=[];
 const add=(title:string,detail:string)=>{if(!sources.some(row=>row.title===title))sources.push({title,detail,kind:'companion'});};
 if(id==='essence'){
  add('Sanctuary Expeditions','Complete eligible missions for Companion Essence rewards.');
  add('Companion Trials','First-clear floors and monthly completion rewards grant Essence.');
  add('Weekly Companion Challenges','Complete rotating challenges for Essence.');
  add('Sanctuary Essence Basin','Claim the Essence generated by an upgraded Essence Basin.');
  add('Duplicate Companions','Duplicate companion rewards can convert to Essence.');
 }
 if(id==='bondstones'){
  add('Companion Trial bosses','First clears of qualifying boss floors, beginning at Floor 10.');
  add('Fallen Knight weekly rematch','A limited weekly Bondstone reward for eligible Fallen Knight rematch clears.');
  add('Monthly Trial completion','Finish the monthly trial track for its completion reward.');
  const challenges=COMPANION_WEEKLY_CHALLENGES.filter(row=>row.rewards.bondstones>0);
  if(challenges.length)add('Weekly Companion Challenges',challenges.map(row=>row.name).slice(0,4).join(' · ')+' (rotation-dependent).');
  const missions=COMPANION_MISSIONS.filter(row=>row.bondstoneEligible);
  if(missions.length)add('Eligible Sanctuary Expeditions',missions.map(row=>row.name).join(' · ')+' (chance-based).');
 }
 if(id==='TRIAL_SANCTUARY_MATERIAL'){
  add('Companion Trial bosses','Qualifying first-clear boss rewards.');
  add('Monthly Trial completion','Included in the monthly completion rewards.');
 }
 for(const mission of COMPANION_MISSIONS){
  const base=mission.baseRewards?.materials?.[id]??0,bonus=mission.bonusRewards?.materials?.[id]??0;
  if(base>0||bonus>0)add(mission.name,base>0?'Sanctuary Expedition reward.':'Bonus Sanctuary Expedition reward (chance-based).');
 }
 for(const challenge of COMPANION_WEEKLY_CHALLENGES){
  if((challenge.rewards.materials?.[id]??0)>0)add(challenge.name,'Weekly Companion Challenge reward (when in the active rotation).');
 }
 return sources;
}
export function resourceCodexSources(state:GameState,entry:ResourceCodexEntry):ResourceCodexSource[]{
 const sources:ResourceCodexSource[]=[];
 if(!entry.virtual){
  for(const source of itemInspectModel(state,entry.id).sources){
   sources.push({title:source.title,detail:source.detail,kind:'item',destination:source.navigation,available:source.availability?.canNavigate!==false&&source.availability?.status!=='info'});
  }
 }
 sources.push(...companionSourcesFor(entry.id));
 return sources.filter((source,index)=>sources.findIndex(other=>other.title===source.title&&other.detail===source.detail)===index);
}
