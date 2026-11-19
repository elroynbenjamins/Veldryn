import type {OwnedCompanionProgress} from './combat-companion-types';
import {combatCompanionDef} from '../content/combat-companions';

/** Housing is optional: only rarity and Ascension limit levels. */
export const COMPANION_HOUSING_UNLIMITED=true;
export const COMPANION_HOUSING_MILESTONES=[
 {housingTier:0,label:'Basic Quarters'},
 {housingTier:1,label:'Reinforced Quarters'},
 {housingTier:2,label:'Veteran Quarters'},
 {housingTier:3,label:'Master Quarters'},
] as const;
/** Existing paid and earned Quarters keep their value as per-companion bonuses. */
export const COMPANION_HOUSING_BONUSES=[
 {trainingXpPct:0,statPct:0,essenceDiscountPct:0},
 {trainingXpPct:5,statPct:1,essenceDiscountPct:3},
 {trainingXpPct:10,statPct:2,essenceDiscountPct:6},
 {trainingXpPct:15,statPct:3,essenceDiscountPct:10},
] as const;
export function companionHousingBonuses(tier:number){
 const index=Number.isFinite(tier)?Math.max(0,Math.min(3,Math.floor(tier))):0;
 return COMPANION_HOUSING_BONUSES[index];
}
export function companionHousingTrainingXpMultiplier(tier:number){return 1+companionHousingBonuses(tier).trainingXpPct/100;}
/** Verified per-companion combat stat bonus from owned Quarters; never an account-wide buff. */
export function companionHousingStatMultiplier(tier:number){return 1+companionHousingBonuses(tier).statPct/100;}
/** Only paid level-training Essence is discounted, not Ascension or Gold. */
export function companionHousingLevelEssenceCost(baseCost:number,tier:number){
 return Math.max(1,Math.ceil(baseCost*(100-companionHousingBonuses(tier).essenceDiscountPct)/100));
}
export const COMPANION_HOUSING_UPGRADES=[
 {tier:1,gold:8000,inputs:[{itemId:'IRONWOOD_LOG',quantity:40},{itemId:'ASTER_IRON_INGOT',quantity:12},{itemId:'REINFORCED_FITTING',quantity:3}]},
 {tier:2,gold:35000,inputs:[{itemId:'CROWNWOOD_LOG',quantity:80},{itemId:'OATHSTONE_INGOT',quantity:30},{itemId:'REINFORCED_FITTING',quantity:10},{itemId:'OATHGLASS_SHARD',quantity:6}]},
 {tier:3,gold:100000,inputs:[{itemId:'WHITEPINE_LOG',quantity:110},{itemId:'FROSTIRON_INGOT',quantity:45},{itemId:'RIMEGLASS',quantity:12},{itemId:'CHOIR_BLOOM',quantity:4}]},
] as const;
export type CompanionHousingTiers=Record<string,number>;
/** Do not restore invalid tier values from imported saves. */
export function normalizeCompanionHousingTiers(raw:unknown):CompanionHousingTiers{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(Object.entries(raw).filter(([id,tier])=>id.length<=80&&typeof tier==='number'&&Number.isInteger(tier)&&tier>=0).slice(0,150).map(([id,tier])=>[id,Math.min(3,tier)]));
}
/** One-time launch credit for companions already trained beyond Basic Quarters. */
export function companionHousingEarnedTier(level:number):number{
 if(!Number.isFinite(level))return 0;
 return level>25?3:level>20?2:level>10?1:0;
}
export function companionHousingTier(companionId:string,tiers?:CompanionHousingTiers){return Math.max(0,Math.min(3,Math.floor(tiers?.[companionId]??0)));}
/** @deprecated Compatibility only. Housing no longer sets a level cap. */
export function companionHousingLevelCap(_housingTier:number){return 35;}
/** @deprecated No housing tier is required for leveling. */
export function companionHousingRequiredTier(_progress:OwnedCompanionProgress){return 0;}
/** @deprecated Housing never blocks leveling. */
export function companionCanLevelWithHousing(_companionId:string,_progress:OwnedCompanionProgress,_tiers?:CompanionHousingTiers){return true;}

