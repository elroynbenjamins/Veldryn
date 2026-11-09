import {COLLECTIBLE_PLAYER_BADGE_IDS,isCollectiblePlayerBadgeId,normalizePlayerBadges,validatedFeaturedBadges,type CollectiblePlayerBadgeId,type PlayerBadgeIdentity} from '../core/player-badges';
import {supabase} from './supabase';

export interface PlayerBadgePreferences{
 identity?:PlayerBadgeIdentity;
 showSupporter:boolean;
 supporterAvailable:boolean;
 ownedExtras?:CollectiblePlayerBadgeId[];
 featuredExtras?:CollectiblePlayerBadgeId[];
}
async function request(name:string,args:Record<string,unknown>={}):Promise<PlayerBadgePreferences>{
 if(!supabase)throw new Error('Online services are not configured.');
 const {data,error}=await supabase.rpc(name,args);
 if(error)throw new Error(error.code==='PGRST202'?'Player badges are not available on this server yet.':error.message);
 const owned=(Array.isArray(data?.ownedExtras)?data.ownedExtras:[]).filter(isCollectiblePlayerBadgeId);
 return {
  identity:normalizePlayerBadges(data?.identity),
  showSupporter:data?.showSupporter===true,
  supporterAvailable:data?.supporterAvailable===true,
  ownedExtras:[...new Set(owned)].sort((a,b)=>COLLECTIBLE_PLAYER_BADGE_IDS.indexOf(a)-COLLECTIBLE_PLAYER_BADGE_IDS.indexOf(b)),
  featuredExtras:validatedFeaturedBadges(data?.featuredExtras,owned),
 };
}
export const loadPlayerBadgePreferences=()=>request('player_badge_self_v1');
export const updatePlayerBadgePreferences=(showSupporter:boolean)=>request('update_player_badge_preferences_v1',{p_show_supporter:showSupporter});
export const updateFeaturedPlayerBadges=(ids:readonly CollectiblePlayerBadgeId[])=>request('update_player_featured_badges_v1',{p_badge_ids:ids});
