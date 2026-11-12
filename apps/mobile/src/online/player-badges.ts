import {COLLECTIBLE_PLAYER_BADGE_IDS,SUPPORTER_BADGE_IDS,canEquipSupporterBadge,isCollectiblePlayerBadgeId,isEquippablePlayerBadgeId,normalizePlayerBadges,supporterTierMonths,validatedFeaturedBadges,type CollectiblePlayerBadgeId,type EquippablePlayerBadgeId,type PlayerBadgeIdentity,type SupporterTenureTier} from '../core/player-badges';
import {supabase} from './supabase';

export interface PlayerBadgePreferences{
 identity?:PlayerBadgeIdentity;
 showSupporter:boolean;
 supporterAvailable:boolean;
 supporterTierMonths:SupporterTenureTier;
 supporterTotalDays:number;
 equippedBadgeId:EquippablePlayerBadgeId|null;
 ownedExtras?:CollectiblePlayerBadgeId[];
 /** Everything this account may put on its profile: earned collectibles plus any
  * Supporter tier its verified tenure has actually reached. */
 selectableBadgeIds?:EquippablePlayerBadgeId[];
 /** The chosen profile showcase, up to three. */
 featuredExtras?:EquippablePlayerBadgeId[];
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
 const tier=supporterTierMonths(data?.supporterTierMonths,available);
 const ownedCollectibles=[...new Set(owned)].sort((a,b)=>COLLECTIBLE_PLAYER_BADGE_IDS.indexOf(a)-COLLECTIBLE_PLAYER_BADGE_IDS.indexOf(b));
 const selectable:EquippablePlayerBadgeId[]=[
  ...SUPPORTER_BADGE_IDS.filter(id=>canEquipSupporterBadge(id,available,tier)),
  ...ownedCollectibles,
 ];
 return {
  identity,
  showSupporter:data?.showSupporter===true,
  supporterAvailable:available,
  supporterTierMonths:tier,
  supporterTotalDays:typeof data?.supporterTotalDays==='number'&&Number.isSafeInteger(data.supporterTotalDays)&&data.supporterTotalDays>=0?data.supporterTotalDays:0,
  equippedBadgeId:selected,
  ownedExtras:ownedCollectibles,
  selectableBadgeIds:selectable,
  featuredExtras:validatedFeaturedBadges(data?.featuredExtras,selectable),
 };
}
export const loadPlayerBadgePreferences=()=>request('player_badge_self_v1');
export const updatePlayerBadgePreferences=(showSupporter:boolean)=>request('update_player_badge_preferences_v1',{p_show_supporter:showSupporter});
/** Pre-showcase servers mirrored "featured" onto the one equipped badge. Keep that
 * writer for the legacy fallback below, and never route a 3-badge showcase through it. */
const updateLegacyFeaturedBadges=(ids:readonly CollectiblePlayerBadgeId[])=>request('update_player_featured_badges_v1',{p_badge_ids:ids});
/** The profile showcase: up to three unlocked badges, re-validated server-side. */
export const updateProfileBadges=(ids:readonly EquippablePlayerBadgeId[])=>request('update_player_profile_badges_v3',{p_badge_ids:ids});

/** Server validates ownership, Supporter tenure and account identity. */
const missingBadgeRpc=(error:unknown)=>error instanceof Error&&error.message==='Player badges are not available on this server yet.';
/** Older installations may not have the v2 RPC yet.
 * Preserve basic one-badge/Supporter behavior until the migration rolls out,
 * but never pretend the server has verified 3-/6-/12-month tenure.
 */
export async function updatePlayerEquippedBadge(id:EquippablePlayerBadgeId|null):Promise<PlayerBadgePreferences>{
 try{return await request('update_player_equipped_badge_v2',{p_badge_id:id});}
 catch(error){
  if(!missingBadgeRpc(error)||id==='supporter_3m'||id==='supporter_6m'||id==='supporter_12m')throw error;
  if(isCollectiblePlayerBadgeId(id))return updateLegacyFeaturedBadges([id]);
  try{await updateLegacyFeaturedBadges([]);}
  catch(legacyError){if(!missingBadgeRpc(legacyError))throw legacyError;}
  return updatePlayerBadgePreferences(id==='supporter');
 }
}
