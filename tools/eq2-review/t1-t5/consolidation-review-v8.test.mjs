import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const index=read('docs/2-0/eq2-consolidated-review-index-v8.json');
test('consolidation preserves all eight exact source blobs and current review contracts',()=>{
 for(const s of index.sources){
  const bytes=readFileSync(s.path);
  const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(sha,s.blobSha,s.path);
 }
 for(const path of Object.values(index.currentContracts))assert(readFileSync(path).length>0);
 assert.equal(index.releaseActivation,false);
});
test('current recipes supersede retired IDs; original recipe source retained as evidence',()=>{
 const c=read(index.currentContracts.catalogue),old=read('docs/equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json'),repl=read('docs/2-0/eq2-t4-replacement-recipe-review-v2.json');
 const retired=new Set(c.retired.items.flatMap(x=>x.retiredRecipeIds));
 const active=new Set([...old.recipes.filter(x=>!retired.has(x.id)),...repl.routes].map(x=>x.id));
 assert.equal(active.size,746);
 for(const id of c.entries.flatMap(x=>x.reconciliation.recipeIds??[]))assert(active.has(id),id);
 for(const id of retired)assert(!active.has(id));
 const pools=read('docs/equipment-2-0/regional-dungeon-boss-loot-and-market-review-v5.json');
 const bossMap=new Map(pools.bossPools.filter(x=>x.dungeonId!=='EXP_007').flatMap(d=>d.bosses.flatMap(b=>b.previewItems.map(x=>[x.itemId,[d.dungeonId,b.bossName]]))));
 assert.equal(bossMap.size,79);
 for(const row of c.entries.filter(x=>x.reconciliation.bossProof))assert.deepEqual(bossMap.get(row.itemId),[row.dungeonId,row.bossName]);
 assert(c.entries.every(x=>x.tier<=5&&x.mayMint===false&&x.mayTrade===false));
});
