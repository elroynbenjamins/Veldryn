import {useMemo,useState} from 'react';
import {FlatList,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {GameTextInput} from '../components/GameTextInput';
import {ItemArtwork} from '../components/ItemArtwork';
import {ResourceIcon} from '../components/ResourceIcon';
import {UiIcon} from '../components/UiIcon';
import {accountText} from '../i18n/account';
import {resourceCodexEntries,resourceCodexQuantity,resourceCodexSources,resourceCodexUse,RESOURCE_CATEGORIES,type ResourceCategory,type ResourceCodexEntry} from '../core/resource-codex';
import {rarityNameColor,rarityMeta} from '../core/item-rarity';
import type {GameState} from '../core/types';
import type {WorkingTowardDestination} from '../core/working-toward';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

const entries=resourceCodexEntries();
const keyOf=(entry:ResourceCodexEntry)=>entry.id;
function ResourceArt({entry,size=46}:{entry:ResourceCodexEntry;size?:number}){
 if(entry.id==='essence'||entry.id==='bondstones')return <ResourceIcon resourceId={entry.id} size={size}/>;
 if(entry.virtual)return <UiIcon name="sanctuary" size={size}/>;
 return <ItemArtwork itemId={entry.id} size={size}/>;
}
export function ResourceCodexScreen({state,onNavigateSource,onOpenCompanions}:{state:GameState;onNavigateSource:(destination:WorkingTowardDestination)=>void;onOpenCompanions:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const a=(value:string)=>accountText(state.settings.language,value);
 const [query,setQuery]=useState(''),[showSearch,setShowSearch]=useState(false),[category,setCategory]=useState<ResourceCategory>('All'),[selectedId,setSelectedId]=useState<string|null>(null);
 // Four inventory-style columns on mobile; honor very large accessibility font settings.
 const columns=fontScale>=1.5||state.settings.textScale>=1.5?2:4;
 const screenWidth=Math.min(width,960),cardWidth=Math.max(60,(screenWidth-spacing.md*2-6*(columns-1))/columns);
 const needle=query.trim().toLocaleLowerCase(state.settings.language);
 const filtered=useMemo(()=>entries.filter(entry=>(category==='All'||entry.category===category)&&(!needle||entry.name.toLocaleLowerCase(state.settings.language).includes(needle))),[category,needle,state.settings.language]);
 const selected=entries.find(entry=>entry.id===selectedId);
 const sources=useMemo(()=>selected?resourceCodexSources(state,selected):[],[selected,state]);
 const details=selected?resourceCodexUse(selected):'';
 const renderItem=({item}:{item:ResourceCodexEntry})=>{
  const color=rarityNameColor(item.rarity,C.dark,C.text);
  return <Pressable onPress={()=>setSelectedId(item.id)} accessibilityRole="button" accessibilityLabel={item.name+', '+item.rarity+', '+item.category} style={({pressed})=>[s.tile,{width:cardWidth},pressed&&s.pressed]}>
   <Text style={s.tileName} numberOfLines={2}>{item.name}</Text>
   <View style={[s.artFrame,{borderColor:rarityMeta(item.rarity).color}]}><ResourceArt entry={item} size={Math.min(48,cardWidth-15)}/></View>
   <Text style={[s.rarity,{color}]} numberOfLines={1}>{rarityMeta(item.rarity).label}</Text>
  </Pressable>;
 };
 return <View style={s.screen}>
  <FlatList key={columns} data={filtered} numColumns={columns} keyExtractor={keyOf} renderItem={renderItem} keyboardShouldPersistTaps="handled" columnWrapperStyle={s.row} initialNumToRender={20} maxToRenderPerBatch={20} windowSize={5} showsVerticalScrollIndicator={false}
   contentContainerStyle={s.content}
   ListHeaderComponent={<View style={s.header}>
    <View style={s.headingRow}>
     <View style={s.headingText}><Text accessibilityRole="header" style={s.title}>{a('Resource Codex')}</Text><Text style={s.hint}>{a('Find materials and see where to get them.')}</Text></View>
     <Pressable accessibilityRole="button" accessibilityLabel={a('Search resources')} accessibilityState={{expanded:showSearch}} onPress={()=>{setShowSearch(value=>!value);setQuery('')}} style={s.iconButton}><UiIcon name="search" size={24}/></Pressable>
    </View>
    {showSearch?<GameTextInput autoFocus autoCorrect={false} value={query} onChangeText={setQuery} placeholder={a('Search resources…')} accessibilityLabel={a('Search resources')}/>:null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.filters}>{RESOURCE_CATEGORIES.map(label=><Pressable key={label} accessibilityRole="button" accessibilityState={{selected:category===label}} onPress={()=>setCategory(label)} style={[s.chip,category===label&&s.chipActive]}><Text style={[s.chipText,category===label&&s.chipTextActive]}>{a(label)}</Text></Pressable>)}</ScrollView>
    <View style={s.summaryRow}><Text style={s.summary}>{filtered.length} {a('resources')}</Text><Text style={s.summary}>{a('Tap to view sources')}</Text></View>
   </View>}
   ListEmptyComponent={<View style={s.empty}><Text style={s.body}>{a('No resources match your search.')}</Text><Pressable onPress={()=>{setQuery('');setCategory('All')}} accessibilityRole="button" style={s.secondaryAction}><Text style={s.secondaryText}>{a('Clear filters')}</Text></Pressable></View>}
  />
  {selected?<GameModalSurface visible presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={()=>setSelectedId(null)}>
   <GameModalHeader eyebrow={a(selected.category).toLocaleUpperCase(state.settings.language)} title={selected.name} onClose={()=>setSelectedId(null)}/>
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.detail} showsVerticalScrollIndicator={false}>
    <View style={s.hero}>
     <View style={[s.heroArt,{borderColor:rarityMeta(selected.rarity).color}]}><ResourceArt entry={selected} size={64}/></View>
     <View style={s.heroCopy}><Text style={[s.detailRarity,{color:rarityNameColor(selected.rarity,C.dark,C.text)}]}>{rarityMeta(selected.rarity).label}</Text><Text style={s.body}>{a('Owned')}: {resourceCodexQuantity(state,selected).toLocaleString(state.settings.language)}</Text><Text style={s.muted}>{a('Inventory, bank and companion balance')}</Text></View>
    </View>
    <Text style={s.sectionTitle}>{a('Where to get it')}</Text>
    {sources.length?sources.map((source,index)=>{const canOpen=source.kind==='companion'||!!source.destination&&source.available!==false;return <Pressable key={source.kind+':'+source.title+':'+index} disabled={!canOpen} accessibilityRole="button" accessibilityState={{disabled:!canOpen}} accessibilityLabel={source.title} onPress={()=>{setSelectedId(null);if(source.kind==='companion')onOpenCompanions();else if(source.destination)onNavigateSource(source.destination)}} style={({pressed})=>[s.source,pressed&&canOpen&&s.pressed]}>
      <View style={s.sourceCopy}><Text style={s.sourceTitle}>{source.title}</Text><Text style={s.sourceDetail}>{source.detail}</Text></View>
      {canOpen?<UiIcon name="next" size={20}/>:null}
     </Pressable>}):<View style={s.source}><Text style={s.sourceDetail}>{a('No confirmed source is currently listed for this resource.')}</Text></View>}
    <Text style={s.sectionTitle}>{a('Used for')}</Text>
    <Text style={s.body}>{details}</Text>
    {selected.companionRelated?<Pressable accessibilityRole="button" onPress={()=>{setSelectedId(null);onOpenCompanions()}} style={s.secondaryAction}><UiIcon name="companions" size={22}/><Text style={s.secondaryText}>{a('Open Companions')}</Text></Pressable>:null}
   </ScrollView>
  </GameModalSurface>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},
 content:{padding:spacing.md,paddingBottom:spacing.xl,gap:6},
 header:{gap:11,marginBottom:8},headingRow:{flexDirection:'row',alignItems:'center',gap:10},
 headingText:{flex:1,gap:3},title:{...typography.title,color:C.text},hint:{...typography.caption,color:C.muted},
 iconButton:{width:45,height:45,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 filters:{gap:6,paddingVertical:2},chip:{borderWidth:1,borderColor:C.line,paddingHorizontal:12,minHeight:38,justifyContent:'center',backgroundColor:C.panel,borderRadius:18},
 chipActive:{backgroundColor:C.selection,borderColor:C.selectionLine},chipText:{color:C.muted,fontSize:12,fontWeight:'600'},chipTextActive:{color:C.text},
 summaryRow:{flexDirection:'row',justifyContent:'space-between',gap:8},summary:{fontSize:11,color:C.muted},
 row:{gap:6,marginBottom:6},
 tile:{height:116,backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:radii.sm,padding:4,alignItems:'center',justifyContent:'space-between'},
 tileName:{fontSize:10,lineHeight:13,color:C.text,textAlign:'center',fontWeight:'600',minHeight:26},
 artFrame:{width:52,height:52,backgroundColor:C.panel2,borderRadius:radii.sm,borderWidth:1,alignItems:'center',justifyContent:'center'},
 rarity:{fontSize:10,lineHeight:13,fontWeight:'700',textAlign:'center'},
 pressed:{opacity:.72},
 empty:{alignItems:'center',justifyContent:'center',padding:24,gap:12},
 detail:{padding:spacing.md,gap:11,paddingBottom:30},
 hero:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:C.panel,padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 heroArt:{width:74,height:74,backgroundColor:C.panel2,borderWidth:1,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
 heroCopy:{flex:1,gap:4},detailRarity:{fontSize:13,fontWeight:'700'},
 muted:{fontSize:11,color:C.muted},body:{fontSize:13,lineHeight:20,color:C.text},
 sectionTitle:{fontSize:13,fontWeight:'700',color:C.text,marginTop:5},
 source:{flexDirection:'row',alignItems:'center',minHeight:60,gap:8,padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 sourceCopy:{flex:1,gap:3},sourceTitle:{fontSize:13,fontWeight:'700',color:C.text},sourceDetail:{fontSize:12,lineHeight:17,color:C.muted},
 secondaryAction:{minHeight:44,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panel,paddingHorizontal:12,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},
 secondaryText:{fontSize:13,fontWeight:'700',color:C.text},
 })};
