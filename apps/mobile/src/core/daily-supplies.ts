import type {ActiveActivity,CharacterState,GameState,RewardBundle} from './types';

export const DAILY_SUPPLY_BONUS=0.10;
export const DAILY_SUPPLY_CHARGE_SECONDS=2*60*60;
export const DAILY_SUPPLY_TRACK_LENGTH=28;
export const DAILY_SUPPLY_BOOST_TYPES=['gathering_yield','crafting_output','skill_xp','combat_xp'] as const;
export type DailySupplyBoostType=typeof DAILY_SUPPLY_BOOST_TYPES[number];

export interface DailySuppliesTrack{
 schemaVersion:1;
 totalClaims:number;
 lastClaimDayKey?:string;
}
export interface ActiveDailySupplyBoost{
 type:DailySupplyBoostType;
 remainingSeconds:number;
 remainders?:Record<string,number>;
}
export interface DailySupplyStatus{
 cycle:number;
 dayInTrack:number;
 canClaim:boolean;
 currentDayKey:string;
 reward:{kind:'boost';type:DailySupplyBoostType;charges:number}|{kind:'premium';amount:number};
}
export interface DailySupplyTimedResult{
 reward:RewardBundle;
 consumedSeconds:number;
 nextRemainders:Record<string,number>;
 updates?:Partial<Record<DailySupplyBoostType,{consumedSeconds:number;nextRemainders:Record<string,number>}>>;
}

const BOOST_LABELS:Record<DailySupplyBoostType,string>={
 gathering_yield:'Gathering Yield',
 crafting_output:'Crafting / Processing Output',
 skill_xp:'Skill XP',
 combat_xp:'Combat XP',
};
const milestonePremium:Record<number,number>={7:10,14:20,21:30,28:40};

