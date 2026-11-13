import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View,type ScrollViewInstance} from 'react-native';
import {GooglePlayCommercePanel} from '../components/GooglePlayCommercePanel';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {BoardTabs} from '../components/BoardTabs';
import {StoreCollectionsPreview} from '../components/StoreCollectionsPreview';
import type {GameState} from '../core/types';
import {accountText} from '../i18n/account';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

type Props={
 state:GameState;
 onChange:(next:GameState)=>void;
 online?:boolean;
 onRefreshCommerce?:(expectedAccountId:string)=>Promise<void>;
 onRedeemCode?:(code:string)=>Promise<string|void>|string|void;
};
type StoreSection='Memberships'|'Collections';
// Keep the concept implemented, but hide the unfinished Collections tab until release.
const STORE_COLLECTIONS_VISIBLE=false;

/** Store remains independent of Settings. Billing stays mounted when switching
 * categories so purchase and restoration callbacks are never lost. */
export function StoreScreen({state,onChange,online=false,onRefreshCommerce,onRedeemCode}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const a=(text:string)=>accountText(state.settings.language,text);
 const [section,setSection]=useState<StoreSection>('Memberships');
 const scrollRef=useRef<ScrollViewInstance>(null);
 const changeSection=(next:StoreSection)=>{setSection(next);scrollRef.current?.scrollTo({y:0,animated:false});};
 const [showPromoCode,setShowPromoCode]=useState(false);
 const [code,setCode]=useState(''),[status,setStatus]=useState(''),[redeeming,setRedeeming]=useState(false);
 const redeemFlight=useRef(false);
 const redeem=async()=>{
  const normalized=code.trim().toUpperCase();
  if(!normalized||redeemFlight.current||!onRedeemCode)return;
  redeemFlight.current=true;setStatus('');setRedeeming(true);
  try{
   const result=await onRedeemCode(normalized);
   setStatus(result??a('Code submitted.'));
   setCode('');
  }catch(error){setStatus(error instanceof Error?error.message:a('Unable to redeem this code.'));}
  finally{redeemFlight.current=false;setRedeeming(false);}
 };
 return <ScrollView ref={scrollRef} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={s.hero}>
   <View pointerEvents="none" style={s.heroAccent}><Text style={[s.heroSymbol,{color:C.accentSoft}]}>✦</Text></View>
   <Text style={s.eyebrow}>{a('SUPPORT THE ADVENTURE')}</Text>
   <Text accessibilityRole="header" style={s.heroTitle}>{a('The Realm Store')}</Text>
   <Text style={s.heroDescription}>{a('Permanent upgrades and optional Supporter benefits.')}</Text>
   <Text style={s.heroFooter}>{a('NO PAID PREMIUM CURRENCY · NO PAID PVP POWER')}</Text>
  </View>
  {STORE_COLLECTIONS_VISIBLE?<BoardTabs compact label="Store categories" items={[{id:'Memberships',label:'Memberships'},{id:'Collections',label:'Collections · Concept'}] as const} value={section} onChange={changeSection}/>:null}
  <View style={section==='Memberships'?s.visible:s.hidden}>
   <GooglePlayCommercePanel state={state} onChange={onChange} online={online} onRefreshCommerce={onRefreshCommerce}/>
   <Panel>
    <Pressable accessibilityRole="button" accessibilityLabel={a('Redeem code')} accessibilityState={{expanded:showPromoCode}} onPress={()=>setShowPromoCode(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
     <Text style={s.disclosureTitle}>{a('Redeem code')}</Text>
     <Text style={s.disclosureArrow}>{showPromoCode?'−':'+'}</Text>
    </Pressable>
    {showPromoCode?<View style={s.redeemContent}>
     <Text style={s.redeemDescription}>{a('Enter a promotional code from an official VELDRYN announcement or event.')}</Text>
     <View style={s.redeemRow}>
      <TextInput accessibilityLabel={a('Redeem code')} autoCapitalize="characters" autoCorrect={false} maxLength={64} value={code} onChangeText={value=>{setCode(value.replace(/\s/g,''));setStatus('')}} placeholder={a('ENTER CODE')} placeholderTextColor={C.muted} style={s.codeInput}/>
      <GameButton compact loading={redeeming} title={redeeming?a('Checking…'):a('Redeem')} disabled={!code.trim()||redeeming||!onRedeemCode} onPress={()=>void redeem()}/>
     </View>
     {!onRedeemCode?<Text style={s.redeemStatus}>{a('Code redemption will be available when Live-Ops redemption is enabled.')}</Text>:null}
     {status?<Text accessibilityLiveRegion="polite" style={[s.redeemStatus,{color:C.info}]}>{status}</Text>:null}
    </View>:null}
   </Panel>
  </View>
  {STORE_COLLECTIONS_VISIBLE&&section==='Collections'?<StoreCollectionsPreview/>:null}
 </ScrollView>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:12,paddingBottom:110},
 visible:{gap:12},hidden:{display:'none'},
 hero:{position:'relative',overflow:'hidden',gap:7,padding:15,minHeight:146,borderRadius:12,borderWidth:1,borderColor:C.warning,backgroundColor:C.panelRaised},
 heroAccent:{position:'absolute',right:-8,top:-42,opacity:.12},
 heroSymbol:{fontSize:160,lineHeight:170,fontWeight:'900'},
 eyebrow:{fontSize:10,lineHeight:15,letterSpacing:1.1,fontWeight:'900',color:C.warning},
 heroTitle:{fontSize:23,lineHeight:30,fontWeight:'800',color:C.text,maxWidth:285},
 heroDescription:{fontSize:12,lineHeight:18,color:C.muted,maxWidth:310},
 heroFooter:{fontSize:9,lineHeight:14,fontWeight:'800',letterSpacing:.55,color:C.good,marginTop:3},
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 disclosureTitle:{...typography.bodyStrong,color:C.text},
 disclosureArrow:{fontSize:18,fontWeight:'800',color:C.accent},
 redeemContent:{gap:8,paddingTop:9,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 redeemDescription:{...typography.caption,color:C.muted,lineHeight:18},
 redeemRow:{flexDirection:'row',alignItems:'center',gap:8},
 codeInput:{flex:1,minWidth:0,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:12,fontSize:15,fontWeight:'700',letterSpacing:1,color:C.text,backgroundColor:C.inputBg},
 redeemStatus:{...typography.caption,color:C.muted,lineHeight:17},
 pressed:{opacity:.76},
});}
