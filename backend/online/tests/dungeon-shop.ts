import {strict as assert} from 'node:assert';
import {makeDungeonShopController} from '../dungeon-shop';

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
 console.log('Hidden Dungeon Marks Shop preview and mutation gate passed');
}
void run();
