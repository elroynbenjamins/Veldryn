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

export const CORE_PET_SIGNATURE_DROPS:readonly CorePetSignatureDrop[]=[
  {petId:'PET_018',monsterId:'OATHGLASS_REVENANT',region:'Asterfall',chance:.0005},
  {petId:'PET_023',monsterId:'GLASSBOUND_SENTINEL',region:'Sunscar',chance:.0005},
  {petId:'PET_028',monsterId:'CHOIR_HUNTER',region:'Frostmarch',chance:.0005},
  {petId:'PET_033',monsterId:'ASHEN_REVENANT',region:'Ashlands',chance:.0005},
];

export type CorePetDropRoll=(seed:string,index:number)=>number;

export function corePetSignatureDropForMonster(monsterId:string){
  return CORE_PET_SIGNATURE_DROPS.find(row=>row.monsterId===monsterId);
}

export function resolveCorePetCombatDrops(
  state:GameState,
  monsterId:string,
  kills:number,
  seedBase:string,
  roll:CorePetDropRoll=random01,
):string[]{
  const rule=corePetSignatureDropForMonster(monsterId);
  if(!rule||kills<=0)return [];
  const owned=new Set([
    ...(state.account.unlockedCosmeticPetIds??[]),
    ...(state.character?.ownedPetIds??[]),
  ]);
  if(owned.has(rule.petId))return [];
  const attempts=Math.max(0,Math.floor(kills));
  const seed=`${seedBase}:core-pet:${rule.petId}:${monsterId}`;
  for(let index=0;index<attempts;index++)if(roll(seed,index)<rule.chance)return [rule.petId];
  return [];
}

export function applyCorePetCombatDrops(
  state:GameState,
  monsterId:string,
  kills:number,
  seedBase:string,
  roll?:CorePetDropRoll,
){
  const ids=resolveCorePetCombatDrops(state,monsterId,kills,seedBase,roll);
  let next=state;
  const drops:Array<{petId:string;name:string;sourceId:string}>=[];
  for(const id of ids){
    const def=CORE_PET_COLLECTIBLES.find(row=>row.id===id);
    if(!def)continue;
    next=unlockCollectible(next,id);
    if(next.character&&!next.character.ownedPetIds?.includes(id)){
      next={...next,character:{...next.character,ownedPetIds:[...(next.character.ownedPetIds??[]),id]}};
    }
    drops.push({petId:id,name:def.name,sourceId:monsterId});
  }
  return {state:next,drops};
}
