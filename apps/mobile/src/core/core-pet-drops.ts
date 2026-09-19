import {CORE_PET_COLLECTIBLES} from '../content/core-pets';
import {unlockCollectible} from './collectibles';
import {random01} from './rng';
import type {GameState} from './types';

export interface CorePetSignatureDrop{
  petId:string;
  monsterId:string;
  region:'Asterfall'|'Sunscar'|'Frostmarch'|'Ashlands';
  chance:number;
}

export type CorePetActivitySourceType='combat'|'gathering'|'exploration';
export interface CorePetActivityDrop{
  petId:string;
  sourceType:CorePetActivitySourceType;
  sourceId:string;
  region:'Asterfall'|'Sunscar'|'Frostmarch'|'Ashlands';
  chance:number;
}

export const CORE_PET_SIGNATURE_DROPS:readonly CorePetSignatureDrop[]=[
  {petId:'PET_018',monsterId:'OATHGLASS_REVENANT',region:'Asterfall',chance:.0005},
  {petId:'PET_023',monsterId:'GLASSBOUND_SENTINEL',region:'Sunscar',chance:.0005},
  {petId:'PET_028',monsterId:'CHOIR_HUNTER',region:'Frostmarch',chance:.0005},
  {petId:'PET_033',monsterId:'ASHEN_REVENANT',region:'Ashlands',chance:.0005},
];

/**
 * Regular Asterfall collection pets use existing activities rather than
 * competing with the region-signature 0.05% enemy pets.
 *
 * Gathering rates are per completed gathering action.
 * Exploration rates are per completed route.
 * Combat rates are per kill.
 */
export const CORE_PET_ACTIVITY_DROPS:readonly CorePetActivityDrop[]=[
  {petId:'PET_001',sourceType:'gathering',sourceId:'COPPER_VEIN',region:'Asterfall',chance:.0012},
  {petId:'PET_002',sourceType:'gathering',sourceId:'ASTER_IRON_VEIN',region:'Asterfall',chance:.0012},
  {petId:'PET_003',sourceType:'gathering',sourceId:'GREENWOOD_TREE',region:'Asterfall',chance:.0012},
  {petId:'PET_004',sourceType:'combat',sourceId:'IRONWOOD_WOLF',region:'Asterfall',chance:.001},
  {petId:'PET_005',sourceType:'gathering',sourceId:'SILVERBROOK_SHOAL',region:'Asterfall',chance:.0012},
  {petId:'PET_006',sourceType:'gathering',sourceId:'OATHSCALE_POOL',region:'Asterfall',chance:.0012},
  {petId:'PET_007',sourceType:'gathering',sourceId:'IRONBLOOM_THICKET',region:'Asterfall',chance:.0012},
  {petId:'PET_008',sourceType:'gathering',sourceId:'CAVELICHEN_COLONY',region:'Asterfall',chance:.0012},
  {petId:'PET_009',sourceType:'combat',sourceId:'ROADSIDE_BOAR',region:'Asterfall',chance:.001},
  {petId:'PET_010',sourceType:'exploration',sourceId:'SCOUT_GREENFIELDS',region:'Asterfall',chance:.002},
  {petId:'PET_011',sourceType:'gathering',sourceId:'OATHSTONE_SEAM',region:'Asterfall',chance:.0012},
  {petId:'PET_012',sourceType:'combat',sourceId:'LANTERN_WRETCH',region:'Asterfall',chance:.001},
  {petId:'PET_013',sourceType:'exploration',sourceId:'SCOUT_KINGS_ROAD',region:'Asterfall',chance:.002},
  {petId:'PET_014',sourceType:'exploration',sourceId:'SCOUT_OLD_MINES',region:'Asterfall',chance:.002},
  {petId:'PET_015',sourceType:'exploration',sourceId:'SCOUT_SILVERBROOK',region:'Asterfall',chance:.002},
  {petId:'PET_016',sourceType:'combat',sourceId:'ECHO_BAT',region:'Asterfall',chance:.001},
  {petId:'PET_017',sourceType:'exploration',sourceId:'SCOUT_IRONWOOD',region:'Asterfall',chance:.002},

  {petId:'PET_019',sourceType:'combat',sourceId:'SUNSCAR_SCORPION',region:'Sunscar',chance:.001},
  {petId:'PET_020',sourceType:'exploration',sourceId:'SCOUT_SUNSCAR',region:'Sunscar',chance:.002},
  {petId:'PET_021',sourceType:'gathering',sourceId:'SUNSCALE_BLOOM',region:'Sunscar',chance:.0012},
  {petId:'PET_022',sourceType:'combat',sourceId:'DUNE_ORACLE',region:'Sunscar',chance:.0008},

  {petId:'PET_024',sourceType:'exploration',sourceId:'SCOUT_FROSTMARCH',region:'Frostmarch',chance:.002},
  {petId:'PET_025',sourceType:'gathering',sourceId:'FROSTBELL_FLOWER',region:'Frostmarch',chance:.0012},
  {petId:'PET_026',sourceType:'combat',sourceId:'FROSTWOLF',region:'Frostmarch',chance:.001},
  {petId:'PET_027',sourceType:'combat',sourceId:'BELLWRAITH',region:'Frostmarch',chance:.0008},

  {petId:'PET_029',sourceType:'combat',sourceId:'BLACKGLASS_MIRELING',region:'Ashlands',chance:.001},
  {petId:'PET_030',sourceType:'gathering',sourceId:'ASHEN_MYRRH_GROVE',region:'Ashlands',chance:.0012},
  {petId:'PET_031',sourceType:'exploration',sourceId:'SCOUT_ASHLANDS',region:'Ashlands',chance:.002},
  {petId:'PET_032',sourceType:'combat',sourceId:'CINDER_TITAN',region:'Ashlands',chance:.0008},
];

