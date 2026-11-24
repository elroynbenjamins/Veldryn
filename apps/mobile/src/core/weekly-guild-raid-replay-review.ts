/** Review-only projection from settled owner-scoped server replay.
 * No live route or simulation. Local HP is never shared guild HP.
 * Resume seeks without replaying past transient effects. */
export interface WeeklyRaidReplayEvent{
 atMs:number;type:string;actorId?:string;targetId?:string;abilityId?:string;amount?:number;
 absorbed?:number;critical?:boolean;interruptedAbilityId?:string;statusTag?:string;expiresAtMs?:number;
}
export interface WeeklyRaidReplaySource{
 durationMs:number;reason:'victory'|'wipe'|'timeout';events:readonly WeeklyRaidReplayEvent[];
}
export function weeklyRaidReplayFrame(source:WeeklyRaidReplaySource|null,elapsedMs:number,previousMs:number|null,reduceMotion:boolean){
 if(!source)return {state:'pending' as const,events:[],effects:[],elapsedMs:0};
 if(!Number.isFinite(source.durationMs)||source.durationMs<0||source.durationMs>180000||!Number.isFinite(elapsedMs)||
  (previousMs!==null&&!Number.isFinite(previousMs)))throw Error('invalid_raid_replay_clock');
 let last=-1;
 for(const event of source.events){
  if(!Number.isFinite(event.atMs)||event.atMs<last||event.atMs<0||event.atMs>source.durationMs)throw Error('invalid_raid_replay_order');
  last=event.atMs;
 }
 const elapsed=Math.min(source.durationMs,Math.max(0,elapsedMs));
 const history=source.events.filter(e=>e.atMs<=elapsed);
 const fresh=previousMs!==null&&previousMs>=0&&previousMs<=elapsed&&elapsed-previousMs<=1500;
 const effects=!reduceMotion&&fresh?history.filter(e=>e.atMs>previousMs!&&['damage','dot_tick','heal','hot_tick','shield','interrupt','status_remove','cast_start','phase'].includes(e.type)):[];
 return {state:elapsed>=source.durationMs?'complete' as const:'replay' as const,elapsedMs:elapsed,events:history,effects};
}
