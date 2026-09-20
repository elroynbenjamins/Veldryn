import {FAITH_TIERS,FAITH_BLESSINGS,HOLY_WATER_ID,faithBlessingDef} from '../content/faith';
import {levelFromXp,totalXpAtLevel} from './progression';
import type {GameState,RewardBundle,ItemStack} from './types';
export interface FaithPractice{tierId:string;remaining:number;lastClaimAtMs:number;progressMs:number;}
export interface CharacterFaith{xp:number;selectedBlessingId?:string;favoriteBlessingIds:string[];hideWeakerBlessings:boolean;practice?:FaithPractice;}
const MAX_XP=totalXpAtLevel(100);
export function normalizeFaith(raw:any):CharacterFaith{
 const xp=typeof raw?.xp==='number'&&Number.isFinite(raw.xp)?Math.max(0,Math.min(MAX_XP,Math.floor(raw.xp))):0;
 const selected=faithBlessingDef(raw?.selectedBlessingId),p=raw?.practice,tier=FAITH_TIERS.find(t=>t.id===p?.tierId);
 const practice=tier&&Number.isSafeInteger(p.remaining)&&p.remaining>0&&p.remaining<=1000&&Number.isSafeInteger(p.lastClaimAtMs)&&p.lastClaimAtMs>=0&&Number.isSafeInteger(p.progressMs)&&p.progressMs>=0&&p.progressMs<tier.seconds*1000?{tierId:tier.id,remaining:p.remaining,lastClaimAtMs:p.lastClaimAtMs,progressMs:p.progressMs}:undefined;
 return {xp,selectedBlessingId:selected&&selected.level<=levelFromXp(xp)?selected.id:undefined,favoriteBlessingIds:Array.isArray(raw?.favoriteBlessingIds)?[...new Set<string>(raw.favoriteBlessingIds.filter((id:unknown)=>typeof id==='string'&&faithBlessingDef(id)))]:[],hideWeakerBlessings:raw?.hideWeakerBlessings!==false,practice};
}
export const faithLevel=(state:GameState|any[])=>levelFromXp(Array.isArray(state)?(state.find((s:any)=>s.skillId==='faith')?.xp??0):Math.max(normalizeFaith(state.character?.faith).xp,state.skills.find(s=>s.skillId==='faith')?.xp??0));
export const selectedFaithBlessing=(state:GameState)=>{
 const raw=state.character?.faith, blessing=faithBlessingDef(raw?.selectedBlessingId);
 return blessing&&blessing.level<=faithLevel(state)?blessing:undefined;
};
export function blessingRows(state:GameState){
 const faith=normalizeFaith(state.character?.faith),level=faithLevel(state);
 return FAITH_BLESSINGS.filter(b=>!faith.hideWeakerBlessings||faith.favoriteBlessingIds.includes(b.id)||faith.selectedBlessingId===b.id||!FAITH_BLESSINGS.some(other=>other.family===b.family&&other.bonus>b.bonus&&other.level<=level));
}
export function updateFaithPreference(state:GameState,kind:'blessing'|'favorite'|'hide',id?:string,enabled?:boolean):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const faith=normalizeFaith(state.character.faith);
 if(kind==='hide')faith.hideWeakerBlessings=!!enabled;
 else {const blessing=faithBlessingDef(id);if(!blessing)throw new Error('Unknown blessing.');
 if(kind==='blessing'){if(blessing.level>faithLevel(state))throw new Error('Requires Faith level '+blessing.level);faith.selectedBlessingId=blessing.id;}
 else faith.favoriteBlessingIds=enabled?[...new Set([...faith.favoriteBlessingIds,blessing.id])]:faith.favoriteBlessingIds.filter(b=>b!==blessing.id);}
 return {...state,character:{...state.character,faith}};
}
export const holyWaterAvailable=(state:GameState)=>[...state.inventory.stacks,...state.bank.stacks].filter(s=>s.itemId===HOLY_WATER_ID).reduce((n,s)=>n+s.quantity,0);
function removeWater(stacks:ItemStack[],quantity:number){let remaining=quantity;return stacks.map(s=>{if(s.itemId!==HOLY_WATER_ID)return s;const taken=Math.min(remaining,s.quantity);remaining-=taken;return {...s,quantity:s.quantity-taken};}).filter(s=>s.quantity>0);}
export function reserveFaithPractice(state:GameState,tierId:string,count:number,now:number):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const faith=normalizeFaith(state.character.faith),tier=FAITH_TIERS.find(t=>t.id===tierId);
 if(faith.practice)throw new Error('Stop the current practice first.');
 if(!tier||tier.level>faithLevel(state))throw new Error('Faith tier is locked.');
 if(faith.xp>=MAX_XP)throw new Error('Faith is mastered.');
 if(!Number.isSafeInteger(count)||count<1||count>1000)throw new Error('Choose 1–1000 practices.');
 const cost=tier.water*count;if(holyWaterAvailable(state)<cost)throw new Error('Not enough Holy Water in Inventory and Bank.');
 const inv=Math.min(cost,state.inventory.stacks.filter(s=>s.itemId===HOLY_WATER_ID).reduce((n,s)=>n+s.quantity,0));
 return {...state,inventory:{...state.inventory,stacks:removeWater(state.inventory.stacks,inv)},bank:{...state.bank,stacks:removeWater(state.bank.stacks,cost-inv)},activity:{kind:'faith',targetId:tierId,startedAtMs:now,lastClaimAtMs:now,faithPractice:{tierId,remainingPractices:count,lastClaimAtMs:now,progressFraction:0}},character:{...state.character,classTraining:undefined,faith}};
}
export function settleFaithPractice(state:GameState,now:number,capSeconds:number):{state:GameState;reward:RewardBundle;refund:number}{
 const empty:RewardBundle={xp:0,gold:0,kills:0,items:[],elapsedSeconds:0,faithActions:0,faithXp:0,holyWaterConsumed:0};
 const normalized=normalizeFaith(state.character?.faith),skillXp=state.skills.find(s=>s.skillId==='faith')?.xp??0,faith={...normalized,xp:Math.max(normalized.xp,skillXp)},reservation=state.activity?.faithPractice,p=faith.practice??(reservation?{tierId:reservation.tierId,remaining:reservation.remainingPractices,lastClaimAtMs:reservation.lastClaimAtMs,progressMs:Math.floor(reservation.progressFraction*60000)}:undefined),tier=FAITH_TIERS.find(t=>t.id===p?.tierId);
 if(!state.character||!p||!tier||now<p.lastClaimAtMs)return {state,reward:empty,refund:0};
 const elapsed=Math.min(capSeconds*1000,now-p.lastClaimAtMs),total=p.progressMs+elapsed;
 const actions=Math.min(p.remaining,Math.floor(total/(tier.seconds*1000)),Math.ceil((MAX_XP-faith.xp)/tier.xp)),xp=Math.min(MAX_XP-faith.xp,actions*tier.xp);
 const remaining=p.remaining-actions,mastered=faith.xp+xp===MAX_XP,refund=mastered?remaining*tier.water:0;
 const nextPractice=remaining&&!mastered?{...p,remaining,lastClaimAtMs:now,progressMs:total%(tier.seconds*1000)}:undefined;
 const nextActivity=nextPractice&&state.activity?{...state.activity,lastClaimAtMs:now,faithPractice:{tierId:nextPractice.tierId,remainingPractices:nextPractice.remaining,lastClaimAtMs:now,progressFraction:nextPractice.progressMs/(tier.seconds*1000)}}:null;
 const qualifyingActivitySeconds=nextPractice?Math.floor(elapsed/1000):actions?Math.max(0,Math.min(Math.floor(elapsed/1000),actions*tier.seconds-Math.floor(p.progressMs/1000))):0;
 return {state:{...state,activity:nextActivity,character:{...state.character,faith:{...faith,xp:faith.xp+xp,practice:nextPractice}}},refund,reward:{...empty,xp,elapsedSeconds:Math.floor(elapsed/1000),qualifyingActivitySeconds,faithActions:actions,faithXp:xp,holyWaterConsumed:actions*tier.water,faithWaterRefund:refund}};
}
export function cancelFaithPractice(state:GameState):{state:GameState;refund:number}{
 const faith=normalizeFaith(state.character?.faith),reservation=state.activity?.faithPractice,p=faith.practice??(reservation?{tierId:reservation.tierId,remaining:reservation.remainingPractices,lastClaimAtMs:reservation.lastClaimAtMs,progressMs:0}:undefined),tier=FAITH_TIERS.find(t=>t.id===p?.tierId);
 if(!state.character||!p||!tier)return {state,refund:0};
 return {state:{...state,character:{...state.character,faith:{...faith,practice:undefined}}},refund:p.remaining*tier.water};
}
export const faithPracticeAvailability=(state:GameState,tierId:string,count:number)=>{const tier=FAITH_TIERS.find(t=>t.id===tierId);const level=faithLevel(state);const cost=(tier?.water??0)*count;return {ready:!!tier&&tier.level<=level&&count>=1&&count<=1000&&holyWaterAvailable(state)>=cost,reason:!tier?'Unknown tier':tier.level>level?'Faith tier is locked.':holyWaterAvailable(state)<cost?'Not enough Holy Water.':'Ready'};};
export const startFaithPractice=reserveFaithPractice;
export const previewFaithReward=(state:GameState,elapsedSeconds:number):RewardBundle=>settleFaithPractice(state,(state.activity?.lastClaimAtMs??0)+elapsedSeconds*1000,elapsedSeconds).reward;
export const faithPracticeRefund=(p:any)=>{const tier=FAITH_TIERS.find(t=>t.id===p?.tierId);return tier&&Number.isSafeInteger(p?.remainingPractices??p?.remaining)?tier.water*(p.remainingPractices??p.remaining):0;};
