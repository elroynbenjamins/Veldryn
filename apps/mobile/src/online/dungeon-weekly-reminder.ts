import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {gameAlert} from '../core/game-alerts';
import {supabase} from './supabase';

export interface PendingDungeonReminder {
  weekKey:string;
  charges:number;
  weeklyRemaining:number;
}

export function deviceTimeZone():string {
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}
  catch{return 'UTC';}
}

export async function registerDungeonReminderTimeZone():Promise<void> {
  if(!supabase)return;
  const {error}=await supabase.rpc('dungeon_reminder_register_v1',{p_time_zone:deviceTimeZone()});
  if(error)throw error;
}

export async function dungeonReminderEnabled():Promise<boolean> {
  if(!supabase)return false;
  const {data,error}=await supabase.rpc('dungeon_reminder_preference_v1');
  if(error)throw error;
  return data!==false;
}

export async function setDungeonReminderEnabled(enabled:boolean):Promise<void> {
  if(!supabase)throw new Error('Online account required.');
  const {error}=await supabase.rpc('dungeon_reminder_set_enabled_v1',{p_enabled:enabled});
  if(error)throw error;
}

export async function pendingDungeonReminder():Promise<PendingDungeonReminder|null> {
  if(!supabase)return null;
  const {data,error}=await supabase.rpc('dungeon_reminder_pending_v1');
  if(error)throw error;
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const value=data as Record<string,unknown>;
  if(typeof value.weekKey!=='string')return null;
  const charges=Number(value.charges),weeklyRemaining=Number(value.weeklyRemaining);
  if(!Number.isInteger(charges)||charges<1||charges>3
    ||!Number.isInteger(weeklyRemaining)||weeklyRemaining<1||weeklyRemaining>12)return null;
  return {weekKey:value.weekKey,charges,weeklyRemaining};
}

export async function acknowledgeDungeonReminder(weekKey:string):Promise<void> {
  if(!supabase)return;
  const {error}=await supabase.rpc('dungeon_reminder_ack_v1',{p_week_key:weekKey});
  if(error)throw error;
}

/**
 * An in-app reminder: safe to poll only while foregrounded. This is NOT
 * a background/OS push notification (which requires device push tokens).
 * The server enqueues the weekly eligible reminder on Saturday at 10 local;
 * the app shows it once when next opened, until the Monday UTC reset.
 */
export function useDungeonWeeklyReminder(accountId:string|undefined,onOpenDungeons:()=>void):void {
  const openRef=useRef(onOpenDungeons);
  openRef.current=onOpenDungeons;
  useEffect(()=>{
    if(!accountId||!supabase)return;
    let cancelled=false,inFlight=false,registered=false;
    const shown=new Set<string>();
    const poll=async()=>{
      if(cancelled||inFlight||AppState.currentState!=='active')return;
      inFlight=true;
      try{
        if(!registered){await registerDungeonReminderTimeZone();registered=true;}
        const reminder=await pendingDungeonReminder();
        if(cancelled||!reminder||shown.has(reminder.weekKey))return;
        shown.add(reminder.weekKey);
        // Acknowledging on presentation prevents duplicate prompts after restart.
        void acknowledgeDungeonReminder(reminder.weekKey).catch(()=>{});
        const chargeText=reminder.charges===1?'charge':'charges';
        const rewardText=reminder.weeklyRemaining===1?'enhanced reward':'enhanced rewards';
        gameAlert.alert(
          'Dungeon rewards available',
          `You have ${reminder.charges} dungeon ${chargeText} and ${reminder.weeklyRemaining} weekly ${rewardText} available. The weekly enhanced-reward limit resets Monday at 00:00 UTC.`,
          [{text:'Later',style:'cancel'},{text:'Open Dungeons',onPress:()=>openRef.current()}],
          {cancelable:true},
        );
      }catch{
        // Optional notifications must never block sign-in or gameplay.
      }finally{inFlight=false;}
    };
    void poll();
    const timer=setInterval(()=>{void poll();},5*60*1000);
    const subscription=AppState.addEventListener('change',status=>{
      if(status==='active')void poll();
    });
    return()=>{cancelled=true;clearInterval(timer);subscription.remove();};
  },[accountId]);
}
