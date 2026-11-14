import type {CraftedGearInstance,GameState} from '../../apps/mobile/src/core/types';
import type {ItemRarity} from '../../apps/mobile/src/core/item-rarity';
import {characterLevelFromXp} from '../../apps/mobile/src/core/progression';
import {itemDef} from '../../apps/mobile/src/content/items';
import {V33_EQUIPMENT_RECIPES} from '../../apps/mobile/src/content/equipment-recipes-v33';
import {isReleasedEquipmentTier} from '../../apps/mobile/src/content/equipment-release';

/**
 * Hidden Market V17 acquisition preview. This file has NO route, grants, Gold
 * mutations, receipt transfers or feature switch. A future private SQL buyer
 * transaction MUST independently enforce the same canonical facts under its
 * own locked, server-owned state and offer rows before moving Gold.
 */
export const MARKET_ACQUISITION_RELEASED_V17=false as const;

export const MARKET_EQUIPMENT_LEVEL_FLOORS_V17={
  T1:6,T2:18,T3:30,T4:52,
} as const;
export const MARKET_RARITY_LEVEL_PREMIUM_V17:Readonly<Record<ItemRarity,number>>={
  common:0,uncommon:0,rare:2,epic:4,legendary:6,mythic:8,
};
type ApprovedMarketTierV17=keyof typeof MARKET_EQUIPMENT_LEVEL_FLOORS_V17;

/** Provisional per-SKU *source* tiers. Not a tradability whitelist.
 * Anything not explicitly mapped must fail closed, even if a high-tier
 * recipe happens to consume it. Resource floors are NOT gear floors.
 */
const RESOURCE_SOURCE_DRAFT_V17:Readonly<Record<string,{tier:string;level:number}>>={
  COPPER_ORE:{tier:'T1',level:1},
  GREENWOOD_LOG:{tier:'T1',level:1},
  MOSS_FIBER:{tier:'T1',level:1},
  BOAR_HIDE:{tier:'T1',level:1},
  MEADOW_PERCH:{tier:'T1',level:1},
  DUNEWOOD:{tier:'T3',level:20},
  SUNSTONE_ORE:{tier:'T3',level:20},
  FROSTIRON:{tier:'T5',level:40},
};

const equipmentByItemId=new Map(V33_EQUIPMENT_RECIPES.map(recipe=>
  [recipe.output.itemId,recipe] as const));

export type MarketAcquisitionReasonV17=
  'market_state_unverified'|'market_character_not_owned'|'market_active_character_required'
  |'market_character_xp_invalid'|'market_item_unrecognized'|'market_item_restricted'
  |'market_gear_receipt_invalid'|'market_tier_not_approved'|'market_item_policy_unapproved'
  |'market_class_required'|'market_level_required'|'market_disabled';

export type MarketOfferPreviewV17=
 |{assetKind:'equipment';itemId:string;quantity:number;exactReceipt:CraftedGearInstance|null}
 |{assetKind:'resource';itemId:string;quantity:number};

/**
 * Input can only be built by trusted code after retrieving the authenticated,
 * account-owned online_game_states snapshot. These types alone do not verify
 * authentication, item-policy rows, escrow, custody or snapshot revision.
 */
export interface MarketTrustedCharacterSnapshotV17{
  accountId:string;
  activeCharacterId:string;
  state:GameState;
}
export interface MarketAcquisitionPreviewV17{
  itemId:string;
  recipientCharacterId:string|null;
  characterLevel:number|null;
  requiredCharacterLevel:number|null;
  equipmentTier:string|null;
  rolledRarity:ItemRarity|null;
  meetsLevelRequirement:boolean;
  /** No positive preview can open a purchase route while flags are false. */
  canTradeNow:false;
  reason:MarketAcquisitionReasonV17;
}

function result(
 offer:MarketOfferPreviewV17,
 reason:MarketAcquisitionReasonV17,
 data:Partial<MarketAcquisitionPreviewV17>={},
):MarketAcquisitionPreviewV17{
 return {
  itemId:offer.itemId,recipientCharacterId:null,characterLevel:null,
  requiredCharacterLevel:null,equipmentTier:null,rolledRarity:null,
  meetsLevelRequirement:false,canTradeNow:false,reason,...data,
 };
}
function validXp(value:unknown):value is number{
 return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
}
function validRarity(value:unknown):value is ItemRarity{
 return typeof value==='string'&&Object.prototype.hasOwnProperty.call(
  MARKET_RARITY_LEVEL_PREMIUM_V17,value);
}

/**
 * For a purchase use mode='purchase': only the *active* character may pay.
 * For a pending purchased gear delivery use mode='delivery' and recheck the
 * exact recipient's XP/class, including parked characters. This is a read-only
 * requirement preview; it cannot claim items or rebind market provenance.
 */
