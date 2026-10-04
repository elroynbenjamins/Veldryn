import type {Purchase} from 'expo-iap';
import type {GameState} from '../core/types';
import {withServerCommerceEntitlements,type ServerCommerceEntitlements} from '../core/account-entitlements';
import {commerceProduct,type CommerceProductId,type PlayBillingProductType} from '../content/commerce-products';
import {supabase} from './supabase';

export interface GooglePlayBillingContext{
  obfuscatedAccountId:string;
  entitlements:ServerCommerceEntitlements;
  /** Older handlers omit this; newer handlers explicitly disable unconfigured checkout. */
  checkoutAvailable?:boolean;
}

export interface GooglePlayVerificationResult{
  entitlements:ServerCommerceEntitlements;
  verifiedProductIds:string[];
}

export interface GooglePlayPurchaseEvidence{
  purchaseToken:string;
  productId:string;
  productType:PlayBillingProductType;
}

function requireBillingClient(){
  if(!supabase)throw new Error('Online services are not configured in this build.');
  return supabase;
}

async function requireRecoverableSession(expectedAccountId?:string){
  const client=requireBillingClient();
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  const session=data.session;
  if(expectedAccountId&&session?.user.id!==expectedAccountId)throw new Error('ACCOUNT_CHANGED');
  if(!session)throw new Error('Sign in before using Google Play purchases.');
  if(session.user.is_anonymous)throw new Error('Secure your guest account with email and password before making a purchase.');
  return session;
}

function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value)}

function validatedEntitlements(value:unknown):ServerCommerceEntitlements{
  if(!record(value)||typeof value.vip!=='boolean'||typeof value.vipPlus!=='boolean'||typeof value.supporter!=='boolean'
    ||!(value.supporterExpiresAt===null||(typeof value.supporterExpiresAt==='string'&&Number.isFinite(Date.parse(value.supporterExpiresAt))))){
    throw new Error('INVALID_COMMERCE_RESPONSE');
  }
  return {vip:value.vip,vipPlus:value.vipPlus,supporter:value.supporter,supporterExpiresAt:value.supporterExpiresAt};
}

function validatedContext(value:Record<string,unknown>):GooglePlayBillingContext{
  if(typeof value.obfuscatedAccountId!=='string'||!/^[a-f0-9]{64}$/.test(value.obfuscatedAccountId)
    ||(value.checkoutAvailable!==undefined&&typeof value.checkoutAvailable!=='boolean'))throw new Error('INVALID_COMMERCE_RESPONSE');
  return {obfuscatedAccountId:value.obfuscatedAccountId,entitlements:validatedEntitlements(value.entitlements),
    ...(typeof value.checkoutAvailable==='boolean'?{checkoutAvailable:value.checkoutAvailable}:{})};
}

function validatedVerification(value:Record<string,unknown>):GooglePlayVerificationResult{
  if(!Array.isArray(value.verifiedProductIds)||!value.verifiedProductIds.every(id=>typeof id==='string'&&!!commerceProduct(id)))throw new Error('INVALID_COMMERCE_RESPONSE');
  return {entitlements:validatedEntitlements(value.entitlements),verifiedProductIds:[...new Set(value.verifiedProductIds as string[])]};
}

/** Read account-wide benefits independently of the optional Google Play service. */
export async function loadAccountCommerceEntitlements(expectedAccountId:string):Promise<ServerCommerceEntitlements>{
  const client=requireBillingClient();
  const session=await requireRecoverableSession(expectedAccountId);
  const {data,error}=await client.rpc('commerce_entitlements_self_v1')
    .setHeader('Authorization',`Bearer ${session.access_token}`);
  await requireRecoverableSession(session.user.id);
  if(error)throw error;
  return validatedEntitlements(data);
}

async function invokeBilling(body:Record<string,unknown>,expectedAccountId?:string):Promise<Record<string,unknown>>{
  const client=requireBillingClient();
  const session=await requireRecoverableSession(expectedAccountId);
  const {data,error}=await client.functions.invoke('play-billing',{body,headers:{Authorization:`Bearer ${session.access_token}`}});
  await requireRecoverableSession(session.user.id);
  if(error){
    // Native fetch responses need not share the global Response prototype.
    // Inspect only the public error fields; never display arbitrary response bodies.
    const response=error.context as {status?:number;clone?:()=>{json:()=>Promise<unknown>};json?:()=>Promise<unknown>}|undefined;
    if(response?.status===404)throw new Error('GOOGLE_PLAY_BILLING_UNAVAILABLE');
    if(typeof response?.json==='function'){
      const payload=await (response.clone?.()??response).json!().catch(()=>null);
      if(record(payload)){
        if(typeof payload.error==='string')throw new Error(payload.error);
        if(typeof payload.message==='string')throw new Error(payload.message);
        if(typeof payload.code==='string')throw new Error(payload.code);
      }
    }
    throw error;
  }
  if(!record(data))throw new Error('INVALID_COMMERCE_RESPONSE');
  if('error' in data&&typeof data.error==='string')throw new Error(data.error);
  return data;
}

