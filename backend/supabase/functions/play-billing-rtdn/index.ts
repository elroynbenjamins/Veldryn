import {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.115.0';
import {
  GOOGLE_PLAY_PACKAGE_NAME,
  GooglePlayApiError,
  acknowledgeGooglePlayPurchase,
  expectedGooglePlayType,
  isGooglePlayProductId,
  verifyGooglePlayPurchase,
  verifyGooglePubSubOidc,
  type GooglePlayProductId,
  type GooglePlayProductType,
  type VerifiedGooglePlayPurchase,
} from '../_shared/google-play.ts';

type RtdnPayload={
  packageName?:string;
  testNotification?:{version?:string};
  subscriptionNotification?:{notificationType?:number;purchaseToken?:string};
  oneTimeProductNotification?:{notificationType?:number;purchaseToken?:string;sku?:string};
};

function firstJsonSecret(name:string){
  const raw=Deno.env.get(name);if(!raw)return undefined;
  try{return Object.values(JSON.parse(raw) as Record<string,string>).find(value=>typeof value==='string'&&value.length>0)}catch{return undefined}
}
function envValue(...names:string[]){for(const name of names){const value=Deno.env.get(name)?.trim();if(value)return value}}
function adminClient(){
  const url=envValue('SUPABASE_URL');
  const key=envValue('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY')??firstJsonSecret('SUPABASE_SECRET_KEYS');
  if(!url||!key)throw new Error('Supabase service credentials are not configured');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function decodeMessage(value:string){
  const raw=atob(value);const bytes=Uint8Array.from(raw,char=>char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as RtdnPayload;
}
async function scalar(admin:SupabaseClient,name:string,args:Record<string,unknown>){
  const {data,error}=await admin.rpc(name,args);if(error)throw error;
  return typeof data==='string'&&data?data:null;
}
async function ownerByToken(admin:SupabaseClient,token:string){
  return scalar(admin,'google_play_purchase_owner_v1',{p_purchase_token:token});
}
async function ownerByObfuscated(admin:SupabaseClient,id:string){
  return scalar(admin,'google_play_account_from_obfuscated_v1',{p_obfuscated_account_id:id});
}
async function record(admin:SupabaseClient,accountId:string,purchase:VerifiedGooglePlayPurchase,source:string){
  const {error}=await admin.rpc('google_play_record_purchase_v1',{
    p_account_id:accountId,p_purchase_token:purchase.purchaseToken,p_product_id:purchase.productId,
    p_product_type:purchase.productType,p_google_state:purchase.googleState,p_entitlement_active:purchase.entitlementActive,
    p_order_id:purchase.orderId,p_purchased_at:purchase.purchasedAt,p_expires_at:purchase.expiresAt,
    p_auto_renewing:purchase.autoRenewing,p_acknowledgement_state:purchase.acknowledgementState,
    p_linked_purchase_token:purchase.linkedPurchaseToken,p_obfuscated_account_id:purchase.obfuscatedAccountId,
    p_is_test:purchase.isTest,p_region_code:purchase.regionCode,p_base_plan_id:purchase.basePlanId,
    p_offer_id:purchase.offerId,p_source:source,
  });
  if(error)throw error;
}
async function markKnownTokenInactive(admin:SupabaseClient,accountId:string,purchaseToken:string){
  const {data,error}=await admin.rpc('google_play_tokens_for_account_v1',{p_account_id:accountId});
  if(error)throw error;
  const row=(Array.isArray(data)?data:[]).find((item:any)=>item.purchase_token===purchaseToken) as {product_id?:string;product_type?:string}|undefined;
  if(!row?.product_id||!isGooglePlayProductId(row.product_id)||row.product_type!==expectedGooglePlayType(row.product_id))return;
  await record(admin,accountId,{
    purchaseToken,productId:row.product_id,productType:row.product_type as GooglePlayProductType,
    googleState:'NOT_FOUND',entitlementActive:false,orderId:null,purchasedAt:null,expiresAt:null,
    autoRenewing:null,acknowledgementState:null,linkedPurchaseToken:null,obfuscatedAccountId:null,
    isTest:false,regionCode:null,basePlanId:null,offerId:null,
  },'rtdn_not_found');
}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('method not allowed',{status:405});
  try{
    await verifyGooglePubSubOidc(req);
    const envelope=await req.json() as {message?:{data?:string}};
    if(!envelope.message?.data)return new Response('missing Pub/Sub data',{status:400});
    const payload=decodeMessage(envelope.message.data);
    if(payload.packageName!==GOOGLE_PLAY_PACKAGE_NAME)return new Response('wrong package',{status:400});
    if(payload.testNotification)return new Response(null,{status:204});

    const sub=payload.subscriptionNotification;
    const one=payload.oneTimeProductNotification;
    const purchaseToken=(sub?.purchaseToken??one?.purchaseToken)?.trim();
    if(!purchaseToken)return new Response('missing purchase token',{status:400});
    const productType:GooglePlayProductType=sub?'subs':'in-app';
    const expectedProductId=one?.sku&&isGooglePlayProductId(one.sku)?one.sku:undefined;

    const admin=adminClient();
    let accountId=await ownerByToken(admin,purchaseToken);
    let verified:VerifiedGooglePlayPurchase;
    try{
      verified=await verifyGooglePlayPurchase(purchaseToken,productType,expectedProductId);
    }catch(error){
      if(accountId&&error instanceof GooglePlayApiError&&(error.status===404||error.status===410)){
        await markKnownTokenInactive(admin,accountId,purchaseToken);
        return new Response(null,{status:204});
      }
      throw error;
    }

    if(!accountId&&verified.linkedPurchaseToken)accountId=await ownerByToken(admin,verified.linkedPurchaseToken);
    if(!accountId&&verified.obfuscatedAccountId)accountId=await ownerByObfuscated(admin,verified.obfuscatedAccountId);
    if(!accountId)return new Response('purchase owner not linked yet',{status:503,headers:{'retry-after':'30'}});

    await record(admin,accountId,verified,'rtdn');
    if(verified.entitlementActive&&verified.acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'){
      verified=await acknowledgeGooglePlayPurchase(verified);
      await record(admin,accountId,verified,'rtdn');
    }
    return new Response(null,{status:204});
  }catch(error){
    const status=error instanceof GooglePlayApiError&&error.status>=500?503:401;
    return new Response(error instanceof Error?error.message:'RTDN_FAILED',{status});
  }
});