export type CorePetDropRoll=(seed:string,index:number)=>number;

export function corePetSignatureDropForMonster(monsterId:string){
  return CORE_PET_SIGNATURE_DROPS.find(row=>row.monsterId===monsterId);
}

export function corePetActivityDropsForSource(sourceType:CorePetActivitySourceType,sourceId:string){
  return CORE_PET_ACTIVITY_DROPS.filter(row=>row.sourceType===sourceType&&row.sourceId===sourceId);
}

function ownedPetIds(state:GameState){
  return new Set([
    ...(state.account.unlockedCosmeticPetIds??[]),
    ...(state.character?.ownedPetIds??[]),
  ]);
}

function resolveRules(
  state:GameState,
  rules:readonly {petId:string;chance:number}[],
  attempts:number,
  seedBase:string,
  roll:CorePetDropRoll,
){
  if(attempts<=0||!rules.length)return [] as string[];
  const owned=ownedPetIds(state),found:string[]=[];
  const tries=Math.max(0,Math.floor(attempts));
  for(const rule of rules){
    if(owned.has(rule.petId)||found.includes(rule.petId))continue;
    const seed=`${seedBase}:core-pet:${rule.petId}`;
    for(let index=0;index<tries;index++){
      if(roll(seed,index)<rule.chance){found.push(rule.petId);break;}
    }
  }
  return found;
}

export function resolveCorePetActivityDrops(
  state:GameState,
  sourceType:CorePetActivitySourceType,
  sourceId:string,
  attempts:number,
  seedBase:string,
  roll:CorePetDropRoll=random01,
){
  return resolveRules(state,corePetActivityDropsForSource(sourceType,sourceId),attempts,`${seedBase}:${sourceType}:${sourceId}`,roll);
}

export function resolveCorePetCombatDrops(
  state:GameState,
  monsterId:string,
  kills:number,
  seedBase:string,
  roll:CorePetDropRoll=random01,
):string[]{
  const regular=corePetActivityDropsForSource('combat',monsterId);
  const signature=CORE_PET_SIGNATURE_DROPS.filter(row=>row.monsterId===monsterId);
  return resolveRules(state,[...regular,...signature],kills,`${seedBase}:combat:${monsterId}`,roll);
}

function applyPetIds(state:GameState,ids:readonly string[],sourceId:string){
  let next=state;
  const drops:Array<{petId:string;name:string;sourceId:string}>=[];
  for(const id of ids){
    const def=CORE_PET_COLLECTIBLES.find(row=>row.id===id);
    if(!def)continue;
    next=unlockCollectible(next,id);
    if(next.character&&!next.character.ownedPetIds?.includes(id)){
      next={...next,character:{...next.character,ownedPetIds:[...(next.character.ownedPetIds??[]),id]}};
    }
    drops.push({petId:id,name:def.name,sourceId});
  }
  return {state:next,drops};
}

export function applyCorePetActivityDrops(
  state:GameState,
  sourceType:CorePetActivitySourceType,
  sourceId:string,
  attempts:number,
  seedBase:string,
  roll?:CorePetDropRoll,
){
  const ids=resolveCorePetActivityDrops(state,sourceType,sourceId,attempts,seedBase,roll);
  return applyPetIds(state,ids,sourceId);
}

export function applyCorePetCombatDrops(
  state:GameState,
  monsterId:string,
  kills:number,
  seedBase:string,
  roll?:CorePetDropRoll,
){
  const ids=resolveCorePetCombatDrops(state,monsterId,kills,seedBase,roll);
  return applyPetIds(state,ids,monsterId);
}
