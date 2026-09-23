import type {Purchase} from 'expo-iap';
import type {GameState} from '../core/types';
import {withServerCommerceEntitlements,type ServerCommerceEntitlements} from '../core/account-entitlements';
import {commerceProduct,type PlayBillingProductType} from '../content/commerce-products';
import {supabase} from './supabase';

export interface GooglePlayBillingContext{
  obfuscatedAccountId:string;
  entitlements:ServerCommerceEntitlements;
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

async function requireRecoverableSession(){
  const client=requireBillingClient();
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  const session=data.session;
  if(!session)throw new Error('Sign in before using Google Play purchases.');
  if(session.user.is_anonymous)throw new Error('Secure your guest account with email and password before making a purchase.');
  return session;
}

async function invokeBilling<T>(body:Record<string,unknown>):Promise<T>{
  const client=requireBillingClient();
  await requireRecoverableSession();
  const {data,error}=await client.functions.invoke('play-billing',{body});
  if(error)throw error;
  if(!data||typeof data!=='object')throw new Error('Google Play billing returned an invalid response.');
  if('error' in data&&typeof data.error==='string')throw new Error(data.error);
  return data as T;
}

export function googlePlayPurchaseEvidence(purchase:Purchase):GooglePlayPurchaseEvidence{
  const product=commerceProduct(purchase.productId);
  if(!product)throw new Error('This Google Play product is not recognized by VELDRYN.');
  if(purchase.store!=='google')throw new Error('Only Google Play purchases can be verified here.');
  const purchaseToken=purchase.purchaseToken?.trim();
  if(!purchaseToken)throw new Error('Google Play did not return a purchase token.');
  return {purchaseToken,productId:product.playProductId,productType:product.playProductType};
}

export async function loadGooglePlayBillingContext():Promise<GooglePlayBillingContext>{
  return invokeBilling<GooglePlayBillingContext>({action:'context'});
}

export async function verifyGooglePlayPurchase(purchase:Purchase):Promise<GooglePlayVerificationResult>{
  return invokeBilling<GooglePlayVerificationResult>({action:'verify',purchase:googlePlayPurchaseEvidence(purchase)});
}

export async function restoreGooglePlayPurchases(purchases:Purchase[]):Promise<GooglePlayVerificationResult>{
  const evidence=purchases.flatMap(purchase=>{
    try{return [googlePlayPurchaseEvidence(purchase)]}catch{return []}
  });
  return invokeBilling<GooglePlayVerificationResult>({action:'restore',purchases:evidence});
}

export async function refreshGooglePlayEntitlements():Promise<GooglePlayVerificationResult>{
  return invokeBilling<GooglePlayVerificationResult>({action:'status'});
}

export function applyServerCommerceEntitlements(state:GameState,result:{entitlements:ServerCommerceEntitlements}){
  return withServerCommerceEntitlements(state,result.entitlements);
}
