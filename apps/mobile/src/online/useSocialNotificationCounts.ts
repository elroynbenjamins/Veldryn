import {useCallback,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {friendRequests,guildApplications,myGuild,socialChatAttention,socialInvitations} from './social';
import {useAuthSession} from './AuthSessionProvider';

export interface SocialNotificationCounts{
  friendRequests:number;
  chatUnread:number;
  chatMentions:number;
  guildChatUnread:number;
  guildChatMentions:number;
  partyChatUnread:number;
  partyChatMentions:number;
  guild:number;
  guildApplications:number;
  guildInvites:number;
  party:number;
  partyInvites:number;
  events:number;
  account:number;
}

const ZERO:SocialNotificationCounts={friendRequests:0,chatUnread:0,chatMentions:0,guildChatUnread:0,guildChatMentions:0,partyChatUnread:0,partyChatMentions:0,guild:0,guildApplications:0,guildInvites:0,party:0,partyInvites:0,events:0,account:0};

export function useSocialNotificationCounts(){
  const {session}=useAuthSession();
  const [counts,setCounts]=useState<SocialNotificationCounts>(ZERO);
  const refresh=useCallback(async()=>{
    if(!session){setCounts(ZERO);return;}
    try{
      const requests=await friendRequests();
      const incoming=requests.filter(request=>request.direction==='incoming').length;
      let guildApplicationsCount=0,guildInvites=0,partyInvites=0;
      let chatAttention:{guildUnread:number;guildMentions:number;partyUnread:number;partyMentions:number}|null=null;
      try{
        const invites=await socialInvitations();
        guildInvites=invites.guild.length;partyInvites=invites.party.length;
      }catch{/* Invitation polling is best-effort during migration rollout. */}
      try{
        const chat=await socialChatAttention();
        chatAttention={guildUnread:Number(chat.guild?.unread??0),guildMentions:Number(chat.guild?.mentions??0),partyUnread:Number(chat.party?.unread??0),partyMentions:Number(chat.party?.mentions??0)};
      }catch{/* Chat attention is best-effort during migration rollout. */}
      try{
        const mine=await myGuild();
        if(mine&&(mine.role==='leader'||mine.role==='officer'))guildApplicationsCount=(await guildApplications(mine.guild_id)).length;
      }catch{/* Guild application attention must not suppress other social counts. */}
      setCounts(current=>{
        const guild=guildApplicationsCount+guildInvites,party=partyInvites;
        const guildChatUnread=chatAttention?.guildUnread??current.guildChatUnread,guildChatMentions=chatAttention?.guildMentions??current.guildChatMentions;
        const partyChatUnread=chatAttention?.partyUnread??current.partyChatUnread,partyChatMentions=chatAttention?.partyMentions??current.partyChatMentions;
        const chatUnread=guildChatUnread+partyChatUnread,chatMentions=guildChatMentions+partyChatMentions;
        const next={...current,friendRequests:incoming,chatUnread,chatMentions,guildChatUnread,guildChatMentions,partyChatUnread,partyChatMentions,guild,guildApplications:guildApplicationsCount,guildInvites,party,partyInvites};
        return {...next,account:next.friendRequests+next.chatUnread+next.guild+next.party+next.events};
      });
    }catch{
      // Notification polling must never interrupt gameplay or sign-in.
    }
  },[session?.user.id]);
  useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),15000);const sub=AppState.addEventListener('change',status=>{if(status==='active')void refresh();});return()=>{clearInterval(id);sub.remove();}},[refresh]);
  return {counts,refresh};
}
