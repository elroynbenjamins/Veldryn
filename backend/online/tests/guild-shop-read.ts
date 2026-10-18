import { guildShopReadHandler, type GuildShopReadServices } from "../guild-shop-read";
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
   if(name==="guild_construction_snapshot_server_v1")return [] as unknown as T;
   return {balance:3000,earnedThisWeek:125,claimedDailyKinds:[],ownedItemIds:["border_silver"]} as unknown as T;
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
 assert(calls.length===2 && calls[0].name==="guild_shop_snapshot_server_v1" && calls[1].name==="guild_construction_snapshot_server_v1","both read-only RPCs called for authorized requests");
 assert(calls[0].args.p_account_id==="11111111-1111-4111-8111-111111111111","verified identity forwarded");
 const noGuild = guildShopReadHandler({...services,guildLevelForAccount:async()=>null});
 const blocked = await noGuild(new Request("https://example.test/guild/shop",{headers:{authorization:"Bearer valid"}}));
 assert(blocked.status===403,"nonmembers blocked");
 console.log("guild shop read handler tests passed");
}
void run();
