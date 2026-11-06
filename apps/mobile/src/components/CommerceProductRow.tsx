import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CommerceProductId} from '../content/commerce-products';
import {CommerceProductBadge} from './CommerceProductBadge';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,type ThemeColors} from '../theme/theme';

/** Visual card only. Pressing a card opens details; only the confirmed
 * Google Play detail action may initiate the checkout flow. */
export function CommerceProductRow({productId,price,owned=false,confirmed,compact=false,onDetails}:{
 productId:CommerceProductId;
 price:string;
 owned?:boolean;
 confirmed:boolean;
 compact?:boolean;
 onDetails:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const supporter=productId==='supporter_monthly',plus=productId==='vip_plus';
 const name=supporter?'Supporter':plus?'VIP+':'VIP';
 const color=supporter?(C.dark?'#F1C76A':'#9A6A1D'):plus?(C.dark?'#E4A5FA':'#9234AC'):(C.dark?'#8BBEFD':'#236AAE');
 const shade=supporter?C.warningSurface:plus?C.specialSurface:C.infoSurface;
 const perks=supporter?['+1 active Forge slot','Animated name styles']:plus?['+30 bank slots','+10% Crafting speed']:['+10 inventory slots','+5% Gathering speed'];
 return <Pressable accessibilityRole="button" accessibilityLabel={`View ${name} benefits`} accessibilityHint="Opens membership details and purchase availability"
  onPress={onDetails} style={({pressed})=>[s.card,compact?s.compact:s.wide,{borderColor:color,backgroundColor:shade},pressed&&s.pressed]}>
  <View pointerEvents="none" style={[s.glow,{backgroundColor:color}]}/>
  <View style={[s.leading,compact&&s.compactLeading]}>
   <View style={[s.symbolPlate,{borderColor:color,backgroundColor:C.panel}]}>
    <CommerceProductBadge productId={productId} size={34}/>
   </View>
   <View style={s.topCopy}>
    <Text style={[s.name,{color:C.text}]}>{name}</Text>
    <Text style={[s.type,{color}]}>{supporter?'MONTHLY SUPPORTER':'PERMANENT UPGRADE'}</Text>
   </View>
   <Text style={[s.state,{color:owned?C.good:C.muted,borderColor:owned?C.good:C.line}]}>{!confirmed?'CHECKING':owned?(supporter?'ACTIVE':'OWNED'):supporter?'MONTHLY':'ONE-TIME'}</Text>
  </View>
  <View style={[s.body,compact&&s.compactBody]}>
   <View style={s.perks}>{perks.map(text=><Text key={text} numberOfLines={2} style={s.perk}><Text style={{color:C.good}}>✧ </Text>{text}</Text>)}</View>
   <View style={s.bottom}><Text style={s.price} numberOfLines={2}>{price}</Text><View style={[s.details,{borderColor:C.lineStrong,backgroundColor:C.panel}]}><Text style={[s.detailsText,{color:C.text}]}>View details</Text><Text style={{color:C.accent,fontSize:14,fontWeight:'800'}}>›</Text></View></View>
  </View>
 </Pressable>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 card:{position:'relative',overflow:'hidden',borderWidth:1,borderRadius:radii.md,padding:11,minWidth:0,gap:11},
 compact:{flex:1,minHeight:205},wide:{minHeight:132},
 glow:{position:'absolute',width:112,height:112,borderRadius:99,top:-75,right:-38,opacity:.12},
 leading:{flexDirection:'row',alignItems:'center',gap:9,minWidth:0},
 compactLeading:{flexDirection:'column',alignItems:'flex-start',gap:5},
 symbolPlate:{width:42,height:42,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:8},
 topCopy:{minWidth:0,flex:1,gap:3},
 name:{fontSize:18,lineHeight:22,fontWeight:'800'},
 type:{fontSize:9,lineHeight:13,letterSpacing:.6,fontWeight:'900'},
 state:{alignSelf:'flex-start',fontSize:9,lineHeight:13,fontWeight:'900',paddingHorizontal:6,paddingVertical:3,borderRadius:5,borderWidth:1},
 body:{flex:1,gap:10,minWidth:0},
 compactBody:{justifyContent:'space-between'},
 perks:{gap:4},perk:{fontSize:11,lineHeight:16,color:C.muted},
 bottom:{gap:8},price:{fontSize:12,lineHeight:17,color:C.text,fontWeight:'800'},
 details:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,minHeight:44,paddingHorizontal:9,paddingVertical:6,borderWidth:1,borderRadius:7},
 detailsText:{fontSize:12,lineHeight:17,fontWeight:'800'},
 pressed:{opacity:.76,transform:[{translateY:1}]},
});}
