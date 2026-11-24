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

export interface WeeklyRaidPresentation extends WeeklyRaidReplaySource{
 presentation:{
  hero:{id:string;name:string;maxHp:number;finalHp:number};
  boss:{id:string;name:string;maxHp:number;finalHp:number};
  abilities:readonly {id:string;name:string;companion:boolean;castTimeMs:number}[];
  phases:readonly {id:string;name:string}[];
 };
 actualBossHpRemoved:number;effectiveHealing:number;shieldAbsorbed:number;interrupts:number;cleanses:number;
 companionDirectDamage:number;companionEffectiveHealing:number;companionShieldGranted:number;
}
export interface WeeklyRaidSettledReceipt{
 nonce:string;replay:WeeklyRaidPresentation|null;sharedHpCredit?:number;performanceScore?:number;
}
export const WEEKLY_RAID_SCREEN_RELEASED=false as const;
const clamp=(n:number,max:number)=>Math.max(0,Math.min(max,n));
export function weeklyRaidPresentationFrame(source:WeeklyRaidPresentation,elapsedMs:number,previousMs:number|null,reduceMotion:boolean){
 const frame=weeklyRaidReplayFrame(source,elapsedMs,previousMs,reduceMotion);
 const {hero,boss,abilities,phases}=source.presentation;
 const units=[hero,boss];
 if(hero.id===boss.id||units.some(u=>!Number.isFinite(u.maxHp)||u.maxHp<=0||!Number.isFinite(u.finalHp)||u.finalHp<0||u.finalHp>u.maxHp))throw Error('invalid_raid_replay_units');
 const hp=new Map(units.map(u=>[u.id,u.maxHp]));
 const names=new Map(abilities.map(a=>[a.id,a]));
 const phaseNames=new Map(phases.map(p=>[p.id,p.name]));
 let cast:{name:string;until:number;id:string}|null=null,phase:string|null=null;
 for(const e of frame.events){
  if(e.targetId&&hp.has(e.targetId)){
   const unit=units.find(u=>u.id===e.targetId)!;
   const amount=typeof e.amount==='number'&&Number.isFinite(e.amount)?Math.max(0,e.amount):0;
   const delta=e.type==='damage'||e.type==='dot_tick'?-amount:e.type==='heal'||e.type==='hot_tick'?amount:0;
   hp.set(unit.id,clamp(hp.get(unit.id)!+delta,unit.maxHp));
  }
  if(e.actorId===boss.id&&e.type==='cast_start'&&e.abilityId){
   const a=names.get(e.abilityId);if(a)cast={name:a.name,id:a.id,until:e.atMs+a.castTimeMs};
  }
  if(cast&&((e.actorId===boss.id&&e.type==='cast_complete'&&e.abilityId===cast.id)||
   (e.targetId===boss.id&&e.type==='interrupt'&&e.interruptedAbilityId===cast.id)))cast=null;
  if(e.actorId===boss.id&&e.type==='phase'&&e.abilityId)phase=phaseNames.get(e.abilityId)??null;
 }
 const complete=frame.state==='complete';
 if(complete||cast&&cast.until<=frame.elapsedMs)cast=null;
 const display=(e:WeeklyRaidReplayEvent)=>{
  const ability=e.abilityId?names.get(e.abilityId):undefined;
  return {...e,label:ability?.name??(e.abilityId==='COMPANION_REFLECT'?'Companion reflect':e.type==='phase'?phaseNames.get(e.abilityId??'')??'Boss phase':e.type==='damage'?'Attack':e.type.replace(/_/g,' ')),
   source:ability?.companion||e.abilityId==='COMPANION_REFLECT'?'Companion':e.actorId===boss.id?'Boss':'Character'};
 };
 const visibleTypes=['damage','dot_tick','heal','hot_tick','shield','interrupt','status_remove','cast_start','phase','miss'];
 return {...frame,heroHp:complete?hero.finalHp:hp.get(hero.id)!,bossHp:complete?boss.finalHp:hp.get(boss.id)!,
  approximateHp:!complete,cast,phase,log:frame.events.filter(e=>visibleTypes.includes(e.type)).slice(-5).reverse().map(display),
  cue:frame.effects.length?display(frame.effects[frame.effects.length-1]):null};
}
export function weeklyRaidBattleSummary(receipt:WeeklyRaidSettledReceipt){
 const replay=receipt.replay;if(!replay)return null;
 return {durationMs:replay.durationMs,outcome:replay.reason,localBossHpDamage:replay.actualBossHpRemoved,
  effectiveHealing:replay.effectiveHealing,shieldAbsorbed:replay.shieldAbsorbed,interrupts:replay.interrupts,cleanses:replay.cleanses,
  companionDirectDamage:replay.companionDirectDamage,companionEffectiveHealing:replay.companionEffectiveHealing,companionShieldGranted:replay.companionShieldGranted,
  sharedHpCredit:receipt.sharedHpCredit??null,performanceScore:receipt.performanceScore??null,claimable:false as const};
}
