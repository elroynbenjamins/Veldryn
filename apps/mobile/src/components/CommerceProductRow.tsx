import {accountText} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo,useState} from 'react';
import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {COMMERCE_PRODUCT_BONUSES,commerceProduct,type CommerceProductId} from '../content/commerce-products';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameButton} from './GameButton';

export function CommerceProductRow({language:languageOverride,productId,title,price,status,action,owned=false,disabled,onPress}:{language?:Language;productId:CommerceProductId;title:string;price:string;status?:string;action:string;owned?:boolean;disabled:boolean;onPress:()=>void}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[expanded,setExpanded]=useState(false);
 const bonuses=COMMERCE_PRODUCT_BONUSES[productId],name=commerceProduct(productId)!.name;
 const label=a(expanded?'Hide {name} bonuses':'Show {name} bonuses',{name});
 const palette=productPalette(productId,C.dark);
 return <View style={[s.row,{backgroundColor:palette.surface,borderColor:palette.accent}]}>
  <View pointerEvents="none" style={[s.glow,{backgroundColor:palette.glow}]}/>
  <View style={[s.accentRail,{backgroundColor:palette.accent}]}/>
  <View style={s.summary}>
   <View style={s.copy}><View style={s.heading}><Text style={[s.title,{color:palette.title}]}>{title}</Text>{status?<Text style={[s.status,{color:palette.title,backgroundColor:palette.badge}]}>{status}</Text>:null}</View><Text style={[s.price,{color:palette.price}]}>{price}</Text></View>
   <GameButton compact title={action} tone={owned?'secondary':'primary'} selected={owned} disabled={disabled} onPress={onPress} colors={owned?undefined:{backgroundColor:palette.button,borderColor:palette.accent,textColor:'#FFFFFF'}}/>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded}} {...(Platform.OS==='web'?{title:label}:{})} onPress={()=>setExpanded(value=>!value)} style={({pressed})=>[s.toggle,pressed&&s.pressed]}>
   <Text aria-hidden style={[s.symbol,{color:palette.accent}]}>{expanded?'\u2212':'+'}</Text>
  </Pressable>
  {expanded?<View style={s.bonuses}><Text style={s.note}>{a(bonuses.note)}</Text>{bonuses.items.map(item=><Text key={item} style={s.bonus}>{a(item)}</Text>)}</View>:null}
 </View>;
}

function productPalette(productId:CommerceProductId,dark:boolean){
 const palettes={
  vip:dark?{accent:'#5FA8FF',surface:'#10233D',glow:'#1D4B78',title:'#A9D0FF',price:'#FFFFFF',button:'#216DC8',badge:'#214D7E'}:{accent:'#2878D4',surface:'#E8F2FF',glow:'#C7E0FF',title:'#12529E',price:'#0D3D77',button:'#1768C3',badge:'#D3E7FF'},
  vip_plus:dark?{accent:'#E789FF',surface:'#30143E',glow:'#682678',title:'#F1B7FF',price:'#FFFFFF',button:'#A83BC3',badge:'#652778'}:{accent:'#A43BC0',surface:'#F8E8FF',glow:'#EEC7FA',title:'#7E208F',price:'#591064',button:'#9633B1',badge:'#EFCEF9'},
  supporter_monthly:dark?{accent:'#FFD166',surface:'#392B10',glow:'#795B15',title:'#FFE4A3',price:'#FFFFFF',button:'#B87108',badge:'#765817'}:{accent:'#A66700',surface:'#FFF4D7',glow:'#FFE4A0',title:'#805000',price:'#633C00',button:'#A66700',badge:'#FFE6A8'},
 } as const;
 return palettes[productId];
}

function styles(C:ThemeColors){return StyleSheet.create({
 row:{position:'relative',overflow:'hidden',padding:spacing.md,borderWidth:1,borderRadius:12,shadowOpacity:C.dark?.28:.12,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:2},
 glow:{position:'absolute',width:150,height:150,borderRadius:999,right:-70,top:-90,opacity:.48},
 accentRail:{position:'absolute',width:4,top:0,bottom:0,left:0},
 summary:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.sm},
 copy:{flexGrow:1,flexShrink:1,flexBasis:170,minWidth:0},
 heading:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.xs},
 title:{...typography.bodyStrong,flexShrink:1,fontSize:16},
 price:{fontWeight:'900',marginTop:3,fontSize:15},
 status:{fontSize:10,fontWeight:'900',textTransform:'uppercase',letterSpacing:.5,paddingHorizontal:6,paddingVertical:2,borderRadius:99,overflow:'hidden'},
 toggle:{width:44,height:44,alignItems:'center',justifyContent:'center',alignSelf:'flex-start',borderRadius:6},
 symbol:{fontSize:22,lineHeight:26,color:C.muted},pressed:{backgroundColor:C.panel2},
 bonuses:{gap:6,paddingTop:spacing.xs},
 note:{fontSize:12,lineHeight:18,color:C.muted,marginBottom:2},
 bonus:{fontSize:13,lineHeight:19,color:C.text},
});}
