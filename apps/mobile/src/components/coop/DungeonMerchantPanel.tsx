import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopMerchantShopView} from '../../core/coop-presentation';
import {useSocialText} from '../../i18n/social';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {FantasyPanel} from './CoopVisualKit';

type MerchantKind='boon'|'artifact'|'salve';
const KIND_GLYPH:Record<MerchantKind,string>={boon:'✦',artifact:'◈',salve:'♥'};

/** Every price, purchase flag and resource balance is supplied by the server.
 * The specific boon/artifact identity is intentionally hidden until purchase
 * — the UI makes the TYPE of pick clear while preserving the mystery. */
export function DungeonMerchantPanel({shop,busy=false,onPurchase}:{shop:CoopMerchantShopView;busy?:boolean;onPurchase?:(offerId:string)=>void}){
 const {styles:s,colors:C}=useCoopStyles(makeStyles),st=useSocialText();
 const label=(kind:MerchantKind)=>kind==='boon'?st('Sealed boon'):kind==='artifact'?st('Run artifact'):st('Restorative salve');
 const description=(kind:MerchantKind)=>kind==='boon'?st('Grants a dungeon boon'):kind==='artifact'?st('Grants a dungeon artifact'):st('Restores 35% HP');
 const flavor=(kind:MerchantKind)=>kind==='boon'?st('Random passive effect for your party. Identity revealed on pickup.'):kind==='artifact'?st('Persistent run item. Effect triggers in combat.'):st('Instantly heals the chosen ally. No mystery here.');
 const kindTint=(kind:MerchantKind)=>kind==='boon'?C.violet:kind==='artifact'?C.gold:C.success;
 return <FantasyPanel variant="default">
  <View style={s.header}>
   <Text style={s.title}>{st('Merchant offers')}</Text>
   <Text style={s.balance}>{shop.resources} · {st('Dungeon resources')}</Text>
  </View>
  {shop.offers.map(offer=>{
   const affordable=shop.resources>=offer.cost,disabled=busy||offer.purchased||!affordable||!onPurchase;
   const tint=kindTint(offer.kind);
   return <View key={offer.id} style={s.offer}>
    <View style={[s.glyph,{borderColor:tint}]}><Text style={[s.glyphText,{color:tint}]}>{KIND_GLYPH[offer.kind]}</Text></View>
    <View style={s.details}>
     <Text style={s.name}>{label(offer.kind)}</Text>
     <Text style={s.description}>{description(offer.kind)}</Text>
     <Text style={s.flavor} numberOfLines={2}>{flavor(offer.kind)}</Text>
     <Text style={[s.price,!affordable&&!offer.purchased&&s.priceShort]}>{offer.cost} · {st('Dungeon resources')}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={offer.purchased?st('Purchased'):`${st('Buy')} ${label(offer.kind)}, ${offer.cost} ${st('Dungeon resources')}`}
     accessibilityState={{disabled}} disabled={disabled} onPress={()=>onPurchase?.(offer.id)}
     style={({pressed})=>[s.buy,disabled&&s.disabled,pressed&&!disabled&&s.pressed]}>
     <Text style={s.buyText}>{offer.purchased?st('Purchased'):st('Buy')}</Text>
    </Pressable>
   </View>;
  })}
 </FantasyPanel>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:coopSpacing.sm},
 title:{flex:1,minWidth:110,fontSize:16,lineHeight:22,fontWeight:'800',color:C.text},
 balance:{fontSize:11,lineHeight:16,color:C.gold,fontWeight:'700'},
 offer:{flexDirection:'row',gap:coopSpacing.sm,alignItems:'center',paddingVertical:8,borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line},
 glyph:{width:36,height:36,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:10,backgroundColor:C.surfaceRaised},
 glyphText:{fontSize:18,lineHeight:22,fontWeight:'800'},
 details:{flex:1,minWidth:0,gap:2},
 name:{fontSize:14,lineHeight:19,color:C.text,fontWeight:'700'},
 description:{fontSize:11,lineHeight:16,color:C.textSecondary},
 flavor:{fontSize:10,lineHeight:14,color:C.textMuted,fontStyle:'italic'},
 price:{fontSize:11,lineHeight:16,color:C.gold,fontWeight:'700'},
 priceShort:{color:C.danger},
 buy:{minWidth:77,minHeight:44,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderRadius:9,borderWidth:1,borderColor:C.goldDim,backgroundColor:C.surfaceRaised},
 disabled:{opacity:.4},pressed:{opacity:.7},
 buyText:{fontSize:12,lineHeight:17,color:C.gold,fontWeight:'800'},
});
