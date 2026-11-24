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
 const effects=!reduceMotion&&fresh?history.filter(e=>e.atMs>previousMs!&&['damage','dot_tick','heal','hot_tick','shield','interrupt','status_remove','cast_start','phase','down','death','miss'].includes(e.type)):[];
 return {state:elapsed>=source.durationMs?'complete' as const:'replay' as const,elapsedMs:elapsed,events:history,effects};
}

export interface WeeklyRaidPresentation extends WeeklyRaidReplaySource{
 classId?:string;
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
 startedMs?:number;resolvesMs?:number;settledMs?:number;
 identity?:{heroName:string;classId:string;bossName:string};
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
  approximateHp:!complete,cast,phase,log:frame.events.filter(e=>visibleTypes.includes(e.type)).slice(-3).reverse().map(display),
  cue:frame.effects.length?display(frame.effects[frame.effects.length-1]):null};
}
export function weeklyRaidBattleSummary(receipt:WeeklyRaidSettledReceipt){
 const replay=receipt.replay;if(!replay)return null;
 return {durationMs:replay.durationMs,outcome:replay.reason,localBossHpDamage:replay.actualBossHpRemoved,
  effectiveHealing:replay.effectiveHealing,shieldAbsorbed:replay.shieldAbsorbed,interrupts:replay.interrupts,cleanses:replay.cleanses,
  companionDirectDamage:replay.companionDirectDamage,companionEffectiveHealing:replay.companionEffectiveHealing,companionShieldGranted:replay.companionShieldGranted,
  sharedHpCredit:receipt.sharedHpCredit??null,performanceScore:receipt.performanceScore??null,claimable:false as const};
}

/** Same entitlement policy as dungeon theater; speed never enters a command. */
export function weeklyRaidPlaybackSpeed(vipPlus:boolean,requested:unknown):1|2{return vipPlus&&requested===2?2:1}
/** Presentation only: no browser timer may settle a server attempt. */
export function weeklyRaidPendingState(receipt:WeeklyRaidSettledReceipt,serverAlignedNowMs:number){
 if(receipt.replay)return {status:'settled' as const,remainingMs:0};
 const end=receipt.resolvesMs;
 if(end===undefined||!Number.isFinite(end)||!Number.isFinite(serverAlignedNowMs))return {status:'pending' as const,remainingMs:null};
 const remainingMs=Math.min(180000,Math.max(0,end-serverAlignedNowMs));
 return {status:remainingMs===0?'resolving' as const:'pending' as const,remainingMs};
}
/** An opened settled receipt starts on its summary, not a second 3-minute wait.
 * Players may explicitly replay. Leaving or reconnecting never creates a new attempt. */
export function weeklyRaidOpenCursor(receipt:WeeklyRaidSettledReceipt){return receipt.replay?.durationMs??0}

export type WeeklyRaidEffectKind='damage'|'critical'|'heal'|'shield'|'interrupt'|'phase'|'cast'|'down'|'cleanse'|'miss';
export type WeeklyRaidEffectAnchor='boss'|'hero';
export interface WeeklyRaidVisualEffect{
 anchor:WeeklyRaidEffectAnchor;kind:WeeklyRaidEffectKind;event:WeeklyRaidReplayEvent;key:string;
}
const priority:Record<WeeklyRaidEffectKind,number>={down:100,interrupt:90,phase:80,cleanse:75,critical:65,shield:60,heal:55,damage:50,cast:40,miss:30};
/** A cast belongs to the caster, impacts to the recipient. Unknown IDs fail
 * closed. One prioritized burst per portrait per display interval avoids
 * stacking multiple sprites, while independent opposing hits are retained. */
export function weeklyRaidVisualEffects(events:readonly WeeklyRaidReplayEvent[],heroId:string,bossId:string):WeeklyRaidVisualEffect[]{
 if(!heroId||!bossId||heroId===bossId)return [];
 const chosen=new Map<WeeklyRaidEffectAnchor,WeeklyRaidVisualEffect>();
 for(let index=0;index<events.length;index++){
  const e=events[index];
  const kind:WeeklyRaidEffectKind|undefined=e.type==='damage'||e.type==='dot_tick'?(e.critical?'critical':'damage'):
   e.type==='heal'||e.type==='hot_tick'?'heal':e.type==='shield'?'shield':e.type==='interrupt'?'interrupt':
   e.type==='phase'?'phase':e.type==='cast_start'?'cast':e.type==='down'||e.type==='death'?'down':
   e.type==='status_remove'?'cleanse':e.type==='miss'?'miss':undefined;
  if(!kind)continue;
  const id=kind==='cast'||kind==='phase'?e.actorId:e.targetId;
  const anchor=id===heroId?'hero':id===bossId?'boss':undefined;
  if(!anchor)continue;
  const prior=chosen.get(anchor);
  if(!prior||priority[kind]>=priority[prior.kind])chosen.set(anchor,{anchor,kind,event:e,key:[e.atMs,e.type,e.actorId,e.targetId,e.abilityId,e.statusTag,index].join(':')});
 }
 return Array.from(chosen.values());
}
