export const GOOGLE_PLAY_PACKAGE_NAME=Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME')??'com.elroybenjamins.veldryn';
export const GOOGLE_PLAY_PRODUCTS={
  vip:'in-app',
  vip_plus:'in-app',
  supporter_monthly:'subs',
} as const;

export type GooglePlayProductId=keyof typeof GOOGLE_PLAY_PRODUCTS;
export type GooglePlayProductType=(typeof GOOGLE_PLAY_PRODUCTS)[GooglePlayProductId];

export interface VerifiedGooglePlayPurchase{
  purchaseToken:string;
  productId:GooglePlayProductId;
  productType:GooglePlayProductType;
  googleState:string;
  entitlementActive:boolean;
  orderId:string|null;
  purchasedAt:string|null;
  expiresAt:string|null;
  autoRenewing:boolean|null;
  acknowledgementState:string|null;
  linkedPurchaseToken:string|null;
  obfuscatedAccountId:string|null;
  expiredPurchaseToken:string|null;
  expiredObfuscatedAccountId:string|null;
  isTest:boolean;
  regionCode:string|null;
  basePlanId:string|null;
  offerId:string|null;
}

type ServiceAccount={
  client_email:string;
  private_key:string;
  token_uri?:string;
};

type CachedToken={value:string;expiresAt:number};
let cachedAccessToken:CachedToken|undefined;
let cachedJwks:{keys:Array<JsonWebKey&{kid?:string}>;expiresAt:number}|undefined;

export class GooglePlayApiError extends Error{
  constructor(public readonly status:number,message:string){super(message)}
}

function requiredEnv(name:string){
  const value=Deno.env.get(name)?.trim();
  if(!value)throw new Error('Missing server secret: '+name);
  return value;
}

function googlePlayRtdnAudience(){
  const configured=Deno.env.get('GOOGLE_PLAY_RTDN_AUDIENCE')?.trim();
  if(configured)return configured;
  // Pub/Sub defaults its audience to the push endpoint. Derive that one exact
  // value from trusted server configuration, never request headers or claims.
  const base=requiredEnv('SUPABASE_URL');
  let url:URL;
  try{url=new URL(base)}catch{
    throw new Error('Invalid server configuration: SUPABASE_URL must be an HTTPS origin');
  }
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||base.includes('?')||base.includes('#')){
    throw new Error('Invalid server configuration: SUPABASE_URL must be an HTTPS origin');
  }
  return url.origin+'/functions/v1/play-billing-rtdn';
}

