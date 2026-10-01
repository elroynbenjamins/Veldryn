import {accountText} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo,useState} from 'react';
import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {COMMERCE_PRODUCT_BONUSES,commerceProduct,type CommerceProductId} from '../content/commerce-products';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameButton} from './GameButton';

export function CommerceProductRow({language:languageOverride,productId,title,price,status,action,disabled,onPress}:{language?:Language;productId:CommerceProductId;title:string;price:string;status?:string;action:string;disabled:boolean;onPress:()=>void}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[expanded,setExpanded]=useState(false);
 const bonuses=COMMERCE_PRODUCT_BONUSES[productId],name=commerceProduct(productId)!.name;
 const label=a(expanded?'Hide {name} bonuses':'Show {name} bonuses',{name});
 return <View style={s.row}>
  <View style={s.summary}>
   <View style={s.copy}><View style={s.heading}><Text style={s.title}>{title}</Text>{status?<Text style={s.status}>{status}</Text>:null}</View><Text style={s.price}>{price}</Text></View>
   <GameButton compact title={action} disabled={disabled} onPress={onPress}/>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded}} {...(Platform.OS==='web'?{title:label}:{})} onPress={()=>setExpanded(value=>!value)} style={({pressed})=>[s.toggle,pressed&&s.pressed]}>
   <Text aria-hidden style={s.symbol}>{expanded?'\u2212':'+'}</Text>
  </Pressable>
  {expanded?<View style={s.bonuses}><Text style={s.note}>{a(bonuses.note)}</Text>{bonuses.items.map(item=><Text key={item} style={s.bonus}>{a(item)}</Text>)}</View>:null}
 </View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 row:{paddingVertical:spacing.sm,borderTopWidth:1,borderColor:C.line},
 summary:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.sm},
 copy:{flexGrow:1,flexShrink:1,flexBasis:170,minWidth:0},
 heading:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.xs},
 title:{...typography.bodyStrong,color:C.text,flexShrink:1},
 price:{color:C.good,fontWeight:'900',marginTop:3},
 status:{color:C.good,fontSize:11,fontWeight:'900',textTransform:'uppercase'},
 toggle:{width:44,height:44,alignItems:'center',justifyContent:'center',alignSelf:'flex-start',borderRadius:6},
 symbol:{fontSize:22,lineHeight:26,color:C.muted},pressed:{backgroundColor:C.panel2},
 bonuses:{gap:6,paddingBottom:spacing.sm},
 note:{fontSize:12,lineHeight:18,color:C.muted,marginBottom:2},
 bonus:{fontSize:13,lineHeight:19,color:C.text},
});}
