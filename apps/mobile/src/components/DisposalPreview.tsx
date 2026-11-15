import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {ItemStack} from '../core/types';
import {itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {itemRarity,rarityMeta,type ItemRarity} from '../core/item-rarity';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {ItemArtwork} from './ItemArtwork';

/** Presentation only: every displayed amount must come from the same reward
 * calculation as the command being confirmed. Never re-price gear here. */
export interface DisposalPreviewItem{
 itemId:string;
 quantity:number;
 rarity?:ItemRarity;
 quality?:number;
}
export function DisposalPreview({mode,items,gold=0,rewards=[],note,warning}:{
 mode:'sell'|'salvage';
 items:readonly DisposalPreviewItem[];
 gold?:number;
 rewards?:readonly ItemStack[];
 note?:string;
 warning?:string;
}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{height}=useWindowDimensions();
 const count=items.reduce((total,item)=>total+item.quantity,0);
 return <ScrollView style={{maxHeight:Math.max(142,Math.min(420,height*.48))}} contentContainerStyle={s.root} nestedScrollEnabled showsVerticalScrollIndicator>
   <View style={s.sectionHead}>
     <Text style={s.eyebrow}>{mode==='sell'?'SELLING':'SALVAGING'}</Text>
     <Text style={s.counter}>{count.toLocaleString(language)} {count===1?'item':'items'}</Text>
   </View>
   <View style={s.itemList}>
     {items.slice(0,3).map((item,index)=>{
       const definition=itemDef(item.itemId),gear=definition.type==='gear';
       const meta=rarityMeta(item.rarity??itemRarity(definition));
       return <View key={item.itemId+':'+index} style={s.itemRow}>
         <View style={[s.art,{borderColor:gear?meta.color:C.lineStrong,backgroundColor:gear?meta.surface:C.panel}]}><ItemArtwork itemId={item.itemId} size={40}/></View>
         <View style={s.copy}>
           <Text numberOfLines={2} style={[s.itemName,{color:gear?meta.color:C.text}]}>{localizedItemName(language,item.itemId)}</Text>
           {gear?<Text style={s.itemMeta}>{meta.label}{typeof item.quality==='number'?' · Q'+item.quality:''}</Text>:null}
         </View>
         <Text style={s.quantity}>×{item.quantity.toLocaleString(language)}</Text>
       </View>;
     })}
     {items.length>3?<Text style={s.more}>+{items.length-3} more item stacks</Text>:null}
   </View>
   <View style={s.receipt}>
     <Text style={s.eyebrow}>{mode==='sell'?'GOLD RECEIVED':'MATERIALS RECEIVED'}</Text>
     {mode==='sell'?
       <View style={s.goldRow}>
         <View style={s.goldMark}><Text style={s.goldGlyph}>◆</Text></View>
         <Text style={s.goldAmount}>+{gold.toLocaleString(language)}</Text>
         <Text style={s.goldLabel}>Gold</Text>
       </View>:
       <View style={s.rewards}>
         {rewards.map(reward=><View key={reward.itemId} style={s.rewardRow}>
           <View style={s.rewardArt}><ItemArtwork itemId={reward.itemId} size={30}/></View>
           <Text numberOfLines={2} style={s.rewardName}>{localizedItemName(language,reward.itemId)}</Text>
           <Text style={s.rewardQuantity}>+{reward.quantity.toLocaleString(language)}</Text>
         </View>)}
         {!rewards.length?<Text style={s.note}>No recoverable materials</Text>:null}
       </View>}
   </View>
   {note?<Text style={s.note}>{note}</Text>:null}
   <Text style={s.caution}>{warning??'This action cannot be undone.'}</Text>
 </ScrollView>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm},
 sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 eyebrow:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.7},
 counter:{...typography.caption,color:C.text,fontWeight:'800'},
 itemList:{gap:6},
 itemRow:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.line,borderRadius:10,padding:7,backgroundColor:C.panel2},
 art:{width:49,height:49,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1.5},
 copy:{flex:1,minWidth:0,gap:2},
 itemName:{...typography.bodyStrong,color:C.text},
 itemMeta:{...typography.caption,color:C.muted},
 quantity:{...typography.bodyStrong,color:C.text},
 more:{...typography.caption,color:C.muted,paddingHorizontal:4},
 receipt:{borderWidth:1,borderRadius:11,borderColor:C.line,backgroundColor:C.panel,gap:8,padding:spacing.sm},
 goldRow:{flexDirection:'row',alignItems:'center',gap:9},
 goldMark:{width:33,height:33,borderRadius:9,backgroundColor:C.warningSurface,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.warning},
 goldGlyph:{fontSize:18,color:C.warning},
 goldAmount:{...typography.title,color:C.warning,fontWeight:'900'},
 goldLabel:{...typography.bodyStrong,color:C.text},
 rewards:{gap:6},
 rewardRow:{flexDirection:'row',alignItems:'center',gap:9,padding:6,borderRadius:8,backgroundColor:C.panel2},
 rewardArt:{width:34,height:34,justifyContent:'center',alignItems:'center'},
 rewardName:{flex:1,minWidth:0,...typography.body,color:C.text},
 rewardQuantity:{...typography.bodyStrong,color:C.good,fontWeight:'900'},
 note:{...typography.caption,color:C.muted,lineHeight:17},
 caution:{...typography.caption,color:C.warning},
});}
