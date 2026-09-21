import {strict as assert} from 'node:assert';
import {regionalGemSourceForEncounterV1,settleVerifiedRegionalGemEncounterV1} from './regional-gem-settlement-v1';

assert.equal(regionalGemSourceForEncounterV1('ZONE_006','enemy'),'ZONE_006');
assert.equal(regionalGemSourceForEncounterV1('ZONE_007','elite'),'ZONE_007');
assert.equal(regionalGemSourceForEncounterV1('ZONE_008','elite'),'ZONE_008');
assert.equal(regionalGemSourceForEncounterV1('ZONE_009','elite'),'ZONE_009');
assert.equal(regionalGemSourceForEncounterV1('ZONE_010','regional_boss'),'ZONE_010');
assert.equal(regionalGemSourceForEncounterV1('ZONE_007','enemy'),undefined,'Standard kills must not advance elite pity');
assert.equal(regionalGemSourceForEncounterV1('ZONE_010','elite'),undefined,'Elite kills must not advance regional-boss pity');
assert.equal(regionalGemSourceForEncounterV1('COP_004','regional_boss'),undefined,'Co-op pools use their entitlement settlement path');

const calls:Array<{name:string;args:Record<string,unknown>}>= [];
const rpc={
  async rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
    calls.push({name,args});
    return {eligible:true,sourceId:String(args.p_source_id),gemItemId:'gem:effect_execution:g3',pityTriggered:true,regionalCatalysts:1} as T;
  },
};
async function main(){
const settled=await settleVerifiedRegionalGemEncounterV1(rpc,{accountId:'account-1',receiptKey:'regional:boss:receipt-001',zoneId:'ZONE_010',kind:'regional_boss',victory:true});
assert.equal(settled.sourceId,'ZONE_010');
assert.equal(calls.length,1);
assert.equal(calls[0].name,'settle_regional_gem_source_server_v1');
assert.deepEqual(calls[0].args,{p_account_id:'account-1',p_source_id:'ZONE_010',p_receipt_key:'regional:boss:receipt-001'});

const failed=await settleVerifiedRegionalGemEncounterV1(rpc,{accountId:'account-1',receiptKey:'regional:boss:receipt-002',zoneId:'ZONE_010',kind:'regional_boss',victory:false});
assert.deepEqual(failed,{eligible:false});
assert.equal(calls.length,1,'Failed encounters must never call reward settlement');

const wrongKind=await settleVerifiedRegionalGemEncounterV1(rpc,{accountId:'account-1',receiptKey:'regional:normal:receipt-003',zoneId:'ZONE_007',kind:'enemy',victory:true});
assert.deepEqual(wrongKind,{eligible:false});
assert.equal(calls.length,1,'Normal kills must never consume elite pity');

let invalid=false;
try{await settleVerifiedRegionalGemEncounterV1(rpc,{accountId:'account-1',receiptKey:'bad',zoneId:'ZONE_010',kind:'regional_boss',victory:true});}catch(error){invalid=error instanceof Error&&error.message==='invalid_regional_gem_receipt';}
assert.ok(invalid,'Regional settlement receipt keys must be validated before RPC execution');

console.log('PASS: regional gem settlement boundary and source-kind isolation');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
