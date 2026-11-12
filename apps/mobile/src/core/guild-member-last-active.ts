import type {GuildFlowUiKey} from '../i18n/guild-flow-ui';

/** Server timestamps are evidence of recent presence, not an active socket connection. */
export function guildMemberActivityStatus(lastActiveAt:string|null|undefined,nowMs=Date.now()):{key:GuildFlowUiKey;count?:number;recent:boolean}{
 const timestamp=lastActiveAt?Date.parse(lastActiveAt):NaN;
 if(!Number.isFinite(timestamp))return {key:'Activity unavailable',recent:false};
 const elapsedMinutes=Math.max(0,Math.floor((nowMs-timestamp)/60_000));
 if(elapsedMinutes<10)return {key:'Active recently',recent:true};
 if(elapsedMinutes<60)return {key:'Last active {count}m ago',count:elapsedMinutes,recent:false};
 const hours=Math.floor(elapsedMinutes/60);
 if(hours<24)return {key:'Last active {count}h ago',count:hours,recent:false};
 const days=Math.floor(hours/24);
 if(days<30)return {key:'Last active {count}d ago',count:days,recent:false};
 return {key:'Last active {count}mo ago',count:Math.floor(days/30),recent:false};
}

/** Mutates a filtered copy, never the state array; unrecorded activity is shown first. */
export function sortGuildMembersByActivity<T extends {last_active_at?:string|null}>(members:T[]):T[]{
 return members.sort((a,b)=>{
  const aTime=Date.parse(a.last_active_at??''),bTime=Date.parse(b.last_active_at??'');
  return (Number.isFinite(aTime)?aTime:0)-(Number.isFinite(bTime)?bTime:0);
 });
}
