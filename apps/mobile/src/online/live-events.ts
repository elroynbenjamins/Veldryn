import type {LiveEventRuntime} from '../core/types';
import {supabase} from './supabase';

type ActiveEventRow={event_id:string;starts_at:string|null;ends_at:string|null};

/** Reads only the server's public active-event window; reward settlement remains server-authoritative online. */
export async function fetchActiveEventRuntime(nowMs=Date.now()):Promise<LiveEventRuntime|undefined>{
  if(!supabase)return undefined;
  const {data,error}=await supabase.rpc('visible_live_events');
  if(error)throw error;
  const row=(data as ActiveEventRow[]|null)?.[0];
  if(!row)return undefined;
  return {eventId:row.event_id,enabled:true,startsAtMs:row.starts_at?Date.parse(row.starts_at):nowMs-60_000,endsAtMs:row.ends_at?Date.parse(row.ends_at):nowMs+86400_000};
}
