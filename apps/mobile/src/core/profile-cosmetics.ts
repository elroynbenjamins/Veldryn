import type {GameState} from './types';
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
