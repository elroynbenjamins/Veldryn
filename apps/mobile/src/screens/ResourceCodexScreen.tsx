import {memo,useCallback,useMemo,useState} from 'react';
import {FlatList,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions,type ListRenderItem} from 'react-native';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {GameTextInput} from '../components/GameTextInput';
import {ItemArtwork} from '../components/ItemArtwork';
import {ResourceIcon} from '../components/ResourceIcon';
import {UiIcon} from '../components/UiIcon';
import {accountText} from '../i18n/account';
import {RecipeCodexPanel} from './RecipeCodexPanel';
import {recipeCodexUsesIngredient} from '../core/recipe-codex';
import {resourceCodexCategoryEntries,resourceCodexEntries,resourceCodexQuantity,resourceCodexSources,resourceCodexUse,RESOURCE_CATEGORIES,type ResourceCategory,type ResourceCodexEntry} from '../core/resource-codex';
import {rarityNameColor,rarityMeta} from '../core/item-rarity';
import type {GameState} from '../core/types';
import type {WorkingTowardDestination} from '../core/working-toward';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

const entries=resourceCodexEntries();
const byId=new Map(entries.map(entry=>[entry.id,entry]));
const keyOf=(entry:ResourceCodexEntry)=>entry.id;
function ResourceArt({entry,size=46}:{entry:ResourceCodexEntry;size?:number}){
 if(entry.id==='essence'||entry.id==='bondstones')return <ResourceIcon resourceId={entry.id} size={size}/>;
 if(entry.virtual)return <UiIcon name="sanctuary" size={size}/>;
 return <ItemArtwork itemId={entry.id} size={size}/>;
}

