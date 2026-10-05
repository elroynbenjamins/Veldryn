import {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.115.0';
import {
  GOOGLE_PLAY_PACKAGE_NAME,
  GooglePlayApiError,
  acknowledgeGooglePlayPurchase,
  expectedGooglePlayType,
  isGooglePlayProductId,
  resolveGooglePlayPurchaseOwner,
  verifyGooglePlayPurchase,
  verifyGooglePubSubOidc,
  warnGooglePlayConfiguration,
  type GooglePlayProductId,
  type GooglePlayProductType,
  type VerifiedGooglePlayPurchase,
} from '../_shared/google-play.ts';

warnGooglePlayConfiguration('play-billing-rtdn');

// Exact, fixed messages only: never log token claims, configuration or errors.
const AUTH_REJECTION_REASONS=new Map([
  ['Missing Pub/Sub OIDC bearer token','missing_bearer'],
  ['Invalid Pub/Sub OIDC algorithm','invalid_algorithm'],
  ['Unknown Pub/Sub OIDC signing key','unknown_signing_key'],
  ['Invalid Pub/Sub OIDC signature','invalid_signature'],
  ['Invalid Pub/Sub OIDC issuer','invalid_issuer'],
  ['Expired Pub/Sub OIDC token','invalid_time'],
  ['Invalid Pub/Sub OIDC audience','audience_mismatch'],
  ['Invalid Pub/Sub OIDC service account','service_account_mismatch'],
]);

type RtdnPayload={
  packageName?:string;
  testNotification?:{version?:string};
  subscriptionNotification?:{notificationType?:number;purchaseToken?:string};
  oneTimeProductNotification?:{notificationType?:number;purchaseToken?:string;sku?:string};
  voidedPurchaseNotification?:{purchaseToken?:string;orderId?:string;productType?:number;refundType?:number};
  pendingRefundReviewNotification?:unknown;
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
async function resolveOwner(admin:SupabaseClient,purchase:VerifiedGooglePlayPurchase,knownOwner:string|null){
  return resolveGooglePlayPurchaseOwner(purchase,{
    byPurchaseToken:token=>token===purchase.purchaseToken?Promise.resolve(knownOwner):ownerByToken(admin,token),
    byObfuscatedAccountId:id=>ownerByObfuscated(admin,id),
  });
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
async function rtdnProcessed(admin:SupabaseClient,messageId:string){
  if(!messageId)return false;
  const {data,error}=await admin.rpc('google_play_rtdn_processed_v1',{p_message_id:messageId});
  if(error)throw error;
  return data===true;
}
async function markRtdnProcessed(admin:SupabaseClient,messageId:string){
  if(!messageId)return;
  const {error}=await admin.rpc('google_play_mark_rtdn_processed_v1',{p_message_id:messageId});
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
    expiredPurchaseToken:null,expiredObfuscatedAccountId:null,
    isTest:false,regionCode:null,basePlanId:null,offerId:null,
  },'rtdn_not_found');
}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('method not allowed',{status:405});
  try{
    await verifyGooglePubSubOidc(req);
    const envelope=await req.json() as {message?:{data?:string;messageId?:string}};
    if(!envelope.message?.data)return new Response('missing Pub/Sub data',{status:400});
    const messageId=envelope.message.messageId?.trim()??'';
    const payload=decodeMessage(envelope.message.data);
    if(payload.packageName!==GOOGLE_PLAY_PACKAGE_NAME)return new Response('wrong package',{status:400});

    const admin=adminClient();
    if(messageId&&await rtdnProcessed(admin,messageId))return new Response(null,{status:204});
    if(payload.testNotification||payload.pendingRefundReviewNotification){
      await markRtdnProcessed(admin,messageId);
      if(payload.testNotification)console.log('[play-billing-rtdn] Test notification accepted');
      return new Response(null,{status:204});
    }

    const voided=payload.voidedPurchaseNotification;
    if(voided?.purchaseToken){
      const token=voided.purchaseToken.trim();
      const owner=await ownerByToken(admin,token);
      if(owner){
        if(voided.productType===1){
          try{
            let verified=await verifyGooglePlayPurchase(token,'subs');
            const resolved=await resolveOwner(admin,verified,owner);
            if(!resolved||resolved.accountId!==owner)throw new Error('GOOGLE_PLAY_ACCOUNT_MISMATCH');
            verified={...verified,obfuscatedAccountId:resolved.obfuscatedAccountId};
            await record(admin,owner,verified,'rtdn_voided');
            if(verified.entitlementActive&&verified.acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'){
              verified=await acknowledgeGooglePlayPurchase(verified);
              await record(admin,owner,verified,'rtdn_voided');
            }
          }catch(error){
            if(error instanceof GooglePlayApiError&&(error.status===404||error.status===410))await markKnownTokenInactive(admin,owner,token);
            else throw error;
          }
        }else{
          await markKnownTokenInactive(admin,owner,token);
        }
      }
      await markRtdnProcessed(admin,messageId);
      return new Response(null,{status:204});
    }

    const sub=payload.subscriptionNotification;
    const one=payload.oneTimeProductNotification;
    const purchaseToken=(sub?.purchaseToken??one?.purchaseToken)?.trim();
    if(!purchaseToken)return new Response('missing purchase token',{status:400});
    const productType:GooglePlayProductType=sub?'subs':'in-app';
    const expectedProductId=one?.sku&&isGooglePlayProductId(one.sku)?one.sku:undefined;

    const knownOwner=await ownerByToken(admin,purchaseToken);
    let verified:VerifiedGooglePlayPurchase;
    try{
      verified=await verifyGooglePlayPurchase(purchaseToken,productType,expectedProductId);
    }catch(error){
      if(knownOwner&&error instanceof GooglePlayApiError&&(error.status===404||error.status===410)){
        await markKnownTokenInactive(admin,knownOwner,purchaseToken);
        await markRtdnProcessed(admin,messageId);
        return new Response(null,{status:204});
      }
      throw error;
    }

    const owner=await resolveOwner(admin,verified,knownOwner);
    if(!owner)return new Response('purchase owner not linked yet',{status:503,headers:{'retry-after':'30'}});
    const accountId=owner.accountId;
    verified={...verified,obfuscatedAccountId:owner.obfuscatedAccountId};

    await record(admin,accountId,verified,'rtdn');
    if(verified.entitlementActive&&verified.acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'){
      verified=await acknowledgeGooglePlayPurchase(verified);
      await record(admin,accountId,verified,'rtdn');
    }
    await markRtdnProcessed(admin,messageId);
    return new Response(null,{status:204});
  }catch(error){
    const message=error instanceof Error?error.message:'RTDN_FAILED';
    const reason=AUTH_REJECTION_REASONS.get(message);
    if(reason)console.warn('[play-billing-rtdn] Authentication rejected: '+reason);
    const authError=message.includes('Pub/Sub OIDC');
    const status=authError?401:error instanceof GooglePlayApiError&&error.status>=500?503:500;
    return new Response(message,{status});
  }
});
