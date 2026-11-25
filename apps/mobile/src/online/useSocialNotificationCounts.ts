import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {incomingFriendRequestCount,guildApplications,myGuild,socialChatAttention,socialInvitations} from './social';
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
  const confirmedGuild=useRef<string|null>(null);
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
      const loadGuildCounts=async()=>{
        const mine=await myGuild().catch(()=>undefined);
        // Do not start dependent reads after the owning account has changed.
        if(inFlight.current!==request||activeAccount.current!==accountId||(mine&&mine.account_id!==accountId))return null;
        // Start both guild reads as soon as membership is known, rather than
        // waiting for unrelated friend/invitation/chat requests to finish.
        const [guildProjectRewards,guildApplicationsCount]=await Promise.all([
          mine?claimableOnlineGuildProjectRewardCount(mine).catch(()=>undefined):mine===null?0:undefined,
          mine&&(mine.role==='leader'||mine.role==='officer')?guildApplications(mine.guild_id).then(rows=>rows.length).catch(()=>undefined):mine===undefined?undefined:0,
        ]);
        return {mine,guildProjectRewards,guildApplicationsCount};
      };
      const [incoming,invites,chat,guildCounts]=await Promise.all([
        incomingFriendRequestCount().catch(()=>undefined),
        socialInvitations().catch(()=>null),
        socialChatAttention().catch(()=>null),
        loadGuildCounts(),
      ]);
      if(!guildCounts||inFlight.current!==request||activeAccount.current!==accountId)return;
      const {mine,guildProjectRewards,guildApplicationsCount}=guildCounts;
      let guildInvites:number|undefined,partyInvites:number|undefined;
      let chatAttention:{guildUnread:number;guildMentions:number;guildFirstUnreadMessageId?:string;partyUnread:number;partyMentions:number;partyFirstUnreadMessageId?:string}|null=null;
      if(invites){guildInvites=invites.guild.length;partyInvites=invites.party.length;}
      if(chat)chatAttention={guildUnread:Number(chat.guild?.unread??0),guildMentions:Number(chat.guild?.mentions??0),guildFirstUnreadMessageId:chat.guild?.firstUnreadMessageId??undefined,partyUnread:Number(chat.party?.unread??0),partyMentions:Number(chat.party?.mentions??0),partyFirstUnreadMessageId:chat.party?.firstUnreadMessageId??undefined};
      if(inFlight.current!==request||activeAccount.current!==accountId)return;
      countsAccount.current=accountId;
      const guildChanged=mine!==undefined&&confirmedGuild.current!==(mine?.guild_id??null);
      if(mine!==undefined)confirmedGuild.current=mine?.guild_id??null;
      setCounts(current=>{
        const applications=guildApplicationsCount??(guildChanged?0:current.guildApplications);
        const guildInviteCount=guildInvites??current.guildInvites,partyInviteCount=partyInvites??current.partyInvites;
        const guild=applications+guildInviteCount,party=partyInviteCount;
        const guildChatUnread=chatAttention?.guildUnread??current.guildChatUnread,guildChatMentions=chatAttention?.guildMentions??current.guildChatMentions;
        const guildFirstUnreadMessageId=chatAttention?chatAttention.guildFirstUnreadMessageId:current.guildFirstUnreadMessageId;
        const partyChatUnread=chatAttention?.partyUnread??current.partyChatUnread,partyChatMentions=chatAttention?.partyMentions??current.partyChatMentions;
        const partyFirstUnreadMessageId=chatAttention?chatAttention.partyFirstUnreadMessageId:current.partyFirstUnreadMessageId;
        const chatUnread=guildChatUnread+partyChatUnread,chatMentions=guildChatMentions+partyChatMentions;
        const next={...current,friendRequests:incoming??current.friendRequests,chatUnread,chatMentions,guildChatUnread,guildChatMentions,guildFirstUnreadMessageId,partyChatUnread,partyChatMentions,partyFirstUnreadMessageId,guild,guildApplications:applications,guildInvites:guildInviteCount,guildProjectRewards:guildProjectRewards??(guildChanged?0:current.guildProjectRewards),party,partyInvites:partyInviteCount};
        return {...next,account:next.friendRequests+next.chatUnread+next.guild+next.guildProjectRewards+next.party+next.events};
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
    inFlight.current=null;confirmedGuild.current=null;countsAccount.current=accountId;setCounts(ZERO);
    let previous=AppState.currentState,stopped=false,generation=0;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const clearTimer=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
    const active=()=>AppState.currentState==='active'||AppState.currentState===null;
    const poll=async(force=false)=>{
      clearTimer();const current=++generation;
      if(stopped||!accountId||!active())return;
      await refresh(force);
      if(!stopped&&current===generation&&active())timer=setTimeout(()=>void poll(),30000);
    };
    void poll();
    const sub=AppState.addEventListener('change',status=>{const resumed=previous!=='active'&&status==='active';previous=status;if(status!=='active'){generation++;clearTimer();}else if(resumed)void poll(true);});
    return()=>{stopped=true;generation++;inFlight.current=null;clearTimer();sub.remove();};
  },[accountId,refresh]);
  return {counts:countsAccount.current===accountId?counts:ZERO,refresh};
}
