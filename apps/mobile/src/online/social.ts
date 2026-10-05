import {supabase} from './supabase';
import {CHAT_RECENT_MESSAGE_LIMIT} from './chat-history';
import {normalizePlayerBadges,type PlayerBadgeIdentity} from '../core/player-badges';
import {guildNameError,normalizeGuildName} from '../core/identity-names';
import type {GuildAppearanceEntitlements,GuildBackgroundId,GuildBannerId,GuildFrameId,GuildNameColorId,GuildNameplateId} from '../core/guild-customization';
import type {GuildTagAvailability,GuildTagColorId} from '../core/guild-tags';
import type {PlayerNameStylePreference} from '../core/player-name-style';
import {writePlayerNameStyleForAccount} from '../core/player-name-style-save';
import type {ProfileGuildIdentity} from '../core/profile-guild';

export const WORLD_CHANNELS=[
  {id:'world-1',name:'English',language:'English'},
  {id:'world-2',name:'Spanish',language:'Spanish'},
  {id:'world-3',name:'Global 1',language:'Global'},
  {id:'world-4',name:'Global 2',language:'Global'},
] as const;
export type WorldMessage={id:string;sender_name:string;body:string;created_at:string;account_id:string;guild_tag?:string|null;guild_tag_color_id?:string|null;player_name_style?:PlayerNameStylePreference|null;player_badges?:PlayerBadgeIdentity};
export type OnlineGuild={background_id?:GuildBackgroundId;id:string;name:string;tag:string|null;tag_color_id:GuildTagColorId;level:number;member_cap:number;minimum_level:number;join_policy:'open'|'apply'|'invite';banner_id:GuildBannerId;profile_frame_id:GuildFrameId;name_color_id:GuildNameColorId;nameplate_id:GuildNameplateId;motto:string};
export type GuildMember={account_id:string;display_name:string;role:'leader'|'officer'|'member';joined_at:string;guild_tag?:string|null;guild_tag_color_id?:string|null;player_name_style?:PlayerNameStylePreference|null;player_badges?:PlayerBadgeIdentity};
export type GuildApplication={id:string;account_id:string;created_at:string;status:'pending'|'accepted'|'declined'|'withdrawn'};
export type FriendRelationship='none'|'friend'|'outgoing_pending'|'incoming_pending';
export type FriendProfile={account_id:string;display_name:string;character_name:string|null;class_id:string|null;level:number|null;profile_title:string|null;guild_tag?:string|null;guild_tag_color_id?:string|null;player_name_style?:PlayerNameStylePreference|null;player_badges?:PlayerBadgeIdentity};
export type FriendSearchResult=FriendProfile&{relationship:FriendRelationship};
export type FriendEntry=FriendProfile&{friends_since:string};
export type FriendRequest={player_badges?:PlayerBadgeIdentity;request_id:string;account_id:string;display_name:string;direction:'incoming'|'outgoing';created_at:string};
export type BlockedPlayer={player_badges?:PlayerBadgeIdentity;account_id:string;display_name:string;blocked_at:string};
export type SocialReportReason='identity'|'harassment_spam';
export type GuildChatMessage={id:string;account_id:string;sender_name:string;body:string;created_at:string;guild_tag?:string|null;guild_tag_color_id?:string|null;player_name_style?:PlayerNameStylePreference|null;player_badges?:PlayerBadgeIdentity;guild_role?:'leader'|'officer'|'member'|null};
export interface GuildChatState{guild:{id:string;name:string;tag?:string|null;tagColorId?:string|null}|null;messages:GuildChatMessage[];serverTime:string;}
export interface SocialChatChannelAttention{channelId?:string|null;unread:number;mentions:number;lastReadAt?:string|null;lastReadMessageId?:string|null;firstUnreadMessageId?:string|null;}
export interface SocialChatAttentionState{guild:SocialChatChannelAttention;party:SocialChatChannelAttention;totalUnread:number;totalMentions:number;serverTime:string;}


