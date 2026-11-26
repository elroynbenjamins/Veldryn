import type {GameState} from './types';
import {wave2SetFor,wave2Owned} from './profile-cosmetic-wave2';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import {isUltraLuxeProfileCosmetic} from './ultra-luxe-cosmetics';
import {frostfallRewardsDiscoverable,FROSTFALL_2026_EVENT_ID} from './frostfall-reward-visibility';
export const BASE_PROFILE_BACKGROUNDS=[
  {id:'asterfall-night',name:'Asterfall Night',region:'KINGS_ROAD'},
  {id:'ironwood-dawn',name:'Ironwood Dawn',region:'IRONWOOD'},
  {id:'silverbrook-mist',name:'Silverbrook Mist',region:'SILVERBROOK'},
  {id:'oathglass-hall',name:'Oathglass Hall',region:'KINGS_ROAD'},
] as const;
/** Permanent Guild Token Shop borders may be previewed before they are purchased. */
export const GUILD_TOKEN_PROFILE_BORDERS=new Set(['guild-border-silver','guild-border-emerald','guild-border-royal']);
export function canUseProfileCosmetic(state:GameState,kind:'background'|'border'|'pet',id:string){
  if(!id)return kind!=='background';
  if(kind==='border'&&wave2SetFor('border',id))return wave2Owned(state.account,'border',id);
  if(kind==='background'&&BASE_PROFILE_BACKGROUNDS.some(item=>item.id===id))return true;
  const owned=kind==='background'?state.account.unlockedProfileBackgroundIds:kind==='border'?state.account.unlockedProfileBorderIds:state.account.unlockedCosmeticPetIds;
  return owned?.includes(id)??false;
}

/** Future event assets must stay out of the profile gallery until their event releases. */
export function profileCosmeticReleased(state:GameState,kind:'background'|'border',id:string,nowMs=Date.now()){
  if(kind==='background'&&BASE_PROFILE_BACKGROUNDS.some(item=>item.id===id))return true;
  if(kind==='border'&&GUILD_TOKEN_PROFILE_BORDERS.has(id))return true;
  if(kind==='border'&&wave2SetFor('border',id))return wave2Owned(state.account,'border',id);
  // Ultra-luxe cosmetics are never discoverable as locked/released options.
  // They enter the wardrobe only after an explicit account grant.
  if(isUltraLuxeProfileCosmetic(kind,id))return canUseProfileCosmetic(state,kind,id);
  if(canUseProfileCosmetic(state,kind,id))return true;
  if(!state.character)return false;
  // The same server-window discovery rule applies to every Frostfall scene/frame.
  // Ownership above deliberately survives expiry and a missing runtime.
  const rewards=LIVE_EVENT_CATALOG.filter(event=>event.id!==FROSTFALL_2026_EVENT_ID||frostfallRewardsDiscoverable(state.account,nowMs)).flatMap(event=>[
    ...event.milestones(state.character!.classId).map(row=>row.reward),
    ...event.shop.map(row=>row.reward),
    ...event.communityMilestones.flatMap(row=>row.reward?[row.reward]:[]),
    ...event.discoveries.map(row=>row.reward),
  ]);
  return rewards.some(reward=>reward.kind===kind&&reward.id===id);
}
