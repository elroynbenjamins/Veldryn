import assert from 'node:assert/strict';
import {inspectMarketForgeOrigin,inspectMarketFirstForgeRegistration} from '../market-eq2-forge-origin-review';
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
function matchedDigest(got:ReturnType<typeof inspectMarketForgeOrigin>):string{
 assert.equal(got.receiptMatch,true);
 assert.equal(got.marketAuthorized,false);assert.equal(got.canCommit,false);
 if(!('originalDigest' in got)||typeof got.originalDigest!=='string')throw Error('matched receipt must contain digest');
 assert.match(got.originalDigest,/^[a-f0-9]{64}$/);
 return got.originalDigest;
}
function test(name:string,mutate:(x:ReturnType<typeof make>)=>void,reason:string){
 const x=make();mutate(x);const before=JSON.stringify(x);const got=inspectMarketForgeOrigin(x.input);
 assert.equal(got.reason,reason,name);assert.equal(got.marketAuthorized,false);assert.equal(got.canCommit,false);
 assert.equal(Object.prototype.hasOwnProperty.call(got,'originalDigest'),false,name);
 assert.equal(Object.prototype.hasOwnProperty.call(got,'claimRequestId'),false,name);
 assert.equal(JSON.stringify(x),before);checks++;
}
const base=make(),original=inspectMarketForgeOrigin(base.input);
const originalDigest=matchedDigest(original);checks++;
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
test('coordinated forgery vs pinned digest',x=>{x.input.expectedOriginalDigest=originalDigest;x.item.exactItem.quality=99;x.claim.response.exactItem.quality=99},'original_digest_mismatch');
// Even an unrelated malformed record must not establish a trusted origin.
test('second result for same job',x=>{x.ledger.items.push({...x.item,id:'copy-2'})},'incoherent_account_ledger');
test('orphan item',x=>{x.ledger.items.push({...x.item,id:'copy-2',jobId:'missing'})},'incoherent_account_ledger');
test('orphan skill award',x=>{x.ledger.skillAwards.push({...x.ledger.skillAwards[0],jobId:'missing'})},'incoherent_account_ledger');
test('orphan receipt',x=>{x.ledger.receipts.push({...x.start,requestId:'start-2',response:{...x.start.response,jobId:'missing'}})},'incoherent_account_ledger');
test('unrelated job without start receipt',x=>{x.ledger.jobs.push({...x.job,id:'job-2',status:'queued',resultId:''})},'incoherent_account_ledger');
test('foreign queued job with start receipt',x=>{
 x.ledger.jobs.push({...x.job,id:'job-2',accountId:'other',status:'queued',resultId:''});
 x.ledger.receipts.push({...x.start,requestId:'start-2',response:{...x.start.response,jobId:'job-2'}});
},'incoherent_account_ledger');
test('queued job with reward',x=>{
 x.ledger.jobs.push({...x.job,id:'job-2',status:'queued',resultId:''});
 x.ledger.receipts.push({...x.start,requestId:'start-2',response:{...x.start.response,jobId:'job-2'}});
 x.ledger.skillAwards.push({...x.ledger.skillAwards[0],jobId:'job-2'});
},'incoherent_account_ledger');
const unrelated=make();
unrelated.ledger.jobs.push({...unrelated.job,id:'job-2',status:'queued',resultId:''});
unrelated.ledger.receipts.push({...unrelated.start,requestId:'start-2',response:{...unrelated.start.response,jobId:'job-2'}});
assert.equal(matchedDigest(inspectMarketForgeOrigin(unrelated.input)),originalDigest);checks++;
const reordered=make();reordered.item.exactItem.baseStats={hp:3,attack:2.5};
assert.equal(matchedDigest(inspectMarketForgeOrigin(reordered.input)),originalDigest);checks++;
const pinned=make();pinned.input.expectedOriginalDigest=originalDigest;
assert.equal(matchedDigest(inspectMarketForgeOrigin(pinned.input)),originalDigest);checks++;

