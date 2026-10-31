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
   // Wallet, owned rewards and balances are required; optional projections
   // should not take down the entire shop if a guild feature is temporarily
   // unavailable. Claims/purchases still use separate authoritative RPCs.
   const [base,constructionResult,eventResult,enabledResult,weeklyResult,bankResult]=await Promise.allSettled([
    services.rpc<GuildShopSnapshot>("guild_shop_snapshot_server_v1",{p_account_id:accountId}),
    services.rpc<Array<{templateId:string;completed:boolean;resources:Record<string,number>}>>("guild_construction_snapshot_server_v1",{p_account_id:accountId}),
    services.rpc<Array<{eventId:string;milestonePercent:number;tokens:number;claimed:boolean}>>("guild_shop_event_community_rewards_server_v1",{p_account_id:accountId}),
    services.rpc<string[]>("guild_construction_enabled_server_v1",{p_account_id:accountId}),
    services.rpc<Array<{kind:string;tokens:number;eligible:boolean;claimed:boolean}>>("guild_shop_weekly_rewards_server_v1",{p_account_id:accountId}),
    services.rpc<{balances:Array<{resourceId:string;amount:number}>;activity:Array<{kind:string;resourceId:string;amount:number;templateId?:string;mine:boolean;createdAt:string}>}>("guild_bank_snapshot_server_v1",{p_account_id:accountId}),
   ]);
   if(base.status!=="fulfilled")throw new Error("guild_shop_wallet_snapshot_unavailable");
   const snapshot=base.value;
   if(!snapshot||!Number.isSafeInteger(snapshot.balance)||!Array.isArray(snapshot.ownedItemIds))
    return json({error:"invalid_shop_snapshot"},503);
   const construction=constructionResult.status==="fulfilled"&&Array.isArray(constructionResult.value)?constructionResult.value:[];
   const eventBonuses=eventResult.status==="fulfilled"&&Array.isArray(eventResult.value)?eventResult.value:[];
   const constructionEnabled=enabledResult.status==="fulfilled"&&Array.isArray(enabledResult.value)?enabledResult.value:[];
   const weeklyRewards=weeklyResult.status==="fulfilled"&&Array.isArray(weeklyResult.value)?weeklyResult.value:[];
   const unavailableSections=[
    ...(constructionResult.status==="fulfilled"&&Array.isArray(constructionResult.value)?[]:["construction"]),
    ...(eventResult.status==="fulfilled"&&Array.isArray(eventResult.value)?[]:["eventBonuses"]),
    ...(enabledResult.status==="fulfilled"&&Array.isArray(enabledResult.value)?[]:["constructionUnlocks"]),
    ...(weeklyResult.status==="fulfilled"&&Array.isArray(weeklyResult.value)?[]:["weeklyRewards"]),
    ...(bankResult.status==="fulfilled"&&bankResult.value&&Array.isArray(bankResult.value.balances)?[]:["bank"]),
   ];
   return json({
    guildLevel,
    unavailableSections,
    balance:snapshot.balance,
    earnedThisWeek:snapshot.earnedThisWeek,
    claimedDailyKinds:Array.isArray(snapshot.claimedDailyKinds)?snapshot.claimedDailyKinds:[],
    weeklyCap:250,
    catalogue:GUILD_SHOP_CATALOGUE,
    constructionTemplates:GUILD_CONSTRUCTION_TEMPLATES.map(template=>({
      ...template,enabled:constructionEnabled.includes(template.id),
    })),
    construction,
    bank:bankResult.status==="fulfilled"&&bankResult.value&&Array.isArray(bankResult.value.balances)?bankResult.value:null,
    eventBonuses,
    weeklyRewards,
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
   if(!Number.isSafeInteger(credited)||credited<0||credited>12)
    return json({error:"invalid_claim_result"},503);
   return json({credited});
  } catch(reason) {
   if(reason instanceof Error&&reason.message==="guild_daily_reward_not_earned")
    return json({error:"guild_daily_reward_not_earned"},403);
   return json({error:"guild_token_claim_unavailable"},503);
  }
 };
}

/** Atomic entitlement-backed purchase. SQL release switch and service-role
 * EXECUTE grant both default OFF, so this endpoint cannot spend live Tokens yet.
 */
