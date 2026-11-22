import {useEffect,useMemo,useRef} from 'react';
import {AppState} from 'react-native';
import {offlineCapBreakdown} from '../core/game';
import {gameAlert} from '../core/game-alerts';
import type {GameState} from '../core/types';
import {acknowledgeAfkReminder,pendingAfkReminder,registerAfkReminderCap} from './notification-preferences';
import {supabase} from './supabase';

/** Online, opt-in AFK inbox consumer. Never schedules a speculative local timer. */
export function useAfkReminder(
 accountId:string|undefined,state:GameState|null|undefined,onOpenCharacter:()=>void
):void {
 const openRef=useRef(onOpenCharacter);openRef.current=onOpenCharacter;
 const characterId=state?.character?.id;
 const capHours=useMemo(()=>state?.character?offlineCapBreakdown(state).hours:undefined,[state]);
 const shownRef=useRef(new Set<string>());
 useEffect(()=>{
  if(!accountId||!characterId||!capHours||!supabase)return;
  let disposed=false,registered=false,busy=false;
  const ensureRegistered=async()=>{
   if(registered)return;
   await registerAfkReminderCap(characterId,capHours);
   registered=true;
  };
  const check=async()=>{
   if(disposed||busy||AppState.currentState!=='active')return;
   busy=true;
   try{
    await ensureRegistered();
    const reminder=await pendingAfkReminder();
    if(disposed||!reminder)return;
    const key=accountId+':'+reminder.characterId+':'+reminder.lastClaimAtMs;
    if(shownRef.current.has(key))return;
    // Acknowledge before showing so a restart/rapid refresh cannot double-prompt.
    await acknowledgeAfkReminder(reminder);
    if(disposed)return;
    shownRef.current.add(key);
    const text=reminder.isFull
     ?reminder.characterName+' has filled a '+reminder.capHours+'-hour AFK reserve. Return to collect the rewards.'
     :reminder.characterName+"'s AFK reserve will be full in about "+reminder.minutesLeft+' minutes.';
    gameAlert.alert('AFK rewards ready',text,[
     {text:'Later',style:'cancel'},
     {text:'Open Character',onPress:()=>openRef.current()},
    ],{cancelable:true});
   }catch{
    // A notification is advisory; never block a save, foreground resume, or login.
   }finally{busy=false;}
  };
  void check();
  const timer=setInterval(()=>void check(),5*60*1000);
  const subscription=AppState.addEventListener('change',next=>{
   if(next==='active')void check();
  });
  return()=>{disposed=true;clearInterval(timer);subscription.remove();};
 },[accountId,characterId,capHours]);
}
