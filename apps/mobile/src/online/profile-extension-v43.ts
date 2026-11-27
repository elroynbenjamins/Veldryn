import {supabase} from './supabase';
import {ACCOUNT_SOCIAL_IDENTITY_RELEASED} from './social-identity-client-gate';
import {RequestSingleflight} from '../core/request-singleflight';
import {normalizeProfileGear,type ProfileEquippedGear} from '../core/profile-equipped-gear';
import type {PlayerBadgeIdentity} from '../core/player-badges';
import {guildIdentities,profileGuildByTag} from './social';
import type {ProfileGuildIdentity} from '../core/profile-guild';
import type {PlayerNameStylePreference} from '../core/player-name-style';

export type ProfileVisibilityV43='public'|'guild'|'private';
export type ProfileCollectionKindV43='item'|'pet'|'companion'|'profile_icon'|'background'|'border'|'effect';
export interface ProfileCollectionRefV43{kind:ProfileCollectionKindV43;id:string}
export interface ProfileExtensionSelfV43{
 accountId:string;visibility:ProfileVisibilityV43;worldFeedOptOut:boolean;selectedCharacterId?:string|null;bio:string;
 favoriteSkillId?:string|null;favoriteCompanionId?:string|null;achievementShowcaseIds:string[];collectionShowcase:ProfileCollectionRefV43[];recordShowcaseIds:string[];masteryShowcaseActionIds:string[];revision:number;updatedAt?:string;
}
export interface PublicProfileCharacterChoice{id:string;name:string;classId:string;level:number}
export interface PublicPlayerProfileV43{
 characterChoices?:PublicProfileCharacterChoice[];
 guild?:ProfileGuildIdentity|null;
 accountId:string;displayName:string;visibility:ProfileVisibilityV43;
 combatPower?:number;
 equippedGear?:ProfileEquippedGear[];
 guildTag?:string|null;guildTagColorId?:string|null;nameStyle?:PlayerNameStylePreference|null;playerBadges?:PlayerBadgeIdentity;
 character:{id:string;name:string;classId:string;level:number;bodyPresentation:'male'|'female';profileIconId:string};
 title:string;/** Verified server grant */ ultraLuxeTitleId?:string|null;/** Set only by the grant-sanitizing public profile RPC. */ ultraLuxeAppearanceVerified?:boolean;/** Six-set sanitizer contract; not ownership. */ ultraLuxeAppearanceVersion?:number;backgroundId:string;borderId?:string|null;effectId?:string|null;petId?:string|null;cosmeticsPreview?:boolean;bio:string;favoriteSkillId?:string|null;favoriteCompanionId?:string|null;
 achievementShowcaseIds:string[];collectionShowcase:ProfileCollectionRefV43[];recordShowcaseIds:string[];masteryShowcaseActionIds:string[];recordEntries?:Record<string,{recordId:string;value:number;achievedAtMs:number;characterId?:string;contextLabel?:string}>;revision:number;
}
function client(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
export async function selfProfileExtensionV43(){
 const {data,error}=await client().rpc('profile_extension_self_v43');if(error)throw error;const row=data as ProfileExtensionSelfV43;return {...row,masteryShowcaseActionIds:Array.isArray(row?.masteryShowcaseActionIds)?row.masteryShowcaseActionIds:[]};
}
export async function updateProfileExtensionV43(input:{
 visibility:ProfileVisibilityV43;worldFeedOptOut:boolean;selectedCharacterId?:string|null;bio:string;favoriteSkillId?:string|null;favoriteCompanionId?:string|null;
 achievementShowcaseIds:string[];collectionShowcase:ProfileCollectionRefV43[];recordShowcaseIds:string[];masteryShowcaseActionIds:string[];
}){
 const {data,error}=await client().rpc('profile_extension_update_v43',{
  p_visibility:input.visibility,p_world_feed_opt_out:input.worldFeedOptOut,p_selected_character_id:input.selectedCharacterId??null,p_bio:input.bio,
  p_favorite_skill_id:input.favoriteSkillId??null,p_favorite_companion_id:input.favoriteCompanionId??null,
  p_achievement_showcase_ids:input.achievementShowcaseIds,p_collection_showcase:input.collectionShowcase,p_record_showcase_ids:input.recordShowcaseIds,p_mastery_showcase_action_ids:input.masteryShowcaseActionIds,
 });if(error)throw error;return data as ProfileExtensionSelfV43;
}
/** Account bio and visibility, without ever changing the active or featured character. */
export async function updateProfileIdentityV2(input:{visibility:ProfileVisibilityV43;worldFeedOptOut:boolean;bio:string}){
 const {data,error}=await client().rpc('profile_identity_update_v2',{
  p_visibility:input.visibility,p_world_feed_opt_out:input.worldFeedOptOut,p_bio:input.bio,
 });if(error)throw error;
 return data as ProfileExtensionSelfV43;
}

/** Save only the chosen hero's showcase; changes never switch gameplay characters. */
export async function updateCharacterShowcaseV2(characterId:string,input:CharacterShowcaseFieldsV1){
 const {data,error}=await client().rpc('profile_character_showcase_update_v2',{
  p_character_id:characterId,p_favorite_skill_id:input.favoriteSkillId??null,
  p_favorite_companion_id:input.favoriteCompanionId??null,
  p_achievement_showcase_ids:input.achievementShowcaseIds,
  p_collection_showcase:input.collectionShowcase,
  p_record_showcase_ids:input.recordShowcaseIds,
  p_mastery_showcase_action_ids:input.masteryShowcaseActionIds,
 });if(error)throw error;
 return data as CharacterShowcaseFieldsV1;
}

/** Explicitly choose the public landing hero; this is not a gameplay roster switch. */
export async function setFeaturedProfileCharacterV2(characterId:string){
 const {data,error}=await client().rpc('profile_featured_character_update_v2',{p_character_id:characterId});
 if(error)throw error;
 return data as ProfileExtensionSelfV43;
}

/** Values persisted for one specific character, independent of the account bio/privacy. */
export type CharacterShowcaseFieldsV1=Pick<ProfileExtensionSelfV43,
 'favoriteSkillId'|'favoriteCompanionId'|'achievementShowcaseIds'|
 'collectionShowcase'|'recordShowcaseIds'|'masteryShowcaseActionIds'>;
export async function characterShowcaseSelfV1(characterId:string):Promise<CharacterShowcaseFieldsV1>{
 const {data,error}=await client().rpc('character_showcase_self_v1',{p_character_id:characterId});
 if(error)throw error;
 const row=data as CharacterShowcaseFieldsV1;
 return {
  favoriteSkillId:row.favoriteSkillId??null,
  favoriteCompanionId:row.favoriteCompanionId??null,
  achievementShowcaseIds:Array.isArray(row.achievementShowcaseIds)?row.achievementShowcaseIds:[],
  collectionShowcase:Array.isArray(row.collectionShowcase)?row.collectionShowcase:[],
  recordShowcaseIds:Array.isArray(row.recordShowcaseIds)?row.recordShowcaseIds:[],
  masteryShowcaseActionIds:Array.isArray(row.masteryShowcaseActionIds)?row.masteryShowcaseActionIds:[],
 };
}

const pendingPublicProfiles=new RequestSingleflight<PublicPlayerProfileV43|null>();
export async function publicPlayerProfileV43(accountId:string,characterId?:string):Promise<PublicPlayerProfileV43|null>{
 const db=client(),{data:{session},error:sessionError}=await db.auth.getSession();
 if(sessionError)throw sessionError;
 const viewer=session?.user.id;
 if(!viewer)throw new Error('Sign in to inspect another player.');
 // Sharing only an in-flight authorized read avoids duplicate public-profile,
 // guild-identity and guild-name lookups when multiple panels open together.
 // Do not cache the result: privacy, blocks and guild visibility can change.
 return pendingPublicProfiles.run(viewer+':'+accountId+':'+(ACCOUNT_SOCIAL_IDENTITY_RELEASED?(characterId??'featured'):'legacy'),async()=>{
  // Default-off compatibility: older production servers only expose the v43
  // account profile RPC. Never require the new per-character RPC before rollout.
  const {data,error}=ACCOUNT_SOCIAL_IDENTITY_RELEASED
   ?await db.rpc('profile_character_public_v1',{p_target_account_id:accountId,p_character_id:characterId??null})
   :await db.rpc('profile_public_v43',{p_target_account_id:accountId});
  if(error)throw error;
  const profile=(data??null) as PublicPlayerProfileV43|null;if(!profile)return null;
  // The companion RPC uses the same visibility/block gate, returning only equipped item facts.
  // Older servers that have not deployed it still render the public profile normally.
  // Fetch profile extras concurrently so the new read-only gallery does not add
  // another full network round trip to opening a player's profile.
  // Optional gear failures must not block the existing identity/profile surface.
  const [gearResult,identities]=await Promise.all([
   (async()=>{try{return ACCOUNT_SOCIAL_IDENTITY_RELEASED
    ?await db.rpc('profile_character_gear_v1',{p_target_account_id:accountId,p_character_id:characterId??null})
    :await db.rpc('profile_equipped_gear_v1',{p_target_account_id:accountId});}catch{return null;}})(),
   guildIdentities([accountId]),
  ]);
  const gearRows=gearResult?.data;
  const gearPayload=gearRows&&typeof gearRows==='object'&&!Array.isArray(gearRows)?gearRows as {characterId?:unknown;items?:unknown}:null;
  const equippedGear=gearResult&&!gearResult.error&&gearPayload?.characterId===profile.character.id?normalizeProfileGear(gearPayload.items):undefined;
  const identity=identities.get(accountId);
  const knownGuild=identity?.guild_tag?{tag:identity.guild_tag,tagColorId:identity.guild_tag_color_id}:null;
  const guild=knownGuild?await profileGuildByTag(knownGuild.tag).catch(()=>knownGuild):null;
  return {...profile,guild,equippedGear,masteryShowcaseActionIds:Array.isArray(profile.masteryShowcaseActionIds)?profile.masteryShowcaseActionIds:[],guildTag:identity?.guild_tag??null,guildTagColorId:identity?.guild_tag_color_id??null,nameStyle:identity?.player_name_style??null,playerBadges:identity?.player_badges};
 });
}
