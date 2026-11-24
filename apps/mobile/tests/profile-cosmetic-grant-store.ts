import {SupabaseProfileCosmeticGrantRepository} from '../../../backend/src/server/control-center/supabase-profile-cosmetic-grant-store-v1';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

(async()=>{
 let call:{fn:string;args:Record<string,unknown>}|null=null;
 const repo=new SupabaseProfileCosmeticGrantRepository({rpc:async(fn,args)=>{call={fn,args};return {data:{applied:true,replayed:false,sku:'profile_cosmetic_gloamward_bundle_v1',addedBorderId:'cosmetic:gloamward:arcane-frame',addedEffectId:'effect_gloamward_wisps',revision:42},error:null}}});
 const result=await repo.grantVerified({accountId:'00000000-0000-0000-0000-000000000001',sku:'profile_cosmetic_gloamward_bundle_v1',idempotencyKey:'receipt-12345678',source:'verified_google_play'});
 equal(call?.fn,'profile_cosmetic_grant_server_v1','repository calls the atomic profile cosmetic grant RPC');
 equal(call?.args.p_account_id,'00000000-0000-0000-0000-000000000001','account id is server supplied');
 equal(call?.args.p_sku,'profile_cosmetic_gloamward_bundle_v1','exact verified SKU is forwarded');
 equal(call?.args.p_idempotency_key,'receipt-12345678','idempotency key is forwarded unchanged');
 equal(call?.args.p_source,'verified_google_play','verified source is forwarded');
 ok(result.applied&&!result.replayed,'valid RPC response is normalized');
 equal(result.revision,42,'authoritative revision is returned');

 const errorRepo=new SupabaseProfileCosmeticGrantRepository({rpc:async()=>({data:null,error:{message:'PROFILE_COSMETIC_IDEMPOTENCY_CONFLICT'}})});
 let rejected=false;try{await errorRepo.grantVerified({accountId:'a',sku:'b',idempotencyKey:'c',source:'ops_comp'})}catch(error){rejected=error instanceof Error&&error.message==='PROFILE_COSMETIC_IDEMPOTENCY_CONFLICT'}
 ok(rejected,'database grant errors fail closed without being rewritten');
 console.log('PASS: profile cosmetic grant repository delegates atomically to the service-role RPC');
})().catch(error=>{console.error(error);process.exitCode=1});
