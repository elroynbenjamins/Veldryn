import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import { generateCoopRouteGraph } from '../route-generation';
import { initialPersistentRunState, merchantOffers, purchaseMerchantOffer, resolveCoopNode } from '../node-resolution';

const player=launchPlayer('Ironwarden',25), players=[player], runId='merchant-regression', secret='merchant-secret';
let graph=generateCoopRouteGraph(secret,'EXP_001',runId,'content-v1','balance-v1');
let merchant=graph.nodes.find(node=>node.kind==='merchant');
for(let seed=1;!merchant&&seed<100;seed++){
 graph=generateCoopRouteGraph(secret,'EXP_001',`${runId}-${seed}`,'content-v1','balance-v1');
 merchant=graph.nodes.find(node=>node.kind==='merchant');
}
if(!merchant)throw new Error('route must expose a merchant fixture');
let state=initialPersistentRunState(players);state={...state,resources:5};
const resolved=resolveCoopNode({runId,serverSecret:secret,node:merchant,players,state});
assert.equal(resolved.success,true);state=resolved.state;
const offers=merchantOffers(merchant.contentId);assert.equal(offers.length,3);
const purchased=purchaseMerchantOffer({runId,node:merchant,actorId:player.id,offerId:offers[0].id,state,players});
assert.equal(purchased.state.resources,3);assert.deepEqual(purchased.state.personalEffects[player.id]?.boons,[`${merchant.contentId}:merchant_boon`]);
let duplicate='';try{purchaseMerchantOffer({runId,node:merchant,actorId:player.id,offerId:offers[0].id,state:purchased.state,players});}catch(error){duplicate=error instanceof Error?error.message:String(error)}
assert.equal(duplicate,'merchant_offer_already_purchased');
let poor='';try{purchaseMerchantOffer({runId,node:merchant,actorId:player.id,offerId:offers[1].id,state:{...purchased.state,resources:2},players});}catch(error){poor=error instanceof Error?error.message:String(error)}
assert.equal(poor,'insufficient_run_resources');
console.log('merchant tests passed');
