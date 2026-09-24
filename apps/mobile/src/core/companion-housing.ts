import type {OwnedCompanionProgress} from './combat-companion-types';

/** Every owned companion gets Basic Quarters automatically. Housing never limits collection or use. */
export const COMPANION_HOUSING_UNLIMITED=true;
export const COMPANION_HOUSING_MILESTONES=[
 {levelCap:10,housingTier:0,label:'Basic Quarters'},
 {levelCap:20,housingTier:1,label:'Reinforced Quarters'},
 {levelCap:25,housingTier:2,label:'Veteran Quarters'},
 {levelCap:35,housingTier:3,label:'Master Quarters'},
] as const;
export const COMPANION_HOUSING_UPGRADES=[
 {tier:1,gold:12000,inputs:[{itemId:'IRONWOOD_LOG',quantity:80},{itemId:'ASTER_IRON_INGOT',quantity:30},{itemId:'REINFORCED_FITTING',quantity:8}]},
 {tier:2,gold:45000,inputs:[{itemId:'CROWNWOOD_LOG',quantity:120},{itemId:'OATHSTONE_INGOT',quantity:45},{itemId:'REINFORCED_FITTING',quantity:16},{itemId:'OATHGLASS_SHARD',quantity:10}]},
 {tier:3,gold:140000,inputs:[{itemId:'WHITEPINE_LOG',quantity:150},{itemId:'FROSTIRON_INGOT',quantity:60},{itemId:'RIMEGLASS',quantity:18},{itemId:'CHOIR_BLOOM',quantity:6}]},
] as const;
export type CompanionHousingTiers=Record<string,number>;
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

function qty(stacks:{itemId:string;quantity:number}[],id:string){return stacks.find(s=>s.itemId===id)?.quantity??0;}
export function companionHousingUpgradeCost(companionId:string,tiers?:CompanionHousingTiers){
 const next=companionHousingTier(companionId,tiers)+1;return COMPANION_HOUSING_UPGRADES.find(row=>row.tier===next);
}
export function companionHousingUpgradeAffordability(state:{character:{gold:number}|null;inventory:{stacks:{itemId:string;quantity:number}[]};bank:{stacks:{itemId:string;quantity:number}[]};account:{companionHousingTiers?:CompanionHousingTiers}},companionId:string){
 const cost=companionHousingUpgradeCost(companionId,state.account.companionHousingTiers);if(!cost)return {ready:false,cost:undefined,materials:[]};
 const all=[...state.inventory.stacks,...state.bank.stacks],materials=cost.inputs.map(input=>({...input,owned:qty(all,input.itemId)}));
 return {ready:(state.character?.gold??0)>=cost.gold&&materials.every(x=>x.owned>=x.quantity),cost,materials};
}
export function upgradeCompanionHousing<T extends {character:{gold:number}|null;inventory:{stacks:{itemId:string;quantity:number}[]};bank:{stacks:{itemId:string;quantity:number}[]};account:{companionHousingTiers?:CompanionHousingTiers}}>(state:T,companionId:string):T{
 if(!state.character)throw new Error('character_required');
 const check=companionHousingUpgradeAffordability(state,companionId);if(!check.cost)throw new Error('companion_housing_max');if(!check.ready)throw new Error('companion_housing_resources');
 const spend=(stacks:{itemId:string;quantity:number}[],id:string,amount:number)=>stacks.map(s=>s.itemId===id?{...s,quantity:s.quantity-amount}:s).filter(s=>s.quantity>0);
 let inventory=state.inventory.stacks.map(x=>({...x})),bank=state.bank.stacks.map(x=>({...x}));
 for(const input of check.cost.inputs){let remaining=input.quantity,have=qty(inventory,input.itemId),take=Math.min(have,remaining);if(take){inventory=spend(inventory,input.itemId,take);remaining-=take;}if(remaining)bank=spend(bank,input.itemId,remaining);}
 const tier=companionHousingTier(companionId,state.account.companionHousingTiers)+1;
 return {...state,character:{...state.character,gold:state.character.gold-check.cost.gold},inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank},account:{...state.account,companionHousingTiers:{...(state.account.companionHousingTiers??{}),[companionId]:tier}}};
}
