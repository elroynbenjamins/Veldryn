import {accountText,accountError} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Platform,StyleSheet,Text,View} from 'react-native';
import {
  deepLinkToSubscriptions,
  ErrorCode,
  getAvailablePurchases,
  useIAP,
  type Product,
  type ProductSubscription,
  type Purchase,
  type SubscriptionOffer,
} from 'expo-iap';
import {GameButton} from './GameButton';
import {CommerceCatalog} from './CommerceCatalog';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {purchaseEligibilityError} from '../core/commerce-presentation';
import {
  COMMERCE_PRODUCTS,
  GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS,
  GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS,
  PLAY_BILLING_PACKAGE_NAME,
  type CommerceProductId,
} from '../content/commerce-products';
import {
  applyServerCommerceEntitlements,
  loadGooglePlayBillingContext,
  prepareGooglePlayPurchase,
  refreshGooglePlayEntitlements,
  restoreGooglePlayPurchases,
  verifyGooglePlayPurchase,
  type GooglePlayBillingContext,
} from '../online/play-billing';
import {useAuthSession} from '../online/AuthSessionProvider';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {spacing,typography} from '../theme/theme';

type Props={state:GameState;onChange:(next:GameState)=>void};

function errorMessage(error:unknown){
  if(error instanceof Error)return error.message;
  return 'Google Play billing could not complete that request.';
}

function recurringOffer(product:ProductSubscription|undefined){
  if(!product||product.platform!=='android')return undefined;
  const offers=product.subscriptionOffers??[];
  return offers.find(offer=>offer.basePlanIdAndroid==='monthly'&&offer.id==='monthly')
    ??offers.find(offer=>offer.basePlanIdAndroid==='monthly');
}

function productPrice(product:Product|undefined){return product?.displayPrice||'Loading Play price…'}
function subscriptionPrice(product:ProductSubscription|undefined,offer:SubscriptionOffer|undefined){
  return offer?.displayPrice||product?.displayPrice||'Loading Play price…';
}

export function GooglePlayCommercePanel(props:Props){
  const auth=useAuthSession();
  if(Platform.OS!=='android')return <NonAndroidCommercePanel language={props.state.settings.language}/>;
  return <AndroidGooglePlayCommercePanel key={auth.session?.user.id??'guest'} {...props}/>;
}

function NonAndroidCommercePanel({language:languageOverride}:{language:Language}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  return <Panel><Text style={s.title}>{a("Google Play purchases")}</Text><Text style={s.body}>{a("VIP, VIP+ and Supporter purchases are available in the Android Google Play build.")}</Text></Panel>;
}

