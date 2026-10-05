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
  gatheringSpeedMultiplier:number;
  combatXpMultiplier:number;
  dropChanceMultiplier:number;
  craftingSpeedMultiplier:number;
}

export interface ServerCommerceEntitlements{
  vip:boolean;
  vipPlus:boolean;
  supporter:boolean;
  supporterExpiresAt:string|null;
}

function has(state:GameState,...keys:string[]){
  const entitlements=state.account.entitlements??{};
  return keys.some(key=>entitlements[key]===true);
}

export function accountEntitlementBenefits(state:GameState):AccountEntitlementBenefits{
  const vipPlus=has(state,'vip_plus','vipplus','vip+');
  // Permanent tiers are independent grants; owning both adds both sets of benefits.
  const vip=has(state,'vip');
  const supporter=has(state,'supporter','supporter_subscription');
  return {
    vip,
    vipPlus,
    supporter,
    afkHours:(vip?2:0)+(vipPlus?2:0)+(supporter?2:0),
    inventorySlots:(vip?10:0)+(vipPlus?10:0),
    bankSlots:(vip?20:0)+(vipPlus?30:0),
    loadoutSlots:(vip?1:0)+(vipPlus?1:0),
    actionQueueSlots:vipPlus?1:0,
    forgeSlots:(vipPlus?1:0)+(supporter?1:0),
    solidRgbNames:vipPlus||supporter,
    advancedNameStyles:supporter,
    gatheringSpeedMultiplier:vip?1.05:1,
    combatXpMultiplier:vip?1.05:1,
    dropChanceMultiplier:vipPlus?1.05:1,
    craftingSpeedMultiplier:vipPlus?1.10:1,
  };
}

/**
 * Mirrors server-authoritative paid entitlements into the local GameState cache.
 * Legacy aliases are explicitly cleared so a cancelled Supporter subscription
 * cannot remain active because an older save still contains an alias flag.
 */
export function withServerCommerceEntitlements(state:GameState,server:ServerCommerceEntitlements):GameState{
  const entitlements={...(state.account.entitlements??{})};
  for(const key of ['vip','vip_plus','vipplus','vip+','supporter','supporter_subscription'])entitlements[key]=false;
  entitlements.vip=server.vip;
  entitlements.vip_plus=server.vipPlus;
  entitlements.supporter=server.supporter;
  return {...state,account:{...state.account,entitlements}};
}

export function entitlementStorageCapacity(state:GameState,location:'inventory'|'bank'){
  const benefits=accountEntitlementBenefits(state);
  return state[location].capacity+(location==='inventory'?benefits.inventorySlots:benefits.bankSlots);
}
