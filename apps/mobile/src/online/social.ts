import {supabase} from './supabase';

export const WORLD_CHANNELS=[
  {id:'world-1',name:'World 1',language:'English'},
  {id:'world-2',name:'World 2',language:'Español'},
  {id:'world-3',name:'World 3',language:'Global'},
  {id:'world-4',name:'World 4',language:'Global'},
] as const;
export type WorldMessage={id:string;sender_name:string;body:string;created_at:string;account_id:string};
export type OnlineGuild={id:string;name:string;level:number;member_cap:number;minimum_level:number;join_policy:'open'|'apply'|'invite'};
export type GuildMember={account_id:string;display_name:string;role:'leader'|'officer'|'member';joined_at:string};
export type GuildApplication={id:string;account_id:string;created_at:string;status:'pending'|'accepted'|'declined'|'withdrawn'};
export type FriendRelationship='none'|'friend'|'outgoing_pending'|'incoming_pending';
export type FriendProfile={account_id:string;display_name:string;character_name:string|null;class_id:string|null;level:number|null;profile_title:string|null};
export type FriendSearchResult=FriendProfile&{relationship:FriendRelationship};
export type FriendEntry=FriendProfile&{friends_since:string};
export type FriendRequest={request_id:string;account_id:string;display_name:string;direction:'incoming'|'outgoing';created_at:string};
export type BlockedPlayer={account_id:string;display_name:string;blocked_at:string};

function requireClient(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
export async function worldMessages(channelId:string){const client=requireClient();const {data,error}=await client.from('chat_messages').select('id,account_id,sender_name,body,created_at').eq('channel_type','world').eq('channel_id',channelId).order('created_at',{ascending:true}).limit(50);if(error)throw error;return (data??[]) as WorldMessage[];}
export async function postWorldMessage(channelId:string,body:string,senderName:string){const client=requireClient();const clean=body.trim();if(!clean)throw new Error('Write a message first.');const {error}=await client.rpc('send_world_chat',{p_channel_id:channelId,p_body:clean,p_sender_name:senderName.slice(0,20)||'Adventurer'});if(error)throw error;}
export async function browseGuilds(){const client=requireClient();const {data,error}=await client.from('guilds').select('id,name,level,member_cap,minimum_level,join_policy').order('level',{ascending:false}).limit(25);if(error)throw error;return (data??[]) as OnlineGuild[];}
export async function requestGuildMembership(guildId:string){const client=requireClient();const {data,error}=await client.rpc('request_guild_membership',{p_guild_id:guildId});if(error)throw error;return data as 'joined'|'applied';}
export async function createOnlineGuild(name:string,joinPolicy:'open'|'apply'|'invite',minimumLevel:number){const client=requireClient();const {data,error}=await client.rpc('create_guild',{p_name:name.trim(),p_join_policy:joinPolicy,p_minimum_level:minimumLevel});if(error)throw error;return data as string;}
export async function guildRoster(guildId:string){const client=requireClient();const {data,error}=await client.rpc('guild_roster',{p_guild_id:guildId});if(error)throw error;return (data??[]) as GuildMember[];}
export async function guildApplications(guildId:string){const client=requireClient();const {data,error}=await client.from('guild_applications').select('id,account_id,created_at,status').eq('guild_id',guildId).eq('status','pending').order('created_at');if(error)throw error;return (data??[]) as GuildApplication[];}
export async function reviewGuildApplication(applicationId:string,accept:boolean){const client=requireClient();const {data,error}=await client.rpc('review_guild_application',{p_application_id:applicationId,p_accept:accept});if(error)throw error;return data as 'accepted'|'declined';}
export async function myGuild(){const client=requireClient();const {data:{user},error:userError}=await client.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Sign in before viewing a guild.');const {data,error}=await client.from('guild_members').select('guild_id,role').eq('account_id',user.id).maybeSingle();if(error)throw error;return data as {guild_id:string;role:'leader'|'officer'|'member'}|null;}
export type GuildWeeklyState={guild_id:string;project_progress:number;project_goal:number;boss_hp:number;boss_max_hp:number};
export async function guildWeeklyState(){const client=requireClient();const {data,error}=await client.rpc('guild_weekly_state');if(error)throw error;return (data?.[0]??null) as GuildWeeklyState|null;}
export async function guildContribute(kind:'project'|'boss',amount:number){const client=requireClient();const {data,error}=await client.rpc('guild_contribute',{p_kind:kind,p_amount:amount});if(error)throw error;return (data?.[0]??null) as {project_progress:number;boss_hp:number}|null;}
export async function searchPlayers(query:string){const client=requireClient();const clean=query.trim();if(clean.length<2)throw new Error('Enter at least two characters.');const {data,error}=await client.rpc('social_player_search',{p_query:clean,p_limit:20});if(error)throw error;return (data??[]) as FriendSearchResult[];}
export async function friends(){const client=requireClient();const {data,error}=await client.rpc('friend_list');if(error)throw error;return (data??[]) as FriendEntry[];}
export async function friendRequests(){const client=requireClient();const {data,error}=await client.rpc('friend_request_list');if(error)throw error;return (data??[]) as FriendRequest[];}
export async function sendFriendRequest(accountId:string){const client=requireClient();const {data,error}=await client.rpc('send_friend_request',{p_target_account_id:accountId});if(error)throw error;return data as 'sent'|'already_friends'|'already_pending'|'incoming_request_exists';}
export async function respondFriendRequest(requestId:string,accept:boolean){const client=requireClient();const {data,error}=await client.rpc('respond_friend_request',{p_request_id:requestId,p_accept:accept});if(error)throw error;return data as 'accepted'|'declined';}
export async function cancelFriendRequest(requestId:string){const client=requireClient();const {error}=await client.rpc('cancel_friend_request',{p_request_id:requestId});if(error)throw error;}
export async function removeFriend(accountId:string){const client=requireClient();const {error}=await client.rpc('remove_friend',{p_target_account_id:accountId});if(error)throw error;}
export async function setPlayerBlocked(accountId:string,blocked:boolean){const client=requireClient();const {error}=await client.rpc('set_player_block',{p_target_account_id:accountId,p_blocked:blocked});if(error)throw error;}
export async function blockedPlayers(){const client=requireClient();const {data,error}=await client.rpc('blocked_player_list');if(error)throw error;return (data??[]) as BlockedPlayer[];}
