import {strict as assert} from 'node:assert';
import {makeDungeonShopController} from '../dungeon-shop';
import {coopHandler} from '../coop';
import {GameplayError,type GameplayServices} from '../gameplay';

async function run(){
 const account='11111111-1111-4111-8111-111111111111';
 let shopEnabled=false,rpcCalls=0,purchaseCalls=0;
 const services:GameplayServices={
  authenticate:async token=>token==='valid'?account:null,
  rpc:async <T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   rpcCalls++;
   assert.equal(args.p_account_id,account,'authenticated account always anchors SQL');
   if(name==='dungeon_shop_snapshot_server_v1')return {
    marks:1000,clearedRegions:['Sunscar'],ownedRewardIds:[],purchasesThisUtcWeek:{},
    releasedPrices:{dshop_companion_essence:400,dshop_bondstone:750},
    shopEnabled,
   } as T;
   if(name==='dungeon_shop_purchase_server_v1'){
    purchaseCalls++;
    if(!shopEnabled)throw new GameplayError('dungeon_shop_unreleased',403);
    if(args.p_item_id!=='dshop_bondstone')throw new GameplayError('dungeon_shop_offer_unreleased',403);
    return {status:'purchased',balance:250} as T;
   }
   throw new Error('Unexpected RPC '+name);
  },
  randomId:()=> 'sample-uuid',randomRoll:()=>0.5,
 };
 const controller=makeDungeonShopController(services);
 const disabled=await controller.snapshot(account,Date.UTC(2026,10,11));
 assert.equal(disabled.balance,1000);
 assert.equal(disabled.shopEnabled,false,'global DB gate must remain off');
 assert.equal(disabled.offers.length,17);
 assert.ok(disabled.offers.every(item=>item.status==='unreleased'));
 assert.equal(disabled.nextUtcWeekReset,'2026-11-16T00:00:00.000Z');
 await assert.rejects(()=>controller.purchase(account,'dshop_bondstone','test_request_01'),/dungeon_shop_unreleased/);
 shopEnabled=true;
 const released=await controller.snapshot(account);
 assert.equal(released.shopEnabled,true);
 assert.equal(released.offers.filter(o=>o.status==='eligible').length,2);
 assert.equal(released.offers.find(o=>o.id==='dshop_bondstone')?.marks,750);
 assert.equal(released.offers.find(o=>o.id==='dshop_asterfall_pet')?.status,'unreleased');
 assert.equal(released.offers.find(o=>o.id==='dshop_tempering_satchel')?.status,'unreleased');
 for(const region of ['Asterfall','Sunscar','Frostmarch']){
  assert.equal(released.offers.filter(item=>item.region===region).length,4);
 }
 await assert.rejects(()=>controller.purchase(account,'dshop_tempering_satchel','test_request_01'),/dungeon_shop_offer_unreleased/);
 const purchased=await controller.purchase(account,'dshop_bondstone','test_request_02');
 assert.equal(purchased.status,'purchased');
 assert.equal(purchased.balance,250);
 const handler=coopHandler(services);
 const missing=await handler(new Request('https://sample.test/coop/shop'));
 assert.equal(missing.status,401);
 const invalid=await handler(new Request('https://sample.test/coop/shop',{headers:{Authorization:'Bearer invalid'}}));
 assert.equal(invalid.status,401);
 const authenticated={Authorization:'Bearer valid'};
 const read=await handler(new Request('https://sample.test/coop/shop',{headers:authenticated}));
 assert.equal(read.status,200);
 const body=await read.json() as {shopEnabled:boolean;offers:unknown[]};
 assert.equal(body.shopEnabled,true);
 assert.equal(body.offers.length,17);
 const purchase=await handler(new Request('https://sample.test/coop/shop',{method:'POST',headers:authenticated,body:JSON.stringify({offerId:'dshop_bondstone',requestId:'test_request_03'})}));
 assert.equal(purchase.status,200);
 const badPurchase=await handler(new Request('https://sample.test/coop/shop',{method:'POST',headers:authenticated,body:JSON.stringify({offerId:'dshop_bondstone',requestId:'test_request_04',price:0})}));
 assert.equal(badPurchase.status,400,'clients cannot supply a price');
 const unknown=await handler(new Request('https://sample.test/coop/shop',{method:'POST',headers:authenticated,body:JSON.stringify({offerId:'dshop_fake',requestId:'test_request_05'})}));
 assert.equal(unknown.status,400);
 assert.equal(purchaseCalls,4,'only authenticated validated purchases reach service RPC');
 assert.ok(rpcCalls>=7);
 console.log('PASS Dungeon Shop: DB release gate, server-owned prices, 2 approved SKUs and authenticated co-op route');
}
void run();
