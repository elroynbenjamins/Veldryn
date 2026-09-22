import {supabase} from './supabase';
import {guildIdentities} from './social';

export type ProfileVisibilityV43='public'|'guild'|'private';
export type ProfileCollectionKindV43='item'|'pet'|'companion'|'skin'|'background'|'border';
export interface ProfileCollectionRefV43{kind:ProfileCollectionKindV43;id:string}
export interface ProfileExtensionSelfV43{
 accountId:string;visibility:ProfileVisibilityV43;worldFeedOptOut:boolean;selectedCharacterId?:string|null;bio:string;
 favoriteSkillId?:string|null;favoriteCompanionId?:string|null;achievementShowcaseIds:string[];collectionShowcase:ProfileCollectionRefV43[];recordShowcaseIds:string[];masteryShowcaseActionIds:string[];revision:number;updatedAt?:string;
}
export interface PublicPlayerProfileV43{
 accountId:string;displayName:string;visibility:ProfileVisibilityV43;
 guildTag?:string|null;guildTagColorId?:string|null;
 character:{id:string;name:string;classId:string;level:number;bodyPresentation:'male'|'female';selectedSkinId:string};
 title:string;backgroundId:string;borderId?:string|null;petId?:string|null;bio:string;favoriteSkillId?:string|null;favoriteCompanionId?:string|null;
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
export async function publicPlayerProfileV43(accountId:string){
 const {data,error}=await client().rpc('profile_public_v43',{p_target_account_id:accountId});if(error)throw error;
 const profile=(data??null) as PublicPlayerProfileV43|null;if(!profile)return null;
 const identity=(await guildIdentities([accountId])).get(accountId);
 return {...profile,masteryShowcaseActionIds:Array.isArray(profile.masteryShowcaseActionIds)?profile.masteryShowcaseActionIds:[],guildTag:identity?.guild_tag??null,guildTagColorId:identity?.guild_tag_color_id??null};
}
