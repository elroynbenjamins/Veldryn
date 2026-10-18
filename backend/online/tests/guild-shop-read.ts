import { guildShopReadHandler, guildShopDailyClaimHandler, guildShopPurchaseHandler, guildShopEventClaimHandler, guildConstructionDonationHandler, type GuildShopReadServices } from "../guild-shop-read";
function assert(value: unknown, message: string): asserts value {
 if (!value) throw new Error(message);
}
async function run() {
 const calls: Array<{name:string;args:Record<string,unknown>}> = [];
 const services: GuildShopReadServices = {
  authenticate: async token => token === "valid" ? "11111111-1111-4111-8111-111111111111" : null,
  guildLevelForAccount: async () => 7,
  rpc: async <T>(name:string,args:Record<string,unknown>) => {
   calls.push({name,args});
   if(name==="guild_construction_snapshot_server_v1"||name==="guild_shop_event_community_rewards_server_v1"||name==="guild_construction_enabled_server_v1")return [] as unknown as T;
   return {balance:3000,earnedThisWeek:125,claimedDailyKinds:[],enabledItemIds:[],ownedItemIds:["border_silver"]} as unknown as T;
  },
 };
 const handler = guildShopReadHandler(services);
 const unauthorized = await handler(new Request("https://example.test/guild/shop"));
 assert(unauthorized.status===401,"missing token must fail");
 const invalid = await handler(new Request("https://example.test/guild/shop",{headers:{authorization:"Bearer wrong"}}));
 assert(invalid.status===401,"invalid token must fail");
 const method = await handler(new Request("https://example.test/guild/shop",{method:"POST"}));
 assert(method.status===405,"writes must be disallowed");
 const ok = await handler(new Request("https://example.test/guild/shop",{headers:{authorization:"Bearer valid"}}));
 assert(ok.status===200,"valid request should succeed");
 const body = await ok.json() as {balance:number;weeklyCap:number;cards:Array<{id:string;status:string}>};
 assert(body.balance===3000 && body.weeklyCap===250,"snapshot fields");
 assert(body.cards.find(x=>x.id==="border_silver")?.status==="owned","owned cosmetics");
 assert(body.cards.find(x=>x.id==="guild_pet_02")?.status==="insufficient_tokens","unaffordable pet");
 assert(body.cards.find(x=>x.id==="guild_companion_01")?.status==="guild_level_locked","guild level lock");
 assert(calls.length===4 && calls[0].name==="guild_shop_snapshot_server_v1" && calls[1].name==="guild_construction_snapshot_server_v1" && calls[2].name==="guild_shop_event_community_rewards_server_v1" && calls[3].name==="guild_construction_enabled_server_v1","all authenticated read-only RPCs called");
 assert(calls[0].args.p_account_id==="11111111-1111-4111-8111-111111111111","verified identity forwarded");
 const noGuild = guildShopReadHandler({...services,guildLevelForAccount:async()=>null});
 const blocked = await noGuild(new Request("https://example.test/guild/shop",{headers:{authorization:"Bearer valid"}}));
 assert(blocked.status===403,"nonmembers blocked");

 const claimCalls: Array<{name:string;args:Record<string,unknown>}>=[];
 const claim=guildShopDailyClaimHandler({...services,rpc:async<T>(name:string,args:Record<string,unknown>)=>{
  claimCalls.push({name,args});
  return 10 as unknown as T;
 }});
 const claimUri="https://example.test/gameplay?view=guild-shop";
 const claimNoAuth=await claim(new Request(claimUri,{method:"POST",body:'{"kind":"attendance"}'}));
 assert(claimNoAuth.status===401,"claim requires bearer token");
 const claimBad=await claim(new Request(claimUri,{method:"POST",headers:{authorization:"Bearer valid"},body:'{"kind":"fake"}'}));
 assert(claimBad.status===400,"unknown reward rejected");
 const claimGet=await claim(new Request(claimUri,{method:"GET"}));
 assert(claimGet.status===405,"claim must use POST");
 const claimGood=await claim(new Request(claimUri,{method:"POST",headers:{authorization:"Bearer valid"},body:'{"kind":"contribution"}'}));
 assert(claimGood.status===200,"verified claim succeeds");
 assert((await claimGood.json() as {credited:number}).credited===10,"authoritative credit returned");
 assert(claimCalls.length===1&&claimCalls[0].name==="guild_shop_claim_daily_server_v1","only verified claim RPC called");
 assert(claimCalls[0].args.p_kind==="contribution","reward kind forwarded");
 assert(claimCalls[0].args.p_account_id==="11111111-1111-4111-8111-111111111111","authenticated account forwarded");

 const purchaseCalls: Array<{name:string;args:Record<string,unknown>}>=[];
 const purchase=guildShopPurchaseHandler({...services,rpc:async<T>(name:string,args:Record<string,unknown>)=>{
  purchaseCalls.push({name,args});
  return {status:'purchased',balance:1000,rewardId:'GUILD_PET_001'} as unknown as T;
 }});
 const purchaseNoAuth=await purchase(new Request(claimUri,{method:'POST',body:'{"itemId":"guild_pet_01"}'}));
 assert(purchaseNoAuth.status===401,'purchase requires auth');
 const purchaseInvalid=await purchase(new Request(claimUri,{method:'POST',headers:{authorization:'Bearer valid'},body:'{"itemId":"unknown"}'}));
 assert(purchaseInvalid.status===400,'unknown SKU refused before transaction');
 const purchasePrice=await purchase(new Request(claimUri,{method:'POST',headers:{authorization:'Bearer valid'},body:'{"itemId":"guild_pet_01","price":1}'}));
 assert(purchasePrice.status===400,'client prices refused');
 const purchaseOk=await purchase(new Request(claimUri,{method:'POST',headers:{authorization:'Bearer valid'},body:'{"itemId":"guild_pet_01"}'}));
 assert(purchaseOk.status===200,'verified purchase returned');
 assert(purchaseCalls.length===1&&purchaseCalls[0].name==='guild_shop_purchase_server_v4','only server-priced purchase API called');
 assert(purchaseCalls[0].args.p_account_id==='11111111-1111-4111-8111-111111111111','purchase account comes from auth');
 assert(purchaseCalls[0].args.p_item_id==='guild_pet_01','SKU is transmitted without price');

 const eventCalls:Array<{name:string;args:Record<string,unknown>}>=[];
 const eventClaim=guildShopEventClaimHandler({...services,rpc:async<T>(name:string,args:Record<string,unknown>)=>{
  eventCalls.push({name,args});return 350 as unknown as T;
 }});
 const eventBad=await eventClaim(new Request(claimUri,{method:'POST',headers:{authorization:'Bearer valid'},body:'{"eventId":"veilbreak","milestonePercent":101}'}));
 assert(eventBad.status===400,'unsupported community milestones rejected');
 const eventSpoof=await eventClaim(new Request(claimUri,{method:'POST',headers:{authorization:'Bearer valid'},body:'{"eventId":"veilbreak","milestonePercent":100,"tokens":99999}'}));
 assert(eventSpoof.status===400,'client-provided reward values rejected');
 const eventUnauthorized=await eventClaim(new Request(claimUri,{method:'POST',body:'{"eventId":"veilbreak","milestonePercent":100}'}));
 assert(eventUnauthorized.status===401,'event claims require authentication');
 const eventGood=await eventClaim(new Request(claimUri,{method:'POST',headers:{authorization:'Bearer valid'},body:'{"eventId":"veilbreak","milestonePercent":100}'}));
 assert(eventGood.status===200,'event claim forwarded');
 assert(eventCalls.length===1 && eventCalls[0].name==='guild_shop_claim_event_community_server_v1','event claim uses trusted SQL');
 assert(eventCalls[0].args.p_account_id==='11111111-1111-4111-8111-111111111111','event claim uses authenticated account');

 const donationCalls:Array<{name:string;args:Record<string,unknown>}>=[];
 const donate=guildConstructionDonationHandler({...services,rpc:async<T>(name:string,args:Record<string,unknown>)=>{
  donationCalls.push({name,args});return {alreadyProcessed:false,completed:false} as unknown as T;
 }});
 const donateInput={templateId:'stormwatch_banner',resourceId:'GREENWOOD_LOG',amount:5,requestKey:'guild_donation_a123'};
 const donateUri=claimUri+'&action=donate';
 const donateBad=await donate(new Request(donateUri,{method:'POST',headers:{authorization:'Bearer valid'},body:JSON.stringify({...donateInput,amount:-1})}));
 assert(donateBad.status===400,'negative donations rejected');
 const donateSpoof=await donate(new Request(donateUri,{method:'POST',headers:{authorization:'Bearer valid'},body:JSON.stringify({...donateInput,accountId:'victim'})}));
 assert(donateSpoof.status===400,'client account spoof rejected');
 const donateUnknown=await donate(new Request(donateUri,{method:'POST',headers:{authorization:'Bearer valid'},body:JSON.stringify({...donateInput,resourceId:'DIAMONDS'})}));
 assert(donateUnknown.status===400,'unknown material rejected');
 const donateOk=await donate(new Request(donateUri,{method:'POST',headers:{authorization:'Bearer valid'},body:JSON.stringify(donateInput)}));
 assert(donateOk.status===200,'valid donation forwarded');
 assert(donationCalls.length===1&&donationCalls[0].name==='guild_construction_donate_server_v2','construction donation uses locked SQL');
 assert(donationCalls[0].args.p_account_id==='11111111-1111-4111-8111-111111111111','donation account comes from bearer auth');
 console.log("guild shop read handler tests passed");
}
void run();
