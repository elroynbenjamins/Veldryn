import { GUILD_SHOP_CATALOGUE, GUILD_CONSTRUCTION_TEMPLATES } from "../../packages/guild-shop/src/catalogue";
import { buildGuildShopCards } from "../../packages/guild-shop/src/view-model";
export interface GuildShopSnapshot {
 balance: number;
 earnedThisWeek: number;
 ownedItemIds: string[];
 claimedDailyKinds: Array<'attendance'|'contribution'>;
 enabledItemIds: string[];
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
    claimedDailyKinds:Array.isArray(snapshot.claimedDailyKinds)?snapshot.claimedDailyKinds:[],
    weeklyCap:250,
    catalogue:GUILD_SHOP_CATALOGUE,
    constructionTemplates:GUILD_CONSTRUCTION_TEMPLATES,
    construction,
    cards:buildGuildShopCards({guildLevel,tokenBalance:snapshot.balance,ownedItemIds:snapshot.ownedItemIds}).map(card=>({
     ...card,released:Array.isArray(snapshot.enabledItemIds)&&snapshot.enabledItemIds.includes(card.id),
    })),
   });
  } catch {
   return json({error:"guild_shop_temporarily_unavailable"},503);
  }
 };
}

/** Explicit claim endpoint; the SQL verifies guild membership and activity
 * directly from committed Muster rows and calculates its own reward amount.
 */
export function guildShopDailyClaimHandler(services: GuildShopReadServices) {
 return async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return json({error:"method_not_allowed"},405);
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({error:"auth_required"},401);
  const accountId=await services.authenticate(token);
  if (!accountId) return json({error:"invalid_session"},401);
  const raw=await request.text();
  if(raw.length>2048)return json({error:"request_too_large"},413);
  let body:unknown;
  try{body=JSON.parse(raw);}catch{return json({error:"invalid_json"},400);}
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"invalid_request"},400);
  const candidate=body as Record<string,unknown>;
  if(Object.keys(candidate).length!==1
   ||(candidate.kind!=="attendance"&&candidate.kind!=="contribution"))
   return json({error:"invalid_reward_kind"},400);
  try {
   const credited=await services.rpc<number>("guild_shop_claim_daily_server_v1",{
    p_account_id:accountId,p_kind:candidate.kind,
   });
   if(!Number.isSafeInteger(credited)||credited<0||credited>10)
    return json({error:"invalid_claim_result"},503);
   return json({credited});
  } catch(reason) {
   if(reason instanceof Error&&reason.message==="guild_daily_reward_not_earned")
    return json({error:"guild_daily_reward_not_earned"},403);
   return json({error:"guild_token_claim_unavailable"},503);
  }
 };
}
