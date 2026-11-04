import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopMerchantShopView} from '../../core/coop-presentation';
import {useSocialText} from '../../i18n/social';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {FantasyPanel} from './CoopVisualKit';

/** Every price, purchase flag and resource balance is supplied by the server. */
export function DungeonMerchantPanel({shop,busy=false,onPurchase}:{shop:CoopMerchantShopView;busy?:boolean;onPurchase?:(offerId:string)=>void}){
 const {styles:s}=useCoopStyles(makeStyles),st=useSocialText();
 const label=(kind:'boon'|'artifact'|'salve')=>kind==='boon'?st('Sealed boon'):kind==='artifact'?st('Run artifact'):st('Restorative salve');
 const description=(kind:'boon'|'artifact'|'salve')=>kind==='boon'?st('Grants a dungeon boon'):kind==='artifact'?st('Grants a dungeon artifact'):st('Restores 35% HP');
 return <FantasyPanel variant="default">
  <View style={s.header}>
   <Text style={s.title}>{st('Merchant offers')}</Text>
   <Text style={s.balance}>{shop.resources} · {st('Dungeon resources')}</Text>
  </View>
  {shop.offers.map(offer=>{
   const affordable=shop.resources>=offer.cost,disabled=busy||offer.purchased||!affordable||!onPurchase;
   return <View key={offer.id} style={s.offer}>
    <View style={s.details}><Text style={s.name}>{label(offer.kind)}</Text><Text style={s.description}>{description(offer.kind)}</Text>
     <Text style={s.price}>{offer.cost} · {st('Dungeon resources')}</Text>
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
 details:{flex:1,minWidth:0,gap:2},
 name:{fontSize:14,lineHeight:19,color:C.text,fontWeight:'700'},
 description:{fontSize:11,lineHeight:16,color:C.textSecondary},
 price:{fontSize:11,lineHeight:16,color:C.gold,fontWeight:'700'},
 buy:{minWidth:77,minHeight:44,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderRadius:9,borderWidth:1,borderColor:C.goldDim,backgroundColor:C.surfaceRaised},
 disabled:{opacity:.4},pressed:{opacity:.7},
 buyText:{fontSize:12,lineHeight:17,color:C.gold,fontWeight:'800'},
});
