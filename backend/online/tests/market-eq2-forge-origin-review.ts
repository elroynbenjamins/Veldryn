import assert from 'node:assert/strict';
import {inspectMarketForgeOrigin} from '../market-eq2-forge-origin-review';
const make=()=>{
 const exactItem={pieceId:'EQ2_TEST',manifestVersion:'m1',rulesVersion:'r1',quality:77,baseStats:{attack:2.5,hp:3},affixes:[],gemSlots:[],enhancementRank:0};
 const outcome={pieceId:'EQ2_TEST',recipeId:'recipe',rulesVersion:'r1',quality:77};
 const item={id:'copy',accountId:'original',ownerCharacterId:'c1',jobId:'job',createdAtMs:200,exactItem,outcome};
 const job={id:'job',accountId:'original',ownerCharacterId:'c1',recipeId:'recipe',pieceId:'EQ2_TEST',resultId:'copy',status:'claimed',goldReserved:10,finishesAtMs:100,
  craftContract:{piece:{id:'EQ2_TEST'},recipeId:'recipe',manifestVersion:'m1',rulesVersion:'r1',xpAwarded:5,profession:'smithing'}};
 const start={requestId:'start-1',commandFingerprint:'start:recipe',response:{kind:'started',jobId:'job',recipeId:'recipe',pieceId:'EQ2_TEST',finishesAtMs:100,goldCharged:10,version:2}};
 const claim={requestId:'claim-1',commandFingerprint:'claim:job',response:{kind:'claimed',jobId:'job',instanceId:'copy',exactItem:structuredClone(exactItem),outcome:structuredClone(outcome),xpAwarded:5,profession:'smithing',version:3}};
 const ledger={schemaVersion:'eq2-hidden-game-state-v1',jobs:[job],items:[item],receipts:[start,claim],skillAwards:[{jobId:'job',characterId:'c1',profession:'smithing',xp:5}]};
 return {ledger,item,job,start,claim,input:{originalAccountId:'original',expectedRevision:9,instanceId:'copy',itemId:'EQ2_TEST',row:{account_id:'original',revision:9,state:{account:{equipmentV2Hidden:ledger}}},expectedOriginalDigest:undefined as string|undefined}};
};
let checks=0;
function test(name:string,mutate:(x:ReturnType<typeof make>)=>void,reason:string){
 const x=make();mutate(x);const before=JSON.stringify(x);const got=inspectMarketForgeOrigin(x.input);
 assert.equal(got.reason,reason,name);assert.equal(got.marketAuthorized,false);assert.equal(got.canCommit,false);
 assert.equal(JSON.stringify(x),before);checks++;
}
const base=make(),original=inspectMarketForgeOrigin(base.input);
assert.equal(original.receiptMatch,true);assert.match(original.originalDigest??'',/^[a-f0-9]{64}$/);checks++;
test('wrong original account',x=>{x.input.originalAccountId='buyer'},'account_or_revision');
test('revision',x=>{x.input.expectedRevision=8},'account_or_revision');
test('no original',x=>{x.ledger.items=[]},'missing_original_item');
test('duplicate copy',x=>{x.ledger.items.push(x.item)},'duplicate_or_invalid_ledger');
test('duplicate job',x=>{x.ledger.jobs.push(x.job)},'duplicate_or_invalid_ledger');
test('wrong job owner',x=>{x.job.ownerCharacterId='c2'},'job_mismatch');
test('wrong result',x=>{x.job.resultId='other'},'job_mismatch');
test('queued',x=>{x.job.status='queued'},'job_mismatch');
test('early claim',x=>{x.item.createdAtMs=99},'job_mismatch');
test('rules',x=>{x.job.craftContract.rulesVersion='r2'},'job_mismatch');
test('missing claim',x=>{x.ledger.receipts.pop()},'missing_or_duplicate_receipt');
test('duplicate claim',x=>{x.ledger.receipts.push({...x.claim,requestId:'claim-2'})},'missing_or_duplicate_receipt');
test('receipt revision',x=>{x.claim.response.version=10},'receipt_mismatch');
test('charge mismatch',x=>{x.start.response.goldCharged=11},'receipt_mismatch');
test('modified quality',x=>{x.item.exactItem.quality=99},'receipt_mismatch');
test('modified affix snapshot',x=>{x.claim.response.exactItem.baseStats.attack=99},'receipt_mismatch');
test('award mismatch',x=>{x.ledger.skillAwards[0].xp=6},'award_mismatch');
test('digest mismatch',x=>{x.input.expectedOriginalDigest='0'.repeat(64)},'original_digest_mismatch');
test('coordinated forgery vs pinned digest',x=>{x.input.expectedOriginalDigest=original.originalDigest;x.item.exactItem.quality=99;x.claim.response.exactItem.quality=99},'original_digest_mismatch');
const reordered=make();reordered.item.exactItem.baseStats={hp:3,attack:2.5};
assert.equal(inspectMarketForgeOrigin(reordered.input).originalDigest,original.originalDigest);checks++;
console.log('Market Forge origin receipt review checks passed: '+checks);
