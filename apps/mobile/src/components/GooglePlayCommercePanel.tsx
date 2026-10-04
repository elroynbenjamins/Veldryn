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
import {commerceEntitlementsMatchState,currentCommerceEntitlements,purchaseEligibilityError,type CommerceEntitlementSnapshot} from '../core/commerce-presentation';
import {
  COMMERCE_PRODUCTS,
  GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS,
  GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS,
  PLAY_BILLING_PACKAGE_NAME,
  type CommerceProductId,
} from '../content/commerce-products';
import {
  applyServerCommerceEntitlements,
  googlePlayBillingErrorMessage,
  loadAccountCommerceEntitlements,
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

type Props={state:GameState;onChange:(next:GameState)=>void;online?:boolean;onRefreshCommerce?:(expectedAccountId:string)=>Promise<void>};

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

function AndroidGooglePlayCommercePanel({state,onChange,online=false,onRefreshCommerce}:Props){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),auth=useAuthSession();
  const accountId=auth.session?.user.is_anonymous?undefined:auth.session?.user.id;
  const viewerRef=useRef(accountId);viewerRef.current=accountId;
  useEffect(()=>{viewerRef.current=accountId;return()=>{viewerRef.current=undefined;};},[accountId]);
  const stateRef=useRef(state);stateRef.current=state;
  const onChangeRef=useRef(onChange);onChangeRef.current=onChange;
  const onlineRef=useRef(online);onlineRef.current=online;
  const onRefreshCommerceRef=useRef(onRefreshCommerce);onRefreshCommerceRef.current=onRefreshCommerce;
  const [snapshot,setSnapshot]=useState<{accountId:string;context:GooglePlayBillingContext}>();
  const context=snapshot&&snapshot.accountId===accountId?snapshot.context:undefined;
  const [ownership,setOwnership]=useState<CommerceEntitlementSnapshot>();
  const [ownershipChecking,setOwnershipChecking]=useState(false),[ownershipError,setOwnershipError]=useState('');
  const ownershipRevision=useRef(0);
  const [ownershipClock,setOwnershipClock]=useState(Date.now);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const busyRef=useRef(false),refreshingRef=useRef(false);
  const purchaseRevision=useRef(0);
  const verifyingTokens=useRef(new Set<string>());
  const benefits=currentCommerceEntitlements(ownership,accountId,Math.max(Date.now(),ownershipClock));
  const acceptOwnership=useCallback((entitlements:GooglePlayBillingContext['entitlements'],owner:string)=>{
    if(viewerRef.current!==owner)return;
    ++ownershipRevision.current;
    setOwnership({accountId:owner,entitlements});setOwnershipClock(Date.now());setOwnershipChecking(false);setOwnershipError('');
  },[]);
  const syncGameplay=useCallback(async(result:{entitlements:GooglePlayBillingContext['entitlements']},owner:string,onlyIfChanged=false)=>{
    if(viewerRef.current!==owner||(onlyIfChanged&&commerceEntitlementsMatchState(stateRef.current,result.entitlements)))return;
    if(onlineRef.current){
      // Gameplay reloads its own server snapshot; paid flags never go through a local save.
      const refreshGameplay=onRefreshCommerceRef.current;
      if(!refreshGameplay)throw new Error('Could not load account benefits. Please try again.');
      await refreshGameplay(owner);
    }else{
      const next=applyServerCommerceEntitlements(stateRef.current,result);
      stateRef.current=next;onChangeRef.current(next);
    }
  },[]);
  const refreshOwnership=useCallback(async()=>{
    const owner=viewerRef.current;if(!owner)return;
    const revision=++ownershipRevision.current;
    const current=()=>viewerRef.current===owner&&ownershipRevision.current===revision;
    setOwnershipChecking(true);setOwnershipError('');
    try{
      const entitlements=await loadAccountCommerceEntitlements(owner);
      if(current()){
        setOwnership({accountId:owner,entitlements});setOwnershipClock(Date.now());
        await syncGameplay({entitlements},owner,true);
      }
    }catch(e){if(current())setOwnershipError(googlePlayBillingErrorMessage(e));}
    finally{if(current())setOwnershipChecking(false);}
  },[syncGameplay]);
  const apply=useCallback(async(result:{entitlements:GooglePlayBillingContext['entitlements']},owner:string)=>{
    if(viewerRef.current!==owner)return;
    acceptOwnership(result.entitlements,owner);
    await syncGameplay(result,owner);
  },[acceptOwnership,syncGameplay]);

  useEffect(()=>{
    const expiry=Date.parse(ownership?.entitlements.supporterExpiresAt??'');
    if(!Number.isFinite(expiry)||expiry<=Date.now()||!ownership?.entitlements.supporter)return;
    const timer=setTimeout(()=>{setOwnershipClock(Date.now());void refreshOwnership();},Math.min(expiry-Date.now()+1,2_147_483_647));
    return()=>clearTimeout(timer);
  },[ownership,ownershipClock,refreshOwnership]);

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
      const result=await verifyGooglePlayPurchase(purchase,owner);
      if(viewerRef.current!==owner||purchaseRevision.current!==revision)return;
      await apply(result,owner);
      if(viewerRef.current!==owner||purchaseRevision.current!==revision)return;
      setNotice('Purchase verified by Google Play and applied to your VELDRYN account.');
    }catch(e){if(viewerRef.current===owner&&purchaseRevision.current===revision)setError(googlePlayBillingErrorMessage(e))}
    finally{if(token)verifyingTokens.current.delete(token);if(viewerRef.current===owner&&purchaseRevision.current===revision){busyRef.current=false;setBusy(false)}}
  },[apply]);

  const {connected,products,subscriptions,fetchProducts,requestPurchase,reconnect}=useIAP({
    onPurchaseSuccess:(purchase)=>{void handlePurchase(purchase)},
    onPurchaseError:(purchaseError)=>{if(!viewerRef.current)return;busyRef.current=false;setBusy(false);setError(purchaseError.code===ErrorCode.UserCancelled?'':googlePlayBillingErrorMessage(purchaseError));if(purchaseError.code===ErrorCode.UserCancelled)setNotice('Purchase cancelled.');},
    onError:(generalError)=>{if(!viewerRef.current)return;busyRef.current=false;setBusy(false);setError(googlePlayBillingErrorMessage(generalError))},
  });

  useEffect(()=>{
    if(!connected)return;
    void (async()=>{
      try{
        await fetchProducts({skus:[...GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS],type:'in-app'});
        await fetchProducts({skus:[...GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS],type:'subs'});
      }catch(e){setError(googlePlayBillingErrorMessage(e))}
    })();
  },[connected,fetchProducts]);

  const refresh=useCallback(async()=>{
    const owner=viewerRef.current;
    if(!owner||busyRef.current||refreshingRef.current)return;
    const revision=purchaseRevision.current;
    const current=()=>viewerRef.current===owner&&purchaseRevision.current===revision;
    refreshingRef.current=true;setRefreshing(true);setError('');
    // Account ownership remains readable even if Play verification is unavailable.
    const ownershipRead=refreshOwnership();
    try{
      const next=await loadGooglePlayBillingContext(owner);
      if(!current())return;
      setSnapshot({accountId:owner,context:next});
      if(next.checkoutAvailable===false){setError('Google Play purchases are temporarily unavailable. Your active benefits are unchanged.');return;}
      await refreshGooglePlayEntitlements(owner);
      if(!current())return;
      await refreshOwnership();
      // Recover completed payments even if the app was closed before its callback.
      if(connected){
        const purchases=await getAvailablePurchases({includeSuspendedAndroid:true});
        if(!current())return;
        const ownedPurchases=purchases.filter(row=>row.store==='google'&&'obfuscatedAccountIdAndroid' in row&&row.obfuscatedAccountIdAndroid===next.obfuscatedAccountId&&row.purchaseState==='purchased');
        if(ownedPurchases.length){const restored=await restoreGooglePlayPurchases(ownedPurchases,owner);if(current())await apply(restored,owner);}
      }
    }catch(e){if(current())setError(googlePlayBillingErrorMessage(e))}
    finally{await ownershipRead;refreshingRef.current=false;if(viewerRef.current===owner)setRefreshing(false);}
  },[apply,connected,refreshOwnership]);

  useEffect(()=>{
    setSnapshot(undefined);setOwnership(undefined);setOwnershipError('');setError('');setNotice('');busyRef.current=false;setBusy(false);
  },[accountId]);
  useEffect(()=>{
    void refresh();
    const listener=AppState.addEventListener('change',next=>{if(next==='active')void refresh();});
    const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},60_000);
    return ()=>{listener.remove();clearInterval(timer);};
  },[accountId,refresh]);
  const entitlementFingerprint=JSON.stringify(state.account.entitlements??{});
  const lastEntitlementFingerprint=useRef(entitlementFingerprint);
  useEffect(()=>{
    if(lastEntitlementFingerprint.current===entitlementFingerprint)return;
    lastEntitlementFingerprint.current=entitlementFingerprint;
    // A redemption/gameplay update triggers a fresh read; local flags are never ownership evidence.
    void refreshOwnership();
  },[entitlementFingerprint,refreshOwnership]);

  const byId=(id:string)=>products.find(product=>product.id===id);
  const sub=subscriptions.find(product=>product.id==='supporter_monthly');
  const offer=recurringOffer(sub);
  const signedIn=Boolean(auth.session&&!auth.session.user.is_anonymous);

  const buy=async(id:CommerceProductId)=>{
    if(busyRef.current||refreshingRef.current)return;
    if(!signedIn){setError('Secure or sign in to your VELDRYN account before purchasing.');return}
    if(!context||context.checkoutAvailable===false){setError('Google Play purchases are temporarily unavailable. Your active benefits are unchanged.');return}
    if(!benefits){setOwnershipError('Could not load account benefits. Please try again.');return;}
    const owner=accountId!;
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{
      if(!connected&&!(await reconnect()))throw new Error('Google Play Billing is unavailable right now.');
      const definition=COMMERCE_PRODUCTS.find(row=>row.id===id);
      if(!definition)throw new Error('Unknown product.');
      const issue=purchaseEligibilityError(id,benefits);
      if(issue)throw new Error(issue);
      if(definition.playProductType==='in-app'&&!byId(id))throw new Error('This product is not currently available from Google Play.');
      const prepared=await prepareGooglePlayPurchase(id,owner);
      if(viewerRef.current!==owner)return;
      setSnapshot({accountId:owner,context:prepared});acceptOwnership(prepared.entitlements,owner);
      if(prepared.checkoutAvailable===false)throw new Error('Google Play purchases are temporarily unavailable. Your active benefits are unchanged.');
      const confirmedIssue=purchaseEligibilityError(id,prepared.entitlements);
      if(confirmedIssue)throw new Error(confirmedIssue);
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
    }catch(e){if(viewerRef.current===owner){setError(googlePlayBillingErrorMessage(e));busyRef.current=false;setBusy(false)}}
  };

  const restore=async()=>{
    if(busyRef.current||refreshingRef.current||!accountId)return;
    const owner=accountId;
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{
      const purchases=await getAvailablePurchases({includeSuspendedAndroid:true});
      if(viewerRef.current!==owner)return;
      const result=await restoreGooglePlayPurchases(purchases,owner);
      if(viewerRef.current!==owner)return;
      await apply(result,owner);
      if(viewerRef.current!==owner)return;
      const count=result.verifiedProductIds.length;
      setNotice(count?('Restored '+count+' Google Play purchases.'):a("No restorable VELDRYN purchases were found for this Google Play account."));
    }catch(e){if(viewerRef.current===owner)setError(googlePlayBillingErrorMessage(e))}
    finally{if(viewerRef.current===owner){busyRef.current=false;setBusy(false)}}
  };

  const manageSupporter=()=>void deepLinkToSubscriptions({skuAndroid:'supporter_monthly',packageNameAndroid:PLAY_BILLING_PACKAGE_NAME}).catch(e=>setError(googlePlayBillingErrorMessage(e)));

  return <Panel>
    <Text accessibilityRole="header" style={s.title}>{a("Google Play purchases")}</Text>
    {!signedIn&&<View style={s.warning}><Text style={s.warningTitle}>{a("ACCOUNT REQUIRED")}</Text><Text style={s.body}>{a("Secure your guest account or sign in before buying. Purchases are bound to that VELDRYN account for safe restore.")}</Text></View>}
    {!connected&&<Text style={s.muted}>{a("Connecting to Google Play Billing…")}</Text>}
    {!!ownershipError&&<Text accessibilityRole="alert" style={s.error}>{accountError(language,ownershipError,'Could not load account benefits. Please try again.')}</Text>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{accountError(language,error,'Google Play billing could not complete that request.')}</Text>}
    {!!notice&&<Text accessibilityRole="alert" style={s.success}>{a(notice)}</Text>}
    <CommerceCatalog language={language} owned={benefits} checking={ownershipChecking} ready={!busy&&!refreshing&&!ownershipChecking&&signedIn&&!!context&&context.checkoutAvailable!==false&&connected}
      price={id=>id==='supporter_monthly'?subscriptionPrice(sub,offer):productPrice(byId(id))}
      available={id=>id==='supporter_monthly'?!!offer?.offerTokenAndroid:!!byId(id)}
      onBuy={id=>void buy(id)}/>
    <Text style={s.muted}>{a("Owned and active benefits include redeemed codes.")}</Text>
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