const BILLING_UNAVAILABLE='Google Play purchases are temporarily unavailable. Your active benefits are unchanged.';
const BILLING_CONNECTION='Could not connect to purchase services. Check your connection and try again.';
const BILLING_ERROR_MESSAGES:Record<string,string>={
  ACCOUNT_CHANGED:'The signed-in account changed. Refresh purchases and try again.',
  INVALID_COMMERCE_RESPONSE:'Could not load account benefits. Please try again.',
  AUTH_REQUIRED:'Sign in before using Google Play purchases.',
  RECOVERABLE_ACCOUNT_REQUIRED:'Secure your guest account with email and password before making a purchase.',
  GOOGLE_PLAY_BILLING_UNAVAILABLE:BILLING_UNAVAILABLE,
  GOOGLE_PLAY_BILLING_NOT_CONFIGURED:BILLING_UNAVAILABLE,
  NOT_FOUND:BILLING_UNAVAILABLE,
  GOOGLE_PLAY_SERVICE_UNAVAILABLE:BILLING_CONNECTION,
  GOOGLE_PLAY_ACCOUNT_MISMATCH:'This Google Play purchase belongs to another VELDRYN account.',
  GOOGLE_PLAY_PURCHASE_ALREADY_BOUND:'This Google Play purchase belongs to another VELDRYN account.',
  UNKNOWN_GOOGLE_PLAY_PRODUCT:'This product is not currently available from Google Play.',
  GOOGLE_PLAY_PRODUCT_TYPE_MISMATCH:'This product is not currently available from Google Play.',
  'billing-unavailable':'Google Play Billing is unavailable right now.',
  'iap-not-available':'Google Play Billing is unavailable right now.',
  'item-unavailable':'This product is not currently available from Google Play.',
  'sku-not-found':'This product is not currently available from Google Play.',
  'network-error':BILLING_CONNECTION,
  'service-disconnected':BILLING_CONNECTION,
  'service-timeout':BILLING_CONNECTION,
  FunctionsFetchError:BILLING_CONNECTION,
  FunctionsRelayError:BILLING_CONNECTION,
  'purchase-verification-failed':'The purchase could not be verified. Restore purchases or try again later.',
  'transaction-validation-failed':'The purchase could not be verified. Restore purchases or try again later.',
};
const BILLING_PLAYER_MESSAGES=new Set([
  ...Object.values(BILLING_ERROR_MESSAGES),
  'Online services are not configured in this build.',
  'Secure or sign in to your VELDRYN account before purchasing.',
  'The monthly Supporter plan is not available for this Google Play account.',
  'This Google Play product is not recognized by VELDRYN.',
  'Only Google Play purchases can be verified here.',
  'Google Play did not return a purchase token.',
  'VIP is already owned.',
  'VIP+ is already owned.',
  'Supporter is already active. Manage your subscription in Google Play.',
]);

/** Turn known API/native failure codes into safe, translatable player guidance. */
export function googlePlayBillingErrorMessage(error:unknown):string{
  const row=record(error)?error:undefined;
  const message=error instanceof Error?error.message:typeof error==='string'?error:typeof row?.message==='string'?row.message:'';
  for(const key of [row?.code,message,row?.name]){
    const mapped=typeof key==='string'?BILLING_ERROR_MESSAGES[key]:undefined;
    if(typeof mapped==='string')return mapped;
  }
  if(message==='Invalid JWT')return BILLING_ERROR_MESSAGES.AUTH_REQUIRED;
  if(message.startsWith('Google Play Developer API returned ')||message==='Google OAuth token exchange failed')return BILLING_UNAVAILABLE;
  if(message.startsWith('Missing server secret: ')||message.startsWith('Supabase ')&&message.endsWith('credentials are not configured'))return BILLING_UNAVAILABLE;
  if(BILLING_PLAYER_MESSAGES.has(message))return message;
  return 'Google Play billing could not complete that request.';
}

export function googlePlayPurchaseEvidence(purchase:Purchase):GooglePlayPurchaseEvidence{
  const product=commerceProduct(purchase.productId);
  if(!product)throw new Error('This Google Play product is not recognized by VELDRYN.');
  if(purchase.store!=='google')throw new Error('Only Google Play purchases can be verified here.');
  const purchaseToken=purchase.purchaseToken?.trim();
  if(!purchaseToken)throw new Error('Google Play did not return a purchase token.');
  return {purchaseToken,productId:product.playProductId,productType:product.playProductType};
}

export async function loadGooglePlayBillingContext(expectedAccountId?:string):Promise<GooglePlayBillingContext>{
  return validatedContext(await invokeBilling({action:'context'},expectedAccountId));
}

export async function prepareGooglePlayPurchase(productId:CommerceProductId,expectedAccountId?:string):Promise<GooglePlayBillingContext>{
  const context=validatedContext(await invokeBilling({action:'prepare',productId},expectedAccountId));
  if(context.checkoutAvailable===false)throw new Error('GOOGLE_PLAY_BILLING_NOT_CONFIGURED');
  return context;
}

export async function verifyGooglePlayPurchase(purchase:Purchase,expectedAccountId?:string):Promise<GooglePlayVerificationResult>{
  return validatedVerification(await invokeBilling({action:'verify',purchase:googlePlayPurchaseEvidence(purchase)},expectedAccountId));
}

export async function restoreGooglePlayPurchases(purchases:Purchase[],expectedAccountId?:string):Promise<GooglePlayVerificationResult>{
  const evidence=purchases.flatMap(purchase=>{
    try{return [googlePlayPurchaseEvidence(purchase)]}catch{return []}
  });
  return validatedVerification(await invokeBilling({action:'restore',purchases:evidence},expectedAccountId));
}

export async function refreshGooglePlayEntitlements(expectedAccountId?:string):Promise<GooglePlayVerificationResult>{
  return validatedVerification(await invokeBilling({action:'status'},expectedAccountId));
}

export function applyServerCommerceEntitlements(state:GameState,result:{entitlements:ServerCommerceEntitlements}){
  return withServerCommerceEntitlements(state,result.entitlements);
}