export interface PartyInvitationView{ id:string;partyId:string;inviterAccountId:string;inviterName:string;focus:'combat'|'skilling'|'mixed';memberCount:number;openSpots:number;expiresAt:string; }
export interface GuildInvitationView{ id:string;guildId:string;inviterAccountId:string;inviterName:string;guildName:string;guildTag?:string|null;memberCount:number;memberCap:number;minimumLevel:number;expiresAt:string; }
export interface SocialInvitationState{party:PartyInvitationView[];guild:GuildInvitationView[];serverTime:string;}
export interface OutgoingInvitationView{id:string;recipientAccountId:string;recipientName:string;expiresAt:string;}
export interface SocialOutgoingInvitationState{party:OutgoingInvitationView[];guild:OutgoingInvitationView[];serverTime:string;}
export interface GuildLeadershipStatus{
 guildId:string;leaderMissing?:boolean;leaderAccountId?:string;leaderName?:string;leaderLastActiveAt?:string|null;
 inactiveDays?:number;thresholdDays:number;eligibleForSuccession?:boolean;
 successorAccountId?:string|null;successorName?:string|null;successorRole?:'officer'|'member'|null;successorLastActiveAt?:string|null;
}
export interface InviteCapability{available:boolean;pending:boolean;reason?:string|null;partyId?:string|null;guildId?:string|null;guildName?:string|null;memberCount?:number;memberCap?:number;minimumLevel?:number;}
export interface SocialInviteCapabilities{party:InviteCapability;guild:InviteCapability;}

export interface GuildNoticeBoardState{guildId:string;body:string;updatedAt?:string|null;updatedByAccountId?:string|null;canEdit:boolean;}


