"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_CHANNELS = void 0;
exports.worldMessages = worldMessages;
exports.postWorldMessage = postWorldMessage;
exports.browseGuilds = browseGuilds;
exports.requestGuildMembership = requestGuildMembership;
exports.createOnlineGuild = createOnlineGuild;
exports.guildRoster = guildRoster;
exports.guildApplications = guildApplications;
exports.reviewGuildApplication = reviewGuildApplication;
exports.myGuild = myGuild;
exports.guildWeeklyState = guildWeeklyState;
exports.guildContribute = guildContribute;
exports.searchPlayers = searchPlayers;
exports.friends = friends;
exports.friendRequests = friendRequests;
exports.sendFriendRequest = sendFriendRequest;
exports.respondFriendRequest = respondFriendRequest;
exports.cancelFriendRequest = cancelFriendRequest;
exports.removeFriend = removeFriend;
exports.setPlayerBlocked = setPlayerBlocked;
exports.blockedPlayers = blockedPlayers;
const supabase_1 = require("./supabase");
exports.WORLD_CHANNELS = [
    { id: 'world-1', name: 'English', language: 'English' },
    { id: 'world-2', name: 'Spanish', language: 'Spanish' },
    { id: 'world-3', name: 'Global 1', language: 'Global' },
    { id: 'world-4', name: 'Global 2', language: 'Global' },
];
function requireClient() { if (!supabase_1.supabase)
    throw new Error('Online services are not configured in this build.'); return supabase_1.supabase; }
async function worldMessages(channelId) { const client = requireClient(); const { data, error } = await client.from('chat_messages').select('id,account_id,sender_name,body,created_at').eq('channel_type', 'world').eq('channel_id', channelId).order('created_at', { ascending: true }).limit(50); if (error)
    throw error; return (data ?? []); }
async function postWorldMessage(channelId, body, senderName) { const client = requireClient(); const clean = body.trim(); if (!clean)
    throw new Error('Write a message first.'); const { error } = await client.rpc('send_world_chat', { p_channel_id: channelId, p_body: clean, p_sender_name: senderName.slice(0, 20) || 'Adventurer' }); if (error)
    throw error; }
async function browseGuilds() { const client = requireClient(); const { data, error } = await client.from('guilds').select('id,name,level,member_cap,minimum_level,join_policy').order('level', { ascending: false }).limit(25); if (error)
    throw error; return (data ?? []); }
async function requestGuildMembership(guildId) { const client = requireClient(); const { data, error } = await client.rpc('request_guild_membership', { p_guild_id: guildId }); if (error)
    throw error; return data; }
async function createOnlineGuild(name, joinPolicy, minimumLevel) { const client = requireClient(); const { data, error } = await client.rpc('create_guild', { p_name: name.trim(), p_join_policy: joinPolicy, p_minimum_level: minimumLevel }); if (error)
    throw error; return data; }
async function guildRoster(guildId) { const client = requireClient(); const { data, error } = await client.rpc('guild_roster', { p_guild_id: guildId }); if (error)
    throw error; return (data ?? []); }
async function guildApplications(guildId) { const client = requireClient(); const { data, error } = await client.from('guild_applications').select('id,account_id,created_at,status').eq('guild_id', guildId).eq('status', 'pending').order('created_at'); if (error)
    throw error; return (data ?? []); }
async function reviewGuildApplication(applicationId, accept) { const client = requireClient(); const { data, error } = await client.rpc('review_guild_application', { p_application_id: applicationId, p_accept: accept }); if (error)
    throw error; return data; }
async function myGuild() { const client = requireClient(); const { data: { user }, error: userError } = await client.auth.getUser(); if (userError)
    throw userError; if (!user)
    throw new Error('Sign in before viewing a guild.'); const { data, error } = await client.from('guild_members').select('guild_id,role').eq('account_id', user.id).maybeSingle(); if (error)
    throw error; return data; }
async function guildWeeklyState() { const client = requireClient(); const { data, error } = await client.rpc('guild_weekly_state'); if (error)
    throw error; return (data?.[0] ?? null); }
async function guildContribute(kind, amount) { const client = requireClient(); const { data, error } = await client.rpc('guild_contribute', { p_kind: kind, p_amount: amount }); if (error)
    throw error; return (data?.[0] ?? null); }
async function searchPlayers(query) { const client = requireClient(); const clean = query.trim(); if (clean.length < 2)
    throw new Error('Enter at least two characters.'); const { data, error } = await client.rpc('social_player_search', { p_query: clean, p_limit: 20 }); if (error)
    throw error; return (data ?? []); }
async function friends() { const client = requireClient(); const { data, error } = await client.rpc('friend_list'); if (error)
    throw error; return (data ?? []); }
async function friendRequests() { const client = requireClient(); const { data, error } = await client.rpc('friend_request_list'); if (error)
    throw error; return (data ?? []); }
async function sendFriendRequest(accountId) { const client = requireClient(); const { data, error } = await client.rpc('send_friend_request', { p_target_account_id: accountId }); if (error)
    throw error; return data; }
async function respondFriendRequest(requestId, accept) { const client = requireClient(); const { data, error } = await client.rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept }); if (error)
    throw error; return data; }
async function cancelFriendRequest(requestId) { const client = requireClient(); const { error } = await client.rpc('cancel_friend_request', { p_request_id: requestId }); if (error)
    throw error; }
async function removeFriend(accountId) { const client = requireClient(); const { error } = await client.rpc('remove_friend', { p_target_account_id: accountId }); if (error)
    throw error; }
async function setPlayerBlocked(accountId, blocked) { const client = requireClient(); const { error } = await client.rpc('set_player_block', { p_target_account_id: accountId, p_blocked: blocked }); if (error)
    throw error; }
async function blockedPlayers() { const client = requireClient(); const { data, error } = await client.rpc('blocked_player_list'); if (error)
    throw error; return (data ?? []); }