export const COMPANION_HOUSING_VISUALS=[
 {tier:0,label:'Basic Quarters',borderColor:'#59636f',borderWidth:1,surface:'rgba(89,99,111,0.08)',accent:'BASIC'},
 {tier:1,label:'Reinforced Quarters',borderColor:'#8b6f47',borderWidth:2,surface:'rgba(139,111,71,0.10)',accent:'REINFORCED'},
 {tier:2,label:'Veteran Quarters',borderColor:'#7894a8',borderWidth:2,surface:'rgba(120,148,168,0.12)',accent:'VETERAN'},
 {tier:3,label:'Master Quarters',borderColor:'#d0ad63',borderWidth:3,surface:'rgba(208,173,99,0.13)',accent:'MASTER'},
] as const;
export function companionHousingVisual(companionId:string,tiers?:CompanionHousingTiers){return COMPANION_HOUSING_VISUALS[companionHousingTier(companionId,tiers)];}

function qty(stacks:{itemId:string;quantity:number}[],id:string){return stacks.reduce((total,stack)=>total+(stack.itemId===id?Math.max(0,stack.quantity):0),0);}
export function companionHousingUpgradeCost(companionId:string,tiers?:CompanionHousingTiers){
 const def=combatCompanionDef(companionId);
 if(!def)return undefined;
 // Even a max-level companion can benefit from optional Housing bonuses.
 const next=companionHousingTier(companionId,tiers)+1;
 return COMPANION_HOUSING_UPGRADES.find(row=>row.tier===next);
}
export function companionHousingUpgradeAffordability(state:{character:{gold:number}|null;inventory:{stacks:{itemId:string;quantity:number}[]};bank:{stacks:{itemId:string;quantity:number}[]};account:{companionHousingTiers?:CompanionHousingTiers}},companionId:string){
 const cost=companionHousingUpgradeCost(companionId,state.account.companionHousingTiers);if(!cost)return {ready:false,cost:undefined,materials:[]};
 const all=[...state.inventory.stacks,...state.bank.stacks],materials=cost.inputs.map(input=>({...input,owned:qty(all,input.itemId)}));
 return {ready:(state.character?.gold??0)>=cost.gold&&materials.every(x=>x.owned>=x.quantity),cost,materials};
}
export function upgradeCompanionHousing<T extends {character:{gold:number}|null;inventory:{stacks:{itemId:string;quantity:number}[]};bank:{stacks:{itemId:string;quantity:number}[]};account:{companionHousingTiers?:CompanionHousingTiers;unlockedCombatCompanionIds?:string[]}}>(state:T,companionId:string):T{
 if(!state.character)throw new Error('character_required');
 if(!state.account.unlockedCombatCompanionIds?.includes(companionId))throw new Error('companion_not_owned');
 const check=companionHousingUpgradeAffordability(state,companionId);if(!check.cost)throw new Error('companion_housing_max');if(!check.ready)throw new Error('companion_housing_resources');
 const spend=(stacks:{itemId:string;quantity:number}[],id:string,amount:number)=>{let left=amount;return stacks.map(s=>{if(s.itemId!==id||left<=0)return s;const used=Math.min(Math.max(0,s.quantity),left);left-=used;return {...s,quantity:s.quantity-used};}).filter(s=>s.quantity>0);};
 let inventory=state.inventory.stacks.map(x=>({...x})),bank=state.bank.stacks.map(x=>({...x}));
 for(const input of check.cost.inputs){let remaining=input.quantity,have=qty(inventory,input.itemId),take=Math.min(have,remaining);if(take){inventory=spend(inventory,input.itemId,take);remaining-=take;}if(remaining)bank=spend(bank,input.itemId,remaining);}
 const tier=companionHousingTier(companionId,state.account.companionHousingTiers)+1;
 return {...state,character:{...state.character,gold:state.character.gold-check.cost.gold},inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank},account:{...state.account,companionHousingTiers:{...(state.account.companionHousingTiers??{}),[companionId]:tier}}};
}
