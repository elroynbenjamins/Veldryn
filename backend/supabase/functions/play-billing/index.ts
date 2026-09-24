import {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.115.0';
import {
  GooglePlayApiError,
  acknowledgeGooglePlayPurchase,
  expectedGooglePlayType,
  googlePlayObfuscatedAccountId,
  isGooglePlayProductId,
  verifyGooglePlayPurchase,
  type GooglePlayProductId,
  type GooglePlayProductType,
  type VerifiedGooglePlayPurchase,
} from '../_shared/google-play.ts';

type PurchaseEvidence={purchaseToken:string;productId:string;productType:string};
type Entitlements={vip:boolean;vipPlus:boolean;supporter:boolean;supporterExpiresAt:string|null};

const JSON_HEADERS={'content-type':'application/json','cache-control':'no-store'};

function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:JSON_HEADERS})}

function firstJsonSecret(name:string){
  const raw=Deno.env.get(name);
  if(!raw)return undefined;
  try{
    const parsed=JSON.parse(raw) as Record<string,string>;
    return Object.values(parsed).find(value=>typeof value==='string'&&value.length>0);
  }catch{return undefined}
}

function envValue(...names:string[]){
  for(const name of names){
    const value=Deno.env.get(name)?.trim();
    if(value)return value;
  }
  return undefined;
}

