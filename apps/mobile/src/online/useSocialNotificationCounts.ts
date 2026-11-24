import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {friendRequests,guildApplications,myGuild,socialChatAttention,socialInvitations} from './social';
import {useAuthSession} from './AuthSessionProvider';
import {claimableOnlineGuildProjectRewardCount} from './guild-projects-v18';

export interface SocialNotificationCounts{
  friendRequests:number;
  chatUnread:number;
  chatMentions:number;
  guildChatUnread:number;
  guildChatMentions:number;
  guildFirstUnreadMessageId?:string;
  partyChatUnread:number;
  partyChatMentions:number;
  partyFirstUnreadMessageId?:string;
  guild:number;
  guildApplications:number;
  guildInvites:number;
  guildProjectRewards:number;
  party:number;
  partyInvites:number;
  events:number;
  account:number;
}

const ZERO:SocialNotificationCounts={friendRequests:0,chatUnread:0,chatMentions:0,guildChatUnread:0,guildChatMentions:0,guildFirstUnreadMessageId:undefined,partyChatUnread:0,partyChatMentions:0,partyFirstUnreadMessageId:undefined,guild:0,guildApplications:0,guildInvites:0,guildProjectRewards:0,party:0,partyInvites:0,events:0,account:0};

export function useSocialNotificationCounts(){
  const {session}=useAuthSession(),accountId=session?.user.id;
  const [counts,setCounts]=useState<SocialNotificationCounts>(ZERO);
  const activeAccount=useRef(accountId),countsAccount=useRef(accountId),inFlight=useRef<{accountId:string;promise:Promise<void>;refreshAgain:boolean}|null>(null);
  activeAccount.current=accountId;
  const refresh=useCallback((force=true)=>{
    if(activeAccount.current!==accountId)return Promise.resolve();
    if(!accountId){countsAccount.current=accountId;setCounts(ZERO);return Promise.resolve();}
    if(inFlight.current?.accountId===accountId){if(force)inFlight.current.refreshAgain=true;return inFlight.current.promise;}
    const request={accountId,promise:Promise.resolve(),refreshAgain:false};inFlight.current=request;
    const promise=(async()=>{
    do{
    request.refreshAgain=false;
    try{
      const [requests,invites,chat,mine]=await Promise.all([
        friendRequests(),
        socialInvitations().catch(()=>null),
        socialChatAttention().catch(()=>null),
        myGuild().catch(()=>null),
      ]);
      if(inFlight.current!==request||activeAccount.current!==accountId)return;
      // These reads depend on the same guild snapshot, not on each other.
      const [guildProjectRewards,guildApplicationsCount]=await Promise.all([
        mine?claimableOnlineGuildProjectRewardCount(mine).catch(()=>0):Promise.resolve(0),
        mine&&(mine.role==='leader'||mine.role==='officer')?guildApplications(mine.guild_id).then(rows=>rows.length).catch(()=>0):Promise.resolve(0),
      ]);
      const incoming=requests.filter(request=>request.direction==='incoming').length;
      let guildInvites=0,partyInvites=0;
      let chatAttention:{guildUnread:number;guildMentions:number;guildFirstUnreadMessageId?:string;partyUnread:number;partyMentions:number;partyFirstUnreadMessageId?:string}|null=null;
      if(invites){guildInvites=invites.guild.length;partyInvites=invites.party.length;}
      if(chat)chatAttention={guildUnread:Number(chat.guild?.unread??0),guildMentions:Number(chat.guild?.mentions??0),guildFirstUnreadMessageId:chat.guild?.firstUnreadMessageId??undefined,partyUnread:Number(chat.party?.unread??0),partyMentions:Number(chat.party?.mentions??0),partyFirstUnreadMessageId:chat.party?.firstUnreadMessageId??undefined};
      if(inFlight.current!==request||activeAccount.current!==accountId)return;
      countsAccount.current=accountId;
      setCounts(current=>{
        const guild=guildApplicationsCount+guildInvites,party=partyInvites;
        const guildChatUnread=chatAttention?.guildUnread??current.guildChatUnread,guildChatMentions=chatAttention?.guildMentions??current.guildChatMentions;
        const guildFirstUnreadMessageId=chatAttention?chatAttention.guildFirstUnreadMessageId:current.guildFirstUnreadMessageId;
        const partyChatUnread=chatAttention?.partyUnread??current.partyChatUnread,partyChatMentions=chatAttention?.partyMentions??current.partyChatMentions;
        const partyFirstUnreadMessageId=chatAttention?chatAttention.partyFirstUnreadMessageId:current.partyFirstUnreadMessageId;
        const chatUnread=guildChatUnread+partyChatUnread,chatMentions=guildChatMentions+partyChatMentions;
        const next={...current,friendRequests:incoming,chatUnread,chatMentions,guildChatUnread,guildChatMentions,guildFirstUnreadMessageId,partyChatUnread,partyChatMentions,partyFirstUnreadMessageId,guild,guildApplications:guildApplicationsCount,guildInvites,guildProjectRewards,party,partyInvites};
        const complete={...next,account:next.friendRequests+next.chatUnread+next.guild+next.guildProjectRewards+next.party+next.events};
        // Preserve referential identity when a poll changes no visible badge.
        return (Object.keys(complete) as (keyof SocialNotificationCounts)[]).every(k=>Object.is(complete[k],current[k]))?current:complete;
      });
    }catch{
      // Notification polling must never interrupt gameplay or sign-in.
    }
    // A read acknowledgement or invitation action may finish during the old
    // snapshot request. One serial reread keeps its badge update from being lost.
    }while(request.refreshAgain&&inFlight.current===request&&activeAccount.current===accountId);
    })().finally(()=>{if(inFlight.current===request)inFlight.current=null;});
    request.promise=promise;return promise;
  },[accountId]);
  useEffect(()=>{
    inFlight.current=null;countsAccount.current=accountId;setCounts(ZERO);
    let previous=AppState.currentState;
    let id:ReturnType<typeof setInterval>|undefined;
    const stop=()=>{if(id!==undefined){clearInterval(id);id=undefined;}};
    const start=()=>{if(accountId&&id===undefined)id=setInterval(()=>{if(AppState.currentState==='active')void refresh(false);},30000);};
    // Keep the initial authenticated refresh even when native state is unknown.
    if(accountId&&previous!=='background'&&previous!=='inactive')void refresh(false);
    if(previous==='active')start();
    const sub=AppState.addEventListener('change',status=>{
      const resumed=previous!=='active'&&status==='active';previous=status;
      if(status==='active'){start();if(resumed&&accountId)void refresh();}
      else stop();
    });
    return()=>{inFlight.current=null;stop();sub.remove();};
  },[accountId,refresh]);
  return {counts:countsAccount.current===accountId?counts:ZERO,refresh};
}
