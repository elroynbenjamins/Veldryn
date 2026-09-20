import {useCallback,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {friendRequests,guildApplications,myGuild,socialInvitations} from './social';
import {useAuthSession} from './AuthSessionProvider';

export interface SocialNotificationCounts{
  friendRequests:number;
  chatUnread:number;
  guild:number;
  guildApplications:number;
  guildInvites:number;
  party:number;
  partyInvites:number;
  events:number;
  account:number;
}

const ZERO:SocialNotificationCounts={friendRequests:0,chatUnread:0,guild:0,guildApplications:0,guildInvites:0,party:0,partyInvites:0,events:0,account:0};

export function useSocialNotificationCounts(){
  const {session}=useAuthSession();
  const [counts,setCounts]=useState<SocialNotificationCounts>(ZERO);
  const refresh=useCallback(async()=>{
    if(!session||session.user.is_anonymous){setCounts(ZERO);return;}
    try{
      const requests=await friendRequests();
      const incoming=requests.filter(request=>request.direction==='incoming').length;
      let guildApplicationsCount=0,guildInvites=0,partyInvites=0;
      try{
        const invites=await socialInvitations();
        guildInvites=invites.guild.length;partyInvites=invites.party.length;
      }catch{/* Invitation polling is best-effort during migration rollout. */}
      try{
        const mine=await myGuild();
        if(mine&&(mine.role==='leader'||mine.role==='officer'))guildApplicationsCount=(await guildApplications(mine.guild_id)).length;
      }catch{/* Guild application attention must not suppress other social counts. */}
      setCounts(current=>{
        const guild=guildApplicationsCount+guildInvites,party=partyInvites;
        const next={...current,friendRequests:incoming,guild,guildApplications:guildApplicationsCount,guildInvites,party,partyInvites};
        return {...next,account:next.friendRequests+next.chatUnread+next.guild+next.party+next.events};
      });
    }catch{
      // Notification polling must never interrupt gameplay or sign-in.
    }
  },[session?.user.id,session?.user.is_anonymous]);
  useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),30000);const sub=AppState.addEventListener('change',status=>{if(status==='active')void refresh();});return()=>{clearInterval(id);sub.remove();}},[refresh]);
  return {counts,refresh};
}
