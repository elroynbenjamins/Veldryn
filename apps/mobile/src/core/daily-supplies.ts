import type {ActiveActivity,CharacterState,GameState,RewardBundle} from './types';

/** Supply bonuses are account-wide; candies, events and permanent bonuses remain separate multipliers. */
export const DAILY_SUPPLY_BONUS=0.10;
export const DAILY_SUPPLY_CHARGE_SECONDS=2*60*60;
export const DAILY_SUPPLY_TRACK_LENGTH=28;
export const DAILY_SUPPLY_BOOST_TYPES=['gathering_speed','crafting_speed','skill_xp','combat_xp','combat_speed'] as const;
export type DailySupplyBoostType=typeof DAILY_SUPPLY_BOOST_TYPES[number];
export interface DailySupplyCharge{bonus:number;seconds:number}
export interface ActiveDailySupplyBoost extends DailySupplyCharge{
 type:DailySupplyBoostType;
 remainingSeconds:number;
 remainders?:Record<string,number>;
}
export interface DailySuppliesTrack{
 schemaVersion:2;
 totalClaims:number;
 lastClaimDayKey?:string;
 /** UTC millisecond clock for shared Forge activity settlement; never derived from client UI time. */
 forgeSettledAtMs?:number;
 bank?:Partial<Record<DailySupplyBoostType,DailySupplyCharge[]>>;
 active?:Partial<Record<DailySupplyBoostType,ActiveDailySupplyBoost>>;
 queued?:Partial<Record<DailySupplyBoostType,ActiveDailySupplyBoost[]>>;
}
export interface DailySupplyStatus{
 cycle:number;
 dayInTrack:number;
 canClaim:boolean;
 currentDayKey:string;
 reward:{kind:'boost';type:DailySupplyBoostType;charges:1;bonus:number;seconds:number}|{kind:'milestone';bonus:number;seconds:number};
}
export interface DailySupplyTimedResult{
 reward:RewardBundle;
 consumedSeconds:number;
 nextRemainders:Record<string,number>;
 updates?:Partial<Record<DailySupplyBoostType,{consumedSeconds:number;nextRemainders:Record<string,number>}>>;
}