export function previewMarketAcquisitionV17(
 snapshot:MarketTrustedCharacterSnapshotV17,
 offer:MarketOfferPreviewV17,
 mode:'purchase'|'delivery',
 recipientCharacterId?:string,
):MarketAcquisitionPreviewV17{
 if(!snapshot||!snapshot.state||!snapshot.accountId
  ||snapshot.state.account?.longTermAccountScopeId!==snapshot.accountId
  ||!snapshot.activeCharacterId||snapshot.state.character?.id!==snapshot.activeCharacterId)
  return result(offer,'market_state_unverified');
 const targetId=recipientCharacterId??snapshot.activeCharacterId;
 if(mode==='purchase'&&targetId!==snapshot.activeCharacterId)
  return result(offer,'market_active_character_required');
 const recipient=snapshot.state.character?.id===targetId
  ?snapshot.state.character
  :snapshot.state.otherCharacters?.find(row=>row.character.id===targetId)?.character;
 if(!recipient)return result(offer,'market_character_not_owned');
 if(!validXp(recipient.xp))
  return result(offer,'market_character_xp_invalid',{
   recipientCharacterId:recipient.id,
  });
 const level=characterLevelFromXp(recipient.xp);
 const context={recipientCharacterId:recipient.id,characterLevel:level};

 let item:ReturnType<typeof itemDef>;
 try{item=itemDef(offer.itemId);}
 catch{return result(offer,'market_item_unrecognized',context);}
 if(item.guildOnly||item.knowledgeUnlockId||item.value<=0
  ||!Number.isSafeInteger(offer.quantity)||offer.quantity!==1&&offer.assetKind==='equipment'
  ||offer.quantity<1||offer.quantity>2147483647)
  return result(offer,'market_item_restricted',context);
 if(offer.assetKind==='resource'){
  if(item.type!=='material')return result(offer,'market_item_restricted',context);
  const source=Object.prototype.hasOwnProperty.call(RESOURCE_SOURCE_DRAFT_V17,offer.itemId)
   ?RESOURCE_SOURCE_DRAFT_V17[offer.itemId]:undefined;
  if(!source)return result(offer,'market_item_policy_unapproved',context);
  const extra={...context,equipmentTier:source.tier,
   requiredCharacterLevel:source.level,meetsLevelRequirement:level>=source.level};
  if(level<source.level)return result(offer,'market_level_required',extra);
  // These are only preliminary source-tier classifications. Do not let
  // a preview authorize a resource whose tradability has not been reviewed.
  return result(offer,'market_item_policy_unapproved',extra);
 }
 if(item.type!=='gear')return result(offer,'market_item_restricted',context);
 const recipe=equipmentByItemId.get(offer.itemId);
 if(!recipe||!isReleasedEquipmentTier(recipe.v33EquipmentTier))
  return result(offer,'market_tier_not_approved',context);
 const tier=recipe.v33EquipmentTier;
 if(!Object.prototype.hasOwnProperty.call(MARKET_EQUIPMENT_LEVEL_FLOORS_V17,tier))
  return result(offer,'market_tier_not_approved',{...context,equipmentTier:tier});
 const receipt=offer.exactReceipt;
 if(!receipt||typeof receipt!=='object'
  ||receipt.itemId!==offer.itemId||!receipt.id||receipt.acquireSource!=='craft'
  ||!validRarity(receipt.rarity))
  return result(offer,'market_gear_receipt_invalid',{...context,equipmentTier:tier});
 const rolledRarity=receipt.rarity;
 // The exact item definition already has the rebased requirement. Never
 // compare rebased XP-derived levels to legacy crafting tier floors.
 if(!Number.isSafeInteger(item.requiredLevel)||!item.requiredLevel
  ||item.requiredLevel<1||item.requiredLevel>100)
  return result(offer,'market_item_restricted',{...context,equipmentTier:tier});
 const floor=MARKET_EQUIPMENT_LEVEL_FLOORS_V17[tier as ApprovedMarketTierV17];
 const requiredCharacterLevel=Math.max(item.requiredLevel,floor)
  +MARKET_RARITY_LEVEL_PREMIUM_V17[rolledRarity];
 const extra={...context,equipmentTier:tier,rolledRarity,
  requiredCharacterLevel,meetsLevelRequirement:level>=requiredCharacterLevel};
 if(item.classRestriction!==recipient.classId)
  return result(offer,'market_class_required',extra);
 if(level<requiredCharacterLevel)return result(offer,'market_level_required',extra);
 return result(offer,'market_disabled',extra);
}
