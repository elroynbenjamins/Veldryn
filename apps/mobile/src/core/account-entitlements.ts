import type {GameState} from './types';

export interface AccountEntitlementBenefits{
  vip:boolean;
  vipPlus:boolean;
  supporter:boolean;
  afkHours:number;
  inventorySlots:number;
  bankSlots:number;
  loadoutSlots:number;
  actionQueueSlots:number;
  forgeSlots:number;
  solidRgbNames:boolean;
  advancedNameStyles:boolean;
}

function has(state:GameState,...keys:string[]){
  const entitlements=state.account.entitlements??{};
  return keys.some(key=>entitlements[key]===true);
}

export function accountEntitlementBenefits(state:GameState):AccountEntitlementBenefits{
  const vipPlus=has(state,'vip_plus','vipplus','vip+');
  const vip=has(state,'vip')||vipPlus;
  const supporter=has(state,'supporter','supporter_subscription');
  return {
    vip,
    vipPlus,
    supporter,
    afkHours:(vip?2:0)+(vipPlus?2:0)+(supporter?2:0),
    inventorySlots:(vip?5:0)+(vipPlus?5:0),
    bankSlots:(vip?20:0)+(vipPlus?30:0),
    loadoutSlots:(vip?1:0)+(vipPlus?1:0),
    actionQueueSlots:vipPlus?1:0,
    forgeSlots:(vipPlus?1:0)+(supporter?1:0),
    solidRgbNames:vipPlus||supporter,
    advancedNameStyles:supporter,
  };
}

export function entitlementStorageCapacity(state:GameState,location:'inventory'|'bank'){
  const benefits=accountEntitlementBenefits(state);
  return state[location].capacity+(location==='inventory'?benefits.inventorySlots:benefits.bankSlots);
}
