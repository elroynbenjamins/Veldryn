import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Platform,StyleSheet,Text,View} from 'react-native';
import {
  deepLinkToSubscriptions,
  getAvailablePurchases,
  useIAP,
  type Product,
  type ProductSubscription,
  type Purchase,
  type SubscriptionOffer,
} from 'expo-iap';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {accountEntitlementBenefits} from '../core/account-entitlements';
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
    ??offers.find(offer=>offer.basePlanIdAndroid==='monthly')
    ??offers[0];
}

function productPrice(product:Product|undefined){return product?.displayPrice||'Loading Play price…'}
function subscriptionPrice(product:ProductSubscription|undefined,offer:SubscriptionOffer|undefined){
  return offer?.displayPrice||product?.displayPrice||'Loading Play price…';
}

export function GooglePlayCommercePanel(props:Props){
  if(Platform.OS!=='android')return <NonAndroidCommercePanel/>;
  return <AndroidGooglePlayCommercePanel {...props}/>;
}

function NonAndroidCommercePanel(){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  return <Panel><Text style={s.title}>Google Play purchases</Text><Text style={s.body}>VIP, VIP+ and Supporter purchases are available in the Android Google Play build.</Text></Panel>;
}

function AndroidGooglePlayCommercePanel({state,onChange}:Props){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),auth=useAuthSession();
  const stateRef=useRef(state);useEffect(()=>{stateRef.current=state},[state]);
  const [context,setContext]=useState<GooglePlayBillingContext>();
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const benefits=accountEntitlementBenefits(state);
  const apply=useCallback((result:{entitlements:GooglePlayBillingContext['entitlements']})=>{
    const next=applyServerCommerceEntitlements(stateRef.current,result);
    stateRef.current=next;onChange(next);
  },[onChange]);

  const handlePurchase=useCallback(async(purchase:Purchase)=>{
    if(purchase.purchaseState==='pending'){setBusy(false);setNotice('Payment pending. Benefits will activate automatically after Google Play confirms payment.');return}
    if(purchase.purchaseState!=='purchased')return;
    setBusy(true);setError('');setNotice('');
    try{
      const result=await verifyGooglePlayPurchase(purchase);
      apply(result);
      setNotice('Purchase verified by Google Play and applied to your VELDRYN account.');
    }catch(e){setError(errorMessage(e))}
    finally{setBusy(false)}
  },[apply]);

  const {connected,products,subscriptions,fetchProducts,requestPurchase,reconnect}=useIAP({
    onPurchaseSuccess:(purchase)=>{void handlePurchase(purchase)},
    onPurchaseError:(purchaseError)=>{setBusy(false);setError(purchaseError.message)},
    onError:(generalError)=>{setBusy(false);setError(generalError.message)},
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

  useEffect(()=>{
    const user=auth.session?.user;
    if(!user||user.is_anonymous){setContext(undefined);return}
    void (async()=>{
      try{
        const next=await loadGooglePlayBillingContext();
        setContext(next);apply(next);
        const refreshed=await refreshGooglePlayEntitlements();
        apply(refreshed);
      }catch(e){setError(errorMessage(e))}
    })();
  },[auth.session?.user.id,auth.session?.user.is_anonymous,apply]);

  const byId=(id:string)=>products.find(product=>product.id===id);
  const sub=subscriptions.find(product=>product.id==='supporter_monthly');
  const offer=recurringOffer(sub);
  const signedIn=Boolean(auth.session&&!auth.session.user.is_anonymous);

  const buy=async(id:CommerceProductId)=>{
    if(busy)return;
    if(!signedIn||!context){setError('Secure or sign in to your VELDRYN account before purchasing.');return}
    setBusy(true);setError('');setNotice('');
    try{
      if(!connected&&!(await reconnect()))throw new Error('Google Play Billing is unavailable right now.');
      const definition=COMMERCE_PRODUCTS.find(row=>row.id===id);
      if(!definition)throw new Error('Unknown product.');
      if(definition.playProductType==='subs'){
        const selected=recurringOffer(sub);
        if(!selected?.offerTokenAndroid)throw new Error('The monthly Supporter plan is not available for this Google Play account.');
        await requestPurchase({type:'subs',request:{google:{
          skus:[definition.playProductId],
          subscriptionOffers:[{sku:definition.playProductId,offerToken:selected.offerTokenAndroid}],
          obfuscatedAccountId:context.obfuscatedAccountId,
        }}});
      }else{
        await requestPurchase({type:'in-app',request:{google:{
          skus:[definition.playProductId],
          obfuscatedAccountId:context.obfuscatedAccountId,
        }}});
      }
    }catch(e){setError(errorMessage(e));setBusy(false)}
  };

  const restore=async()=>{
    if(busy||!signedIn)return;
    setBusy(true);setError('');setNotice('');
    try{
      const purchases=await getAvailablePurchases({includeSuspendedAndroid:true});
      const result=await restoreGooglePlayPurchases(purchases);
      apply(result);
      const count=result.verifiedProductIds.length;
      setNotice(count?('Restored '+count+' Google Play purchase'+(count===1?'':'s')+'.'):'No restorable VELDRYN purchases were found for this Google Play account.');
    }catch(e){setError(errorMessage(e))}
    finally{setBusy(false)}
  };

  const manageSupporter=()=>void deepLinkToSubscriptions({skuAndroid:'supporter_monthly',packageNameAndroid:PLAY_BILLING_PACKAGE_NAME}).catch(e=>setError(errorMessage(e)));
  const vipPlusSku:CommerceProductId=benefits.vip&&!benefits.vipPlus?'vip_plus_upgrade':'vip_plus';

  return <Panel>
    <Text accessibilityRole="header" style={s.title}>Google Play purchases</Text>
    <Text style={s.body}>Prices are loaded directly from Google Play for your country and Play account. VELDRYN does not hardcode a currency or regional price.</Text>
    {!signedIn&&<View style={s.warning}><Text style={s.warningTitle}>ACCOUNT REQUIRED</Text><Text style={s.body}>Secure your guest account or sign in before buying. Purchases are bound to that VELDRYN account for safe restore.</Text></View>}
    {!connected&&<Text style={s.muted}>Connecting to Google Play Billing…</Text>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!notice&&<Text accessibilityRole="alert" style={s.success}>{notice}</Text>}
    <View style={s.products}>
      <CommerceRow
        title="VIP · permanent"
        description={COMMERCE_PRODUCTS.find(row=>row.id==='vip')!.description}
        price={productPrice(byId('vip'))}
        status={benefits.vip?'Owned':undefined}
        disabled={busy||!signedIn||!context||benefits.vip}
        action={benefits.vip?'Owned':'Buy VIP'}
        onPress={()=>void buy('vip')}
      />
      <CommerceRow
        title={benefits.vip&&!benefits.vipPlus?'VIP+ Upgrade · permanent':'VIP+ · permanent'}
        description={COMMERCE_PRODUCTS.find(row=>row.id===vipPlusSku)!.description}
        price={productPrice(byId(vipPlusSku))}
        status={benefits.vipPlus?'Owned':undefined}
        disabled={busy||!signedIn||!context||benefits.vipPlus}
        action={benefits.vipPlus?'Owned':benefits.vip?'Upgrade to VIP+':'Buy VIP+'}
        onPress={()=>void buy(vipPlusSku)}
      />
      <CommerceRow
        title="Supporter · subscription"
        description={COMMERCE_PRODUCTS.find(row=>row.id==='supporter_monthly')!.description}
        price={subscriptionPrice(sub,offer)}
        status={benefits.supporter?'Active':undefined}
        disabled={busy||!signedIn||!context||benefits.supporter||!offer?.offerTokenAndroid}
        action={benefits.supporter?'Active':'Subscribe'}
        onPress={()=>void buy('supporter_monthly')}
      />
    </View>
    {benefits.supporter&&<GameButton compact title="Manage Supporter in Google Play" tone="secondary" onPress={manageSupporter}/>}
    <GameButton compact title={busy?'Checking purchases…':'Restore purchases'} tone="secondary" disabled={busy||!signedIn} onPress={()=>void restore()}/>
    <Text style={s.foot}>VIP and VIP+ are one-time purchases. Supporter stacks with them while the subscription is active. There are no ads and no paid PvP power.</Text>
  </Panel>;
}

function CommerceRow({title,description,price,status,action,disabled,onPress}:{title:string;description:string;price:string;status?:string;action:string;disabled:boolean;onPress:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  return <View style={s.row}><View style={s.flex}><View style={s.rowHead}><Text style={s.productTitle}>{title}</Text>{status?<Text style={s.status}>{status}</Text>:null}</View><Text style={s.price}>{price}</Text><Text style={s.muted}>{description}</Text></View><GameButton compact title={action} disabled={disabled} onPress={onPress}/></View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
  title:{...typography.title,color:C.text},
  body:{color:C.muted,lineHeight:20,marginTop:spacing.xs},
  muted:{color:C.muted,fontSize:12,lineHeight:17},
  products:{gap:spacing.sm,marginVertical:spacing.sm},
  row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderColor:C.line},
  rowHead:{flexDirection:'row',alignItems:'center',gap:spacing.xs,flexWrap:'wrap'},
  flex:{flex:1,minWidth:0},
  productTitle:{...typography.bodyStrong,color:C.text},
  price:{color:C.good,fontWeight:'900',marginTop:3},
  status:{color:C.good,fontSize:11,fontWeight:'900',textTransform:'uppercase'},
  error:{color:C.bad,lineHeight:19,marginTop:spacing.sm},
  success:{color:C.good,lineHeight:19,marginTop:spacing.sm},
  warning:{borderWidth:1,borderColor:C.warning,borderRadius:8,padding:spacing.sm,marginTop:spacing.sm},
  warningTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.8},
  foot:{...typography.caption,color:C.muted,lineHeight:17,marginTop:spacing.sm},
})}
