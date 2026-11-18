'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/core/market-preview-quote.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandbox={exports:{}};
vm.runInNewContext(js,sandbox);
const {estimateMarketPreviewQuote:quote,MARKET_PREVIEW_MAX_QUANTITY,MARKET_PREVIEW_MAX_UNIT_PRICE}=sandbox.exports;

test('seller quote is display-only and rounds the five percent fee up to whole Gold',()=>{
 const a=quote('40','18');
 assert.equal(a.valid,true);assert.equal(a.gross,720);assert.equal(a.fee,36);assert.equal(a.net,684);
 const b=quote('1','1');
 assert.equal(b.valid,true);assert.equal(b.fee,1);assert.equal(b.net,0);
 const c=quote('3','11');
 assert.equal(c.fee,2);assert.equal(c.net,31);
});

test('invalid, fractional, negative and excessive values cannot preview a valid listing',()=>{
 for(const input of ['','0','-1','1.5','Infinity','NaN','1e3','0xFF','9999999999','abc']){
  const r=quote(input,'20');
  assert.equal(r.valid,false,input);assert.equal(r.gross,0);assert.equal(r.net,0);
  assert.ok(r.issue,input);
 }
 for(const input of ['','0','-2','1.01','1000000000000','100 Gold']){
  assert.equal(quote('1',input).valid,false,input);
 }
});

test('maximum supported sample values remain safe integers',()=>{
 const q=quote(String(MARKET_PREVIEW_MAX_QUANTITY),String(MARKET_PREVIEW_MAX_UNIT_PRICE));
 assert.equal(q.valid,true);
 assert.equal(Number.isSafeInteger(q.gross),true);
 assert.equal(Number.isSafeInteger(q.net),true);
 assert.equal(q.gross,q.fee+q.net);
});
