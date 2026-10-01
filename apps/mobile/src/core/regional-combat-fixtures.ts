import {EQUIPMENT_ITEMS_V33} from '../content/equipment-items-v33';
import {V33_EQUIPMENT_RECIPES} from '../content/equipment-recipes-v33';
import type {ClassId,GameState} from './types';
import {createCharacter,effectiveStats,newGame} from './game';
import {characterTotalXpAtLevel} from './progression';

export type RegionalPreparation='underprepared'|'prepared'|'optimized';
export interface RegionalCombatFixtureDef{regionId:string;regionName:string;monsterId:string;level:number;tier:string;foodId:string;}

export const REGIONAL_COMBAT_FIXTURES:readonly RegionalCombatFixtureDef[]=[
 {regionId:'GREENFIELDS',regionName:'Greenfields',monsterId:'ROADSIDE_BOAR',level:4,tier:'T1',foodId:'COOKED_MEADOW_PERCH'},
 {regionId:'SILVERBROOK',regionName:'Silverbrook',monsterId:'DROWNED_PILGRIM',level:22,tier:'T3',foodId:'COOKED_SILVERFIN'},
 {regionId:'IRONWOOD',regionName:'Ironwood Forest',monsterId:'ANCIENT_TREANT',level:15,tier:'T3',foodId:'ROASTED_ROOTSTREAM_TROUT'},
 {regionId:'OLD_MINES',regionName:'Old Mines',monsterId:'RUNEBOUND_MINER',level:19,tier:'T4',foodId:'BAKED_CAVE_LOACH'},
 {regionId:'KINGS_ROAD',regionName:"King's Road",monsterId:'OATHGLASS_REVENANT',level:25,tier:'T4',foodId:'ROASTED_CROWN_CARP'},
 {regionId:'SUNSCAR',regionName:'Sunscar',monsterId:'GLASSBOUND_SENTINEL',level:40,tier:'T6',foodId:'GRILLED_OASIS_CARP'},
 {regionId:'FROSTMARCH',regionName:'Frostmarch',monsterId:'CHOIR_HUNTER',level:66,tier:'T8',foodId:'FROSTED_ICEFIN'},
 {regionId:'ASHLANDS',regionName:'Ashlands',monsterId:'ASHEN_REVENANT',level:88,tier:'T9',foodId:'CHARRED_EMBERFIN'},
] as const;

function tierNumber(tier:string){return Number(tier.slice(1))||1;}
const tierByItem=new Map(V33_EQUIPMENT_RECIPES.map(recipe=>[recipe.output.itemId,tierNumber(recipe.v33EquipmentTier)]));
function equipmentFor(classId:ClassId,tier:string,preparation:RegionalPreparation,level:number){
 const target=Math.max(1,Math.min(9,tierNumber(tier)+(preparation==='optimized'?1:preparation==='underprepared'?-1:0)));
 const candidates=EQUIPMENT_ITEMS_V33.filter(item=>item.classRestriction===classId&&item.slot&&(item.requiredLevel??1)<=level&&(tierByItem.get(item.id)??99)<=target).sort((a,b)=>(tierByItem.get(b.id)??0)-(tierByItem.get(a.id)??0));
 const bySlot=new Map<string,string>();for(const item of candidates)if(!bySlot.has(item.slot!))bySlot.set(item.slot!,item.id);
 return Object.fromEntries(bySlot);
}
export function regionalCombatFixture(def:RegionalCombatFixtureDef,preparation:RegionalPreparation,classId:ClassId='IRONWARDEN'):GameState{
 let state=createCharacter(newGame(0),classId,'Regional Sustain');
 const level=Math.max(1,def.level+(preparation==='optimized'?4:preparation==='underprepared'?-3:0));
 const equipment=equipmentFor(classId,def.tier,preparation,level);
 state={...state,currentRegionId:def.regionId,unlockedMonsterIds:[...new Set([...state.unlockedMonsterIds,def.monsterId])],character:{...state.character!,level,xp:characterTotalXpAtLevel(level),currentHp:state.character!.hp,equippedFoodId:def.foodId,equipment:{...state.character!.equipment,...equipment}}};
 state.character!.currentHp=effectiveStats(state).hp;
 return state;
}
