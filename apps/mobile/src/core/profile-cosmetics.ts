import type {GameState} from './types';
import {claimableLiveEvent} from './live-events';
export const BASE_PROFILE_BACKGROUNDS=[
  {id:'asterfall-night',name:'Asterfall Night',region:'KINGS_ROAD'},
  {id:'ironwood-dawn',name:'Ironwood Dawn',region:'IRONWOOD'},
  {id:'silverbrook-mist',name:'Silverbrook Mist',region:'SILVERBROOK'},
  {id:'oathglass-hall',name:'Oathglass Hall',region:'KINGS_ROAD'},
] as const;
export function canUseProfileCosmetic(state:GameState,kind:'background'|'border'|'pet',id:string){
  if(!id)return kind!=='background';
  if(kind==='background'&&BASE_PROFILE_BACKGROUNDS.some(item=>item.id===id))return true;
  const owned=kind==='background'?state.account.unlockedProfileBackgroundIds:kind==='border'?state.account.unlockedProfileBorderIds:state.account.unlockedCosmeticPetIds;
  return owned?.includes(id)??false;
}

/** Future event assets must stay out of the profile gallery until their event releases. */
export function profileCosmeticReleased(state:GameState,kind:'background'|'border',id:string,nowMs=Date.now()){
  if(kind==='background'&&BASE_PROFILE_BACKGROUNDS.some(item=>item.id===id))return true;
  if(canUseProfileCosmetic(state,kind,id))return true;
  const event=claimableLiveEvent(state,nowMs);
  if(!event||!state.character)return false;
  const rewards=[
    ...event.definition.milestones(state.character.classId).map(row=>row.reward),
    ...event.definition.shop.map(row=>row.reward),
    ...event.definition.communityMilestones.flatMap(row=>row.reward?[row.reward]:[]),
    ...event.definition.discoveries.map(row=>row.reward),
  ];
  return rewards.some(reward=>reward.kind===kind&&reward.id===id);
}
