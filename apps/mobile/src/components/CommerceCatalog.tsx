import {useMemo,useState} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {accountText} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {CommerceProductRow} from './CommerceProductRow';
import {CommerceProductBadge} from './CommerceProductBadge';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {COMMERCE_PRODUCT_BONUSES,commerceProduct,type CommerceProductId} from '../content/commerce-products';
import type {ServerCommerceEntitlements} from '../core/account-entitlements';
import {premiumProductRows} from '../core/commerce-presentation';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,type ThemeColors} from '../theme/theme';

export function CommerceCatalog({language:languageOverride,owned,checking=false,ready,signedIn=true,reduceMotion=false,price,available,onBuy}:{language?:Language;
 owned:ServerCommerceEntitlements|undefined;checking?:boolean;ready:boolean;signedIn?:boolean;reduceMotion?:boolean;
 price:(id:CommerceProductId)=>string;
 available:(id:CommerceProductId)=>boolean;
 onBuy:(id:CommerceProductId)=>void;
}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const {width,height,fontScale}=useWindowDimensions();
 const twoColumns=width>=390&&fontScale<1.35;
 const [selected,setSelected]=useState<CommerceProductId|null>(null);
 const rows=premiumProductRows(owned,checking);
 const permanent=rows.filter(row=>row.id!=='supporter_monthly');
 const supporter=rows.find(row=>row.id==='supporter_monthly')!;
 const active=rows.filter(row=>row.owned).length;
 const current=selected?rows.find(row=>row.id===selected):undefined;
 const definition=selected?commerceProduct(selected):undefined;
 const bonuses=selected?COMMERCE_PRODUCT_BONUSES[selected]:undefined;
 const disabled=!current||!ready||!current.confirmed||current.owned||!available(current.id);
 const reason=!signedIn?'Secure your account or sign in before purchasing.'
   :!owned?'Ownership must be checked before checkout.'
   :!available(current?.id??'vip')?'This product is not currently available from Google Play.'
   :!ready?'Checkout is unavailable while purchases are being checked.'
   :null;
 const rowPrice=(row:typeof rows[number])=>row.owned?(row.id==='supporter_monthly'?supporterExpiry(owned?.supporterExpiresAt,language):a('Permanent access')):a(price(row.id));
 const confirm=()=>{if(!current||disabled)return;const id=current.id;setSelected(null);onBuy(id);};
 return <View style={s.root}>
  <View style={[s.ownership,{backgroundColor:C.panelRaised,borderColor:C.lineStrong}]}>
   <View style={s.between}><View style={s.flex}><Text style={s.eyebrow}>YOUR ACCOUNT BENEFITS</Text><Text style={s.ownershipText}>{!signedIn?'Secure your account to buy':!owned?'Checking verified ownership…':active?'Your active and permanent upgrades':'Your adventure starts here'}</Text></View>
    <Text style={[s.count,{color:owned?C.good:C.muted}]}>{owned?`${active}/3`:'—'}</Text>
   </View>
   <View style={s.chips}>{rows.map(row=><View key={row.id} style={[s.chip,{borderColor:row.owned?C.good:C.line,backgroundColor:row.owned?C.goodSurface:C.panel2}]}><Text style={[s.chipText,{color:row.owned?C.good:C.muted}]}>{!owned?'○':row.owned?'✓':'○'} {row.title}</Text></View>)}</View>
  </View>
  <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Permanent Upgrades</Text><Text style={s.copy}>One-time purchases · VIP and VIP+ stack</Text></View>
  <View style={[s.permanent,twoColumns&&s.twoColumns]}>{permanent.map(row=><View key={row.id} style={twoColumns?s.column:undefined}>
   <CommerceProductRow productId={row.id} price={rowPrice(row)} owned={row.owned} confirmed={row.confirmed} compact={twoColumns} onDetails={()=>setSelected(row.id)}/>
  </View>)}</View>
  <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Monthly Supporter</Text><Text style={s.copy}>Additional benefits while active · Stacks with permanent upgrades</Text></View>
  <CommerceProductRow productId={supporter.id} price={rowPrice(supporter)} owned={supporter.owned} confirmed={supporter.confirmed} onDetails={()=>setSelected(supporter.id)}/>

  <GameModalSurface visible={selected!==null} presentation="sheet" reduceMotion={reduceMotion} onClose={()=>setSelected(null)}>
   {current&&definition&&bonuses?<View style={s.modalShell}>
    <GameModalHeader eyebrow={definition.billing==='subscription'?'MONTHLY SUBSCRIPTION':'ONE-TIME UPGRADE'} title={definition.name} onClose={()=>setSelected(null)}/>
    <ScrollView style={{maxHeight:Math.max(180,height*.46)}} contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     <View style={[s.modalHero,{borderColor:C.lineStrong,backgroundColor:C.panelRaised}]}>
      <View style={[s.modalIcon,{borderColor:current.id==='supporter_monthly'?C.warning:current.id==='vip_plus'?C.special:C.info,backgroundColor:C.panel2}]}>
       <CommerceProductBadge productId={current.id} size={52}/>
      </View>
      <View style={s.flex}><Text style={s.modalTitle}>{definition.name}</Text><Text style={s.copy}>{definition.description}</Text></View>
     </View>
     <View style={s.between}><Text style={s.modalHeading}>Included benefits</Text><Text style={s.copy}>{bonuses.items.length} benefits</Text></View>
     {bonuses.items.map(item=><View key={item} style={s.benefit}><Text style={s.benefitTick}>✓</Text><Text style={s.benefitText}>{a(item)}</Text></View>)}
     <Text style={s.copy}>{a(bonuses.note)}</Text>
    </ScrollView>
    <View style={[s.modalFooter,{borderColor:C.line}]}>
     <View style={s.between}><Text style={s.copy}>Google Play</Text><Text style={s.modalPrice}>{rowPrice(current)}</Text></View>
     {current.owned?<Text style={[s.availability,{color:C.good}]}>{current.id==='supporter_monthly'?'Supporter benefits are currently active.':'This purchase is permanently owned by your account.'}</Text>:reason?<Text style={[s.availability,{color:C.warning}]}>{reason}</Text>:null}
     <GameButton title={current.owned?(current.id==='supporter_monthly'?a('Active'):a('Owned')):!current.confirmed?a('Checking…'):current.id==='supporter_monthly'?a('Subscribe'):a(current.action)}
      disabled={disabled} onPress={confirm}/>
     <GameButton compact title={a('Close')} tone="secondary" onPress={()=>setSelected(null)}/>
     <Text style={s.disclaimer}>Payment and final price are confirmed in Google Play. Purchases are verified against your signed-in VELDRYN account.</Text>
    </View>
   </View>:null}
  </GameModalSurface>
 </View>;
}
function supporterExpiry(value:string|null|undefined,language:Language){
 const expiry=Date.parse(value??'');
 return Number.isFinite(expiry)?accountText(language,'Access until {date}',{date:new Date(expiry).toLocaleDateString(language,{year:'numeric',month:'short',day:'numeric'})}):accountText(language,'Active');
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:11},flex:{flex:1,minWidth:0},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 ownership:{gap:10,padding:12,borderWidth:1,borderRadius:radii.md},
 eyebrow:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:.75,color:C.accent},
 ownershipText:{fontSize:12,lineHeight:18,color:C.muted,marginTop:3},
 count:{fontSize:19,lineHeight:24,fontWeight:'900'},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:6},
 chip:{borderWidth:1,borderRadius:7,paddingHorizontal:8,paddingVertical:6},
 chipText:{fontSize:10,lineHeight:15,fontWeight:'800'},
 heading:{gap:3,marginTop:2},
 title:{fontSize:16,lineHeight:22,fontWeight:'800',color:C.text},
 copy:{fontSize:11,lineHeight:17,color:C.muted},
 permanent:{gap:9},twoColumns:{flexDirection:'row'},column:{flex:1,minWidth:0},
 modalShell:{gap:9,minWidth:0},
 modalBody:{gap:10,paddingBottom:12},
 modalHero:{flexDirection:'row',alignItems:'center',gap:10,padding:11,borderWidth:1,borderRadius:radii.md},
 modalIcon:{width:62,height:62,borderWidth:1,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
 modalTitle:{fontSize:17,lineHeight:23,fontWeight:'800',color:C.text},
 modalHeading:{fontSize:13,lineHeight:19,fontWeight:'900',color:C.text},
 benefit:{flexDirection:'row',alignItems:'flex-start',gap:8,minHeight:29,paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
 benefitTick:{fontSize:13,color:C.good,fontWeight:'800'},
 benefitText:{flex:1,minWidth:0,fontSize:12,lineHeight:18,color:C.text},
 modalFooter:{paddingTop:10,paddingBottom:12,borderTopWidth:1,gap:9},
 modalPrice:{flexShrink:1,fontSize:14,lineHeight:20,fontWeight:'900',color:C.text,textAlign:'right'},
 availability:{fontSize:11,lineHeight:16,fontWeight:'700'},
 disclaimer:{fontSize:10,lineHeight:15,color:C.muted,textAlign:'center'},
});}
