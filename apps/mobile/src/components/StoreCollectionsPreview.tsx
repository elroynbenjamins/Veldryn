import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,typography,type ThemeColors} from '../theme/theme';

/** Design preview only. There are no offers, prices, checkout endpoints or unlock mutations. */
const COLLECTIONS=[
 {id:'Bloomwake',season:'Spring',symbol:'✿',theme:'New beginnings',color:'#A7CFA8'},
 {id:'Suncrest',season:'Summer',symbol:'☼',theme:'Golden festivities',color:'#E2C47C'},
 {id:'Harvestwake',season:'Autumn',symbol:'❖',theme:'Fallen leaves',color:'#DBA07C'},
 {id:'Frostfall',season:'Winter',symbol:'✧',theme:'Winter twilight',color:'#AAC8E6'},
] as const;
const EXAMPLES=[{symbol:'◇',rarity:'BASIC',kind:'Profile border'},{symbol:'✦',rarity:'RARE',kind:'Profile icon'},{symbol:'❈',rarity:'PRESTIGE',kind:'Emote set'}] as const;

export function StoreCollectionsPreview(){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[selected,setSelected]=useState<(typeof COLLECTIONS)[number]['id']>('Harvestwake');
 const collection=COLLECTIONS.find(row=>row.id===selected)??COLLECTIONS[0];
 return <View style={s.root}>
  <View style={s.between}><Text style={s.title} accessibilityRole="header">Seasonal Collections</Text><Text style={s.coming}>CONCEPT ONLY</Text></View>
  <Text style={s.copy}>A future home for rotating cosmetics. Nothing on this page can be purchased or claimed yet.</Text>
  <View accessibilityRole="tablist" accessibilityLabel="Collection seasons" style={s.seasons}>
   {COLLECTIONS.map(row=><Pressable key={row.id} accessibilityRole="tab" accessibilityState={{selected:selected===row.id}} onPress={()=>setSelected(row.id)} style={({pressed})=>[s.season,{backgroundColor:selected===row.id?C.selection:C.panel,borderColor:selected===row.id?C.selectionLine:C.line},pressed&&s.pressed]}><Text style={[s.seasonName,{color:selected===row.id?C.text:C.muted}]}>{row.season}</Text></Pressable>)}
  </View>
  <View style={[s.collection,{borderColor:collection.color,backgroundColor:C.panelRaised}]}>
   <View style={s.collectionTop}><Text style={s.eyebrow}>COLLECTION PREVIEW · {collection.season.toUpperCase()}</Text><Text style={[s.sigil,{color:collection.color}]}>{collection.symbol}</Text></View>
   <Text style={[s.collectionName,{color:collection.color}]}>{collection.id}</Text>
   <Text style={s.copy}>{collection.theme} · Possible cosmetic collection theme. Item lineup and acquisition methods are not final.</Text>
  </View>
  <Text style={s.eyebrow}>ILLUSTRATIVE COSMETIC CATEGORIES</Text>
  <View style={s.items}>{EXAMPLES.map(item=><View key={item.rarity} style={[s.item,{backgroundColor:C.panel,borderColor:C.line}]}>
   <View style={[s.itemArt,{backgroundColor:C.panel2,borderColor:C.lineStrong}]}><Text style={[s.itemSymbol,{color:collection.color}]}>{item.symbol}</Text></View>
   <Text style={s.itemRarity}>{item.rarity}</Text>
   <Text style={s.itemName}>{item.kind}</Text>
  </View>)}</View>
  <View style={[s.note,{backgroundColor:C.infoSurface,borderColor:C.info}]}><Text style={s.noteTitle}>Not available yet</Text><Text style={s.copy}>These are examples, not registered catalogue items. No prices, paid currency, entitlements or purchase actions have been added. A future annual pet could be considered separately.</Text></View>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:12},between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 title:{...typography.title,color:C.text,flexShrink:1},
 coming:{fontSize:9,fontWeight:'900',letterSpacing:.5,color:C.warning,borderColor:C.warning,borderWidth:1,borderRadius:radii.sm,paddingHorizontal:6,paddingVertical:4},
 copy:{fontSize:12,lineHeight:18,color:C.muted},
 eyebrow:{fontSize:10,lineHeight:15,fontWeight:'800',letterSpacing:.7,color:C.accent},
 seasons:{flexDirection:'row',gap:5},
 season:{flex:1,minWidth:0,minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:2,borderWidth:1,borderRadius:radii.sm},
 seasonName:{fontSize:11,lineHeight:15,fontWeight:'800'},
 collection:{padding:14,borderWidth:1,borderRadius:radii.md,gap:7,minHeight:124},
 collectionTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 sigil:{fontSize:30,lineHeight:36,fontWeight:'800'},
 collectionName:{fontSize:24,lineHeight:29,fontWeight:'800'},
 items:{flexDirection:'row',gap:7},
 item:{flex:1,minWidth:0,padding:7,alignItems:'center',gap:4,borderWidth:1,borderRadius:radii.md},
 itemArt:{width:'100%',maxWidth:92,height:66,alignItems:'center',justifyContent:'center',borderRadius:7,borderWidth:1},
 itemSymbol:{fontSize:30,fontWeight:'900'},
 itemRarity:{fontSize:9,fontWeight:'900',color:C.accent},
 itemName:{fontSize:11,lineHeight:15,fontWeight:'700',textAlign:'center',color:C.text},
 note:{gap:5,padding:12,borderRadius:radii.md,borderWidth:1},
 noteTitle:{fontSize:13,color:C.info,fontWeight:'800'},pressed:{opacity:.72},
});}
