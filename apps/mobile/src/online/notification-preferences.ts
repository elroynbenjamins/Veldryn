import {supabase} from './supabase';

export type NotificationPreferences={
 dungeonEnabled:boolean;
 dungeonWeekday:number;
 dungeonHour:number;
 dungeonMinute:number;
 afkEnabled:boolean;
 afkLeadMinutes:0|30|60;
 notificationsEnabled:boolean;
 quietEnabled:boolean;
 timeZone:string;
};
export const DEFAULT_NOTIFICATION_PREFERENCES:NotificationPreferences={
 dungeonEnabled:true,dungeonWeekday:6,dungeonHour:10,dungeonMinute:0,
 afkEnabled:true,afkLeadMinutes:0,notificationsEnabled:true,quietEnabled:true,timeZone:'UTC',
};
export type PendingAfkReminder={
 characterId:string;characterName:string;lastClaimAtMs:number;
 capHours:number;minutesLeft:number;isFull:boolean;
};
const asRecord=(v:unknown):Record<string,unknown>|null=>
 typeof v==='object'&&v!==null&&!Array.isArray(v)?v as Record<string,unknown>:null;
const bool=(v:unknown,fallback:boolean)=>typeof v==='boolean'?v:fallback;
const int=(v:unknown,fallback:number,min:number,max:number)=>
 typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max?v:fallback;
export function parseNotificationPreferences(v:unknown):NotificationPreferences {
 const o=asRecord(v);const d=DEFAULT_NOTIFICATION_PREFERENCES;
 return {
  dungeonEnabled:bool(o?.dungeonEnabled,d.dungeonEnabled),
  dungeonWeekday:int(o?.dungeonWeekday,d.dungeonWeekday,1,7),
  dungeonHour:int(o?.dungeonHour,d.dungeonHour,0,23),
  dungeonMinute:[0,15,30,45].includes(Number(o?.dungeonMinute))?
   Number(o?.dungeonMinute):d.dungeonMinute,
  afkEnabled:bool(o?.afkEnabled,d.afkEnabled),
  afkLeadMinutes:([0,30,60].includes(Number(o?.afkLeadMinutes))?
   Number(o?.afkLeadMinutes):0) as 0|30|60,
  notificationsEnabled:bool(o?.notificationsEnabled,d.notificationsEnabled),
  quietEnabled:bool(o?.quietEnabled,d.quietEnabled),
  timeZone:typeof o?.timeZone==='string'?o.timeZone:d.timeZone,
 };
}
export async function loadNotificationPreferences():Promise<NotificationPreferences>{
 if(!supabase)throw new Error('Online account required.');
 const {data,error}=await supabase.rpc('notification_preferences_v1');
 if(error)throw error;
 return parseNotificationPreferences(data);
}
export async function saveNotificationPreferences(value:NotificationPreferences):Promise<void>{
 if(!supabase)throw new Error('Online account required.');
 const {error}=await supabase.rpc('notification_preferences_set_v1',{
  p_dungeon_enabled:value.dungeonEnabled,
  p_weekday:value.dungeonWeekday,
  p_hour:value.dungeonHour,
  p_minute:value.dungeonMinute,
  p_afk_enabled:value.afkEnabled,
  p_afk_lead_minutes:value.afkLeadMinutes,
  p_notifications_enabled:value.notificationsEnabled,
  p_quiet_enabled:value.quietEnabled,
 });
 if(error)throw error;
}
export async function registerAfkReminderCap(characterId:string,capHours:number):Promise<void>{
 if(!supabase)return;
 const {error}=await supabase.rpc('afk_reminder_register_cap_v1',{
  p_character_id:characterId,p_cap_hours:capHours,
 });
 if(error)throw error;
}
export function parsePendingAfkReminder(v:unknown):PendingAfkReminder|null{
 const o=asRecord(v);if(!o)return null;
 if(typeof o.characterId!=='string'||!/^[0-9a-f-]{36}$/i.test(o.characterId)||
  typeof o.characterName!=='string'||typeof o.isFull!=='boolean'||
  typeof o.lastClaimAtMs!=='number'||!Number.isSafeInteger(o.lastClaimAtMs)||
  typeof o.capHours!=='number'||!Number.isInteger(o.capHours)||o.capHours<8||o.capHours>30||
  typeof o.minutesLeft!=='number'||!Number.isInteger(o.minutesLeft)||o.minutesLeft<0||o.minutesLeft>60)return null;
 return {characterId:o.characterId,characterName:o.characterName,lastClaimAtMs:o.lastClaimAtMs,
  capHours:o.capHours,minutesLeft:o.minutesLeft,isFull:o.isFull};
}
export async function pendingAfkReminder():Promise<PendingAfkReminder|null>{
 if(!supabase)return null;
 const {data,error}=await supabase.rpc('afk_reminder_pending_v1');
 if(error)throw error;
 return parsePendingAfkReminder(data);
}
export async function acknowledgeAfkReminder(reminder:PendingAfkReminder):Promise<void>{
 if(!supabase)return;
 const {error}=await supabase.rpc('afk_reminder_ack_v1',{
  p_character_id:reminder.characterId,p_last_claim_at_ms:reminder.lastClaimAtMs,
 });
 if(error)throw error;
}