function AndroidGooglePlayCommercePanel({state,onChange}:Props){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),auth=useAuthSession();
  const accountId=auth.session?.user.is_anonymous?undefined:auth.session?.user.id;
  const viewerRef=useRef(accountId);viewerRef.current=accountId;
  const stateRef=useRef(state);stateRef.current=state;
  const onChangeRef=useRef(onChange);onChangeRef.current=onChange;
  const [snapshot,setSnapshot]=useState<{accountId:string;context:GooglePlayBillingContext}>();
  const context=snapshot&&snapshot.accountId===accountId?snapshot.context:undefined;
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const busyRef=useRef(false),refreshingRef=useRef(false);
  const purchaseRevision=useRef(0);
  const verifyingTokens=useRef(new Set<string>());
  const benefits=context?.entitlements??{vip:false,vipPlus:false,supporter:false,supporterExpiresAt:null};
  const apply=useCallback((result:{entitlements:GooglePlayBillingContext['entitlements']},owner:string)=>{
    if(viewerRef.current!==owner)return;
    const next=applyServerCommerceEntitlements(stateRef.current,result);
    stateRef.current=next;onChangeRef.current(next);
    setSnapshot(previous=>previous?.accountId===owner?{...previous,context:{...previous.context,entitlements:result.entitlements}}:previous);
  },[]);

  const handlePurchase=useCallback(async(purchase:Purchase)=>{
    const owner=viewerRef.current;
    if(!owner)return;
    if(purchase.purchaseState==='pending'){busyRef.current=false;setBusy(false);setNotice('Payment pending. Benefits activate after Google Play confirms payment.');return}
    if(purchase.purchaseState!=='purchased')return;
    const token=purchase.purchaseToken;
    if(token&&verifyingTokens.current.has(token))return;
    if(token)verifyingTokens.current.add(token);
    const revision=++purchaseRevision.current;
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{
      const result=await verifyGooglePlayPurchase(purchase);
      if(viewerRef.current!==owner||purchaseRevision.current!==revision)return;
      apply(result,owner);
      setNotice('Purchase verified by Google Play and applied to your VELDRYN account.');
    }catch(e){if(viewerRef.current===owner&&purchaseRevision.current===revision)setError(errorMessage(e))}
    finally{if(token)verifyingTokens.current.delete(token);if(viewerRef.current===owner&&purchaseRevision.current===revision){busyRef.current=false;setBusy(false)}}
  },[apply]);

  const {connected,products,subscriptions,fetchProducts,requestPurchase,reconnect}=useIAP({
    onPurchaseSuccess:(purchase)=>{void handlePurchase(purchase)},
    onPurchaseError:(purchaseError)=>{busyRef.current=false;setBusy(false);setError(purchaseError.code===ErrorCode.UserCancelled?'':purchaseError.message);if(purchaseError.code===ErrorCode.UserCancelled)setNotice('Purchase cancelled.');},
    onError:(generalError)=>{busyRef.current=false;setBusy(false);setError(generalError.message)},
  });

  useEffect(()=>{
    if(!connected)return;
    void (async()=>{
      try{
        await fetchProducts({skus:[...GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS],type:'in-app'});
        await fetchProducts({skus:[...GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS],type:'subs'});
      }catch(e){setError(errorMessage(e))}
    })();
  },[connected,fetchProducts]);

  const refresh=useCallback(async()=>{
    const owner=viewerRef.current;
    if(!owner||busyRef.current||refreshingRef.current)return;
    const revision=purchaseRevision.current;
    const current=()=>viewerRef.current===owner&&purchaseRevision.current===revision;
    refreshingRef.current=true;setRefreshing(true);setError('');
    try{
      const next=await loadGooglePlayBillingContext();
      if(!current())return;
      setSnapshot({accountId:owner,context:next});apply(next,owner);
      const refreshed=await refreshGooglePlayEntitlements();
      if(!current())return;
      apply(refreshed,owner);
      // Recover completed payments even if the app was closed before its callback.
      if(connected){
        const purchases=await getAvailablePurchases({includeSuspendedAndroid:true});
        if(!current())return;
        const ownedPurchases=purchases.filter(row=>row.store==='google'&&'obfuscatedAccountIdAndroid' in row&&row.obfuscatedAccountIdAndroid===next.obfuscatedAccountId&&row.purchaseState==='purchased');
        const hasVip=refreshed.entitlements.vip||ownedPurchases.some(row=>row.productId==='vip');
        const mine=ownedPurchases.filter(row=>row.productId!=='vip_plus_upgrade'||hasVip);
        if(mine.length){const restored=await restoreGooglePlayPurchases(mine);if(current())apply(restored,owner);}
      }
    }catch(e){if(current())setError(errorMessage(e))}
    finally{refreshingRef.current=false;if(viewerRef.current===owner)setRefreshing(false);}
  },[apply,connected]);

  useEffect(()=>{
    setSnapshot(undefined);setError('');setNotice('');busyRef.current=false;setBusy(false);
  },[accountId]);
  useEffect(()=>{
    void refresh();
    const listener=AppState.addEventListener('change',next=>{if(next==='active')void refresh();});
    const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},60_000);
    return ()=>{listener.remove();clearInterval(timer);};
  },[accountId,refresh]);
  useEffect(()=>{viewerRef.current=accountId;return ()=>{viewerRef.current=undefined;};},[accountId]);

  const byId=(id:string)=>products.find(product=>product.id===id);
  const sub=subscriptions.find(product=>product.id==='supporter_monthly');
  const offer=recurringOffer(sub);
  const signedIn=Boolean(auth.session&&!auth.session.user.is_anonymous);

  const buy=async(id:CommerceProductId)=>{
    if(busyRef.current||refreshingRef.current)return;
    if(!signedIn||!context){setError('Secure or sign in to your VELDRYN account before purchasing.');return}
    const owner=accountId!;
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{
      if(!connected&&!(await reconnect()))throw new Error('Google Play Billing is unavailable right now.');
      const definition=COMMERCE_PRODUCTS.find(row=>row.id===id);
      if(!definition)throw new Error('Unknown product.');
      const issue=purchaseEligibilityError(id,benefits);
      if(issue)throw new Error(issue);
      if(definition.playProductType==='in-app'&&!byId(id))throw new Error('This product is not currently available from Google Play.');
      const prepared=await prepareGooglePlayPurchase(id);
      if(viewerRef.current!==owner)return;
      setSnapshot({accountId:owner,context:prepared});apply(prepared,owner);
      if(definition.playProductType==='subs'){
        const selected=recurringOffer(sub);
        if(!selected?.offerTokenAndroid)throw new Error('The monthly Supporter plan is not available for this Google Play account.');
        await requestPurchase({type:'subs',request:{google:{
          skus:[definition.playProductId],
          subscriptionOffers:[{sku:definition.playProductId,offerToken:selected.offerTokenAndroid}],
          obfuscatedAccountId:prepared.obfuscatedAccountId,
        }}});
      }else{
        await requestPurchase({type:'in-app',request:{google:{
          skus:[definition.playProductId],
          obfuscatedAccountId:prepared.obfuscatedAccountId,
        }}});
      }
    }catch(e){if(viewerRef.current===owner){setError(errorMessage(e));busyRef.current=false;setBusy(false)}}
  };

  const restore=async()=>{
    if(busyRef.current||refreshingRef.current||!accountId)return;
    const owner=accountId;
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{
      const purchases=await getAvailablePurchases({includeSuspendedAndroid:true});
      if(viewerRef.current!==owner)return;
      const result=await restoreGooglePlayPurchases(purchases);
      if(viewerRef.current!==owner)return;
      apply(result,owner);
      const count=result.verifiedProductIds.length;
      setNotice(count?('Restored '+count+' Google Play purchases.'):a("No restorable VELDRYN purchases were found for this Google Play account."));
    }catch(e){if(viewerRef.current===owner)setError(errorMessage(e))}
    finally{if(viewerRef.current===owner){busyRef.current=false;setBusy(false)}}
  };

  const manageSupporter=()=>void deepLinkToSubscriptions({skuAndroid:'supporter_monthly',packageNameAndroid:PLAY_BILLING_PACKAGE_NAME}).catch(e=>setError(errorMessage(e)));

  return <Panel>
    <Text accessibilityRole="header" style={s.title}>{a("Google Play purchases")}</Text>
    {!signedIn&&<View style={s.warning}><Text style={s.warningTitle}>{a("ACCOUNT REQUIRED")}</Text><Text style={s.body}>{a("Secure your guest account or sign in before buying. Purchases are bound to that VELDRYN account for safe restore.")}</Text></View>}
    {!connected&&<Text style={s.muted}>{a("Connecting to Google Play Billing…")}</Text>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{accountError(language,error,'Google Play billing could not complete that request.')}</Text>}
    {!!notice&&<Text accessibilityRole="alert" style={s.success}>{a(notice)}</Text>}
    <CommerceCatalog language={language} owned={benefits} ready={!busy&&!refreshing&&signedIn&&!!context&&connected}
      price={id=>id==='supporter_monthly'?subscriptionPrice(sub,offer):productPrice(byId(id))}
      available={id=>id==='supporter_monthly'?!!offer?.offerTokenAndroid:!!byId(id)}
      onBuy={id=>void buy(id)}/>
    <GameButton compact title={a("Manage Supporter in Google Play")} tone="secondary" disabled={busy||!signedIn} onPress={manageSupporter}/>
    <GameButton compact title={refreshing?a("Refreshing purchases…"):a("Refresh purchases")} tone="secondary" disabled={busy||refreshing||!signedIn} onPress={()=>void refresh()}/>
    <GameButton compact title={busy?a("Checking purchases…"):a("Restore purchases")} tone="secondary" disabled={busy||refreshing||!signedIn} onPress={()=>void restore()}/>
    <Text style={s.foot}>{a("VIP and VIP+ are one-time purchases. Supporter stacks with them while the subscription is active. There are no ads and no paid PvP power.")}</Text>
  </Panel>;
}

function styles(C:ThemeColors){return StyleSheet.create({
  title:{...typography.title,color:C.text},
  body:{color:C.muted,lineHeight:20,marginTop:spacing.xs},
  muted:{color:C.muted,fontSize:12,lineHeight:17},
  error:{color:C.bad,lineHeight:19,marginTop:spacing.sm},
  success:{color:C.good,lineHeight:19,marginTop:spacing.sm},
  warning:{borderWidth:1,borderColor:C.warning,borderRadius:8,padding:spacing.sm,marginTop:spacing.sm},
  warningTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.8},
  foot:{...typography.caption,color:C.muted,lineHeight:17,marginTop:spacing.sm},
})}
