'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/core/market-preview-filter.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandbox={exports:{}};
vm.runInNewContext(js,sandbox);
const {filterMarketPreviewItems:filter}=sandbox.exports;

const rows=Object.freeze([
 Object.freeze({id:'ore',name:'Iron Ore',type:'Resources',amount:40,unit:18}),
 Object.freeze({id:'wood',name:'Oak Logs',type:'Resources',amount:25,unit:12}),
 Object.freeze({id:'rare-armor',name:'Forged Armor',type:'Equipment',amount:1,unit:2500,rarity:'Rare',slot:'Armor',tier:2}),
 Object.freeze({id:'blade',name:'Forged Blade',type:'Equipment',amount:1,unit:4300,rarity:'Epic',slot:'Weapon',tier:3}),
 Object.freeze({id:'gem',name:'Effect Gem',type:'Gems',amount:1,unit:740}),
]);
const ids=result=>Array.from(result,item=>item.id);

test('market browse category, rarity, slot and tier searches work without requiring live offers',()=>{
 assert.deepEqual(ids(filter(rows,'Equipment','', 'name')),['rare-armor','blade']);
 assert.deepEqual(ids(filter(rows,'All','  RARE  ','name')),['rare-armor']);
 assert.deepEqual(ids(filter(rows,'Equipment',' weapon ','unit')),['blade']);
 assert.deepEqual(ids(filter(rows,'All','T3','unit')),['blade']);
 assert.deepEqual(ids(filter(rows,'Resources','  ','unit')),['wood','ore']);
 assert.deepEqual(ids(filter(rows,'Gems','iron','unit')),[]);
});

test('sort orders compare unit price, lot total, highest unit and name without changing source',()=>{
 assert.deepEqual(ids(filter(rows,'All','','unit')),['wood','ore','gem','rare-armor','blade']);
 assert.deepEqual(ids(filter(rows,'All','','unit-desc')),['blade','rare-armor','gem','ore','wood']);
 assert.deepEqual(ids(filter(rows,'All','','lot')),['wood','ore','gem','rare-armor','blade']);
 assert.deepEqual(ids(filter(rows,'All','','name')),['gem','rare-armor','blade','ore','wood']);
 assert.deepEqual(ids(rows),['ore','wood','rare-armor','blade','gem'],'frozen sample array stays in original order');
});

test('equal prices have stable name and ID fallbacks',()=>{
 const tied=[
  {id:'b',name:'Same',type:'Resources',amount:1,unit:10},
  {id:'a',name:'Same',type:'Resources',amount:1,unit:10},
  {id:'c',name:'Alpha',type:'Resources',amount:1,unit:10},
 ];
 assert.deepEqual(ids(filter(tied,'All','','unit')),['c','a','b']);
 assert.deepEqual(ids(filter(tied,'All','','unit-desc')),['c','a','b']);
 assert.deepEqual(ids(tied),['b','a','c']);
});
