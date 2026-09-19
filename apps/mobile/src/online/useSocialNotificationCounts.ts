import {useCallback,useEffect,useState} from 'react';
import {friendRequests} from './social';
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
      setCounts(current=>{
        const next={...current,friendRequests:incoming};
        return {...next,account:next.friendRequests+next.chatUnread+next.guild+next.party+next.events};
      });
    }catch{
      // Notification polling must never interrupt gameplay or sign-in.
    }
  },[session?.user.id,session?.user.is_anonymous]);
  useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),30000);return()=>clearInterval(id);},[refresh]);
  return {counts,refresh};
}
