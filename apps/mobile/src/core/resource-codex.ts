import {ITEMS} from '../content/items';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {COMBAT_COMPANIONS,COMPANION_SANCTUARY_CONFIG} from '../content/combat-companions';
import {COMPANION_MISSIONS,COMPANION_WEEKLY_CHALLENGES,COMPANION_MONTHLY_COMPLETION_REWARD} from '../../../../backend/src/server/companions/content';
import {workingTowardItemSourceEntries} from './working-toward';
import {itemRarity,type ItemRarity} from './item-rarity';
import type {GameState} from './types';
import type {WorkingTowardDestination} from './working-toward';

export type ResourceCategory='All'|'Companions'|'Mining'|'Woodcutting'|'Fishing'|'Herbalism'|'Hunting'|'Gems'|'Combat'|'Crafting'|'Other';
export const RESOURCE_CATEGORIES:ResourceCategory[]=['All','Companions','Mining','Woodcutting','Fishing','Herbalism','Hunting','Gems','Combat','Crafting','Other'];
export type ResourceCodexEntry={id:string;name:string;category:Exclude<ResourceCategory,'All'>;rarity:ItemRarity;virtual:boolean;companionRelated:boolean};
export type ResourceCodexSource={title:string;detail:string;kind:'item'|'companion';destination?:WorkingTowardDestination;available?:boolean;status?:'ready'|'travel'|'locked'|'info';availabilityDetail?:string};
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
 if(type==='gem')return 'Gems';
 const skill=gatheringSkill.get(id);
 if(skill==='mining'||skill==='woodcutting'||skill==='fishing'||skill==='herbalism'||skill==='hunting')return skill[0].toUpperCase()+skill.slice(1) as ResourceCodexEntry['category'];
 if(monsterItems.has(id))return 'Combat';
 if(craftItems.has(id))return 'Crafting';
 return 'Other';
}
const titleFromId=(id:string)=>id.toLowerCase().split('_').map(part=>part?part[0].toUpperCase()+part.slice(1):part).join(' ');
/** Build the immutable catalog once. Gameplay updates never need to rebuild its names or categories. */
const CATALOG:readonly ResourceCodexEntry[]=(()=>{
 const entries:ResourceCodexEntry[]=ITEMS.filter(item=>item.type==='material'||item.type==='gem').map(item=>({
  id:item.id,name:item.name,category:categoryFor(item.id,item.type),rarity:itemRarity(item),virtual:false,companionRelated:companionMaterialIds.has(item.id),
 }));
 for(const special of SPECIAL_RESOURCES)entries.push(special);
 // Backend companion reward materials may not yet be regular Inventory items.
 for(const id of companionMaterialIds)if(!knownIds.has(id)&&!SPECIAL_RESOURCES.some(row=>row.id===id))
  entries.push({id,name:titleFromId(id),category:'Companions',rarity:'common',virtual:true,companionRelated:true});
 return Object.freeze(entries.sort((a,b)=>a.name.localeCompare(b.name)).map(entry=>Object.freeze(entry)));
})();
export function resourceCodexEntries():readonly ResourceCodexEntry[]{return CATALOG;}
/** Companion materials stay discoverable in their natural type and the companion filter. */
export function resourceCodexMatchesCategory(entry:ResourceCodexEntry,category:ResourceCategory){
 return category==='All'||category==='Companions'&&entry.companionRelated||entry.category===category;
}
const ENTRIES_BY_CATEGORY=new Map<ResourceCategory,readonly ResourceCodexEntry[]>(RESOURCE_CATEGORIES.map(category=>[category,Object.freeze(CATALOG.filter(entry=>resourceCodexMatchesCategory(entry,category)))]));
export function resourceCodexCategoryEntries(category:ResourceCategory):readonly ResourceCodexEntry[]{return ENTRIES_BY_CATEGORY.get(category)??CATALOG;}
export function resourceCodexQuantity(state:GameState,entry:ResourceCodexEntry){
 if(entry.id==='essence')return state.account.companionEssence??0;
 if(entry.id==='bondstones')return state.account.bondstones??0;
 const inventory=[...state.inventory.stacks,...state.bank.stacks].reduce((count,stack)=>count+(stack.itemId===entry.id?stack.quantity:0),0);
 return inventory+(state.account.companionMaterials?.[entry.id]??0);
}
/** Source-of-truth companion uses, computed once alongside the Codex catalog. */
const companionUses=new Map<string,Set<string>>();
const recordUse=(id:string,description:string)=>{
 const uses=companionUses.get(id)??new Set<string>();
 uses.add(description);
 companionUses.set(id,uses);
};
for(const companion of COMBAT_COMPANIONS){
 if(companion.ascensionMaterialId)recordUse(companion.ascensionMaterialId,companion.name+' ascensions');
 for(const cost of companion.ascensionMaterialCosts??[])
  recordUse(cost.itemId,companion.name+(cost.tier==='mastery'?' Mastery':' Ascension '+cost.tier));
}
for(const [upgrade,config] of Object.entries(COMPANION_SANCTUARY_CONFIG)){
 if(config.materialId)recordUse(config.materialId,titleFromId(upgrade.replace(/([a-z])([A-Z])/g,'$1_$2'))+' upgrade');
}
for(const mission of COMPANION_MISSIONS){
 for(const id of Object.keys(mission.costs?.materials??{}))
  recordUse(id,'Sanctuary Expedition provisions');
}
export function resourceCodexUse(entry:ResourceCodexEntry){
 if(entry.id==='essence')return 'Companion training, ascension, techniques and Sanctuary upgrades.';
 if(entry.id==='bondstones')return 'Companion ascensions and Prestige Mastery.';
 if(entry.id==='TRIAL_SANCTUARY_MATERIAL')return 'Higher-tier companion ascensions and Sanctuary progression.';
 if(entry.companionRelated){
  const uses=[...(companionUses.get(entry.id)??[])];
  return uses.length?uses.slice(0,5).join(' · ')+(uses.length>5?` · +${uses.length-5} more`:''):'Companion ascensions, Sanctuary upgrades or expedition provisions. Check the companion screen for exact costs.';
 }
 if(entry.category==='Gems')return 'Equipment gem sockets and gem progression.';
 return 'Crafting, equipment upgrades, recipes or other progression.';
}
function computeCompanionSources(id:string):ResourceCodexSource[]{
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
const companionSourcesCache=new Map<string,readonly ResourceCodexSource[]>();
/** Cache static reward metadata only, never player-dependent unlocks or balances. */
function companionSourcesFor(id:string):readonly ResourceCodexSource[]{
 const cached=companionSourcesCache.get(id);
 if(cached)return cached;
 const entries=Object.freeze(computeCompanionSources(id).map(source=>Object.freeze(source)));
 companionSourcesCache.set(id,entries);
 return entries;
}
const SOURCE_ORDER={ready:0,travel:1,locked:2,info:3} as const;
/** Source availability is recomputed for the selected resource from the latest state.
 * Unlike full Inventory inspection this does not run costly acquisition projections. */
export function resourceCodexSources(state:GameState,entry:ResourceCodexEntry):ResourceCodexSource[]{
 const sources:ResourceCodexSource[]=[];
 if(!entry.virtual){
  for(const source of workingTowardItemSourceEntries(state,entry.id)){
   sources.push({title:source.title,detail:source.destination.detail,kind:'item',destination:source.destination,
    available:source.availability.canNavigate,status:source.availability.status,availabilityDetail:source.availability.status==='ready'?undefined:source.availability.detail});
  }
 }
 sources.push(...companionSourcesFor(entry.id));
 const seen=new Set<string>();
 return sources.filter(source=>{const key=source.kind+':'+source.title+':'+source.detail;if(seen.has(key))return false;seen.add(key);return true;})
  .sort((a,b)=>SOURCE_ORDER[a.status??'ready']-SOURCE_ORDER[b.status??'ready']);
}
