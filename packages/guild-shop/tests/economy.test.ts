import { strict as assert } from "node:assert";
import { calculateTokenGrant, calculateTokenPurchase } from "../src/economy";
import { GUILD_SHOP_CATALOGUE, guildShopEligibility } from "../src/catalogue";
const base = { balance: 100, earnedStandardThisWeek: 240, amount: 25, kind: "standard" as const, claimAlreadyProcessed: false };
assert.deepEqual(calculateTokenGrant(base), { ok:true, credited:10, nextBalance:110, nextStandardEarned:250 });
assert.deepEqual(calculateTokenGrant({ ...base, earnedStandardThisWeek:250 }), { ok:false, reason:"weekly_cap_reached" });
assert.deepEqual(calculateTokenGrant({ ...base, kind:"event" }), { ok:true, credited:25, nextBalance:125, nextStandardEarned:240 });
assert.deepEqual(calculateTokenGrant({ ...base, claimAlreadyProcessed:true }), { ok:false, reason:"duplicate_claim" });
assert.deepEqual(calculateTokenGrant({ ...base, amount:-1 }), { ok:false, reason:"invalid_amount" });
assert.deepEqual(calculateTokenPurchase({balance:2000,price:2000,guildLevel:3,requiredGuildLevel:3,alreadyOwned:false}), {ok:true,nextBalance:0});
assert.deepEqual(calculateTokenPurchase({balance:2000,price:2000,guildLevel:2,requiredGuildLevel:3,alreadyOwned:false}), {ok:false,reason:"guild_level_locked"});
assert.deepEqual(calculateTokenPurchase({balance:2000,price:2000,guildLevel:3,requiredGuildLevel:3,alreadyOwned:true}), {ok:false,reason:"already_owned"});
assert.deepEqual(calculateTokenPurchase({balance:1999,price:2000,guildLevel:3,requiredGuildLevel:3,alreadyOwned:false}), {ok:false,reason:"insufficient_tokens"});
assert.equal(new Set(GUILD_SHOP_CATALOGUE.map(item=>item.id)).size,GUILD_SHOP_CATALOGUE.length);
for (const item of GUILD_SHOP_CATALOGUE) {
 assert.equal(guildShopEligibility(item,item.guildLevel,item.tokenCost,false),"eligible");
 assert.equal(guildShopEligibility(item,item.guildLevel-1,item.tokenCost,false),"guild_level_locked");
}
console.log("Guild shop economy rules passed");
