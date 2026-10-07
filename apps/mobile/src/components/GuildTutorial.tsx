import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {GuildTutorialGuide} from './GuildTutorialGuide';
import {createGuildTutorialStore,type GuildTutorialDestination,type GuildTutorialProgress} from '../core/guild-tutorial';
import {useAuthSession} from '../online/AuthSessionProvider';
import {myGuild} from '../online/social';

const preferences=createGuildTutorialStore(AsyncStorage);
export function GuildTutorial({membershipRevision=0,home,onNavigate,onReveal,reduceMotion=false,destination}:{membershipRevision?:number;home:boolean;reduceMotion?:boolean;destination?:GuildTutorialDestination|null;onNavigate:(destination:GuildTutorialDestination)=>void;onReveal:()=>void}){
 const {session}=useAuthSession();
 // Remount all transient state when the signed-in account changes.
 return session?.user.id?<AccountGuildTutorial key={session.user.id} accountId={session.user.id} membershipRevision={membershipRevision} home={home} onNavigate={onNavigate} onReveal={onReveal} reduceMotion={reduceMotion} destination={destination}/>:null;
}
function AccountGuildTutorial({accountId,membershipRevision,home,onNavigate,onReveal,reduceMotion,destination}:{accountId:string;membershipRevision:number;home:boolean;reduceMotion:boolean;destination?:GuildTutorialDestination|null;onNavigate:(destination:GuildTutorialDestination)=>void;onReveal:()=>void}){
 const [member,setMember]=useState<'member'|'officer'|'leader'|null>(null),[progress,setProgress]=useState<GuildTutorialProgress|null>(null);
 useEffect(()=>{let alive=true;void preferences.load(accountId).then(next=>{if(alive)setProgress(next)});return()=>{alive=false}},[accountId]);
 useEffect(()=>{
  let alive=true,pending=false;
  const refresh=async()=>{if(pending)return;pending=true;try{const guild=await myGuild();if(alive)setMember(guild?.account_id===accountId?guild.role:null)}catch{/* A failed membership check must not welcome a non-member. */}finally{pending=false}};
  void refresh();
  const foreground=AppState.addEventListener('change',state=>{if(state==='active')void refresh()});
  // Includes applications approved while this screen remains open.
  const timer=setInterval(()=>{if(AppState.currentState!=='background')void refresh()},15000);
  return()=>{alive=false;clearInterval(timer);foreground.remove()};
 },[accountId,membershipRevision]);
 const active=member&&progress?.status==='active';
 useEffect(()=>{if(active)onReveal()},[active,progress?.step,onReveal]);
 if(!member||!progress)return null;
 const update=(next:GuildTutorialProgress)=>{setProgress(next);void preferences.save(accountId,next)};
 return <GuildTutorialGuide progress={progress} role={member} home={home} reduceMotion={reduceMotion} destination={destination} onProgress={update} onNavigate={onNavigate} onReveal={onReveal}/>;
}
