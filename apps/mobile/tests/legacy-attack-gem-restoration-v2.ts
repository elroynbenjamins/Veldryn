import {strict as assert} from 'node:assert';
import {
  claimLegacyAttackGemRestorationV2,previewLegacyAttackGemRestorationV2,
  type LegacyAttackGemRpcV2,
} from '../src/core/legacy-attack-gem-restoration-v2';

const requestId='12345678-1234-4234-9234-123456789abc';
const calls:Array<{name:string;args?:Record<string,unknown>}>=[];
const client:LegacyAttackGemRpcV2={
  async rpc(name,args){
    calls.push({name,args});
    if(name==='preview_legacy_attack_gem_restoration_v2')return {error:null,data:{
      enabled:true,revision:13,restorations:[{
        legacyId:'EMBER_SHARD',status:'ready',originalCount:3,
        restoredCount:1,remainingEligible:2,canRestoreNow:2,needsReview:0,
        consume:{itemId:'gem:stat_might:g1',quantity:6},
        grant:{itemId:'gem:stat_might:g3',quantity:2},
      }],
    }};
    if(name==='claim_legacy_attack_gem_restoration_v2')return {error:null,data:{
      requestId,legacyId:'EMBERHEART_GEM',restored:1,
      consumed:{itemId:'gem:stat_might:g3',quantity:4},
      granted:{itemId:'LEGACY_EMBERHEART_GEM_V2',quantity:1},
      revision:14,status:'restored',
    }};
    throw new Error('unexpected RPC name');
  },
};
async function main(){
  const preview=await previewLegacyAttackGemRestorationV2(client);
  assert.equal(preview.enabled,true);
  assert.equal(preview.restorations[0].canRestoreNow,2);
  assert.equal(preview.restorations[0].grant.itemId,'gem:stat_might:g3');
  assert.equal(calls[0].name,'preview_legacy_attack_gem_restoration_v2');

  const receipt=await claimLegacyAttackGemRestorationV2(client,{
    legacyId:'EMBERHEART_GEM',quantity:1,requestId,expectedRevision:13,
  });
  assert.equal(receipt.granted.itemId,'LEGACY_EMBERHEART_GEM_V2');
  assert.deepEqual(calls[1],{name:'claim_legacy_attack_gem_restoration_v2',args:{
    p_legacy_id:'EMBERHEART_GEM',p_quantity:1,
    p_request_id:requestId,p_expected_revision:13,
  }});

  const before=calls.length;
  await assert.rejects(()=>claimLegacyAttackGemRestorationV2(client,{
    legacyId:'EMBER_SHARD',quantity:0,requestId,expectedRevision:13,
  }),/Invalid restoration quantity/);
  await assert.rejects(()=>claimLegacyAttackGemRestorationV2(client,{
    legacyId:'EMBER_SHARD',quantity:1,requestId:'not-a-uuid',expectedRevision:13,
  }),/Invalid restoration request ID/);
  assert.equal(calls.length,before,'Invalid claims must never reach the database');

  const errorClient:LegacyAttackGemRpcV2={rpc:async()=>({
    data:null,error:{message:'v2_restoration_not_enabled'},
  })};
  await assert.rejects(()=>previewLegacyAttackGemRestorationV2(errorClient),
    /v2_restoration_not_enabled/);
  const malformed:LegacyAttackGemRpcV2={rpc:async()=>({
    data:{enabled:true,revision:0,restorations:[{legacyId:'NOT_A_LEGACY_GEM'}]},error:null,
  })};
  await assert.rejects(()=>previewLegacyAttackGemRestorationV2(malformed),
    /Invalid restoration response/);

  console.log('PASS 2.0 legacy Attack gem restoration RPC contract');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
