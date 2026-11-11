import {strict as assert} from 'node:assert';
import {makeDungeonShopController} from '../dungeon-shop';
import {coopHandler} from '../coop';
import type {GameplayServices} from '../gameplay';

async function run(){
 let rpcCalls=0;
 const controller=makeDungeonShopController({
  rpc:async <T>(_name:string,_args:Record<string,unknown>):Promise<T>=>{
   rpcCalls++;
   throw new Error('Disabled shop must never access persistence');
  },
 });
 const account='11111111-1111-4111-8111-111111111111';
 const result=await controller.snapshot(account,Date.UTC(2026,10,11));
 assert.equal(result.shopEnabled,false);
 assert.equal(result.offers.length,17);
 for(const region of ['Asterfall','Sunscar','Frostmarch']){
  assert.equal(result.offers.filter(item=>item.region===region).length,4);
 }
 assert.ok(result.offers.every(item=>item.status==='unreleased'));
 assert.equal(result.nextUtcWeekReset,'2026-11-16T00:00:00.000Z');
 await assert.rejects(()=>controller.purchase(account,'dshop_asterfall_pet','test_request_01'),/dungeon_shop_unreleased/);
 await assert.rejects(()=>controller.purchase(account,'dshop_bondstone','test_request_02'),/dungeon_shop_unreleased/);
 assert.equal(rpcCalls,0);
 const services:GameplayServices={
  authenticate:async token=>token==='valid' ? account : null,
  rpc:async <T>()=>{rpcCalls++;throw new Error('Disabled route must not call RPC');},
  randomId:()=> 'sample-uuid',randomRoll:()=>0.5,
 };
 const handler=coopHandler(services);
 const missing=await handler(new Request('https://sample.test/coop/shop'));
 assert.equal(missing.status,401);
 const invalid=await handler(new Request('https://sample.test/coop/shop',{headers:{Authorization:'Bearer invalid'}}));
 assert.equal(invalid.status,401);
 const authenticated={Authorization:'Bearer valid'};
 const read=await handler(new Request('https://sample.test/coop/shop',{headers:authenticated}));
 assert.equal(read.status,200);
 const body=await read.json() as {shopEnabled:boolean;offers:unknown[]};
 assert.equal(body.shopEnabled,false);
 assert.equal(body.offers.length,17);
 const purchase=await handler(new Request('https://sample.test/coop/shop',{method:'POST',headers:authenticated,body:JSON.stringify({offerId:'dshop_asterfall_pet',requestId:'test_request_01'})}));
 assert.equal(purchase.status,403);
 const badPurchase=await handler(new Request('https://sample.test/coop/shop',{method:'POST',headers:authenticated,body:JSON.stringify({offerId:'dshop_asterfall_pet',requestId:'test_request_02',price:0})}));
 assert.equal(badPurchase.status,400);
 assert.equal(rpcCalls,0,'No backend persistence accessed by disabled shop route');
 console.log('Hidden Dungeon Marks Shop HTTP authentication, preview and mutation gate passed');
}
void run();