export const DAILY_SUPPLY_MILESTONES:Readonly<Record<number,DailySupplyCharge>>={
 7:{bonus:.20,seconds:7200},
 14:{bonus:.20,seconds:10800},
 21:{bonus:.25,seconds:10800},
 28:{bonus:.25,seconds:14400},
};
const BOOST_LABELS:Record<DailySupplyBoostType,string>={
 gathering_speed:'Gathering Speed',crafting_speed:'Crafting Speed',
 skill_xp:'Skill XP',combat_xp:'Combat XP',combat_speed:'Combat Speed',
};
const LEGACY_TYPE_MAP:Record<string,DailySupplyBoostType>={
 gathering_yield:'gathering_speed',crafting_output:'crafting_speed',
 gathering_speed:'gathering_speed',crafting_speed:'crafting_speed',
 skill_xp:'skill_xp',combat_xp:'combat_xp',combat_speed:'combat_speed',
};
const baseCharge=():DailySupplyCharge=>({bonus:DAILY_SUPPLY_BONUS,seconds:DAILY_SUPPLY_CHARGE_SECONDS});
const safeSeconds=(value:unknown,max=14400)=>Number.isFinite(Number(value))?Math.max(0,Math.min(max,Math.floor(Number(value)))):0;
const validBonus=(value:unknown)=>[.1,.2,.25].includes(Number(value))?Number(value):DAILY_SUPPLY_BONUS;
const safeType=(value:unknown)=>typeof value==='string'?LEGACY_TYPE_MAP[value]:undefined;
export const dailySupplyBoostLabel=(type:DailySupplyBoostType)=>BOOST_LABELS[type];
export const dailySupplyUtcDayKey=(nowMs:number)=>new Date(nowMs).toISOString().slice(0,10);
export const dailySupplyBonusText=(bonus:number)=>'+'+Math.round(bonus*100)+'%';
function normalizeCharge(value:unknown):DailySupplyCharge|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,seconds=safeSeconds(row.seconds);
 return seconds>0?{bonus:validBonus(row.bonus),seconds}:undefined;
}
function numericRemainders(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const out:Record<string,number>={};
 for(const [key,raw] of Object.entries(value as Record<string,unknown>).slice(0,40)){
  const n=Number(raw);if(key.length<=80&&Number.isFinite(n)&&n>=0&&n<1)out[key]=n;
 }
 return Object.keys(out).length?out:undefined;
}
export function normalizeActiveDailySupplyBoost(value:unknown):ActiveDailySupplyBoost|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,type=safeType(row.type),rawSeconds=Number(row.remainingSeconds),seconds=Number.isFinite(rawSeconds)?Math.max(0,Math.min(14400,rawSeconds)):0;
 if(!type||seconds<=0)return undefined;
 const bonus=validBonus(row.bonus),full=safeSeconds(row.seconds)||DAILY_SUPPLY_CHARGE_SECONDS;
 const remainders=numericRemainders(row.remainders);
 return {type,bonus,seconds:Math.max(seconds,full),remainingSeconds:seconds,...(remainders?{remainders}:{})};
}
function normalizeBoostBank(value:unknown):NonNullable<DailySuppliesTrack['bank']>{
 const bank:NonNullable<DailySuppliesTrack['bank']>={};
 if(!value||typeof value!=='object'||Array.isArray(value))return bank;
 for(const [key,raw] of Object.entries(value as Record<string,unknown>)){
  const type=safeType(key);if(!type)continue;
  const charges=Array.isArray(raw)?raw.slice(0,100).map(normalizeCharge).filter((row):row is DailySupplyCharge=>!!row):[];
  if(charges.length)bank[type]=[...(bank[type]??[]),...charges].slice(0,100);
 }
 return bank;
}
function normalizeBoostActive(value:unknown):NonNullable<DailySuppliesTrack['active']>{
 const active:NonNullable<DailySuppliesTrack['active']>={};
 if(!value||typeof value!=='object'||Array.isArray(value))return active;
 for(const [key,raw] of Object.entries(value as Record<string,unknown>)){
  const type=safeType(key),boost=normalizeActiveDailySupplyBoost(raw);
  if(type&&boost&&boost.type===type)active[type]=boost;
 }
 return active;
}
function normalizeQueued(value:unknown):NonNullable<DailySuppliesTrack['queued']>{
 const queued:NonNullable<DailySuppliesTrack['queued']>={};
 if(!value||typeof value!=='object'||Array.isArray(value))return queued;
 for(const [key,raw] of Object.entries(value as Record<string,unknown>)){
  const type=safeType(key);
  if(!type||!Array.isArray(raw))continue;
  const entries=raw.slice(0,100).map(normalizeActiveDailySupplyBoost).filter((entry):entry is ActiveDailySupplyBoost=>!!entry&&entry.type===type);
  if(entries.length)queued[type]=entries;
 }
 return queued;
}
export function normalizeDailySuppliesTrack(value:unknown):DailySuppliesTrack|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,totalClaims=Number(row.totalClaims);
 if((row.schemaVersion!==1&&row.schemaVersion!==2)||!Number.isSafeInteger(totalClaims)||totalClaims<0)return undefined;
 const lastClaimDayKey=typeof row.lastClaimDayKey==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.lastClaimDayKey)?row.lastClaimDayKey:undefined;
 const forgeSettledAtMs=Number(row.forgeSettledAtMs);
 return {schemaVersion:2,totalClaims,...(lastClaimDayKey?{lastClaimDayKey}:{}),
  ...(Number.isSafeInteger(forgeSettledAtMs)&&forgeSettledAtMs>0?{forgeSettledAtMs}:{}),
  bank:normalizeBoostBank(row.bank),active:normalizeBoostActive(row.active),queued:normalizeQueued(row.queued)};
}
/** The old character-bound charge counter is accepted only for save migration. */
export function normalizeDailySupplyBank(value:unknown):Partial<Record<DailySupplyBoostType,number>>|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const out:Partial<Record<DailySupplyBoostType,number>>={};
 for(const [key,count] of Object.entries(value as Record<string,unknown>)){
  const type=safeType(key),n=Number(count);
  if(type&&Number.isFinite(n)&&n>0)out[type]=Math.min(100,(out[type]??0)+Math.floor(n));
 }
 return Object.keys(out).length?out:undefined;
}
const emptyTrack=():DailySuppliesTrack=>({schemaVersion:2,totalClaims:0,bank:{},active:{},queued:{}});
function track(state:GameState){return normalizeDailySuppliesTrack(state.account.dailySupplies)??emptyTrack()}
const clearLegacy=(character:CharacterState):CharacterState=>({...character,dailySupplyBoostBank:undefined,activeDailySupplyBoost:undefined,activeDailySupplyBoosts:undefined});
/** Idempotent: v2 is canonical. Each legacy character contributes charges only on the first migration. */
export function migrateLegacyDailySupplies(state:GameState,forceLegacy=false):GameState{
 const old=state.account.dailySupplies,needsMigration=forceLegacy||!old||old.schemaVersion!==2;
 const next=track(state);
 if(needsMigration){
  const bank={...(next.bank??{})},active={...(next.active??{})},queued={...(next.queued??{})};
  const characters=[state.character,...(state.otherCharacters??[]).map(entry=>entry.character)].filter((row):row is CharacterState=>!!row);
  for(const character of characters){
   const counters=normalizeDailySupplyBank(character.dailySupplyBoostBank);
   if(counters)for(const type of DAILY_SUPPLY_BOOST_TYPES){
    const count=counters[type]??0;if(count>0)bank[type]=[...(bank[type]??[]),...Array.from({length:count},baseCharge)].slice(0,100);
   }
   const map=activeDailySupplyBoosts(character);
   for(const type of DAILY_SUPPLY_BOOST_TYPES){
    const entry=map[type];if(!entry)continue;
    const current=active[type];
    if(!current||entry.bonus>current.bonus){
     if(current)queued[type]=[...(queued[type]??[]),current];
     active[type]=entry;
    }else queued[type]=[...(queued[type]??[]),entry];
   }
  }
  next.bank=bank;next.active=active;next.queued=queued;
 }
 return {...state,account:{...state.account,dailySupplies:next},
  character:state.character?clearLegacy(state.character):null,
  otherCharacters:(state.otherCharacters??[]).map(entry=>({...entry,character:clearLegacy(entry.character)}))};
}
export function activeDailySupplyBoosts(source:GameState|CharacterState|null|undefined):Partial<Record<DailySupplyBoostType,ActiveDailySupplyBoost>>{
 if(!source)return {};
 if('account' in source)return track(source).active??{};
 const mapped=source.activeDailySupplyBoosts,valid:Partial<Record<DailySupplyBoostType,ActiveDailySupplyBoost>>={};
 if(mapped&&typeof mapped==='object'&&!Array.isArray(mapped)){
  for(const raw of Object.values(mapped)){const entry=normalizeActiveDailySupplyBoost(raw);if(entry&&!valid[entry.type])valid[entry.type]=entry;}
 }
 const legacy=normalizeActiveDailySupplyBoost(source.activeDailySupplyBoost);
 if(legacy&&!valid[legacy.type])valid[legacy.type]=legacy;
 return valid;
}
export function normalizeCharacterDailySupplies(character:CharacterState):CharacterState{
 return {...character,dailySupplyBoostBank:normalizeDailySupplyBank(character.dailySupplyBoostBank),activeDailySupplyBoosts:activeDailySupplyBoosts(character)};
}
function normalRewardIndex(cycle:number,day:number){
 const priorMilestones=Math.floor((day-1)/7);
 return ((cycle-1)*24+(day-1)-priorMilestones)%DAILY_SUPPLY_BOOST_TYPES.length;
}
export function dailySupplyRewardForDay(day:number,cycle=1):DailySupplyStatus['reward']{
 const milestone=DAILY_SUPPLY_MILESTONES[day];
 return milestone?{kind:'milestone',...milestone}:{kind:'boost',type:DAILY_SUPPLY_BOOST_TYPES[normalRewardIndex(cycle,day)],charges:1,...baseCharge()};
}
export function dailySuppliesStatus(state:GameState,nowMs=Date.now()):DailySupplyStatus{
 const current=track(state),dayInTrack=current.totalClaims%DAILY_SUPPLY_TRACK_LENGTH+1,cycle=Math.floor(current.totalClaims/DAILY_SUPPLY_TRACK_LENGTH)+1,currentDayKey=dailySupplyUtcDayKey(nowMs);
 return {cycle,dayInTrack,canClaim:current.lastClaimDayKey!==currentDayKey,currentDayKey,reward:dailySupplyRewardForDay(dayInTrack,cycle)};
}
export function claimDailySupplies(state:GameState,characterId:string,nowMs:number,selectedType?:DailySupplyBoostType){
 if(!state.character||!characterId||(state.character.id!==characterId&&!(state.otherCharacters??[]).some(entry=>entry.character.id===characterId)))throw new Error('Character is not owned.');
 const status=dailySuppliesStatus(state,nowMs);
 if(!status.canClaim)throw new Error('Daily Supplies were already claimed for this UTC day.');
 const canonical=migrateLegacyDailySupplies(state),current=track(canonical);
 const reward=status.reward;
 const type=reward.kind==='milestone'?selectedType:reward.type;
 if(!type||!DAILY_SUPPLY_BOOST_TYPES.includes(type))throw new Error('Choose a Supply Blessing first.');
 const bank={...(current.bank??{})};
 bank[type]=[...(bank[type]??[]),{bonus:reward.bonus,seconds:reward.seconds}].slice(-100);
 const dailySupplies:DailySuppliesTrack={...current,bank,totalClaims:current.totalClaims+1,lastClaimDayKey:status.currentDayKey};
 return {state:{...canonical,account:{...canonical.account,dailySupplies}},status};
}
/** Claim and activation each use the account-wide bank; no inter-character transfers. */
export function activateDailySupplyBoost(state:GameState,type:DailySupplyBoostType){
 if(!state.character)throw new Error('Create a character first.');
 if(!DAILY_SUPPLY_BOOST_TYPES.includes(type))throw new Error('Unknown Daily Supplies boost.');
 const canonical=migrateLegacyDailySupplies(state),current=track(canonical);
 const bank={...(current.bank??{})},available=[...(bank[type]??[])].sort((a,b)=>b.bonus-a.bonus||b.seconds-a.seconds);
 if(!available.length)throw new Error('No banked charge is available for this boost.');
 const chosen=available.shift()!;
 if(available.length)bank[type]=available;else delete bank[type];
 const active={...(current.active??{})},queued={...(current.queued??{})};
 const entry:ActiveDailySupplyBoost={type,...chosen,remainingSeconds:chosen.seconds};
 if(active[type]&&active[type]!.bonus>=entry.bonus){
  queued[type]=[...(queued[type]??[]),entry];
 }else{
  if(active[type])queued[type]=[...(queued[type]??[]),active[type]!];
  active[type]=entry;
 }
 return {...canonical,account:{...canonical.account,dailySupplies:{...current,bank,active,queued}}};
}
export function dailySupplyBank(source:GameState|CharacterState|null|undefined){
 if(!source)return {} as Partial<Record<DailySupplyBoostType,DailySupplyCharge[]>>;
 if('account' in source)return track(source).bank??{};
 const counters=normalizeDailySupplyBank(source.dailySupplyBoostBank)??{},bank:Partial<Record<DailySupplyBoostType,DailySupplyCharge[]>>={};
 for(const type of DAILY_SUPPLY_BOOST_TYPES)if(counters[type])bank[type]=Array.from({length:counters[type]??0},baseCharge);
 return bank;
}
export function dailySupplyQueued(state:GameState){return track(state).queued??{}}
export function dailySupplyActiveLabels(source:GameState|CharacterState|null|undefined){
 const boosts=activeDailySupplyBoosts(source);
 return DAILY_SUPPLY_BOOST_TYPES.flatMap(type=>{const active=boosts[type];return active?[{...active,label:dailySupplyBoostLabel(type),hours:active.remainingSeconds/3600}]:[];});
}
export function dailySupplyActiveLabel(source:GameState|CharacterState|null|undefined){return dailySupplyActiveLabels(source)[0]}
/** Weighted activity-time coverage: a paused weaker tier resumes within the same settlement. */
export function dailySupplyCoverage(state:GameState,type:DailySupplyBoostType,elapsedSeconds:number){
 const current=activeDailySupplyBoosts(state)[type];
 if(!current)return {consumedSeconds:0,weightedBonusSeconds:0};
 const queue=[...(dailySupplyQueued(state)[type]??[])].sort((a,b)=>b.bonus-a.bonus||b.remainingSeconds-a.remainingSeconds);
 let left=Math.max(0,elapsedSeconds),consumedSeconds=0,weightedBonusSeconds=0;
 for(const entry of [current,...queue]){
  if(left<=0)break;
  const used=Math.min(left,entry.remainingSeconds);
  consumedSeconds+=used;weightedBonusSeconds+=used*entry.bonus;left-=used;
 }
 return {consumedSeconds,weightedBonusSeconds};
}
export function dailySupplySpeedMultiplier(state:GameState,type:'gathering_speed'|'crafting_speed'|'combat_speed',elapsedSeconds:number){
 const elapsed=Math.max(0,elapsedSeconds);
 const current=activeDailySupplyBoosts(state)[type];
 if(!current)return 1;
 return elapsed>0?1+dailySupplyCoverage(state,type,elapsed).weightedBonusSeconds/elapsed:1+current.bonus;
}
/** Timed crafting simulates work, but settlement and bonus charges use real elapsed time. */
export function dailySupplyCraftWorkSeconds(state:GameState,elapsed:number){return elapsed+dailySupplyCoverage(state,'crafting_speed',elapsed).weightedBonusSeconds;}
export function dailySupplyAdjustTimedCraftReward(state:GameState,reward:RewardBundle,realElapsed:number):RewardBundle{
 const start=state.activity?.lastClaimAtMs??0,active=activeDailySupplyBoosts(state).crafting_speed;
 if(!active)return {...reward,elapsedSeconds:realElapsed};
 const queue=[...(dailySupplyQueued(state).crafting_speed??[])].sort((a,b)=>b.bonus-a.bonus||b.remainingSeconds-a.remainingSeconds);
 const workToReal=(rawWork:number)=>{
  let pending=Math.max(0,rawWork),real=0;
  for(const entry of [active,...queue]){
   const capacity=entry.remainingSeconds*(1+entry.bonus);
   if(pending<=capacity)return real+pending/(1+entry.bonus);
   real+=entry.remainingSeconds;pending-=capacity;
  }
  return real+pending;
 };
 const times=(reward.craftingCompletedAtMs??[]).map(when=>Math.round(start+workToReal((when-start)/1000)*1000));
 const stillWorking=!!reward.nextBrewRemaining||!!reward.nextProcessingRemaining;
 const end=times.length?Math.max(0,(times[times.length-1]-start)/1000):0;
 return {...reward,elapsedSeconds:realElapsed,qualifyingActivitySeconds:stillWorking?realElapsed:Math.min(realElapsed,end),craftingCompletedAtMs:times};
}
function activityModeEligible(type:DailySupplyBoostType,mode:'combat'|'gathering'|'skill'|'crafting'|'training'){
 if(type==='combat_xp'||type==='combat_speed')return mode==='combat';
 if(type==='gathering_speed')return mode==='gathering';
 if(type==='crafting_speed')return mode==='crafting';
 return mode==='gathering'||mode==='skill'||mode==='crafting'||mode==='training';
}
function bonusInteger(base:number,key:string,fraction:number,remainders:Record<string,number>,bonus:number){
 const extraFloat=Math.max(0,base)*bonus*fraction+(remainders[key]??0),extra=Math.floor(extraFloat+1e-9);
 remainders[key]=Math.max(0,extraFloat-extra);return extra;
}
export function previewDailySupplyTimedReward(state:GameState,reward:RewardBundle,mode:'combat'|'gathering'|'skill'|'crafting'|'training'):DailySupplyTimedResult{
 const boosts=activeDailySupplyBoosts(state),updates:NonNullable<DailySupplyTimedResult['updates']>={};
 let next={...reward,items:reward.items.map(item=>({...item}))};
 for(const type of DAILY_SUPPLY_BOOST_TYPES){
  const active=boosts[type];if(!active||!activityModeEligible(type,mode)||reward.elapsedSeconds<=0)continue;
  const hasReward=type==='combat_xp'?reward.xp>0:type==='skill_xp'?reward.xp>0||(reward.faithXp??0)>0||(reward.classSkillXp??[]).some(row=>row.xp>0):true;
  if(!hasReward)continue;
  const qualifyingSeconds=Math.min(Math.max(0,reward.elapsedSeconds),Math.max(0,reward.qualifyingActivitySeconds??reward.elapsedSeconds));
  if(qualifyingSeconds<=0)continue;
  const coverage=dailySupplyCoverage(state,type,qualifyingSeconds),consumedSeconds=coverage.consumedSeconds,averageBonus=coverage.weightedBonusSeconds/Math.max(1,qualifyingSeconds),remainders={...(active.remainders??{})};
  if(type==='combat_xp')next.xp+=bonusInteger(reward.xp,'xp:combat',1,remainders,averageBonus);
  else if(type==='skill_xp'){
   if(reward.classSkillXp?.length)next.classSkillXp=reward.classSkillXp.map(row=>({...row,xp:row.xp+bonusInteger(row.xp,'class:'+row.skillId,1,remainders,averageBonus)}));
   else{const extra=bonusInteger(reward.xp,'xp:skill',1,remainders,averageBonus);next.xp+=extra;if(reward.faithXp!==undefined)next.faithXp=(reward.faithXp??0)+extra;}
  }
  updates[type]={consumedSeconds,nextRemainders:remainders};
 }
 const first=DAILY_SUPPLY_BOOST_TYPES.map(type=>updates[type]).find(Boolean);
 return {reward:next,consumedSeconds:first?.consumedSeconds??0,nextRemainders:first?.nextRemainders??{},updates};
}
export function commitDailySupplyTimedBoost(state:GameState,result:Pick<DailySupplyTimedResult,'consumedSeconds'|'nextRemainders'|'updates'>){
 if(!state.character)return state;
 const canonical=migrateLegacyDailySupplies(state),current=track(canonical),active={...(current.active??{})},queued={...(current.queued??{})};
 const updates:NonNullable<DailySupplyTimedResult['updates']>=result.updates??{};
 let changed=false;
 for(const type of DAILY_SUPPLY_BOOST_TYPES){
  const existing=active[type],spent=updates[type];if(!existing||!spent||spent.consumedSeconds<=0)continue;
  changed=true;
  let timeLeft=spent.consumedSeconds;
  const rest=[existing,...[...(queued[type]??[])].sort((a,b)=>b.bonus-a.bonus||b.remainingSeconds-a.remainingSeconds)];
  while(timeLeft>0&&rest.length){
   const head=rest[0],used=Math.min(timeLeft,head.remainingSeconds);
   timeLeft-=used;
   const remainingSeconds=Math.max(0,head.remainingSeconds-used);
   if(remainingSeconds>0){rest[0]={...head,remainingSeconds,remainders:spent.nextRemainders};break;}
   rest.shift();
  }
  const next=rest.shift();
  if(next)active[type]=next;else delete active[type];
  if(rest.length)queued[type]=rest;else delete queued[type];
 }
 return changed?{...canonical,account:{...canonical.account,dailySupplies:{...current,active,queued}}}:canonical;
}
/** Instant recipes have no waiting clock to accelerate; do not consume Crafting Speed for them. */
export function applyDailySupplyCraft(state:GameState,input:{seconds:number;outputQuantity:number;xp:number;outputEligible:boolean}){
 if(!state.character||input.seconds<=0)return {state,outputQuantity:input.outputQuantity,xp:input.xp,bonusQuantity:0,bonusXp:0};
 const active=activeDailySupplyBoosts(state).skill_xp;
 if(!active)return {state,outputQuantity:input.outputQuantity,xp:input.xp,bonusQuantity:0,bonusXp:0};
 const coverage=dailySupplyCoverage(state,'skill_xp',input.seconds),consumedSeconds=coverage.consumedSeconds,remainders={...(active.remainders??{})};
 const bonusXp=bonusInteger(input.xp,'craft:xp',1,remainders,coverage.weightedBonusSeconds/input.seconds);
 return {state:commitDailySupplyTimedBoost(state,{consumedSeconds:0,nextRemainders:{},updates:{skill_xp:{consumedSeconds,nextRemainders:remainders}}}),outputQuantity:input.outputQuantity,xp:input.xp+bonusXp,bonusQuantity:0,bonusXp};
}
export function dailySupplyActivityMode(activity:ActiveActivity|null|undefined):'combat'|'gathering'|'skill'|'crafting'|undefined{
 if(!activity)return undefined;if(activity.kind==='combat')return 'combat';
 if(['mining','woodcutting','fishing','herbalism'].includes(activity.kind))return 'gathering';
 if(activity.kind==='alchemy'||activity.kind==='processing')return 'crafting';
 return 'skill';
}