export function guildShopPurchaseHandler(services:GuildShopReadServices){
 return async(request:Request):Promise<Response>=>{
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const token=request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:"auth_required"},401);
  const accountId=await services.authenticate(token);
  if(!accountId)return json({error:"invalid_session"},401);
  const raw=await request.text();
  if(raw.length>1024)return json({error:"request_too_large"},413);
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return json({error:"invalid_json"},400);}
  if(!input||typeof input!=="object"||Array.isArray(input))return json({error:"invalid_request"},400);
  const body=input as Record<string,unknown>;
  if(Object.keys(body).length!==1||typeof body.itemId!=="string"||!GUILD_SHOP_CATALOGUE.some(c=>c.id===body.itemId))
   return json({error:"unknown_guild_reward"},400);
  try{
   const result=await services.rpc<{status:string;balance:number;rewardId?:string}>("guild_shop_purchase_server_v4",{
    p_account_id:accountId,p_item_id:body.itemId,
   });
   if(!result||(result.status!=="purchased"&&result.status!=="already_owned")
    ||!Number.isSafeInteger(result.balance)||result.balance<0)
    return json({error:"invalid_purchase_result"},503);
   return json(result);
  }catch{
   return json({error:"guild_token_purchase_unavailable"},503);
  }
 };
}

/** Claim a finite event milestone after existing event reward validation.
 * The event claim record is the sole source of truth; no client token amount.
 */
export function guildShopEventClaimHandler(services:GuildShopReadServices){
 return async(request:Request):Promise<Response>=>{
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const token=request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:"auth_required"},401);
  const accountId=await services.authenticate(token);
  if(!accountId)return json({error:"invalid_session"},401);
  const raw=await request.text();
  if(raw.length>512)return json({error:"request_too_large"},413);
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return json({error:"invalid_json"},400);}
  if(!input||typeof input!=="object"||Array.isArray(input))return json({error:"invalid_request"},400);
  const body=input as Record<string,unknown>;
  if(Object.keys(body).length!==2||typeof body.eventId!=="string"
    ||!/^[A-Za-z0-9_-]{1,80}$/.test(body.eventId)
    ||![25,50,75,100].includes(body.milestonePercent as number))
   return json({error:"invalid_event_reward"},400);
  try{
   const credited=await services.rpc<number>("guild_shop_claim_event_community_server_v1",{
    p_account_id:accountId,p_event_id:body.eventId,p_milestone_percent:body.milestonePercent,
   });
   if(!Number.isSafeInteger(credited)||credited<0||credited>350)
    return json({error:"invalid_claim_result"},503);
   return json({credited});
  }catch{return json({error:"event_token_claim_unavailable"},503);}
 };
}

/** Item/gold deduction and donation receipt execute together in one locked SQL
 * transaction. The SQL release gate and EXECUTE privilege are OFF by default.
 */
export function guildConstructionDonationHandler(services:GuildShopReadServices){
 return async(request:Request):Promise<Response>=>{
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const token=request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:"auth_required"},401);
  const accountId=await services.authenticate(token);
  if(!accountId)return json({error:"invalid_session"},401);
  const raw=await request.text();
  if(raw.length>1024)return json({error:"request_too_large"},413);
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return json({error:"invalid_json"},400);}
  if(!input||typeof input!=="object"||Array.isArray(input))return json({error:"invalid_request"},400);
  const body=input as Record<string,unknown>;
  if(Object.keys(body).length!==4||typeof body.templateId!=="string"
   ||typeof body.resourceId!=="string"
   ||!Number.isSafeInteger(body.amount)||Number(body.amount)<1||Number(body.amount)>1000000
   ||typeof body.requestKey!=="string"||!/^[A-Za-z0-9_-]{8,128}$/.test(body.requestKey))
   return json({error:"invalid_donation"},400);
  const template=GUILD_CONSTRUCTION_TEMPLATES.find(t=>t.id===body.templateId);
  if(!template||!(['gold',...template.materials.map(m=>m.materialKey)] as string[]).includes(body.resourceId))
   return json({error:"invalid_construction_resource"},400);
  try{
   const result=await services.rpc<{alreadyProcessed:boolean;completed:boolean}>(
    "guild_bank_allocate_server_v1",{
     p_account_id:accountId,p_template_id:body.templateId,p_resource_id:body.resourceId,
     p_amount:body.amount,p_request_key:body.requestKey,
   });
   if(!result||typeof result.alreadyProcessed!=="boolean"
    ||typeof result.completed!=="boolean")
    return json({error:"invalid_donation_result"},503);
   return json(result);
  }catch(reason){
   // Only expose known player-fixable validation errors. Network/database
   // failures stay indistinguishable and are retried with the same receipt.
   const code=reason instanceof Error?reason.message:'';
   if([
    'insufficient_gold','insufficient_construction_materials',
    'construction_resource_target_exceeded','construction_already_completed',
    'construction_donations_not_released','guild_level_locked',
    'guild_membership_required','guild_construction_request_conflict',
    'insufficient_guild_bank_balance',
   ].includes(code))return json({error:code},code==='insufficient_gold'
    ||code==='insufficient_construction_materials'||code==='insufficient_guild_bank_balance'?422:409);
   return json({error:"guild_construction_donation_unavailable"},503);
  }
 };
}

