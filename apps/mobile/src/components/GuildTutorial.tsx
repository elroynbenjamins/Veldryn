import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useState} from 'react';
import {GuildTutorialGuide} from './GuildTutorialGuide';
import {createGuildTutorialStore,type GuildTutorialDestination,type GuildTutorialProgress} from '../core/guild-tutorial';
import {useAuthSession} from '../online/AuthSessionProvider';

type GuildRole='member'|'officer'|'leader';
type Props={
 role:GuildRole|null;autoStart?:boolean;home:boolean;reduceMotion?:boolean;
 destination?:GuildTutorialDestination|null;
 onNavigate:(destination:GuildTutorialDestination)=>void;
 onReveal:()=>void;
};

const preferences=createGuildTutorialStore(AsyncStorage);

/** Membership is supplied by GuildScreen to avoid a second 15-second polling loop. */
export function GuildTutorial({role,autoStart=false,home,onNavigate,onReveal,reduceMotion=false,destination}:Props){
 const {session}=useAuthSession();
 return session?.user.id&&role
  ?<AccountGuildTutorial key={session.user.id} accountId={session.user.id} role={role}
    autoStart={autoStart} home={home} onNavigate={onNavigate} onReveal={onReveal}
    reduceMotion={reduceMotion} destination={destination}/>
  :null;
}

function AccountGuildTutorial({accountId,role,autoStart,home,onNavigate,onReveal,reduceMotion,destination}:Props&{accountId:string;role:GuildRole;autoStart:boolean}){
 const [progress,setProgress]=useState<GuildTutorialProgress|null>(null);
 useEffect(()=>{
  let alive=true;
  void preferences.load(accountId).then(next=>{if(alive)setProgress(next)});
  return()=>{alive=false};
 },[accountId]);
 useEffect(()=>{
  // Joining/creating a guild triggers the tour once. Existing members can opt in on Home.
  if(!autoStart||progress?.status!=='new')return;
  const next:GuildTutorialProgress={step:0,status:'active'};
  setProgress(next);
  void preferences.save(accountId,next);
 },[accountId,autoStart,progress?.status]);
 if(!progress)return null;
 const update=(next:GuildTutorialProgress)=>{setProgress(next);void preferences.save(accountId,next)};
 return <GuildTutorialGuide progress={progress} role={role} home={home}
  reduceMotion={reduceMotion} destination={destination} onProgress={update}
  onNavigate={onNavigate} onReveal={onReveal}/>;
}
