import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {friendRequests,guildApplications,myGuild,socialChatAttention,socialInvitations} from './social';
import {useAuthSession} from './AuthSessionProvider';

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
  party:number;
  partyInvites:number;
  events:number;
  account:number;
}

const ZERO:SocialNotificationCounts={friendRequests:0,chatUnread:0,chatMentions:0,guildChatUnread:0,guildChatMentions:0,guildFirstUnreadMessageId:undefined,partyChatUnread:0,partyChatMentions:0,partyFirstUnreadMessageId:undefined,guild:0,guildApplications:0,guildInvites:0,party:0,partyInvites:0,events:0,account:0};

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
      const requests=await friendRequests();
      const incoming=requests.filter(request=>request.direction==='incoming').length;
      let guildApplicationsCount=0,guildInvites=0,partyInvites=0;
      let chatAttention:{guildUnread:number;guildMentions:number;guildFirstUnreadMessageId?:string;partyUnread:number;partyMentions:number;partyFirstUnreadMessageId?:string}|null=null;
      try{
        const invites=await socialInvitations();
        guildInvites=invites.guild.length;partyInvites=invites.party.length;
      }catch{/* Invitation polling is best-effort during migration rollout. */}
      try{
        const chat=await socialChatAttention();
        chatAttention={guildUnread:Number(chat.guild?.unread??0),guildMentions:Number(chat.guild?.mentions??0),guildFirstUnreadMessageId:chat.guild?.firstUnreadMessageId??undefined,partyUnread:Number(chat.party?.unread??0),partyMentions:Number(chat.party?.mentions??0),partyFirstUnreadMessageId:chat.party?.firstUnreadMessageId??undefined};
      }catch{/* Chat attention is best-effort during migration rollout. */}
      try{
        const mine=await myGuild();
        if(mine&&(mine.role==='leader'||mine.role==='officer'))guildApplicationsCount=(await guildApplications(mine.guild_id)).length;
      }catch{/* Guild application attention must not suppress other social counts. */}
      if(inFlight.current!==request||activeAccount.current!==accountId)return;
      countsAccount.current=accountId;
      setCounts(current=>{
        const guild=guildApplicationsCount+guildInvites,party=partyInvites;
        const guildChatUnread=chatAttention?.guildUnread??current.guildChatUnread,guildChatMentions=chatAttention?.guildMentions??current.guildChatMentions;
        const guildFirstUnreadMessageId=chatAttention?chatAttention.guildFirstUnreadMessageId:current.guildFirstUnreadMessageId;
        const partyChatUnread=chatAttention?.partyUnread??current.partyChatUnread,partyChatMentions=chatAttention?.partyMentions??current.partyChatMentions;
        const partyFirstUnreadMessageId=chatAttention?chatAttention.partyFirstUnreadMessageId:current.partyFirstUnreadMessageId;
        const chatUnread=guildChatUnread+partyChatUnread,chatMentions=guildChatMentions+partyChatMentions;
        const next={...current,friendRequests:incoming,chatUnread,chatMentions,guildChatUnread,guildChatMentions,guildFirstUnreadMessageId,partyChatUnread,partyChatMentions,partyFirstUnreadMessageId,guild,guildApplications:guildApplicationsCount,guildInvites,party,partyInvites};
        return {...next,account:next.friendRequests+next.chatUnread+next.guild+next.party+next.events};
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
    inFlight.current=null;countsAccount.current=accountId;setCounts(ZERO);void refresh(false);
    let previous=AppState.currentState;
    const id=setInterval(()=>{if(AppState.currentState==='active')void refresh(false);},30000);
    const sub=AppState.addEventListener('change',status=>{const resumed=previous!=='active'&&status==='active';previous=status;if(resumed)void refresh();});
    return()=>{inFlight.current=null;clearInterval(id);sub.remove();};
  },[accountId,refresh]);
  return {counts:countsAccount.current===accountId?counts:ZERO,refresh};
}
