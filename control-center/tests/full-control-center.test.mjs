import test from 'node:test';
import assert from 'node:assert/strict';
import { canReverse, commandStatusAfterQueue, confirmationPhrase, validateCommandParameters, validateCommandRequest } from '../functions/_shared/admin-control.js';

test('high risk command requires exact typed confirmation and reason',()=>{
  const registry={command_key:'economy.gold_adjust',enabled:true,min_role:'owner',risk_tier:'high',target_scope:'account',params_schema:{fields:[{name:'amount',type:'integer',required:true,min:-1000,max:1000}]}};
  const bad=validateCommandRequest(registry,'owner',{targetAccountId:'11111111-1111-4111-8111-111111111111',parameters:{amount:500},reason:'too short',confirmation:'yes'});
  assert.ok(bad.errors.length>=2);
  const ok=validateCommandRequest(registry,'owner',{targetAccountId:'11111111-1111-4111-8111-111111111111',parameters:{amount:500},reason:'Support correction after verified missing settlement.',confirmation:confirmationPhrase(registry.command_key)});
  assert.deepEqual(ok.errors,[]);
});

test('schema rejects unknown parameters and numeric overflow',()=>{
  const schema={fields:[{name:'xp',type:'integer',required:true,min:0,max:100}]};
  const result=validateCommandParameters(schema,{xp:101,rawSql:'nope'});
  assert.ok(result.errors.some(x=>x.includes('maximum')));
  assert.ok(result.errors.some(x=>x.includes('unknown parameter')));
});

test('critical commands can require a second approval',()=>{
  const row={risk_tier:'critical',requires_approval:false};
  assert.equal(commandStatusAfterQueue(row,{dualApprovalCritical:true}),'pending_approval');
  assert.equal(commandStatusAfterQueue(row,{dualApprovalCritical:false}),'approved');
});

test('only completed commands with handler-provided reversal can be reversed',()=>{
  assert.equal(canReverse({reversible:true,status:'succeeded',result_json:{reversal:{commandKey:'economy.gold_adjust',parameters:{amount:-10}}}}),true);
  assert.equal(canReverse({reversible:true,status:'succeeded',result_json:{}}),false);
});

test('schema supports JSON and multi-catalog fields without accepting arbitrary extra parameters',()=>{
  const schema={fields:[
    {name:'items',type:'catalog_multi',required:true,catalogType:'item'},
    {name:'metadata',type:'json',required:true,objectOnly:true},
  ]};
  const ok=validateCommandParameters(schema,{items:['ore_iron','wood_oak','ore_iron'],metadata:'{"reason":"repair"}'});
  assert.deepEqual(ok.errors,[]);
  assert.deepEqual(ok.parameters.items,['ore_iron','wood_oak']);
  assert.equal(ok.parameters.metadata.reason,'repair');
  const bad=validateCommandParameters(schema,{items:[],metadata:'[]',sql:'drop table'});
  assert.ok(bad.errors.some(x=>x.includes('at least one')));
  assert.ok(bad.errors.some(x=>x.includes('JSON object')));
  assert.ok(bad.errors.some(x=>x.includes('unknown parameter')));
});
