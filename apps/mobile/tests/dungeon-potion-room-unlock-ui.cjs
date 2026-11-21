const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const screen=fs.readFileSync(path.join(__dirname,'../src/screens/CoopExpeditionScreen.tsx'),'utf8');

function extractBetween(start,end){
 const startAt=screen.indexOf(start);
 assert.ok(startAt>=0,'Missing dungeon action '+start);
 const endAt=screen.indexOf(end,startAt);
 assert.ok(endAt>startAt,'Missing action boundary '+end);
 return screen.slice(startAt,endAt);
}

test('Q-Mode healing applies the server run immediately and never waits on account refresh',()=>{
 const heal=extractBetween('onUseHealingPotion={entrySource.kind', 'onQueueAgain={queueAgainAction}');
 assert.match(heal,/acceptRun\(await coopClient\.useHealingPotion\(run\.runId\)\);/);
 assert.match(heal,/refreshConsumableInventory\(\);/);
 assert.doesNotMatch(heal,/await onRewardsChanged/);
});

test('Account refresh after consumables is detached and failure-safe',()=>{
 const helper=extractBetween('const refreshConsumableInventory=()=>{','// Auto-preparation');
 assert.match(helper,/void Promise\.resolve\(\)\.then\(\(\)=>onRewardsChanged\?\.\(\)\)\.catch\(\(\)=>\{\}\)/);
 const manualTonic=extractBetween('onPrepareTonic={entrySource.kind', 'healingPotion={entrySource.kind');
 assert.match(manualTonic,/acceptRun\(await coopClient\.prepareTonic/);
 assert.match(manualTonic,/refreshConsumableInventory\(\)/);
 assert.doesNotMatch(manualTonic,/await onRewardsChanged/);
 const autoTonic=extractBetween('const potionId=autoDungeonTonicForRun','const load=useCallback');
 assert.match(autoTonic,/refreshConsumableInventory\(\)/);
 assert.doesNotMatch(autoTonic,/await onRewardsChanged/);
});

test('Room choices still use authoritative decision state and no client-side mutation',()=>{
 const choose=extractBetween('onChoose={(nodeId,boonId)=>void action','dungeonTonic={entrySource.kind');
 assert.match(choose,/decisionId:run\.decisionId,decisionRevision:run\.decisionRevision,optionId:nodeId/);
 assert.match(choose,/await coopClient\.choose\(run\.runId,body\)/);
 assert.match(choose,/acceptRun\(result\)/);
});