const first=()=>{
 const x=make();
 const empty=()=>({capacity:30,stacks:[] as {itemId:string;instanceId:string;quantity:number}[]});
 const character=(id:string)=>({id,equipmentPouch:empty(),equipmentInstanceIds:{} as Record<string,string>,savedLoadouts:[]});
 const state={version:11,account:{equipmentV2Hidden:x.ledger,craftedGearInstances:[] as {id:string}[]},
  character:character('c1'),inventory:empty(),overflow:empty(),bank:empty(),
  otherCharacters:[{character:character('c2'),inventory:empty(),overflow:empty()}],
  settings:{lockedItemIds:[] as string[],favoriteItemIds:[] as string[]}};
 state.inventory.stacks.push({itemId:x.input.itemId,instanceId:x.input.instanceId,quantity:1});
 return {...x.input,expectedOriginalDigest:originalDigest,originalCharacterId:'c1',
  row:{...x.input.row,character_id:'c1',state},ownedCharacterIds:['c1','c2'],
  protectedInstanceIds:[] as string[],destination:'inventory' as 'inventory'|'pouch'};
};
function registration(name:string,mutate:(x:ReturnType<typeof first>)=>void,reason:string,receiptMatch:boolean,physicalMatch:boolean){
 const x=first();mutate(x);const before=JSON.stringify(x);
 assert.deepEqual(inspectMarketFirstForgeRegistration(x),{reason,receiptMatch,physicalMatch,marketAuthorized:false,canCommit:false},name);
 assert.equal(JSON.stringify(x),before,'never mutate source');checks++;
}
registration('first physical delivery',()=>{},'matching_first_registration_requires_authoritative_commit',true,true);
registration('first pouch delivery',x=>{x.row.state.character.equipmentPouch.stacks=x.row.state.inventory.stacks;x.row.state.inventory.stacks=[];x.destination='pouch'},'matching_first_registration_requires_authoritative_commit',true,true);
registration('virtual-only claim',x=>{x.row.state.inventory.stacks=[]},'physical_copy_not_verified',true,false);
registration('duplicate physical copy',x=>{x.row.state.bank.stacks.push({...x.row.state.inventory.stacks[0]})},'physical_copy_not_verified',true,false);
registration('physical copy but corrupt receipt',x=>{x.row.state.account.equipmentV2Hidden.receipts.pop()},'original_receipt_not_verified',false,false);
registration('wrong original crafter',x=>{x.originalCharacterId='c2'},'original_character_mismatch',true,false);
registration('wrong destination',x=>{x.destination='pouch'},'physical_copy_not_verified',true,false);
registration('stale online revision',x=>{x.row.revision++},'original_receipt_not_verified',false,false);
registration('legacy collision',x=>{x.row.state.account.craftedGearInstances.push({id:x.instanceId})},'physical_copy_not_verified',true,false);
registration('protected copy',x=>{x.protectedInstanceIds.push(x.instanceId)},'physical_copy_requires_protection_review',true,true);
registration('missing digest',x=>{x.expectedOriginalDigest=''},'invalid_registration_evidence',false,false);
registration('valid looking wrong digest',x=>{x.expectedOriginalDigest='f'.repeat(64)},'original_receipt_not_verified',false,false);
registration('changed roster',x=>{x.ownedCharacterIds=['c1']},'physical_copy_not_verified',true,false);
registration('different active character',x=>{
 const state=x.row.state,old=state.character,inventory=state.inventory,overflow=state.overflow;
 const alt=state.otherCharacters[0];state.character=alt.character;state.inventory=alt.inventory;state.overflow=alt.overflow;
 state.otherCharacters=[{character:old,inventory,overflow}];x.row.character_id='c2';
},'matching_first_registration_requires_authoritative_commit',true,true);
console.log('Market Forge origin receipt review checks passed: '+checks);
