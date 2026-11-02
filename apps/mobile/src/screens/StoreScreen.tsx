import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GooglePlayCommercePanel} from '../components/GooglePlayCommercePanel';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
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

/** Store belongs to the Account hub, not Settings. Purchase ownership stays server-authoritative. */
export function StoreScreen({state,onChange,online=false,onRefreshCommerce,onRedeemCode}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const a=(text:string)=>accountText(state.settings.language,text);
 const [showPromoCode,setShowPromoCode]=useState(false);
 const [code,setCode]=useState(''),[status,setStatus]=useState(''),[redeeming,setRedeeming]=useState(false);
 const redeem=async()=>{
  const normalized=code.trim().toUpperCase();
  if(!normalized||redeeming||!onRedeemCode)return;
  setStatus('');setRedeeming(true);
  try{
   const result=await onRedeemCode(normalized);
   setStatus(result??a('Code submitted.'));
   setCode('');
  }catch(error){setStatus(error instanceof Error?error.message:a('Unable to redeem this code.'));}
  finally{setRedeeming(false);}
 };
 return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <GooglePlayCommercePanel state={state} onChange={onChange} online={online} onRefreshCommerce={onRefreshCommerce}/>
  <Panel>
   <Pressable accessibilityRole="button" accessibilityLabel={a('Redeem code')} accessibilityState={{expanded:showPromoCode}} onPress={()=>setShowPromoCode(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
    <Text style={s.disclosureTitle}>{a('Redeem code')}</Text>
    <Text style={s.disclosureArrow}>{showPromoCode?'−':'+'}</Text>
   </Pressable>
   {showPromoCode?<View style={s.redeemContent}>
    <Text style={s.redeemDescription}>{a('Enter a promotional code from an official VELDRYN announcement or event.')}</Text>
    <View style={s.redeemRow}>
     <TextInput accessibilityLabel={a('Redeem code')} autoCapitalize="characters" autoCorrect={false} value={code} onChangeText={value=>{setCode(value.replace(/\s/g,''));setStatus('')}} placeholder={a('ENTER CODE')} placeholderTextColor={C.muted} style={s.codeInput}/>
     <GameButton compact loading={redeeming} title={redeeming?a('Checking…'):a('Redeem')} disabled={!code.trim()||redeeming||!onRedeemCode} onPress={()=>void redeem()}/>
    </View>
    {!onRedeemCode?<Text style={s.redeemStatus}>{a('Code redemption will be available when Live-Ops redemption is enabled.')}</Text>:null}
    {status?<Text accessibilityLiveRegion="polite" style={[s.redeemStatus,{color:C.info}]}>{status}</Text>:null}
   </View>:null}
  </Panel>
 </ScrollView>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:10,paddingBottom:110},
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 disclosureTitle:{...typography.bodyStrong,color:C.text},
 disclosureArrow:{fontSize:18,fontWeight:'800',color:C.accent},
 redeemContent:{gap:8,paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 redeemDescription:{...typography.caption,color:C.muted,lineHeight:18},
 redeemRow:{flexDirection:'row',alignItems:'center',gap:8},
 codeInput:{flex:1,minWidth:0,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:12,fontSize:15,fontWeight:'700',letterSpacing:1,color:C.text,backgroundColor:C.inputBg},
 redeemStatus:{...typography.caption,color:C.muted,lineHeight:17},
 pressed:{opacity:.76},
});}
