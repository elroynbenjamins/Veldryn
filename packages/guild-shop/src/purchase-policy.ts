import { GUILD_SHOP_CATALOGUE, type GuildShopEntry } from "./catalogue";
/** A trusted backend may use this to resolve item IDs, never client-provided prices. */
export type PurchaseDecision =
 | { ok:true; entry:GuildShopEntry }
 | { ok:false; reason:"unknown_item"|"guild_membership_required"|"invalid_balance"|"already_owned"|"guild_level_locked"|"insufficient_tokens" };
export function validateGuildShopPurchase(
 itemId:unknown, guildLevel:number|null, balance:number, ownedIds:readonly string[]
): PurchaseDecision {
 if (typeof itemId!=="string") return {ok:false,reason:"unknown_item"};
 const entry=GUILD_SHOP_CATALOGUE.find(item=>item.id===itemId);
 if (!entry) return {ok:false,reason:"unknown_item"};
 if (guildLevel===null || !Number.isSafeInteger(guildLevel) || guildLevel<1)
  return {ok:false,reason:"guild_membership_required"};
 if (!Number.isSafeInteger(balance) || balance<0) return {ok:false,reason:"invalid_balance"};
 if (ownedIds.includes(itemId)) return {ok:false,reason:"already_owned"};
 if (guildLevel<entry.guildLevel) return {ok:false,reason:"guild_level_locked"};
 if (balance<entry.tokenCost) return {ok:false,reason:"insufficient_tokens"};
 return {ok:true,entry};
}