/** Pure row: opening details or changing balances never repaints unchanged item artwork. */
const ResourceTile=memo(function ResourceTile({entry,width,artSize,C,s,onOpen}:{entry:ResourceCodexEntry;width:number;artSize:number;C:ThemeColors;s:ReturnType<typeof makeStyles>;onOpen:(id:string)=>void}){
 const rarity=rarityMeta(entry.rarity),color=rarityNameColor(entry.rarity,C.dark,C.text);
 return <Pressable onPress={()=>onOpen(entry.id)} accessibilityRole="button" accessibilityLabel={entry.name+', '+rarity.label} accessibilityHint="Show where this resource can be found" style={({pressed})=>[s.tile,{width},pressed&&s.pressed]}>
  <Text style={s.tileName} numberOfLines={2}>{entry.name}</Text>
  <View style={[s.artFrame,{borderColor:rarity.color}]}><ResourceArt entry={entry} size={artSize}/></View>
  <Text style={[s.rarity,{color}]} numberOfLines={1}>{rarity.label}</Text>
 </Pressable>;
});
export function ResourceCodexScreen({state,onNavigateSource,onOpenCompanions}:{state:GameState;onNavigateSource:(destination:WorkingTowardDestination)=>void;onOpenCompanions:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const language=state.settings.language;
 const a=useCallback((value:string)=>accountText(language,value),[language]);
 const [query,setQuery]=useState(''),[showSearch,setShowSearch]=useState(false),[showFilters,setShowFilters]=useState(false),[category,setCategory]=useState<ResourceCategory>('All'),[selectedId,setSelectedId]=useState<string|null>(null);
 const [activeView,setActiveView]=useState<'Resources'|'Recipes'>('Resources');
 const [ingredientFilterId,setIngredientFilterId]=useState<string|undefined>();
 // Four columns for normal mobile layouts, with measured fallbacks for compact devices and larger text.
 const columns=fontScale>=1.5||state.settings.textScale>=1.5?2:width<300||fontScale>=1.2||state.settings.textScale>=1.2?3:4;
 const screenWidth=Math.min(width,960),cardWidth=Math.max(0,(screenWidth-spacing.md*2-6*(columns-1))/columns);
 const artSize=Math.min(46,Math.max(30,cardWidth-16));
 const needle=query.trim().toLocaleLowerCase(language);
 // Category lists, names and images are stable; typing filters an already-built catalog.
 const filtered=useMemo(()=>{
  const categoryEntries=resourceCodexCategoryEntries(category);
  return !needle?categoryEntries:categoryEntries.filter(entry=>entry.name.toLocaleLowerCase(language).includes(needle));
 },[category,needle,language]);
 const selected=selectedId?byId.get(selectedId):undefined;
 const onOpen=useCallback((id:string)=>setSelectedId(id),[]);
 const onClose=useCallback(()=>setSelectedId(null),[]);
 const renderItem=useCallback<ListRenderItem<ResourceCodexEntry>>(({item})=><ResourceTile entry={item} width={cardWidth} artSize={artSize} C={C} s={s} onOpen={onOpen}/>,[cardWidth,artSize,C,s,onOpen]);
 // Only inspect acquisition sources for the currently selected resource.
 const sources=useMemo(()=>selected?resourceCodexSources(state,selected):[],[selected,state]);
 const quantity=useMemo(()=>selected?resourceCodexQuantity(state,selected):0,[selected,state.inventory.stacks,state.bank.stacks,state.account.companionMaterials,state.account.companionEssence,state.account.bondstones]);
 const details=selected?resourceCodexUse(selected):'';
 return <View style={s.screen}>
  <View accessibilityRole="tablist" style={s.codexTabs}>
   {(['Resources','Recipes'] as const).map(view=><Pressable key={view} accessibilityRole="tab" accessibilityState={{selected:activeView===view}} onPress={()=>{if(view==='Recipes')setIngredientFilterId(undefined);setActiveView(view);}} style={[s.codexTab,activeView===view&&s.codexTabActive]}><Text style={[s.codexTabLabel,activeView===view&&s.codexTabLabelActive]}>{a(view)}</Text></Pressable>)}
  </View>
  {activeView==='Recipes'?<RecipeCodexPanel state={state} onNavigateSource={onNavigateSource} onOpenResource={id=>{if(!byId.has(id))return;setSelectedId(id);setActiveView('Resources');}} ingredientFilterId={ingredientFilterId} onClearIngredientFilter={()=>setIngredientFilterId(undefined)}/>:<FlatList key={columns} data={filtered} numColumns={columns} keyExtractor={keyOf} renderItem={renderItem} keyboardShouldPersistTaps="handled" columnWrapperStyle={s.row} initialNumToRender={16} maxToRenderPerBatch={12} updateCellsBatchingPeriod={40} windowSize={5} showsVerticalScrollIndicator={false}
   contentContainerStyle={s.content}
   ListHeaderComponent={<View style={s.header}>
    <View style={s.headingRow}>
     <View style={s.headingText}><Text accessibilityRole="header" style={s.title}>{a('Resource Codex')}</Text><Text style={s.hint}>{a('Discover materials and where to obtain them.')}</Text></View>
     <Pressable accessibilityRole="button" accessibilityLabel={a('Filter resources')} accessibilityState={{expanded:showFilters}} onPress={()=>setShowFilters(value=>!value)} style={s.filterButton}><UiIcon name="filter" size={19}/><Text numberOfLines={1} style={s.filterButtonText}>{a(category)}</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={a('Search resources')} accessibilityState={{expanded:showSearch}} onPress={()=>{setShowSearch(value=>!value);setQuery('');}} style={s.iconButton}><UiIcon name="search" size={24}/></Pressable>
    </View>
    {showSearch?<GameTextInput autoFocus autoCorrect={false} value={query} onChangeText={setQuery} placeholder={a('Search resources…')} accessibilityLabel={a('Search resources')}/>:null}
    {showFilters?<View style={s.filterMenu}>{RESOURCE_CATEGORIES.map(label=><Pressable key={label} accessibilityRole="button" accessibilityState={{selected:category===label}} onPress={()=>{setCategory(label);setShowFilters(false);}} style={[s.filterOption,category===label&&s.chipActive]}><Text style={[s.chipText,category===label&&s.chipTextActive]}>{a(label)}</Text></Pressable>)}</View>:null}
    <View style={s.summaryRow}><Text style={s.summary}>{filtered.length} {a('resources')}</Text><Text style={s.summary}>{a('Tap for sources')}</Text></View>
   </View>}
   ListEmptyComponent={<View style={s.empty}><Text style={s.body}>{a('No resources match your search.')}</Text><Pressable onPress={()=>{setQuery('');setCategory('All');}} accessibilityRole="button" style={s.secondaryAction}><Text style={s.secondaryText}>{a('Clear filters')}</Text></Pressable></View>}
  />}
  {activeView==='Resources'&&selected?<GameModalSurface visible presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={onClose}>
   <GameModalHeader eyebrow={a(selected.companionRelated?'Companions':selected.category).toLocaleUpperCase(language)} title={selected.name} onClose={onClose}/>
   <ScrollView showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.detail} showsVerticalScrollIndicator={false}>
    <View style={s.hero}>
     <View style={[s.heroArt,{borderColor:rarityMeta(selected.rarity).color}]}><ResourceArt entry={selected} size={64}/></View>
     <View style={s.heroCopy}><Text style={[s.detailRarity,{color:rarityNameColor(selected.rarity,C.dark,C.text)}]}>{rarityMeta(selected.rarity).label}</Text><Text style={s.owned}>{a('Owned')}: {quantity.toLocaleString(language)}</Text><Text style={s.muted}>{a('Includes Inventory, Bank and companion storage')}</Text></View>
    </View>
    <Text style={s.sectionTitle}>{a('Where to get it')}</Text>
    {sources.length?sources.map((source,index)=>{const canOpen=source.kind==='companion'||!!source.destination&&source.available!==false;const status=source.status==='locked'?'Locked':source.status==='travel'?'Travel':null;return <Pressable key={source.kind+':'+source.title+':'+index} disabled={!canOpen} accessibilityRole="button" accessibilityState={{disabled:!canOpen}} accessibilityLabel={source.title} accessibilityHint={canOpen?source.kind==='companion'?'Open Companions':'Open source activity':undefined} onPress={()=>{onClose();if(source.kind==='companion')onOpenCompanions();else if(source.destination)onNavigateSource(source.destination)}} style={({pressed})=>[s.source,pressed&&canOpen&&s.pressed]}>
      <View style={s.sourceCopy}><Text style={s.sourceTitle}>{source.title}</Text><Text style={s.sourceDetail}>{source.detail}</Text>{source.availabilityDetail?<Text style={s.sourceHint}>{source.availabilityDetail}</Text>:null}</View>
      {status?<Text style={[s.sourceStatus,{color:source.status==='locked'?C.warning:C.info}]}>{a(status)}</Text>:null}
      {canOpen?<UiIcon name="next" size={18}/>:null}
     </Pressable>}):<View style={s.source}><Text style={s.sourceDetail}>{a('No confirmed source is currently listed for this resource.')}</Text></View>}
    <Text style={s.sectionTitle}>{a('Used for')}</Text>
    <Text style={s.body}>{details}</Text>
    {recipeCodexUsesIngredient(selected.id,state.character?.classId).length>0?<Pressable accessibilityRole="button" accessibilityLabel={a('View recipes using this resource')} onPress={()=>{onClose();setIngredientFilterId(selected.id);setActiveView('Recipes');}} style={s.secondaryAction}><UiIcon name="skills" size={20}/><Text style={s.secondaryText}>{a('Recipes using this')} · {recipeCodexUsesIngredient(selected.id,state.character?.classId).length}</Text><UiIcon name="next" size={17}/></Pressable>:null}
    {selected.companionRelated?<Pressable accessibilityRole="button" onPress={()=>{onClose();onOpenCompanions();}} style={s.secondaryAction}><UiIcon name="companions" size={22}/><Text style={s.secondaryText}>{a('Open Companions')}</Text></Pressable>:null}
   </ScrollView>
  </GameModalSurface>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},
 codexTabs:{flexDirection:'row',gap:6,paddingHorizontal:spacing.md,paddingTop:spacing.sm,paddingBottom:5},
 codexTab:{flex:1,minHeight:43,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 codexTabActive:{backgroundColor:C.selection,borderColor:C.selectionLine},
 codexTabLabel:{fontSize:13,color:C.muted,fontWeight:'700'},codexTabLabelActive:{color:C.text},
 content:{padding:spacing.md,paddingBottom:spacing.xl,gap:6},
 header:{gap:11,marginBottom:8},headingRow:{flexDirection:'row',alignItems:'center',gap:10},
 headingText:{flex:1,gap:3},title:{...typography.title,color:C.text},hint:{...typography.caption,color:C.muted},
 iconButton:{width:45,height:45,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 filterButton:{minHeight:43,maxWidth:132,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:9,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},filterButtonText:{fontSize:12,color:C.text,fontWeight:'700',flexShrink:1},filterMenu:{flexDirection:'row',flexWrap:'wrap',gap:6,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},filterOption:{width:'48%',flexGrow:1,borderWidth:1,borderColor:C.line,paddingHorizontal:10,minHeight:38,justifyContent:'center',backgroundColor:C.panel,borderRadius:9},
 chipActive:{backgroundColor:C.selection,borderColor:C.selectionLine},chipText:{color:C.muted,fontSize:12,fontWeight:'600'},chipTextActive:{color:C.text},
 summaryRow:{flexDirection:'row',justifyContent:'space-between',gap:8},summary:{fontSize:11,color:C.muted},
 row:{gap:6,marginBottom:6},
 tile:{height:118,backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:radii.sm,padding:4,alignItems:'center',justifyContent:'space-between'},
 tileName:{fontSize:10.5,lineHeight:13.5,color:C.text,textAlign:'center',fontWeight:'600',minHeight:27},
 artFrame:{width:52,height:52,maxWidth:'100%',backgroundColor:C.panel2,borderRadius:radii.sm,borderWidth:1,alignItems:'center',justifyContent:'center'},
 rarity:{fontSize:10,lineHeight:13,fontWeight:'700',textAlign:'center'},
 pressed:{opacity:.72},
 empty:{alignItems:'center',justifyContent:'center',padding:24,gap:12},
 detail:{padding:spacing.md,gap:11,paddingBottom:30},
 hero:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:C.panel,padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 heroArt:{width:74,height:74,backgroundColor:C.panel2,borderWidth:1,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
 heroCopy:{flex:1,gap:4},detailRarity:{fontSize:13,fontWeight:'700'},
 muted:{fontSize:11,color:C.muted},body:{fontSize:13,lineHeight:20,color:C.text},owned:{fontSize:14,fontWeight:'700',color:C.text},
 sectionTitle:{fontSize:13,fontWeight:'700',color:C.text,marginTop:5},
 source:{flexDirection:'row',alignItems:'center',minHeight:60,gap:8,padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 sourceCopy:{flex:1,gap:3},sourceTitle:{fontSize:13,fontWeight:'700',color:C.text},sourceDetail:{fontSize:12,lineHeight:17,color:C.muted},sourceHint:{fontSize:11,lineHeight:15,color:C.warning},
 sourceStatus:{fontSize:10,fontWeight:'700',flexShrink:0},
 secondaryAction:{minHeight:44,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panel,paddingHorizontal:12,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},
 secondaryText:{fontSize:13,fontWeight:'700',color:C.text},
 })};