function base64Url(bytes:Uint8Array){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function decodeBase64Url(value:string){
  const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
  const padded=normalized+'='.repeat((4-normalized.length%4)%4);
  const raw=atob(padded);
  return Uint8Array.from(raw,char=>char.charCodeAt(0));
}

function jsonPart(value:unknown){
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function pkcs8Bytes(pem:string){
  const base64=pem.replace(/-----BEGIN PRIVATE KEY-----/g,'').replace(/-----END PRIVATE KEY-----/g,'').replace(/\s/g,'');
  if(!base64)throw new Error('Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON private key');
  const raw=atob(base64);
  return Uint8Array.from(raw,char=>char.charCodeAt(0));
}

function serviceAccount():ServiceAccount{
  const raw=Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')?.trim();
  try{
    const parsed=JSON.parse(raw??'null') as Partial<ServiceAccount>|null;
    if(!parsed||typeof parsed.client_email!=='string'||!parsed.client_email.trim()
      ||typeof parsed.private_key!=='string'||!parsed.private_key.includes('-----BEGIN PRIVATE KEY-----')
      ||!parsed.private_key.includes('-----END PRIVATE KEY-----')
      ||(parsed.token_uri!==undefined&&(typeof parsed.token_uri!=='string'||!parsed.token_uri.trim())))throw new Error();
    return {client_email:parsed.client_email,private_key:parsed.private_key,token_uri:parsed.token_uri};
  }catch{
    // JSON parse errors can include fragments of the credential. Never return them.
    throw new Error('GOOGLE_PLAY_BILLING_NOT_CONFIGURED');
  }
}

/** Configuration presence only. This never sends credentials or contacts Google. */
export function googlePlayBillingConfigured(){
  try{serviceAccount();return true}catch{return false}
}

/** Validate signing/OAuth before letting a new purchase open the native payment sheet. */
export async function assertGooglePlayBillingReady(){
  serviceAccount();
  try{await googleAccessToken()}catch(error){
    if(error instanceof GooglePlayApiError&&error.status>=500)throw new Error('GOOGLE_PLAY_SERVICE_UNAVAILABLE');
    if(error instanceof TypeError)throw new Error('GOOGLE_PLAY_SERVICE_UNAVAILABLE');
    throw new Error('GOOGLE_PLAY_BILLING_NOT_CONFIGURED');
  }
}

export function warnGooglePlayConfiguration(functionName:'play-billing'|'play-billing-rtdn'){
  const missing:string[]=[];
  if(!googlePlayBillingConfigured())missing.push('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if(functionName==='play-billing-rtdn'){
    try{googlePlayRtdnAudience()}catch{missing.push('SUPABASE_URL');}
    if(!Deno.env.get('GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL')?.trim())missing.push('GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL');
  }
  if(missing.length)console.warn('['+functionName+'] Missing or invalid configuration keys: '+missing.join(', '));
}

async function googleAccessToken(){
  if(cachedAccessToken&&cachedAccessToken.expiresAt>Date.now()+60_000)return cachedAccessToken.value;
  const sa=await serviceAccount();
  const now=Math.floor(Date.now()/1000);
  const header=jsonPart({alg:'RS256',typ:'JWT'});
  const payload=jsonPart({
    iss:sa.client_email,
    scope:'https://www.googleapis.com/auth/androidpublisher',
    aud:sa.token_uri??'https://oauth2.googleapis.com/token',
    iat:now,
    exp:now+3600,
  });
  const unsigned=header+'.'+payload;
  const key=await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes(sa.private_key),
    {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},
    false,
    ['sign'],
  );
  const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const assertion=unsigned+'.'+base64Url(signature);
  const response=await fetch(sa.token_uri??'https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if(!response.ok)throw new GooglePlayApiError(response.status,'Google OAuth token exchange failed');
  const body=await response.json() as {access_token?:string;expires_in?:number};
  if(!body.access_token)throw new Error('Google OAuth response did not contain an access token');
  cachedAccessToken={value:body.access_token,expiresAt:Date.now()+(body.expires_in??3600)*1000};
  return body.access_token;
}

async function googleJson(url:string,init?:RequestInit){
  const token=await googleAccessToken();
  const response=await fetch(url,{...init,headers:{authorization:'Bearer '+token,'content-type':'application/json',...(init?.headers??{})}});
  if(!response.ok){
    await response.text();
    throw new GooglePlayApiError(response.status,'Google Play Developer API returned '+response.status);
  }
  if(response.status===204)return null;
  const text=await response.text();
  return text?JSON.parse(text):null;
}

export function isGooglePlayProductId(value:string):value is GooglePlayProductId{
  return Object.prototype.hasOwnProperty.call(GOOGLE_PLAY_PRODUCTS,value);
}

export function expectedGooglePlayType(productId:GooglePlayProductId):GooglePlayProductType{
  return GOOGLE_PLAY_PRODUCTS[productId];
}

function currentLine<T extends {productId?:string;expiryTime?:string}>(lines:T[],expectedProductId?:string){
  if(expectedProductId){
    const exact=lines.find(line=>line.productId===expectedProductId);
    if(exact)return exact;
  }
  return [...lines].sort((a,b)=>Date.parse(b.expiryTime??'')-Date.parse(a.expiryTime??''))[0];
}

function activeSubscriptionState(state:string,expiresAt:string|null){
  const expiry=Date.parse(expiresAt??'');
  if(!Number.isFinite(expiry)||expiry<=Date.now())return false;
  return state==='SUBSCRIPTION_STATE_ACTIVE'
    ||state==='SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
    ||state==='SUBSCRIPTION_STATE_CANCELED';
}

export async function verifyGooglePlayPurchase(
  purchaseToken:string,
  productType:GooglePlayProductType,
  expectedProductId?:GooglePlayProductId,
):Promise<VerifiedGooglePlayPurchase>{
  if(!purchaseToken.trim())throw new Error('Missing Google Play purchase token');
  const encodedPackage=encodeURIComponent(GOOGLE_PLAY_PACKAGE_NAME);
  const encodedToken=encodeURIComponent(purchaseToken);

  if(productType==='in-app'){
    const payload=await googleJson(
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+encodedPackage+'/purchases/productsv2/tokens/'+encodedToken,
    ) as {
      productLineItem?:Array<{productId?:string}>;
      purchaseStateContext?:{purchaseState?:string};
      testPurchaseContext?:unknown;
      orderId?:string;
      obfuscatedExternalAccountId?:string;
      regionCode?:string;
      purchaseCompletionTime?:string;
      acknowledgementState?:string;
    };
    const line=currentLine(payload.productLineItem??[],expectedProductId);
    const productId=line?.productId;
    if(!productId||!isGooglePlayProductId(productId)||GOOGLE_PLAY_PRODUCTS[productId]!=='in-app')throw new Error('Google Play returned an unknown one-time product');
    if(expectedProductId&&productId!==expectedProductId)throw new Error('Google Play product does not match the requested product');
    const state=payload.purchaseStateContext?.purchaseState??'PURCHASE_STATE_UNSPECIFIED';
    return {
      purchaseToken,
      productId,
      productType:'in-app',
      googleState:state,
      entitlementActive:state==='PURCHASED',
      orderId:payload.orderId??null,
      purchasedAt:payload.purchaseCompletionTime??null,
      expiresAt:null,
      autoRenewing:null,
      acknowledgementState:payload.acknowledgementState??null,
      linkedPurchaseToken:null,
      obfuscatedAccountId:payload.obfuscatedExternalAccountId??null,
      expiredPurchaseToken:null,
      expiredObfuscatedAccountId:null,
      isTest:Boolean(payload.testPurchaseContext),
      regionCode:payload.regionCode??null,
      basePlanId:null,
      offerId:null,
    };
  }

  const payload=await googleJson(
    'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+encodedPackage+'/purchases/subscriptionsv2/tokens/'+encodedToken,
  ) as {
    regionCode?:string;
    startTime?:string;
    subscriptionState?:string;
    linkedPurchaseToken?:string;
    testPurchase?:unknown;
    acknowledgementState?:string;
    externalAccountIdentifiers?:{obfuscatedExternalAccountId?:string};
    outOfAppPurchaseContext?:{
      expiredPurchaseToken?:string;
      expiredExternalAccountIdentifiers?:{obfuscatedExternalAccountId?:string};
    };
    lineItems?:Array<{
      productId?:string;
      expiryTime?:string;
      latestSuccessfulOrderId?:string;
      autoRenewingPlan?:{autoRenewEnabled?:boolean};
      offerDetails?:{basePlanId?:string;offerId?:string};
    }>;
  };
  const line=currentLine(payload.lineItems??[],expectedProductId);
  const productId=line?.productId;
  if(!productId||!isGooglePlayProductId(productId)||GOOGLE_PLAY_PRODUCTS[productId]!=='subs')throw new Error('Google Play returned an unknown subscription product');
  if(expectedProductId&&productId!==expectedProductId)throw new Error('Google Play subscription does not match the requested product');
  const state=payload.subscriptionState??'SUBSCRIPTION_STATE_UNSPECIFIED';
  const expiresAt=line?.expiryTime??null;
  return {
    purchaseToken,
    productId,
    productType:'subs',
    googleState:state,
    entitlementActive:activeSubscriptionState(state,expiresAt),
    orderId:line?.latestSuccessfulOrderId??null,
    purchasedAt:payload.startTime??null,
    expiresAt,
    autoRenewing:line?.autoRenewingPlan?.autoRenewEnabled??null,
    acknowledgementState:payload.acknowledgementState??null,
    linkedPurchaseToken:payload.linkedPurchaseToken??null,
    obfuscatedAccountId:payload.externalAccountIdentifiers?.obfuscatedExternalAccountId??null,
    expiredPurchaseToken:payload.outOfAppPurchaseContext?.expiredPurchaseToken??null,
    expiredObfuscatedAccountId:payload.outOfAppPurchaseContext?.expiredExternalAccountIdentifiers?.obfuscatedExternalAccountId??null,
    isTest:Boolean(payload.testPurchase),
    regionCode:payload.regionCode??null,
    basePlanId:line?.offerDetails?.basePlanId??null,
    offerId:line?.offerDetails?.offerId??null,
  };
}

export async function acknowledgeGooglePlayPurchase(purchase:VerifiedGooglePlayPurchase){
  if(!purchase.entitlementActive||purchase.acknowledgementState==='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')return purchase;
  const pkg=encodeURIComponent(GOOGLE_PLAY_PACKAGE_NAME);
  const product=encodeURIComponent(purchase.productId);
  const token=encodeURIComponent(purchase.purchaseToken);
  const path=purchase.productType==='subs'
    ?'/purchases/subscriptions/'+product+'/tokens/'+token+':acknowledge'
    :'/purchases/products/'+product+'/tokens/'+token+':acknowledge';
  await googleJson('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+pkg+path,{method:'POST',body:'{}'});
  return {...purchase,acknowledgementState:'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'};
}

export async function googlePlayObfuscatedAccountId(accountId:string){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('veldryn:'+accountId)));
  return Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('');
}

/** Resolve only Google-verified identifiers against server-owned account links. */
export async function resolveGooglePlayPurchaseOwner(
  purchase:VerifiedGooglePlayPurchase,
  lookup:{
    byPurchaseToken:(token:string)=>Promise<string|null>;
    byObfuscatedAccountId:(id:string)=>Promise<string|null>;
  },
):Promise<{accountId:string;obfuscatedAccountId:string}|null>{
  const ids=[purchase.obfuscatedAccountId,purchase.expiredObfuscatedAccountId].filter((id):id is string=>id!==null);
  if(ids.some(id=>!(/^[0-9a-f]{64}$/).test(id))||new Set(ids).size>1)throw new Error('GOOGLE_PLAY_ACCOUNT_MISMATCH');
  const tokens=[...new Set([purchase.purchaseToken,purchase.linkedPurchaseToken,purchase.expiredPurchaseToken].filter((token):token is string=>Boolean(token)))];
  const owners=await Promise.all([
    ...tokens.map(token=>lookup.byPurchaseToken(token)),
    ...[...new Set(ids)].map(id=>lookup.byObfuscatedAccountId(id)),
  ]);
  const accounts=[...new Set(owners.filter((id):id is string=>Boolean(id)))];
  if(accounts.length>1)throw new Error('GOOGLE_PLAY_ACCOUNT_MISMATCH');
  if(!accounts.length)return null;
  const accountId=accounts[0];
  const obfuscatedAccountId=await googlePlayObfuscatedAccountId(accountId);
  if(ids.some(id=>id!==obfuscatedAccountId))throw new Error('GOOGLE_PLAY_ACCOUNT_MISMATCH');
  return {accountId,obfuscatedAccountId};
}

function parseJwtPart<T>(part:string):T{
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(part))) as T;
}

