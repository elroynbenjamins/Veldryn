import {COLLECTIBLE_PLAYER_BADGE_IDS,isCollectiblePlayerBadgeId,isEquippablePlayerBadgeId,normalizePlayerBadges,supporterTierMonths,validatedFeaturedBadges,type CollectiblePlayerBadgeId,type EquippablePlayerBadgeId,type PlayerBadgeIdentity,type SupporterTenureTier} from '../core/player-badges';
import {supabase} from './supabase';

export interface PlayerBadgePreferences{
 identity?:PlayerBadgeIdentity;
 showSupporter:boolean;
 supporterAvailable:boolean;
 supporterTierMonths:SupporterTenureTier;
 equippedBadgeId:EquippablePlayerBadgeId|null;
 ownedExtras?:CollectiblePlayerBadgeId[];
 featuredExtras?:CollectiblePlayerBadgeId[];
}
async function request(name:string,args:Record<string,unknown>={}):Promise<PlayerBadgePreferences>{
 if(!supabase)throw new Error('Online services are not configured.');
 const {data,error}=await supabase.rpc(name,args);
 if(error)throw new Error(error.code==='PGRST202'?'Player badges are not available on this server yet.':error.message);
 const providedExtras:unknown[]=Array.isArray(data?.ownedExtras)?(data.ownedExtras as unknown[]):[];
 const owned:CollectiblePlayerBadgeId[]=providedExtras.filter(isCollectiblePlayerBadgeId);
 const identity=normalizePlayerBadges(data?.identity);
 const available=data?.supporterAvailable===true;
 const equipped=data?.equippedBadgeId??identity?.equippedBadgeId;
 const selected=isEquippablePlayerBadgeId(equipped)?equipped:null;
 return {
  identity,
  showSupporter:data?.showSupporter===true,
  supporterAvailable:available,
  supporterTierMonths:supporterTierMonths(data?.supporterTierMonths,available),
  equippedBadgeId:selected,
  ownedExtras:[...new Set(owned)].sort((a,b)=>COLLECTIBLE_PLAYER_BADGE_IDS.indexOf(a)-COLLECTIBLE_PLAYER_BADGE_IDS.indexOf(b)),
  featuredExtras:validatedFeaturedBadges(data?.featuredExtras,owned),
 };
}
export const loadPlayerBadgePreferences=()=>request('player_badge_self_v1');
export const updatePlayerBadgePreferences=(showSupporter:boolean)=>request('update_player_badge_preferences_v1',{p_show_supporter:showSupporter});
export const updateFeaturedPlayerBadges=(ids:readonly CollectiblePlayerBadgeId[])=>request('update_player_featured_badges_v1',{p_badge_ids:ids});

/** Server validates ownership, Supporter tenure and account identity. */
export const updatePlayerEquippedBadge=(id:EquippablePlayerBadgeId|null)=>request('update_player_equipped_badge_v2',{p_badge_id:id});
