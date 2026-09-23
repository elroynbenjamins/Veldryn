import type {GameState,HerbalismHarvestMethodId} from './types';
import type {GatherDef} from '../content/skills';

export interface HerbalismHarvestMethod{
 id:HerbalismHarvestMethodId;
 name:string;
 unlockLevel:number;
 description:string;
 actionTimeMultiplier:number;
 yieldMultiplier:number;
 xpMultiplier:number;
 essenceChanceMultiplier:number;
}
export const HERBALISM_HARVEST_METHODS:readonly HerbalismHarvestMethod[]=[
 {id:'balanced',name:'Balanced Picking',unlockLevel:1,description:'Steady hand-picking with no trade-off.',actionTimeMultiplier:1,yieldMultiplier:1,xpMultiplier:1,essenceChanceMultiplier:1},
 {id:'quick',name:'Quick Harvest',unlockLevel:20,description:'Faster gathering with slightly less yield and fewer rare finds.',actionTimeMultiplier:.85,yieldMultiplier:.90,xpMultiplier:.95,essenceChanceMultiplier:.75},
 {id:'careful',name:'Careful Harvest',unlockLevel:45,description:'Slower, precise harvesting with a much better Wild Essence chance.',actionTimeMultiplier:1.15,yieldMultiplier:1,xpMultiplier:1.05,essenceChanceMultiplier:1.75},
 {id:'bountiful',name:'Bountiful Harvest',unlockLevel:70,description:'Prioritize material volume over skill XP.',actionTimeMultiplier:1.12,yieldMultiplier:1.25,xpMultiplier:.90,essenceChanceMultiplier:1.15},
] as const;
export const HERBALISM_ESSENCE_ITEM_ID='WILD_ESSENCE';

export function herbalismHarvestMethod(id:unknown):HerbalismHarvestMethod{
 return HERBALISM_HARVEST_METHODS.find(row=>row.id===id)??HERBALISM_HARVEST_METHODS[0];
}
export function herbalismLevel(state:GameState){return state.skills.find(row=>row.skillId==='herbalism')?.level??1}
export function selectedHerbalismHarvestMethod(state:GameState){return herbalismHarvestMethod(state.character?.herbalismHarvestMethodId)}
export function herbalismHarvestMethodForActivity(state:GameState){
 return state.activity?.kind==='herbalism'?herbalismHarvestMethod(state.activity.herbalismHarvestMethodId):selectedHerbalismHarvestMethod(state);
}
export function setHerbalismHarvestMethod(state:GameState,id:HerbalismHarvestMethodId){
 if(!state.character)throw new Error('Create a character first');
 const method=herbalismHarvestMethod(id);if(method.id!==id)throw new Error('Unknown Herbalism harvest method');
 const level=herbalismLevel(state);if(level<method.unlockLevel)throw new Error(`Requires Herbalism level ${method.unlockLevel}`);
 return {...state,character:{...state.character,herbalismHarvestMethodId:id}} as GameState;
}
export function herbalismInsightMultiplier(level:number){
 if(level>=100)return 1.5;
 if(level>=75)return 1.35;
 if(level>=50)return 1.2;
 if(level>=25)return 1.1;
 return 1;
}
/** Base secondary-find chance scales gradually with the node rather than introducing a separate tool tier. */
export function herbalismEssenceChance(state:GameState,node:GatherDef,methodId?:HerbalismHarvestMethodId,weatherDropMultiplier=1){
 if(node.skillId!=='herbalism')return 0;
 const method=herbalismHarvestMethod(methodId??state.character?.herbalismHarvestMethodId),level=herbalismLevel(state);
 const base=Math.min(.022,.006+Math.max(0,node.unlockLevel)*.00022);
 return Math.min(.08,base*method.essenceChanceMultiplier*herbalismInsightMultiplier(level)*Math.max(.1,weatherDropMultiplier));
}
export function herbalismMethodSummary(method:HerbalismHarvestMethod){
 const parts:string[]=[];
 if(method.actionTimeMultiplier!==1)parts.push((method.actionTimeMultiplier<1?'':'+' )+Math.round((method.actionTimeMultiplier-1)*100)+'% action time');
 if(method.yieldMultiplier!==1)parts.push((method.yieldMultiplier>1?'+':'')+Math.round((method.yieldMultiplier-1)*100)+'% herb yield');
 if(method.xpMultiplier!==1)parts.push((method.xpMultiplier>1?'+':'')+Math.round((method.xpMultiplier-1)*100)+'% XP');
 if(method.essenceChanceMultiplier!==1)parts.push((method.essenceChanceMultiplier>1?'+':'')+Math.round((method.essenceChanceMultiplier-1)*100)+'% essence chance');
 return parts.length?parts.join(' · '):'Standard speed, yield, XP and rare-find chance';
}