function adminClient(){
  const url=envValue('SUPABASE_URL');
  const key=envValue('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY')??firstJsonSecret('SUPABASE_SECRET_KEYS');
  if(!url||!key)throw new Error('Supabase service credentials are not configured');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

function userClient(authorization:string){
  const url=envValue('SUPABASE_URL');
  const key=envValue('SUPABASE_ANON_KEY','SUPABASE_PUBLISHABLE_KEY')??firstJsonSecret('SUPABASE_PUBLISHABLE_KEYS');
  if(!url||!key)throw new Error('Supabase public credentials are not configured');
  return createClient(url,key,{
    global:{headers:{Authorization:authorization}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
}

async function authenticatedUser(req:Request){
  const authorization=req.headers.get('authorization')??'';
  const jwt=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!jwt)throw new Error('AUTH_REQUIRED');
  const client=userClient(authorization);
  const {data,error}=await client.auth.getUser(jwt);
  if(error||!data.user)throw new Error('AUTH_REQUIRED');
  if(data.user.is_anonymous)throw new Error('RECOVERABLE_ACCOUNT_REQUIRED');
  return {user:data.user,client};
}

async function entitlements(client:SupabaseClient):Promise<Entitlements>{
  const {data,error}=await client.rpc('commerce_entitlements_self_v1');
  if(error)throw error;
  const value=data as Partial<Entitlements>|null;
  return {
    vip:Boolean(value?.vip),
    vipPlus:Boolean(value?.vipPlus),
    supporter:Boolean(value?.supporter),
    supporterExpiresAt:typeof value?.supporterExpiresAt==='string'?value.supporterExpiresAt:null,
  };
}

function evidence(value:unknown):PurchaseEvidence{
  if(!value||typeof value!=='object')throw new Error('INVALID_PURCHASE');
  const row=value as Partial<PurchaseEvidence>;
  if(typeof row.purchaseToken!=='string'||!row.purchaseToken.trim())throw new Error('INVALID_PURCHASE_TOKEN');
  if(typeof row.productId!=='string'||!isGooglePlayProductId(row.productId))throw new Error('UNKNOWN_GOOGLE_PLAY_PRODUCT');
  if(row.productType!==expectedGooglePlayType(row.productId))throw new Error('GOOGLE_PLAY_PRODUCT_TYPE_MISMATCH');
  return {purchaseToken:row.purchaseToken.trim(),productId:row.productId,productType:row.productType};
}

async function registerAccount(admin:SupabaseClient,accountId:string,obfuscatedAccountId:string){
  const {error}=await admin.rpc('google_play_register_account_link_v1',{
    p_account_id:accountId,
    p_obfuscated_account_id:obfuscatedAccountId,
  });
  if(error)throw error;
}

async function record(admin:SupabaseClient,accountId:string,purchase:VerifiedGooglePlayPurchase,source:string){
  const {error}=await admin.rpc('google_play_record_purchase_v1',{
    p_account_id:accountId,
    p_purchase_token:purchase.purchaseToken,
    p_product_id:purchase.productId,
    p_product_type:purchase.productType,
    p_google_state:purchase.googleState,
    p_entitlement_active:purchase.entitlementActive,
    p_order_id:purchase.orderId,
    p_purchased_at:purchase.purchasedAt,
    p_expires_at:purchase.expiresAt,
    p_auto_renewing:purchase.autoRenewing,
    p_acknowledgement_state:purchase.acknowledgementState,
    p_linked_purchase_token:purchase.linkedPurchaseToken,
    p_obfuscated_account_id:purchase.obfuscatedAccountId,
    p_is_test:purchase.isTest,
    p_region_code:purchase.regionCode,
    p_base_plan_id:purchase.basePlanId,
    p_offer_id:purchase.offerId,
    p_source:source,
  });
  if(error)throw error;
}

async function verifyAndRecord(
  admin:SupabaseClient,
  accountId:string,
  obfuscatedAccountId:string,
  row:PurchaseEvidence,
  source:string,
){
  const productId=row.productId as GooglePlayProductId;
  const productType=row.productType as GooglePlayProductType;
  let verified=await verifyGooglePlayPurchase(row.purchaseToken,productType,productId);
  if(!verified.obfuscatedAccountId||verified.obfuscatedAccountId!==obfuscatedAccountId){
    throw new Error('GOOGLE_PLAY_ACCOUNT_MISMATCH');
  }
  await record(admin,accountId,verified,source);
  if(verified.entitlementActive&&verified.acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'){
    verified=await acknowledgeGooglePlayPurchase(verified);
    await record(admin,accountId,verified,source);
  }
  return verified;
}

async function refreshKnownPurchases(admin:SupabaseClient,accountId:string,obfuscatedAccountId:string){
  const {data,error}=await admin.rpc('google_play_tokens_for_account_v1',{p_account_id:accountId});
  if(error)throw error;
  const rows=(Array.isArray(data)?data:[]) as Array<{purchase_token:string;product_id:string;product_type:string}>;
  const verifiedIds:string[]=[];
  for(const row of rows){
    if(!isGooglePlayProductId(row.product_id)||row.product_type!==expectedGooglePlayType(row.product_id))continue;
    try{
      const verified=await verifyAndRecord(admin,accountId,obfuscatedAccountId,{
        purchaseToken:row.purchase_token,
        productId:row.product_id,
        productType:row.product_type,
      },'status');
      verifiedIds.push(verified.productId);
    }catch(error){
      if(error instanceof GooglePlayApiError&&(error.status===404||error.status===410)){
        await record(admin,accountId,{
          purchaseToken:row.purchase_token,
          productId:row.product_id as GooglePlayProductId,
          productType:row.product_type as GooglePlayProductType,
          googleState:'NOT_FOUND',
          entitlementActive:false,
          orderId:null,purchasedAt:null,expiresAt:null,autoRenewing:null,
          acknowledgementState:null,linkedPurchaseToken:null,
          obfuscatedAccountId,
          isTest:false,regionCode:null,basePlanId:null,offerId:null,
        },'status_not_found');
      }
    }
  }
  return [...new Set(verifiedIds)];
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...JSON_HEADERS,'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type'}});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const {user,client}=await authenticatedUser(req);
    const admin=adminClient();
    const obfuscatedAccountId=await googlePlayObfuscatedAccountId(user.id);
    await registerAccount(admin,user.id,obfuscatedAccountId);
    const body=await req.json() as {action?:string;purchase?:unknown;purchases?:unknown[]};

    if(body.action==='context'){
      return json({obfuscatedAccountId,entitlements:await entitlements(client)});
    }

    if(body.action==='verify'){
      const verified=await verifyAndRecord(admin,user.id,obfuscatedAccountId,evidence(body.purchase),'client');
      return json({entitlements:await entitlements(client),verifiedProductIds:[verified.productId]});
    }

    if(body.action==='restore'){
      const rows=Array.isArray(body.purchases)?body.purchases:[];
      if(rows.length>16)throw new Error('TOO_MANY_RESTORE_PURCHASES');
      const verifiedIds:string[]=[];
      for(const raw of rows){
        try{
          const verified=await verifyAndRecord(admin,user.id,obfuscatedAccountId,evidence(raw),'restore');
          verifiedIds.push(verified.productId);
        }catch(error){
          if(error instanceof GooglePlayApiError&&(error.status===404||error.status===410))continue;
          throw error;
        }
      }
      return json({entitlements:await entitlements(client),verifiedProductIds:[...new Set(verifiedIds)]});
    }

    if(body.action==='status'){
      const verifiedProductIds=await refreshKnownPurchases(admin,user.id,obfuscatedAccountId);
      return json({entitlements:await entitlements(client),verifiedProductIds});
    }

    return json({error:'UNKNOWN_ACTION'},400);
  }catch(error){
    const message=error instanceof Error?error.message:'GOOGLE_PLAY_BILLING_FAILED';
    const status=message==='AUTH_REQUIRED'?401:message==='RECOVERABLE_ACCOUNT_REQUIRED'?403:message.includes('MISMATCH')?409:400;
    return json({error:message},status);
  }
});