function requireClient(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
/** Uses the existing signed-in guild directory, never a private roster query. */
export async function profileGuildByTag(tag:string):Promise<ProfileGuildIdentity|null>{
 const {data,error}=await requireClient().from('guilds').select('id,name,tag,tag_color_id,name_color_id,banner_id').eq('tag',tag).maybeSingle();
 if(error)throw error;
 return data?{id:data.id,name:data.name,tag:data.tag,tagColorId:data.tag_color_id,nameColorId:data.name_color_id,bannerId:data.banner_id}:null;
}
export interface SocialProfileIcon {profile_icon_id?:string|null;class_id?:string|null;}
export async function guildIdentities(accountIds:readonly string[]):Promise<Map<string,SocialProfileIcon&{guild_tag?:string|null;guild_tag_color_id?:string|null;player_name_style?:PlayerNameStylePreference|null;player_badges?:PlayerBadgeIdentity}>>{const unique=[...new Set(accountIds.filter(Boolean))];if(!unique.length)return new Map();const client=requireClient();const rows:any[]=[];for(let i=0;i<unique.length;i+=100){const args={p_account_ids:unique.slice(i,i+100)};let result=await client.rpc('guild_identities_v3',args);if(result.error?.code==='PGRST202')result=await client.rpc('guild_identities_v2',args);if(result.error?.code==='PGRST202')result=await client.rpc('guild_identities',args);if(result.error)throw result.error;rows.push(...(result.data??[]));}return new Map(rows.map((row:any)=>[row.account_id,{profile_icon_id:row.profile_icon_id??null,class_id:row.class_id??null,guild_tag:row.guild_tag??null,guild_tag_color_id:row.guild_tag_color_id??null,player_name_style:row.player_name_style??null,player_badges:normalizePlayerBadges(row.player_badges)}]));}
async function withGuildIdentities<T extends {account_id:string}>(rows:T[]){const identities=await guildIdentities(rows.map(row=>row.account_id));return rows.map(row=>({...row,...identities.get(row.account_id)}));}
/** Cosmetic identity lookup failure must not hide already-authorized messages. */
export async function withChatIdentities<T extends {account_id:string}>(rows:T[]):Promise<T[]>{try{return await withGuildIdentities(rows);}catch{return rows;}}
export async function worldMessages(channelId:string){const client=requireClient();const {data,error}=await client.from('chat_messages').select('id,account_id,sender_name,body,created_at').eq('channel_type','world').eq('channel_id',channelId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(CHAT_RECENT_MESSAGE_LIMIT);if(error)throw error;return withChatIdentities(((data??[]) as WorldMessage[]).reverse());}
export function worldChatCommandKey(){return `world-chat-${Date.now()}-${Math.random().toString(36).slice(2,14)}`;}
export async function postWorldMessage(channelId:string,body:string,senderName:string,idempotencyKey:string){const client=requireClient();const clean=body.trim();if(!clean)throw new Error('Write a message first.');const {data,error}=await client.rpc('send_world_chat_v2',{p_channel_id:channelId,p_body:clean,p_sender_name:senderName.slice(0,20)||'Adventurer',p_idempotency_key:idempotencyKey});if(error)throw error;return data as string;}
const guildFields='id,name,tag,tag_color_id,level,member_cap,minimum_level,join_policy,banner_id,profile_frame_id,name_color_id,nameplate_id,motto';
async function readGuildProjection(guildId?:string){
 const client=requireClient();
 const query=(fields:string)=>guildId?client.from('guilds').select(fields).eq('id',guildId).single():client.from('guilds').select(fields).order('level',{ascending:false}).limit(25);
 let result=await query(guildFields+',background_id');
 // Keep the existing directory usable during a staged server/client rollout.
 if(result.error&&['42703','PGRST204'].includes(result.error.code)&&result.error.message.includes('background_id'))result=await query(guildFields);
 if(result.error)throw result.error;
 return result.data;
}
export async function browseGuilds(){return (await readGuildProjection()??[]) as unknown as OnlineGuild[];}
export async function requestGuildMembership(guildId:string){const client=requireClient();const {data,error}=await client.rpc('request_guild_membership',{p_guild_id:guildId});if(error)throw error;return data as 'joined'|'applied';}
export async function guildTagAvailability(tag:string){const client=requireClient();const {data,error}=await client.rpc('guild_tag_availability',{p_tag:tag});if(error)throw error;const row=data?.[0];return {input:tag,normalizedTag:row?.normalized_tag??undefined,valid:row?.reason!=='invalid_format',available:row?.available===true,reason:row?.reason??undefined} as GuildTagAvailability;}
export async function createOnlineGuild(name:string,tag:string,joinPolicy:'open'|'apply'|'invite',minimumLevel:number){const client=requireClient(),normalizedName=normalizeGuildName(name),nameError=guildNameError(normalizedName);if(nameError)throw new Error(nameError);const {data,error}=await client.rpc('create_guild',{p_name:normalizedName,p_tag:tag.trim(),p_join_policy:joinPolicy,p_minimum_level:minimumLevel});if(error)throw error;return data as string;}
export async function updateOnlineGuildTag(tag:string){const client=requireClient();const {data,error}=await client.rpc('update_guild_tag',{p_tag:tag});if(error)throw error;return data?.[0] as {guild_id:string;tag:string;previous_tag:string|null}|undefined;}
export async function updateOnlineGuildTagColor(tagColorId:GuildTagColorId){const client=requireClient();const {data,error}=await client.rpc('update_guild_tag_color',{p_tag_color_id:tagColorId});if(error)throw error;return data?.[0] as {guild_id:string;tag_color_id:GuildTagColorId}|undefined;}
export async function guildRoster(guildId:string){const client=requireClient();const {data,error}=await client.rpc('guild_roster',{p_guild_id:guildId});if(error)throw error;return withGuildIdentities((data??[]) as GuildMember[]);}
export async function guildApplications(guildId:string){const client=requireClient();const {data,error}=await client.from('guild_applications').select('id,account_id,created_at,status').eq('guild_id',guildId).eq('status','pending').order('created_at');if(error)throw error;return (data??[]) as GuildApplication[];}
export async function reviewGuildApplication(applicationId:string,accept:boolean){const client=requireClient();const {data,error}=await client.rpc('review_guild_application',{p_application_id:applicationId,p_accept:accept});if(error)throw error;return data as 'accepted'|'declined';}
export async function myGuild(){const client=requireClient();const {data:{session},error:userError}=await client.auth.getSession();if(userError)throw userError;const user=session?.user;if(!user)throw new Error('Sign in before viewing a guild.');const {data,error}=await client.from('guild_members').select('guild_id,role').eq('account_id',user.id).maybeSingle();if(error)throw error;return data?{...(data as {guild_id:string;role:'leader'|'officer'|'member'}),account_id:user.id}:null;}
export async function guildDetails(guildId:string){return await readGuildProjection(guildId) as unknown as OnlineGuild;}
export async function updateGuildCustomization(input:{bannerId:GuildBannerId;profileFrameId:GuildFrameId;nameplateId:GuildNameplateId;motto:string}){const client=requireClient();const {data,error}=await client.rpc('update_guild_customization',{p_banner_id:input.bannerId,p_profile_frame_id:input.profileFrameId,p_nameplate_id:input.nameplateId,p_motto:input.motto});if(error)throw error;return (data?.[0]??null) as {guild_id:string;banner_id:GuildBannerId;profile_frame_id:GuildFrameId;nameplate_id:GuildNameplateId;motto:string}|null;}
export async function guildAppearanceEntitlements(){const client=requireClient();const {data,error}=await client.rpc('guild_appearance_entitlements_v4');if(error)throw error;const row=data?.[0];return {guildLevel:Number(row?.guild_level??1),bannerGalleryTier:Number(row?.banner_gallery_tier??0),pveAchievementIds:(row?.pve_achievement_ids??[]) as string[],eventCosmeticIds:(row?.event_cosmetic_ids??[]) as string[],revealedEventColorIds:(row?.revealed_event_color_ids??[]) as string[]} satisfies GuildAppearanceEntitlements;}
export async function updateGuildAppearance(input:{backgroundId:GuildBackgroundId;bannerId:GuildBannerId;borderId:GuildFrameId;nameColorId:GuildNameColorId;tagColorId:GuildTagColorId;nameplateId:GuildNameplateId;motto:string}){const client=requireClient();let {data,error}=await client.rpc('update_guild_appearance_with_background_v3',{p_background_id:input.backgroundId,p_banner_id:input.bannerId,p_border_id:input.borderId,p_name_color_id:input.nameColorId,p_tag_color_id:input.tagColorId,p_nameplate_id:input.nameplateId,p_motto:input.motto});if(error)throw error;if(!data?.[0])throw new Error('Guild appearance update was not confirmed.');return data[0] as {background_id?:GuildBackgroundId;guild_id:string;banner_id:GuildBannerId;border_id:GuildFrameId;name_color_id:GuildNameColorId;tag_color_id:GuildTagColorId;nameplate_id:GuildNameplateId;motto:string;revision:number}|undefined;}
export type GuildWeeklyState={guild_id:string;project_progress:number;project_goal:number;boss_hp:number;boss_max_hp:number};
export async function guildWeeklyState(){const client=requireClient();const {data,error}=await client.rpc('guild_weekly_state');if(error)throw error;return (data?.[0]??null) as GuildWeeklyState|null;}
export async function guildContribute(kind:'project'|'boss',amount:number){const client=requireClient();const {data,error}=await client.rpc('guild_contribute',{p_kind:kind,p_amount:amount});if(error)throw error;return (data?.[0]??null) as {project_progress:number;boss_hp:number}|null;}
export async function searchPlayers(query:string){const client=requireClient();const clean=query.trim();if(clean.length<2)throw new Error('Enter at least two characters.');const {data,error}=await client.rpc('social_player_search',{p_query:clean,p_limit:20});if(error)throw error;return withGuildIdentities((data??[]) as FriendSearchResult[]);}
export async function friends(){const client=requireClient();const {data,error}=await client.rpc('friend_list');if(error)throw error;return withGuildIdentities((data??[]) as FriendEntry[]);}
export async function friendRequests(){const client=requireClient();const {data,error}=await client.rpc('friend_request_list');if(error)throw error;return withGuildIdentities((data??[]) as FriendRequest[]);}
export async function friendRelationshipState(accountId:string):Promise<{relationship:FriendRelationship;requestId?:string}>{
 const client=requireClient();
 const [{data:friendData,error:friendError},{data:requestData,error:requestError}]=await Promise.all([
  client.rpc('friend_list'),
  client.rpc('friend_request_list'),
 ]);
 if(friendError)throw friendError;if(requestError)throw requestError;
 const friend=((friendData??[]) as FriendEntry[]).find(row=>row.account_id===accountId);
 if(friend)return {relationship:'friend'};
 const request=((requestData??[]) as FriendRequest[]).find(row=>row.account_id===accountId);
 if(request)return {relationship:request.direction==='incoming'?'incoming_pending':'outgoing_pending',requestId:request.request_id};
 return {relationship:'none'};
}
export async function sendFriendRequest(accountId:string){const client=requireClient();const {data,error}=await client.rpc('send_friend_request',{p_target_account_id:accountId});if(error)throw error;return data as 'sent'|'already_friends'|'already_pending'|'incoming_request_exists';}
export async function respondFriendRequest(requestId:string,accept:boolean){const client=requireClient();const {data,error}=await client.rpc('respond_friend_request',{p_request_id:requestId,p_accept:accept});if(error)throw error;return data as 'accepted'|'declined';}
export async function cancelFriendRequest(requestId:string){const client=requireClient();const {error}=await client.rpc('cancel_friend_request',{p_request_id:requestId});if(error)throw error;}
export async function removeFriend(accountId:string){const client=requireClient();const {error}=await client.rpc('remove_friend',{p_target_account_id:accountId});if(error)throw error;}
export async function setPlayerBlocked(accountId:string,blocked:boolean){const client=requireClient();const {error}=await client.rpc('set_player_block',{p_target_account_id:accountId,p_blocked:blocked});if(error)throw error;}
export async function blockedPlayers(){const client=requireClient();const {data,error}=await client.rpc('blocked_player_list');if(error)throw error;return withGuildIdentities((data??[]) as BlockedPlayer[]);}

export async function socialInvitations(){const client=requireClient();const {data,error}=await client.rpc('social_invitation_state_v1');if(error)throw error;return data as SocialInvitationState;}
export async function socialInviteCapabilities(accountId:string){const client=requireClient();const {data,error}=await client.rpc('social_invite_capabilities_v1',{p_target_account_id:accountId});if(error)throw error;return data as SocialInviteCapabilities;}
export async function sendPartyInvitation(accountId:string){const client=requireClient();const {data,error}=await client.rpc('send_party_invitation_v1',{p_target_account_id:accountId});if(error)throw error;return data as {id:string;status:'sent'|'already_pending';expiresAt:string};}
export async function respondPartyInvitation(invitationId:string,accept:boolean,characterId?:string|null){const client=requireClient();const {data,error}=await client.rpc('respond_party_invitation_v1',{p_invitation_id:invitationId,p_accept:accept,p_character_id:characterId??null});if(error)throw error;return data as 'accepted'|'declined';}
export async function sendGuildInvitation(accountId:string){const client=requireClient();const {data,error}=await client.rpc('send_guild_invitation_v1',{p_target_account_id:accountId});if(error)throw error;return data as {id:string;status:'sent'|'already_pending';expiresAt:string};}
export async function respondGuildInvitation(invitationId:string,accept:boolean){const client=requireClient();const {data,error}=await client.rpc('respond_guild_invitation_v1',{p_invitation_id:invitationId,p_accept:accept});if(error)throw error;return data as 'accepted'|'declined';}
export async function socialOutgoingInvitations(){const client=requireClient();const {data,error}=await client.rpc('social_outgoing_invitation_state_v1');if(error)throw error;return data as SocialOutgoingInvitationState;}
export async function cancelGuildInvitation(invitationId:string){const client=requireClient();const {data,error}=await client.rpc('cancel_guild_invitation_v1',{p_invitation_id:invitationId});if(error)throw error;return data as 'cancelled';}
export async function updateGuildMemberRole(accountId:string,role:'officer'|'member'){const client=requireClient();const {data,error}=await client.rpc('update_guild_member_role_v1',{p_target_account_id:accountId,p_role:role});if(error)throw error;return data as 'officer'|'member';}
export async function removeGuildMember(accountId:string){const client=requireClient();const {data,error}=await client.rpc('remove_guild_member_v1',{p_target_account_id:accountId});if(error)throw error;return data as 'removed';}
export function guildChatCommandKey(){return `guild-chat-${Date.now()}-${Math.random().toString(36).slice(2,14)}`;}
export async function guildChatState(limit=CHAT_RECENT_MESSAGE_LIMIT){const client=requireClient();const {data,error}=await client.rpc('guild_chat_state_v1',{p_limit:limit});if(error)throw error;const state=data as GuildChatState;if(!state?.messages?.length)return state;return {...state,messages:await withChatIdentities(state.messages)};}
export async function sendGuildChat(body:string,idempotencyKey:string){const client=requireClient();const {data,error}=await client.rpc('send_guild_chat_v1',{p_body:body,p_idempotency_key:idempotencyKey});if(error)throw error;return data as string;}
export async function socialChatAttention(){const client=requireClient();const {data,error}=await client.rpc('social_chat_attention_state_v1');if(error)throw error;return data as SocialChatAttentionState;}
export async function markSocialChatRead(channelType:'guild'|'party',channelId:string,messageId:string){const client=requireClient();const {data,error}=await client.rpc('mark_social_chat_read_v2',{p_channel_type:channelType,p_channel_id:channelId,p_message_id:messageId});if(error)throw error;return data as {channelType:'guild'|'party';channelId:string;readAt:string;readMessageId:string};}

export async function guildNoticeBoardState():Promise<GuildNoticeBoardState|null>{const client=requireClient();const {data,error}=await client.rpc('guild_notice_board_state_v1');if(error)throw error;const row=(data?.[0]??null) as {guild_id:string;body:string;updated_at?:string|null;updated_by_account_id?:string|null;can_edit:boolean}|null;return row?{guildId:row.guild_id,body:row.body??'',updatedAt:row.updated_at??null,updatedByAccountId:row.updated_by_account_id??null,canEdit:row.can_edit===true}:null;}
export async function updateGuildNoticeBoard(body:string):Promise<GuildNoticeBoardState>{const client=requireClient();const clean=body.trim();if(clean.length>280)throw new Error('Guild notices can be at most 280 characters.');const {data,error}=await client.rpc('update_guild_notice_board_v1',{p_body:clean});if(error)throw error;const row=data?.[0] as {guild_id:string;body:string;updated_at?:string|null;updated_by_account_id?:string|null;can_edit:boolean}|undefined;if(!row)throw new Error('Guild notice update was not confirmed.');return{guildId:row.guild_id,body:row.body??'',updatedAt:row.updated_at??null,updatedByAccountId:row.updated_by_account_id??null,canEdit:row.can_edit===true};}

export async function guildLeadershipStatus(){const client=requireClient();const {data,error}=await client.rpc('guild_leadership_status_v1');if(error)throw error;return data as GuildLeadershipStatus|null;}
export async function transferGuildLeadership(accountId:string){const client=requireClient();const {data,error}=await client.rpc('transfer_guild_leadership_v1',{p_target_account_id:accountId});if(error)throw error;return data as 'transferred';}
export async function leaveGuild(){const client=requireClient();const {data,error}=await client.rpc('leave_guild_v1');if(error)throw error;return data as 'left';}
export async function disbandGuild(){const client=requireClient();const {data,error}=await client.rpc('disband_guild_v1');if(error)throw error;return data as 'disbanded';}
export async function reportSocialPlayer(accountId:string,reason:SocialReportReason,messageId?:string){const client=requireClient();const {data,error}=await client.rpc('report_social_player_v1',{p_target_account_id:accountId,p_reason:reason,p_message_id:messageId??null});if(error)throw error;return data as 'submitted'|'already_reported';}


export async function updateOnlinePlayerNameStyle(style:PlayerNameStylePreference,accountId:string){
 const client=requireClient();
 return writePlayerNameStyleForAccount(accountId,style,{
  session:async()=>{const {data:{session},error}=await client.auth.getSession();if(error)throw error;return session?{accountId:session.user.id,accessToken:session.access_token}:null;},
  write:async(preference,accessToken)=>{
   const {data,error}=await client.rpc('update_player_name_style_v1',{p_mode:preference.mode,p_solid_color:preference.solidColor??null,p_gradient_colors:preference.gradientColors??[],p_animation:preference.animation??'none'}).setHeader('Authorization',`Bearer ${accessToken}`);
   if(error)throw error;return data as PlayerNameStylePreference;
  },
 });
}
export async function guildPveBoard(){const {data,error}=await requireClient().rpc('guild_pve_board_v1');if(error)throw error;return (data??[]) as import('../core/guild-pve-encounters').GuildPveEncounter[];}
export async function claimGuildPve(encounterId:string,milestone:number){const {data,error}=await requireClient().rpc('claim_guild_pve_v1',{p_encounter:encounterId,p_milestone:milestone});if(error)throw error;return data as {alreadyClaimed:boolean;gold?:number};}