export function dailySupplyBoostLabel(type:DailySupplyBoostType){return BOOST_LABELS[type]}
export function dailySupplyUtcDayKey(nowMs:number){return new Date(nowMs).toISOString().slice(0,10)}
export function normalizeDailySuppliesTrack(value:unknown):DailySuppliesTrack|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,totalClaims=Number(row.totalClaims);
 if(row.schemaVersion!==1||!Number.isFinite(totalClaims)||totalClaims<0)return undefined;
 const lastClaimDayKey=typeof row.lastClaimDayKey==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.lastClaimDayKey)?row.lastClaimDayKey:undefined;
 return {schemaVersion:1,totalClaims:Math.max(0,Math.floor(totalClaims)),...(lastClaimDayKey?{lastClaimDayKey}:{})};
}
export function normalizeDailySupplyBank(value:unknown):Partial<Record<DailySupplyBoostType,number>>|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,out:Partial<Record<DailySupplyBoostType,number>>={};
 for(const type of DAILY_SUPPLY_BOOST_TYPES){const count=Number(row[type]);if(Number.isFinite(count)&&count>0)out[type]=Math.floor(count)}
 return Object.keys(out).length?out:undefined;
}
function numericRemainders(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const out:Record<string,number>={};
 for(const [key,raw] of Object.entries(value as Record<string,unknown>).slice(0,40)){const n=Number(raw);if(key.length<=80&&Number.isFinite(n)&&n>=0&&n<1)out[key]=n}
 return Object.keys(out).length?out:undefined;
}
export function normalizeActiveDailySupplyBoost(value:unknown):ActiveDailySupplyBoost|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,type=row.type as DailySupplyBoostType,seconds=Number(row.remainingSeconds);
 if(!DAILY_SUPPLY_BOOST_TYPES.includes(type)||!Number.isFinite(seconds)||seconds<=0)return undefined;
 const remainders=numericRemainders(row.remainders);
 return {type,remainingSeconds:Math.min(DAILY_SUPPLY_CHARGE_SECONDS,Math.max(1,Math.floor(seconds))),...(remainders?{remainders}:{})};
}
export function activeDailySupplyBoosts(character:CharacterState|null|undefined):Partial<Record<DailySupplyBoostType,ActiveDailySupplyBoost>>{
 if(!character)return {};
 const mapped=character.activeDailySupplyBoosts,valid:Partial<Record<DailySupplyBoostType,ActiveDailySupplyBoost>>={};
 if(mapped&&typeof mapped==='object'&&!Array.isArray(mapped)){
  for(const type of DAILY_SUPPLY_BOOST_TYPES){const entry=normalizeActiveDailySupplyBoost(mapped[type]);if(entry&&entry.type===type)valid[type]=entry;}
 }
 if(!Object.keys(valid).length){const legacy=normalizeActiveDailySupplyBoost(character.activeDailySupplyBoost);if(legacy)valid[legacy.type]=legacy;}
 return valid;
}
function withActiveDailySupplyBoosts(character:CharacterState,boosts:Partial<Record<DailySupplyBoostType,ActiveDailySupplyBoost>>):CharacterState{
 const first=DAILY_SUPPLY_BOOST_TYPES.map(type=>boosts[type]).find(Boolean);
 return {...character,activeDailySupplyBoosts:boosts,activeDailySupplyBoost:first};
}
export function normalizeCharacterDailySupplies(character:CharacterState):CharacterState{
 const normalized={...character,dailySupplyBoostBank:normalizeDailySupplyBank(character.dailySupplyBoostBank)};
 return withActiveDailySupplyBoosts(normalized,activeDailySupplyBoosts(character));
}
function track(state:GameState):DailySuppliesTrack{return normalizeDailySuppliesTrack(state.account.dailySupplies)??{schemaVersion:1,totalClaims:0}}
function normalClaimIndex(totalClaims:number){
 const inCycle=totalClaims%DAILY_SUPPLY_TRACK_LENGTH,priorMilestones=Math.floor(inCycle/7);
 return inCycle-priorMilestones;
}
export function dailySuppliesStatus(state:GameState,nowMs=Date.now()):DailySupplyStatus{
 const current=track(state),dayInTrack=current.totalClaims%DAILY_SUPPLY_TRACK_LENGTH+1,currentDayKey=dailySupplyUtcDayKey(nowMs),premium=milestonePremium[dayInTrack];
 return {cycle:Math.floor(current.totalClaims/DAILY_SUPPLY_TRACK_LENGTH)+1,dayInTrack,canClaim:current.lastClaimDayKey!==currentDayKey,currentDayKey,reward:premium?{kind:'premium',amount:premium}:{kind:'boost',type:DAILY_SUPPLY_BOOST_TYPES[normalClaimIndex(current.totalClaims)%DAILY_SUPPLY_BOOST_TYPES.length],charges:1}};
}
function updateCharacter(state:GameState,characterId:string,fn:(character:CharacterState)=>CharacterState){
 if(state.character?.id===characterId)return {...state,character:fn(state.character)};
 let found=false;
 const otherCharacters=(state.otherCharacters??[]).map(entry=>entry.character.id===characterId?(found=true,{...entry,character:fn(entry.character)}):entry);
 if(!found)throw new Error('Character is not owned.');
 return {...state,otherCharacters};
}
export function claimDailySupplies(state:GameState,characterId:string,nowMs:number){
 if(!state.character||!characterId||(state.character.id!==characterId&&!(state.otherCharacters??[]).some(entry=>entry.character.id===characterId)))throw new Error('Character is not owned.');
 const status=dailySuppliesStatus(state,nowMs),current=track(state);
 if(!status.canClaim)throw new Error('Daily Supplies were already claimed for this UTC day.');
 let next=state;
 if(status.reward.kind==='premium'){
  next={...next,account:{...next.account,premiumCurrencyBalance:(next.account.premiumCurrencyBalance??0)+status.reward.amount}};
 }else{
  const reward=status.reward;
  next=updateCharacter(next,characterId,character=>{
   const bank={...(character.dailySupplyBoostBank??{})},type=reward.type;
   bank[type]=(bank[type]??0)+reward.charges;
   return {...character,dailySupplyBoostBank:bank};
  });
 }
 next={...next,account:{...next.account,dailySupplies:{schemaVersion:1,totalClaims:current.totalClaims+1,lastClaimDayKey:status.currentDayKey}}};
 return {state:next,status};
}
export function activateDailySupplyBoost(state:GameState,type:DailySupplyBoostType){
 if(!state.character)throw new Error('Create a character first.');
 if(!DAILY_SUPPLY_BOOST_TYPES.includes(type))throw new Error('Unknown Daily Supplies boost.');
 const active=activeDailySupplyBoosts(state.character);
 if(active[type])throw new Error('This Daily Supplies boost is already active.');
 const bank={...(normalizeDailySupplyBank(state.character.dailySupplyBoostBank)??{})},charges=bank[type]??0;
 if(charges<1)throw new Error('No banked charge is available for this boost.');
 if(charges===1)delete bank[type];else bank[type]=charges-1;
 return {...state,character:withActiveDailySupplyBoosts({...state.character,dailySupplyBoostBank:bank},{...active,[type]:{type,remainingSeconds:DAILY_SUPPLY_CHARGE_SECONDS}})};
}
function activityModeEligible(type:DailySupplyBoostType,mode:'combat'|'gathering'|'skill'|'crafting'|'training'){
 if(type==='combat_xp')return mode==='combat';
 if(type==='gathering_yield')return mode==='gathering';
 if(type==='crafting_output')return mode==='crafting';
 return mode==='gathering'||mode==='skill'||mode==='crafting'||mode==='training';
}
function bonusInteger(base:number,key:string,fraction:number,remainders:Record<string,number>){
 const extraFloat=Math.max(0,base)*DAILY_SUPPLY_BONUS*fraction+(remainders[key]??0),extra=Math.floor(extraFloat+1e-9);
 remainders[key]=Math.max(0,extraFloat-extra);
 return extra;
}
export function previewDailySupplyTimedReward(state:GameState,reward:RewardBundle,mode:'combat'|'gathering'|'skill'|'crafting'|'training'):DailySupplyTimedResult{
 const boosts=activeDailySupplyBoosts(state.character),updates:NonNullable<DailySupplyTimedResult['updates']>={};
 let next={...reward,items:reward.items.map(item=>({...item}))};
 for(const type of DAILY_SUPPLY_BOOST_TYPES){
  const active=boosts[type];if(!active||!activityModeEligible(type,mode)||reward.elapsedSeconds<=0)continue;
  const hasReward=type==='combat_xp'?reward.xp>0:type==='skill_xp'?reward.xp>0||(reward.faithXp??0)>0||(reward.classSkillXp??[]).some(row=>row.xp>0):reward.items.some(item=>item.quantity>0);
  if(!hasReward)continue;
  const qualifyingSeconds=Math.min(Math.max(0,reward.elapsedSeconds),Math.max(0,reward.qualifyingActivitySeconds??reward.elapsedSeconds));if(qualifyingSeconds<=0)continue;
  const consumedSeconds=Math.min(active.remainingSeconds,qualifyingSeconds),fraction=consumedSeconds/Math.max(1,qualifyingSeconds),remainders={...(active.remainders??{})};
  if(type==='combat_xp')next.xp+=bonusInteger(reward.xp,'xp:combat',fraction,remainders);
  else if(type==='skill_xp'){
   if(reward.classSkillXp?.length)next.classSkillXp=reward.classSkillXp.map(row=>({...row,xp:row.xp+bonusInteger(row.xp,`class:${row.skillId}`,fraction,remainders)}));
   else{const extra=bonusInteger(reward.xp,'xp:skill',fraction,remainders);next.xp+=extra;if(reward.faithXp!==undefined)next.faithXp=(reward.faithXp??0)+extra;}
  }else next.items=next.items.map(item=>({...item,quantity:item.quantity+bonusInteger(item.quantity,`item:${item.itemId}`,fraction,remainders)}));
  updates[type]={consumedSeconds,nextRemainders:remainders};
 }
 const first=DAILY_SUPPLY_BOOST_TYPES.map(type=>updates[type]).find(Boolean);
 return {reward:next,consumedSeconds:first?.consumedSeconds??0,nextRemainders:first?.nextRemainders??{},updates};
}
export function commitDailySupplyTimedBoost(state:GameState,result:Pick<DailySupplyTimedResult,'consumedSeconds'|'nextRemainders'|'updates'>){
 if(!state.character)return state;
 const active=activeDailySupplyBoosts(state.character);
 const updates:NonNullable<DailySupplyTimedResult['updates']>=result.updates??(state.character.activeDailySupplyBoost?{[state.character.activeDailySupplyBoost.type]:result}:{});
 const next={...active};let changed=false;
 for(const type of DAILY_SUPPLY_BOOST_TYPES){
  const current=active[type],spent=updates[type];if(!current||!spent||spent.consumedSeconds<=0)continue;
  changed=true;
  const remainingSeconds=Math.max(0,current.remainingSeconds-spent.consumedSeconds);
  if(remainingSeconds>0)next[type]={...current,remainingSeconds,remainders:spent.nextRemainders};else delete next[type];
 }
 return changed?{...state,character:withActiveDailySupplyBoosts(state.character,next)}:state;
}
export function applyDailySupplyCraft(state:GameState,input:{seconds:number;outputQuantity:number;xp:number;outputEligible:boolean}){
 if(!state.character||input.seconds<=0)return {state,outputQuantity:input.outputQuantity,xp:input.xp,bonusQuantity:0,bonusXp:0};
 const active=activeDailySupplyBoosts(state.character),updates:NonNullable<DailySupplyTimedResult['updates']>={};
 let bonusQuantity=0,bonusXp=0;
 for(const type of ['crafting_output','skill_xp'] as const){
  const boost=active[type];if(!boost||type==='crafting_output'&&!input.outputEligible)continue;
  const consumedSeconds=Math.min(boost.remainingSeconds,input.seconds),fraction=consumedSeconds/input.seconds,remainders={...(boost.remainders??{})};
  if(type==='crafting_output')bonusQuantity=bonusInteger(input.outputQuantity,'craft:output',fraction,remainders);
  else bonusXp=bonusInteger(input.xp,'craft:xp',fraction,remainders);
  updates[type]={consumedSeconds,nextRemainders:remainders};
 }
 return {state:commitDailySupplyTimedBoost(state,{consumedSeconds:0,nextRemainders:{},updates}),outputQuantity:input.outputQuantity+bonusQuantity,xp:input.xp+bonusXp,bonusQuantity,bonusXp};
}
export function dailySupplyActiveLabels(character:CharacterState|null|undefined){
 const boosts=activeDailySupplyBoosts(character);
 return DAILY_SUPPLY_BOOST_TYPES.flatMap(type=>{const active=boosts[type];return active?[{...active,label:dailySupplyBoostLabel(type),hours:active.remainingSeconds/3600}]:[];});
}
export function dailySupplyActiveLabel(character:CharacterState|null|undefined){return dailySupplyActiveLabels(character)[0]}
export function dailySupplyBank(character:CharacterState|null|undefined){return normalizeDailySupplyBank(character?.dailySupplyBoostBank)??{}}
export function dailySupplyActivityMode(activity:ActiveActivity|null|undefined):'combat'|'gathering'|'skill'|'crafting'|undefined{
 if(!activity)return undefined;if(activity.kind==='combat')return 'combat';if(['mining','woodcutting','fishing','herbalism'].includes(activity.kind))return 'gathering';if(activity.kind==='alchemy'||activity.kind==='processing')return 'crafting';return 'skill';
}
