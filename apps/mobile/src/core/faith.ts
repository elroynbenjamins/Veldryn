import {mealSpeedFactor} from './meal-buffs';
import {FAITH_TIERS,FAITH_BLESSINGS,HOLY_WATER_ID,faithBlessingDef,faithBlessingGroup,FAITH_BLESSING_GROUPS,type FaithBlessingGroup} from '../content/faith';
import {levelFromXp,totalXpAtLevel} from './progression';
import type {GameState,RewardBundle,ItemStack} from './types';
import type {CharacterFaithState} from './faith-types';
export interface FaithPractice{tierId:string;remaining:number;lastClaimAtMs:number;progressMs:number;}
export interface CharacterFaith{xp:number;selectedBlessingId?:string;selectedBlessingIds:Partial<Record<FaithBlessingGroup,string>>;favoriteBlessingIds:string[];hideWeakerBlessings:boolean;practice?:FaithPractice;}
const MAX_XP=totalXpAtLevel(100);
export const MAX_FAITH_PRACTICES=1000;
/** Keep the combat/profession hot path independent of favorites and practice reservations. */
function validFaithSelections(raw:CharacterFaithState|undefined,level:number){
 const selections:Partial<Record<FaithBlessingGroup,string>>={};
 if(raw?.selectedBlessingIds&&typeof raw.selectedBlessingIds==='object'){
  for(const group of FAITH_BLESSING_GROUPS){
   const blessing=faithBlessingDef(raw.selectedBlessingIds[group.id]);
   if(blessing&&blessing.level<=level&&faithBlessingGroup(blessing)===group.id)selections[group.id]=blessing.id;
  }
 }else{
  const blessing=faithBlessingDef(raw?.selectedBlessingId);
  if(blessing&&blessing.level<=level){
   const group=faithBlessingGroup(blessing);if(group)selections[group]=blessing.id;
  }
 }
 return selections;
}
function safeFaithXp(xp:unknown){return typeof xp==='number'&&Number.isFinite(xp)?Math.max(0,Math.min(MAX_XP,Math.floor(xp))):0;}
function stateFaithXp(state:GameState){return Math.max(safeFaithXp(state.character?.faith?.xp),safeFaithXp(state.skills.find(s=>s.skillId==='faith')?.xp));}
export function normalizeFaith(raw:any):CharacterFaith{
 const xp=safeFaithXp(raw?.xp);
 const selected=faithBlessingDef(raw?.selectedBlessingId),p=raw?.practice,tier=FAITH_TIERS.find(t=>t.id===p?.tierId);
 const selectedBlessingIds=validFaithSelections(raw,levelFromXp(xp));
 const legacy=selected&&Object.values(selectedBlessingIds).includes(selected.id)?selected.id:Object.values(selectedBlessingIds)[0];
 const practice=tier&&Number.isSafeInteger(p.remaining)&&p.remaining>0&&p.remaining<=MAX_FAITH_PRACTICES&&Number.isSafeInteger(p.lastClaimAtMs)&&p.lastClaimAtMs>=0&&Number.isSafeInteger(p.progressMs)&&p.progressMs>=0&&p.progressMs<tier.seconds*1000?{tierId:tier.id,remaining:p.remaining,lastClaimAtMs:p.lastClaimAtMs,progressMs:p.progressMs}:undefined;
 return {xp,selectedBlessingId:legacy,selectedBlessingIds,favoriteBlessingIds:Array.isArray(raw?.favoriteBlessingIds)?[...new Set<string>(raw.favoriteBlessingIds.filter((id:unknown)=>typeof id==='string'&&faithBlessingDef(id)))]:[],hideWeakerBlessings:raw?.hideWeakerBlessings!==false,practice};
}
export const faithLevel=(state:GameState|any[])=>levelFromXp(Array.isArray(state)?safeFaithXp(state.find((s:any)=>s.skillId==='faith')?.xp):stateFaithXp(state));
export function activeFaithPreferences(state:GameState){
 const raw=state.character?.faith;
 return normalizeFaith({...raw,xp:stateFaithXp(state)});
}
export const selectedFaithBlessing=(state:GameState,group?:FaithBlessingGroup)=>{
 const raw=state.character?.faith;if(!raw)return undefined;
 const selections=validFaithSelections(raw,faithLevel(state));
 const ids=Object.values(selections);
 return faithBlessingDef(group?selections[group]:raw.selectedBlessingId&&ids.includes(raw.selectedBlessingId)?raw.selectedBlessingId:ids[0]);
};
export const selectedFaithBlessings=(state:GameState)=>{
 const raw=state.character?.faith;if(!raw)return [];
 const ids=Object.values(validFaithSelections(raw,faithLevel(state)));
 return ids.map(id=>faithBlessingDef(id)!);
};
export function blessingRows(state:GameState){
 const faith=activeFaithPreferences(state),level=faithLevel(state);
 return FAITH_BLESSINGS.filter(b=>!faith.hideWeakerBlessings||faith.favoriteBlessingIds.includes(b.id)||Object.values(faith.selectedBlessingIds).includes(b.id)||!FAITH_BLESSINGS.some(other=>other.family===b.family&&other.bonus>b.bonus&&other.level<=level));
}
export function updateFaithPreference(state:GameState,kind:'blessing'|'favorite'|'hide',id?:string,enabled?:boolean):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const faith=activeFaithPreferences(state);
 if(kind==='hide')faith.hideWeakerBlessings=!!enabled;
 else {const blessing=faithBlessingDef(id);if(!blessing)throw new Error('Unknown blessing.');
 if(kind==='blessing'){if(blessing.level>faithLevel(state))throw new Error('Requires Faith level '+blessing.level);const group=faithBlessingGroup(blessing);if(!group)throw new Error('Unknown blessing category.');faith.selectedBlessingIds[group]=blessing.id;faith.selectedBlessingId=blessing.id;}
 else faith.favoriteBlessingIds=enabled?[...new Set([...faith.favoriteBlessingIds,blessing.id])]:faith.favoriteBlessingIds.filter(b=>b!==blessing.id);}
 return {...state,character:{...state.character,faith}};
}
export const holyWaterAvailable=(state:GameState)=>[...state.inventory.stacks,...state.bank.stacks].filter(s=>s.itemId===HOLY_WATER_ID).reduce((n,s)=>n+s.quantity,0);
function removeWater(stacks:ItemStack[],quantity:number){let remaining=quantity;return stacks.map(s=>{if(s.itemId!==HOLY_WATER_ID)return s;const taken=Math.min(remaining,s.quantity);remaining-=taken;return {...s,quantity:s.quantity-taken};}).filter(s=>s.quantity>0);}
export function reserveFaithPractice(state:GameState,tierId:string,count:number,now:number):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const faith=activeFaithPreferences(state),tier=FAITH_TIERS.find(t=>t.id===tierId);
 if(faith.practice)throw new Error('Stop the current practice first.');
 if(!tier||tier.level>faithLevel(state))throw new Error('Faith tier is locked.');
 if(faith.xp>=MAX_XP)throw new Error('Faith is mastered.');
 if(!Number.isSafeInteger(count)||count<1||count>MAX_FAITH_PRACTICES)throw new Error('Choose 1–1000 practices.');
 const cost=tier.water*count;if(holyWaterAvailable(state)<cost)throw new Error('Not enough Holy Water in Inventory and Bank.');
 const inv=Math.min(cost,state.inventory.stacks.filter(s=>s.itemId===HOLY_WATER_ID).reduce((n,s)=>n+s.quantity,0));
 return {...state,inventory:{...state.inventory,stacks:removeWater(state.inventory.stacks,inv)},bank:{...state.bank,stacks:removeWater(state.bank.stacks,cost-inv)},activity:{kind:'faith',targetId:tierId,startedAtMs:now,lastClaimAtMs:now,faithPractice:{tierId,remainingPractices:count,lastClaimAtMs:now,progressFraction:0}},character:{...state.character,classTraining:undefined,faith}};
}
export function settleFaithPractice(state:GameState,now:number,capSeconds:number):{state:GameState;reward:RewardBundle;refund:number}{
 const empty:RewardBundle={xp:0,gold:0,kills:0,items:[],elapsedSeconds:0,faithActions:0,faithXp:0,holyWaterConsumed:0};
 const faith=activeFaithPreferences(state),reservation=state.activity?.faithPractice,reservationTier=FAITH_TIERS.find(t=>t.id===reservation?.tierId);
 const p=faith.practice??(reservation&&reservationTier?{tierId:reservation.tierId,remaining:reservation.remainingPractices,lastClaimAtMs:reservation.lastClaimAtMs,progressMs:Math.floor(Math.max(0,Math.min(.999999,reservation.progressFraction))*reservationTier.seconds*1000)}:undefined),tier=FAITH_TIERS.find(t=>t.id===p?.tierId);
 if(!state.character||!p||!tier||now<p.lastClaimAtMs)return {state,reward:empty,refund:0};
 const elapsed=Math.min(capSeconds*1000,now-p.lastClaimAtMs),speed=mealSpeedFactor(state.character,'noncombat'),total=p.progressMs+elapsed*speed;
 const actions=Math.min(p.remaining,Math.floor(total/(tier.seconds*1000)),Math.ceil((MAX_XP-faith.xp)/tier.xp)),xp=Math.min(MAX_XP-faith.xp,actions*tier.xp);
 const remaining=p.remaining-actions,mastered=faith.xp+xp===MAX_XP,refund=mastered?remaining*tier.water:0;
 const nextPractice=remaining&&!mastered?{...p,remaining,lastClaimAtMs:now,progressMs:Math.floor(total%(tier.seconds*1000))}:undefined;
 const nextActivity=nextPractice&&state.activity?{...state.activity,lastClaimAtMs:now,faithPractice:{tierId:nextPractice.tierId,remainingPractices:nextPractice.remaining,lastClaimAtMs:now,progressFraction:nextPractice.progressMs/(tier.seconds*1000)}}:null;
 const qualifyingActivitySeconds=nextPractice?Math.floor(elapsed/1000):actions?Math.max(0,Math.min(Math.floor(elapsed/1000),Math.floor((actions*tier.seconds*1000-p.progressMs)/speed/1000))):0;
 return {state:{...state,activity:nextActivity,character:{...state.character,faith:{...faith,xp:faith.xp+xp,practice:nextPractice}}},refund,reward:{...empty,xp,elapsedSeconds:Math.floor(elapsed/1000),qualifyingActivitySeconds,faithActions:actions,faithXp:xp,holyWaterConsumed:actions*tier.water,faithWaterRefund:refund}};
}
export function cancelFaithPractice(state:GameState):{state:GameState;refund:number}{
 const faith=activeFaithPreferences(state),reservation=state.activity?.faithPractice,p=faith.practice??(reservation?{tierId:reservation.tierId,remaining:reservation.remainingPractices,lastClaimAtMs:reservation.lastClaimAtMs,progressMs:0}:undefined),tier=FAITH_TIERS.find(t=>t.id===p?.tierId);
 if(!state.character||!p||!tier)return {state,refund:0};
 return {state:{...state,character:{...state.character,faith:{...faith,practice:undefined}}},refund:p.remaining*tier.water};
}
/** One tap reserves every currently affordable practice, up to the safe session cap. */
export function affordableFaithPracticeCount(state:GameState,tierId:string):number{
 const tier=FAITH_TIERS.find(row=>row.id===tierId);
 if(!tier||tier.level>faithLevel(state)||faithLevel(state)>=100)return 0;
 return Math.min(MAX_FAITH_PRACTICES,Math.floor(holyWaterAvailable(state)/tier.water));
}
export const faithPracticeAvailability=(state:GameState,tierId:string,count:number)=>{const tier=FAITH_TIERS.find(t=>t.id===tierId);const level=faithLevel(state);const cost=(tier?.water??0)*count;return {ready:!!tier&&tier.level<=level&&count>=1&&count<=MAX_FAITH_PRACTICES&&holyWaterAvailable(state)>=cost,reason:!tier?'Unknown tier':tier.level>level?'Faith tier is locked.':holyWaterAvailable(state)<cost?'Not enough Holy Water.':'Ready'};};
export const startFaithPractice=reserveFaithPractice;
export const previewFaithReward=(state:GameState,elapsedSeconds:number):RewardBundle=>settleFaithPractice(state,(state.activity?.lastClaimAtMs??0)+elapsedSeconds*1000,elapsedSeconds).reward;
export const faithPracticeRefund=(p:any)=>{const tier=FAITH_TIERS.find(t=>t.id===p?.tierId);return tier&&Number.isSafeInteger(p?.remainingPractices??p?.remaining)?tier.water*(p.remainingPractices??p.remaining):0;};
