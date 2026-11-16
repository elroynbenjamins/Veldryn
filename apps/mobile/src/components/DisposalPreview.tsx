import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {ItemStack} from '../core/types';
import {itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {disposalPreviewText} from '../i18n/disposal-preview-ui';
import {formatLocalizedNumber} from '../i18n/translator';
import {itemRarity,rarityMeta,rarityNameColor,type ItemRarity} from '../core/item-rarity';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {ItemArtwork} from './ItemArtwork';

/** Pure presentation: values must come from authoritative disposal previews,
 * never estimated based on item names or display rarity. */
export interface DisposalPreviewItem{
 itemId:string;
 quantity:number;
 rarity?:ItemRarity;
 quality?:number;
}
export interface DisposalPreviewSummary{selected:number;eligible:number;protected:number;}
export function DisposalPreview({mode,items,gold=0,rewards=[],note,warning,summary}:{
 mode:'sell'|'salvage';
 items:readonly DisposalPreviewItem[];
 gold?:number;
 rewards?:readonly ItemStack[];
 note?:string;
 warning?:string;
 summary?:DisposalPreviewSummary;
}){
 const language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{height}=useWindowDimensions();
 const t=(key:string,params?:Record<string,string|number>)=>disposalPreviewText(language,key,params);
 const number=(n:number)=>formatLocalizedNumber(language,n);
 const count=items.reduce((total,item)=>total+item.quantity,0);
 const visibleItems=items.slice(0,3);
 return <ScrollView
   style={{maxHeight:Math.max(144,Math.min(396,height*.50))}}
   contentContainerStyle={s.root}
   nestedScrollEnabled showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}
   keyboardShouldPersistTaps="handled">
   <View style={s.heading}>
     <View style={s.headingText}><Text style={s.eyebrow}>{t('PREVIEW')}</Text>
       <Text style={s.headingTitle}>{t(mode==='sell'?'SELLING':'SALVAGING')}</Text></View>
     <View style={s.countPill}><Text style={s.countText}>{t(count===1?'{count} item':'{count} items',{count:number(count)})}</Text></View>
   </View>
   {summary?<View style={s.metrics} accessibilityRole="summary">
     {([
       {label:'SELECTED',value:summary.selected,color:C.text},
       {label:'PROTECTED',value:summary.protected,color:summary.protected?C.warning:C.muted},
       {label:'ELIGIBLE',value:summary.eligible,color:C.good},
     ] as const).map(metric=><View key={metric.label} style={s.metricCard}>
       <Text style={[s.metricValue,{color:metric.color}]}>{number(metric.value)}</Text>
       <Text style={s.metricLabel}>{t(metric.label)}</Text>
     </View>)}
   </View>:null}
   <View style={s.itemList}>
     {visibleItems.map((item,index)=>{
       let definition:ReturnType<typeof itemDef>|null=null;
       try{definition=itemDef(item.itemId)}catch{ /* Old receipts may reference removed item IDs. */ }
       const gear=definition?.type==='gear';
       const meta=rarityMeta(item.rarity??(definition?itemRarity(definition):'common'));
       return <View key={item.itemId+':'+index} style={s.itemRow}>
         <View style={[s.art,{borderColor:gear?meta.color:C.lineStrong,backgroundColor:gear?meta.surface:C.panel}]}>
           <ItemArtwork itemId={item.itemId} size={38}/>
         </View>
         <View style={s.copy}>
           <Text numberOfLines={2} style={[s.itemName,{color:gear?rarityNameColor(meta.id,C.dark,C.text):C.text}]}>{localizedItemName(language,item.itemId)}</Text>
           {gear?<Text style={s.itemMeta}>{t(meta.label)}{typeof item.quality==='number'?' · Q'+number(item.quality):''}</Text>:null}
         </View>
         <Text style={s.quantity}>×{number(item.quantity)}</Text>
       </View>;
     })}
     {items.length>3?<Text style={s.more}>{t('+{count} more stacks',{count:number(items.length-3)})}</Text>:null}
   </View>
   <View style={[s.receipt,{borderLeftColor:mode==='sell'?C.warning:C.good}]}>
     <Text style={s.eyebrow}>{t(mode==='sell'?'GOLD TO RECEIVE':'MATERIALS TO RECEIVE')}</Text>
     {mode==='sell'?
       <View style={s.goldRow}>
         <View style={s.goldMark}><Text style={s.goldGlyph}>●</Text></View>
         <Text style={s.goldAmount} numberOfLines={1} adjustsFontSizeToFit>+{number(gold)}</Text>
         <Text style={s.goldLabel}>{t('Gold')}</Text>
       </View>:
       <View style={s.rewards}>
         {rewards.map(reward=><View key={reward.itemId} style={s.rewardRow}>
           <View style={s.rewardArt}><ItemArtwork itemId={reward.itemId} size={30}/></View>
           <Text numberOfLines={2} style={s.rewardName}>{localizedItemName(language,reward.itemId)}</Text>
           <Text style={s.rewardQuantity}>+{number(reward.quantity)}</Text>
         </View>)}
         {!rewards.length?<Text style={s.note}>{t('No recoverable materials')}</Text>:null}
       </View>}
   </View>
   {note?<Text style={s.note}>{note}</Text>:null}
   <Text style={s.caution}>• {warning??t('This action cannot be undone.')}</Text>
 </ScrollView>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm,paddingBottom:spacing.xs},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingVertical:2},
 headingText:{flex:1,minWidth:0,gap:2},
 eyebrow:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.65},
 headingTitle:{...typography.bodyStrong,color:C.text,fontWeight:'900',letterSpacing:.3},
 countPill:{paddingHorizontal:10,paddingVertical:6,borderRadius:99,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2},
 countText:{...typography.caption,color:C.text,fontWeight:'800'},
 metrics:{flexDirection:'row',gap:6},
 metricCard:{flex:1,minWidth:0,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2,paddingVertical:9,paddingHorizontal:5,alignItems:'center',gap:2},
 metricValue:{...typography.title,fontWeight:'900',fontVariant:['tabular-nums']},
 metricLabel:{...typography.caption,fontSize:10,color:C.muted,fontWeight:'800',letterSpacing:.3,textAlign:'center'},
 itemList:{gap:5},
 itemRow:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.line,borderRadius:10,padding:7,backgroundColor:C.panel2},
 art:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1.5},
 copy:{flex:1,minWidth:0,gap:2},
 itemName:{...typography.bodyStrong,color:C.text},
 itemMeta:{...typography.caption,color:C.muted},
 quantity:{...typography.bodyStrong,color:C.text,fontWeight:'800',fontVariant:['tabular-nums']},
 more:{...typography.caption,color:C.muted,paddingHorizontal:8,paddingVertical:2},
 receipt:{borderWidth:1,borderLeftWidth:3,borderRadius:10,borderColor:C.line,backgroundColor:C.panel,gap:8,padding:spacing.sm},
 goldRow:{flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'},
 goldMark:{width:32,height:32,borderRadius:99,backgroundColor:C.warningSurface,justifyContent:'center',alignItems:'center',borderWidth:1.5,borderColor:C.warning},
 goldGlyph:{fontSize:18,lineHeight:23,color:C.warning},
 goldAmount:{...typography.title,color:C.warning,fontWeight:'900',fontVariant:['tabular-nums'],flexShrink:1},
 goldLabel:{...typography.bodyStrong,color:C.text},
 rewards:{gap:6},
 rewardRow:{flexDirection:'row',alignItems:'center',gap:8,padding:5,borderRadius:8,backgroundColor:C.panel2},
 rewardArt:{width:34,height:34,justifyContent:'center',alignItems:'center'},
 rewardName:{flex:1,minWidth:0,...typography.body,color:C.text},
 rewardQuantity:{...typography.bodyStrong,color:C.good,fontWeight:'900',fontVariant:['tabular-nums']},
 note:{...typography.caption,color:C.muted,lineHeight:17},
 caution:{...typography.caption,color:C.warning,fontWeight:'600'},
});}
