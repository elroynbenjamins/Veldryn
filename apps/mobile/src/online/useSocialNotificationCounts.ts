import {useCallback,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {friendRequests,guildApplications,myGuild} from './social';
import {useAuthSession} from './AuthSessionProvider';

export interface SocialNotificationCounts{
  friendRequests:number;
  chatUnread:number;
  guild:number;
  party:number;
  events:number;
  account:number;
}

const ZERO:SocialNotificationCounts={friendRequests:0,chatUnread:0,guild:0,party:0,events:0,account:0};

export function useSocialNotificationCounts(){
  const {session}=useAuthSession();
  const [counts,setCounts]=useState<SocialNotificationCounts>(ZERO);
  const refresh=useCallback(async()=>{
    if(!session||session.user.is_anonymous){setCounts(ZERO);return;}
    try{
      const requests=await friendRequests();
      const incoming=requests.filter(request=>request.direction==='incoming').length;
      let guild=0;
      try{
        const mine=await myGuild();
        if(mine&&(mine.role==='leader'||mine.role==='officer'))guild=(await guildApplications(mine.guild_id)).length;
      }catch{/* Guild attention is best-effort and must not suppress friend request counts. */}
      setCounts(current=>{
        const next={...current,friendRequests:incoming,guild};
        return {...next,account:next.friendRequests+next.chatUnread+next.guild+next.party+next.events};
      });
    }catch{
      // Notification polling must never interrupt gameplay or sign-in.
    }
  },[session?.user.id,session?.user.is_anonymous]);
  useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),30000);const sub=AppState.addEventListener('change',status=>{if(status==='active')void refresh();});return()=>{clearInterval(id);sub.remove();}},[refresh]);
  return {counts,refresh};
}
