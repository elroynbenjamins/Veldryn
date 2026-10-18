import { GUILD_SHOP_CATALOGUE, GUILD_CONSTRUCTION_TEMPLATES } from "../../packages/guild-shop/src/catalogue";
import { buildGuildShopCards } from "../../packages/guild-shop/src/view-model";
export interface GuildShopSnapshot {
 balance: number;
 earnedThisWeek: number;
 ownedItemIds: string[];
}
export interface GuildShopReadServices {
 authenticate(token: string): Promise<string | null>;
 rpc<T>(name: string, args: Record<string, unknown>): Promise<T>;
 guildLevelForAccount(accountId: string): Promise<number | null>;
}
const responseHeaders = { "Content-Type":"application/json", "Cache-Control":"no-store" };
const json = (value: unknown, status = 200) =>
 new Response(JSON.stringify(value), { status, headers:responseHeaders });
/** Separate read-only endpoint. Mount only after server auth and guild-level
 * lookup are wired to canonical guild membership records.
 */
export function guildShopReadHandler(services: GuildShopReadServices) {
 return async (request: Request): Promise<Response> => {
  if (request.method !== "GET") return json({error:"method_not_allowed"},405);
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({error:"auth_required"},401);
  const accountId = await services.authenticate(token);
  if (!accountId) return json({error:"invalid_session"},401);
  try {
   const guildLevel = await services.guildLevelForAccount(accountId);
   if (guildLevel === null) return json({error:"guild_membership_required"},403);
   const [snapshot,construction] = await Promise.all([
    services.rpc<GuildShopSnapshot>("guild_shop_snapshot_server_v1",{p_account_id:accountId}),
    services.rpc<Array<{templateId:string;completed:boolean;resources:Record<string,number>}>>(
      "guild_construction_snapshot_server_v1",{p_account_id:accountId}),
   ]);
   if (!snapshot || !Number.isSafeInteger(snapshot.balance) || !Array.isArray(snapshot.ownedItemIds) || !Array.isArray(construction))
    return json({error:"invalid_shop_snapshot"},503);
   return json({
    guildLevel,
    balance:snapshot.balance,
    earnedThisWeek:snapshot.earnedThisWeek,
    weeklyCap:250,
    catalogue:GUILD_SHOP_CATALOGUE,
    constructionTemplates:GUILD_CONSTRUCTION_TEMPLATES,
    construction,
    cards:buildGuildShopCards({guildLevel,tokenBalance:snapshot.balance,ownedItemIds:snapshot.ownedItemIds}),
   });
  } catch {
   return json({error:"guild_shop_temporarily_unavailable"},503);
  }
 };
}
