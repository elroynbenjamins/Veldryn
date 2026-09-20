import type {CollectibleDefinition,CollectibleTarget} from './collectibles';

import {EVENT_COLLECTIBLE_METADATA as metadata} from './event-collectible-metadata';
const targetById:Record<string,CollectibleTarget>={
  EVT_PET_001:'skillXp',EVT_PET_002:'actionSpeed',EVT_PET_003:'cookingSpeed',EVT_PET_004:'healingEffectiveness',
  EVT_PET_005:'herbalismSpeed',EVT_PET_006:'gatheringYield',EVT_PET_007:'characterXp',EVT_PET_008:'skillXp',
  EVT_PET_009:'craftingSpeed',EVT_PET_010:'dropChance',EVT_PET_011:'cookingSpeed',EVT_PET_012:'gatheringYield',
  EVT_PET_013:'dropChance',EVT_PET_014:'dungeonReward',EVT_PET_015:'fishingSpeed',EVT_PET_016:'materialPreservation',
  EVT_PET_017:'skillXp',EVT_PET_018:'craftingSpeed',EVT_PET_019:'guildContribution',
};
const activeBps=(buff:string)=>Math.round(Number(buff.match(/\+(\d+(?:\.\d+)?)%/)?.[1]??2)*100);
export const EVENT_PET_COLLECTIBLES:readonly CollectibleDefinition[]=metadata.filter(row=>row.type==='pet').map(row=>({
  id:row.id,kind:'pet',name:row.name,bonusFamilyId:row.id,target:targetById[row.id]??'skillXp',ownedBps:50,activeBps:activeBps(row.buff),collectionGroup:'event',source:`${row.event_name} · ${row.event_window}`,event:row.event,rarity:row.rarity,buff:row.buff,description:row.description,
}));
