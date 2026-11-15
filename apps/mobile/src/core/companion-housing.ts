import type {OwnedCompanionProgress} from './combat-companion-types';

/** Every owned companion gets Basic Quarters automatically. Housing limits training only, never ownership or combat use. */
export const COMPANION_HOUSING_UNLIMITED=true;
export const COMPANION_HOUSING_MILESTONES=[
 {levelCap:10,housingTier:0,label:'Basic Quarters'},
 {levelCap:20,housingTier:1,label:'Reinforced Quarters'},
 {levelCap:25,housingTier:2,label:'Veteran Quarters'},
 {levelCap:35,housingTier:3,label:'Master Quarters'},
] as const;
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
export function companionHousingLevelCap(housingTier:number){const tier=Math.max(0,Math.min(3,Math.floor(housingTier)));return COMPANION_HOUSING_MILESTONES[tier].levelCap;}
export function companionHousingRequiredTier(progress:OwnedCompanionProgress){if(progress.level<10)return 0;if(progress.level<20)return 1;if(progress.level<25)return 2;return 3;}
export function companionCanLevelWithHousing(companionId:string,progress:OwnedCompanionProgress,tiers?:CompanionHousingTiers){return progress.level<companionHousingLevelCap(companionHousingTier(companionId,tiers));}

export const COMPANION_HOUSING_VISUALS=[
 {tier:0,label:'Basic Quarters',borderColor:'#59636f',borderWidth:1,surface:'rgba(89,99,111,0.08)',accent:'BASIC'},
 {tier:1,label:'Reinforced Quarters',borderColor:'#8b6f47',borderWidth:2,surface:'rgba(139,111,71,0.10)',accent:'REINFORCED'},
 {tier:2,label:'Veteran Quarters',borderColor:'#7894a8',borderWidth:2,surface:'rgba(120,148,168,0.12)',accent:'VETERAN'},
 {tier:3,label:'Master Quarters',borderColor:'#d0ad63',borderWidth:3,surface:'rgba(208,173,99,0.13)',accent:'MASTER'},
] as const;
export function companionHousingVisual(companionId:string,tiers?:CompanionHousingTiers){return COMPANION_HOUSING_VISUALS[companionHousingTier(companionId,tiers)];}

function qty(stacks:{itemId:string;quantity:number}[],id:string){return stacks.reduce((total,stack)=>total+(stack.itemId===id?Math.max(0,stack.quantity):0),0);}
export function companionHousingUpgradeCost(companionId:string,tiers?:CompanionHousingTiers){
 const next=companionHousingTier(companionId,tiers)+1;return COMPANION_HOUSING_UPGRADES.find(row=>row.tier===next);
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
 const spend=(stacks:{itemId:string;quantity:number}[],id:string,amount:number)=>stacks.map(s=>s.itemId===id?{...s,quantity:s.quantity-amount}:s).filter(s=>s.quantity>0);
 let inventory=state.inventory.stacks.map(x=>({...x})),bank=state.bank.stacks.map(x=>({...x}));
 for(const input of check.cost.inputs){let remaining=input.quantity,have=qty(inventory,input.itemId),take=Math.min(have,remaining);if(take){inventory=spend(inventory,input.itemId,take);remaining-=take;}if(remaining)bank=spend(bank,input.itemId,remaining);}
 const tier=companionHousingTier(companionId,state.account.companionHousingTiers)+1;
 return {...state,character:{...state.character,gold:state.character.gold-check.cost.gold},inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank},account:{...state.account,companionHousingTiers:{...(state.account.companionHousingTiers??{}),[companionId]:tier}}};
}