async function googleJwks(){
  if(cachedJwks&&cachedJwks.expiresAt>Date.now())return cachedJwks.keys;
  const response=await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if(!response.ok)throw new Error('Could not load Google OIDC signing keys');
  const body=await response.json() as {keys:Array<JsonWebKey&{kid?:string}>};
  cachedJwks={keys:body.keys??[],expiresAt:Date.now()+55*60_000};
  return cachedJwks.keys;
}

export async function verifyGooglePubSubOidc(req:Request){
  // An unconfigured webhook rejects before downloading keys or touching commerce data.
  const expectedAudience=googlePlayRtdnAudience();
  const expectedServiceAccount=requiredEnv('GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL');
  const authorization=req.headers.get('authorization')??'';
  const token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  const parts=token.split('.');
  if(parts.length!==3)throw new Error('Missing Pub/Sub OIDC bearer token');
  const header=parseJwtPart<{alg?:string;kid?:string}>(parts[0]);
  const claims=parseJwtPart<{iss?:string;aud?:string;email?:string;email_verified?:boolean;exp?:number;nbf?:number}>(parts[1]);
  if(header.alg!=='RS256'||!header.kid)throw new Error('Invalid Pub/Sub OIDC algorithm');
  const keyData=(await googleJwks()).find(key=>key.kid===header.kid);
  if(!keyData)throw new Error('Unknown Pub/Sub OIDC signing key');
  const key=await crypto.subtle.importKey('jwk',keyData,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decodeBase64Url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  if(!valid)throw new Error('Invalid Pub/Sub OIDC signature');
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!=='https://accounts.google.com'&&claims.iss!=='accounts.google.com')throw new Error('Invalid Pub/Sub OIDC issuer');
  if(!claims.exp||claims.exp<now-30||(claims.nbf&&claims.nbf>now+30))throw new Error('Expired Pub/Sub OIDC token');
  if(claims.aud!==expectedAudience)throw new Error('Invalid Pub/Sub OIDC audience');
  if(claims.email!==expectedServiceAccount||claims.email_verified!==true)throw new Error('Invalid Pub/Sub OIDC service account');
  return claims;
}