/** Weekly goals are verified against guild Muster, project and PvE tables. */
export function guildShopWeeklyClaimHandler(services:GuildShopReadServices){
 return async(request:Request):Promise<Response>=>{
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const token=request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:"auth_required"},401);
  const accountId=await services.authenticate(token);
  if(!accountId)return json({error:"invalid_session"},401);
  const raw=await request.text();
  if(raw.length>512)return json({error:"request_too_large"},413);
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return json({error:"invalid_json"},400);}
  if(!input||typeof input!=="object"||Array.isArray(input))return json({error:"invalid_request"},400);
  const body=input as Record<string,unknown>;
  if(Object.keys(body).length!==1||!['attendance','project','boss'].includes(body.kind as string))
   return json({error:"invalid_weekly_guild_reward"},400);
  try{
   const credited=await services.rpc<number>("guild_shop_claim_weekly_server_v1",{
    p_account_id:accountId,p_kind:body.kind,
   });
   if(!Number.isSafeInteger(credited)||credited<0||credited>60)
    return json({error:"invalid_claim_result"},503);
   return json({credited});
  }catch{return json({error:"weekly_guild_reward_not_earned_or_unavailable"},503);}
 };
}

/** Exactly-once personal deposit -> guild-owned bank stock. A verified account
 * is obtained from the bearer token, never from request body fields. */
export function guildBankDepositHandler(services:GuildShopReadServices){
 return async(request:Request):Promise<Response>=>{
  if(request.method!=="POST")return json({error:"method_not_allowed"},405);
  const token=request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:"auth_required"},401);
  const accountId=await services.authenticate(token);
  if(!accountId)return json({error:"invalid_session"},401);
  const raw=await request.text();
  if(raw.length>1024)return json({error:"request_too_large"},413);
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return json({error:"invalid_json"},400);}
  if(!input||typeof input!=="object"||Array.isArray(input))return json({error:"invalid_request"},400);
  const body=input as Record<string,unknown>;
  if(Object.keys(body).length!==3||typeof body.resourceId!=="string"||
   !GUILD_CONSTRUCTION_TEMPLATES.some(t=>(['gold',...t.materials.map(m=>m.materialKey)]).includes(body.resourceId as string))||
   !Number.isSafeInteger(body.amount)||Number(body.amount)<1||Number(body.amount)>1000000||
   typeof body.requestKey!=="string"||!/^[A-Za-z0-9_-]{8,128}$/.test(body.requestKey))
   return json({error:"invalid_guild_bank_deposit"},400);
  try{
   const result=await services.rpc<{alreadyProcessed:boolean;amount:number;resourceId:string}>('guild_bank_deposit_server_v1',{
    p_account_id:accountId,p_resource_id:body.resourceId,p_amount:body.amount,p_request_key:body.requestKey,
   });
   if(!result||typeof result.alreadyProcessed!=="boolean"||
    result.amount!==body.amount||result.resourceId!==body.resourceId)
    return json({error:"invalid_bank_receipt"},503);
   return json(result);
  }catch(reason){
   const code=reason instanceof Error?reason.message:'';
   if(['guild_membership_required','guild_bank_resource_unavailable','guild_bank_item_locked',
     'insufficient_gold','insufficient_construction_materials','guild_bank_capacity_reached',
     'guild_bank_request_conflict','character_required'].includes(code))
    return json({error:code},code.startsWith('insufficient_')?422:409);
   return json({error:"guild_bank_deposit_unavailable"},503);
  }
 };
}
