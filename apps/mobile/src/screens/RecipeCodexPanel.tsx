import {memo,useCallback,useMemo,useState} from 'react';
import {FlatList,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions,type ListRenderItem} from 'react-native';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {GameTextInput} from '../components/GameTextInput';
import {ItemArtwork} from '../components/ItemArtwork';
import {UiIcon} from '../components/UiIcon';
import {accountText} from '../i18n/account';
import {resourceCodexEntries} from '../core/resource-codex';
import {recipeCodexEntryById,recipeCodexEntriesForClass,recipeCodexAvailableForClass,recipeCodexFilter,recipeCodexIngredients,recipeCodexRequirements,recipeCodexUsesIngredient,RECIPE_CODEX_SKILLS,type RecipeCodexEntry,type RecipeCodexSkill} from '../core/recipe-codex';
import {rarityMeta,rarityNameColor} from '../core/item-rarity';
import type {GameState} from '../core/types';
import type {WorkingTowardDestination} from '../core/working-toward';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

const resourceIds=new Set(resourceCodexEntries().map(entry=>entry.id));
const keyOf=(entry:RecipeCodexEntry)=>entry.id;
const label=(name:string)=>name.slice(0,1).toUpperCase()+name.slice(1);
const RecipeTile=memo(function RecipeTile({entry,width,artSize,C,s,onOpen}:{entry:RecipeCodexEntry;width:number;artSize:number;C:ThemeColors;s:ReturnType<typeof makeStyles>;onOpen:(id:string)=>void}){
 const rarity=rarityMeta(entry.rarity);
 return <Pressable accessibilityRole="button" accessibilityLabel={entry.name+', '+label(entry.skillId)+' level '+entry.level} accessibilityHint="View ingredients and crafting requirements" onPress={()=>onOpen(entry.id)} style={({pressed})=>[s.tile,{width},pressed&&s.pressed]}>
  <Text style={s.tileName} numberOfLines={2}>{entry.outputName}</Text>
  <View style={[s.artFrame,{borderColor:rarity.color}]}><ItemArtwork itemId={entry.outputId} size={artSize}/></View>
  <Text style={s.tileMeta} numberOfLines={1}>{label(entry.skillId)} · {entry.level}</Text>
 </Pressable>;
});

export function RecipeCodexPanel({state,onNavigateSource,onOpenResource,ingredientFilterId,onClearIngredientFilter}:{
 state:GameState;onNavigateSource:(destination:WorkingTowardDestination)=>void;
 onOpenResource:(id:string)=>void;ingredientFilterId?:string;onClearIngredientFilter:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const language=state.settings.language,a=useCallback((value:string)=>accountText(language,value),[language]);
 const [query,setQuery]=useState(''),[showSearch,setShowSearch]=useState(false),[showFilters,setShowFilters]=useState(false),[skill,setSkill]=useState<RecipeCodexSkill>('All'),[selectedId,setSelectedId]=useState<string|null>(null);
 const classId=state.character?.classId,allRecipes=useMemo(()=>recipeCodexEntriesForClass(classId),[classId]);
 const columns=fontScale>=1.5||state.settings.textScale>=1.5?2:width<300||fontScale>=1.2||state.settings.textScale>=1.2?3:4;
 const cardWidth=Math.max(0,(Math.min(width,960)-spacing.md*2-6*(columns-1))/columns);
 const artSize=Math.min(46,Math.max(30,cardWidth-16));
 const needle=query.trim().toLocaleLowerCase(language);
 const filtered=useMemo(()=>{
  const matches=recipeCodexFilter(skill,needle,classId);
  if(!ingredientFilterId)return matches;
  const ids=new Set(recipeCodexUsesIngredient(ingredientFilterId,classId).map(row=>row.id));
  return matches.filter(row=>ids.has(row.id));
 },[skill,needle,ingredientFilterId,classId]);
 const openRecipe=useCallback((id:string)=>setSelectedId(id),[]);
 const closeRecipe=useCallback(()=>setSelectedId(null),[]);
 const renderItem=useCallback<ListRenderItem<RecipeCodexEntry>>(({item})=><RecipeTile entry={item} width={cardWidth} artSize={artSize} C={C} s={s} onOpen={openRecipe}/>,[cardWidth,artSize,C,s,openRecipe]);
 const selectedEntry=selectedId?recipeCodexEntryById(selectedId):undefined;
 const selected=selectedEntry&&recipeCodexAvailableForClass(selectedEntry,classId)?selectedEntry:undefined;
 const requirements=useMemo(()=>selected?recipeCodexRequirements(state,selected):undefined,[selected,state]);
 const ingredients=useMemo(()=>selected?recipeCodexIngredients(state,selected):[],[selected,state.inventory.stacks,state.bank.stacks]);

 return <View style={s.root}>
  <FlatList key={columns} data={filtered} numColumns={columns} keyExtractor={keyOf} renderItem={renderItem} columnWrapperStyle={s.row} keyboardShouldPersistTaps="handled" initialNumToRender={16} maxToRenderPerBatch={12} windowSize={5} updateCellsBatchingPeriod={40} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}
   ListHeaderComponent={<View style={s.header}>
    <View style={s.headingRow}><View style={s.headingText}><Text style={s.title} accessibilityRole="header">{a('Recipes')}</Text><Text style={s.hint}>{a('Ingredients, requirements and crafting locations.')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={a('Filter recipes')} accessibilityState={{expanded:showFilters}} onPress={()=>setShowFilters(value=>!value)} style={s.filterButton}><UiIcon name="filter" size={19}/><Text numberOfLines={1} style={s.filterButtonText}>{skill==='All'?a('All'):a(label(skill))}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={a('Search recipes')} accessibilityState={{expanded:showSearch}} onPress={()=>{setShowSearch(value=>!value);setQuery('');}} style={s.iconButton}><UiIcon name="search" size={23}/></Pressable></View>
    {showSearch?<GameTextInput autoFocus autoCorrect={false} value={query} onChangeText={setQuery} placeholder={a('Search recipe or ingredient…')} accessibilityLabel={a('Search recipes')}/>:null}
    {showFilters?<View style={s.filterMenu}>{RECIPE_CODEX_SKILLS.map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:skill===value}} onPress={()=>{setSkill(value);setShowFilters(false);}} style={[s.filterOption,skill===value&&s.chipActive]}><Text style={[s.chipText,skill===value&&s.chipTextActive]}>{value==='All'?a('All'):a(label(value))}</Text></Pressable>)}</View>:null}
    {ingredientFilterId?<View style={s.ingredientFilter}><Text style={s.ingredientFilterLabel}>{a('Recipes using selected resource')}</Text><Pressable accessibilityRole="button" accessibilityLabel={a('Clear ingredient filter')} onPress={onClearIngredientFilter}><Text style={s.clearText}>{a('Clear')} ×</Text></Pressable></View>:null}
    <View style={s.summaryRow}><Text style={s.summary}>{filtered.length} / {allRecipes.length} {a('recipes')}</Text><Text style={s.summary}>{a('Tap for ingredients')}</Text></View>
   </View>}
   ListEmptyComponent={<View style={s.empty}><Text style={s.body}>{a('No recipes match these filters.')}</Text><Pressable onPress={()=>{setQuery('');setSkill('All');onClearIngredientFilter();}} accessibilityRole="button" style={s.action}><Text style={s.actionText}>{a('Clear filters')}</Text></Pressable></View>}
  />
  {selected&&requirements?<GameModalSurface visible presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={closeRecipe}>
   <GameModalHeader eyebrow={(label(selected.skillId)+' · Lv '+selected.level).toLocaleUpperCase(language)} title={selected.name} onClose={closeRecipe}/>
   <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.detail}>
    <View style={s.hero}><View style={[s.heroArt,{borderColor:rarityMeta(selected.rarity).color}]}><ItemArtwork itemId={selected.outputId} size={64}/></View><View style={s.heroCopy}><Text style={s.outputName}>{selected.outputName}</Text><Text style={s.body}>{a('Makes')} ×{selected.quantity}</Text><Text style={[s.rarityText,{color:rarityNameColor(selected.rarity,C.dark,C.text)}]}>{rarityMeta(selected.rarity).label}</Text></View></View>
    <View style={s.metaRow}><Text style={s.meta}>{label(selected.skillId)} Lv {selected.level}</Text><Text style={s.meta}>{selected.recipe.gold.toLocaleString(language)} {a('Gold')}</Text><Text style={s.meta}>+{selected.recipe.xp.toLocaleString(language)} XP</Text></View>
    {selected.recipe.characterLevel?<Text style={s.hint}>{a('Character level')} {selected.recipe.characterLevel} {a('required')}</Text>:null}
    {selected.recipe.v33EquipmentTier?<Text style={s.hint}>{selected.recipe.v33EquipmentTier} {selected.recipe.v33Region?' · '+selected.recipe.v33Region:''}</Text>:null}
    <Text style={s.sectionTitle}>{a('Ingredients')}</Text>
    {ingredients.length?ingredients.map(row=><Pressable key={row.itemId} accessibilityRole="button" accessibilityState={{disabled:!resourceIds.has(row.itemId)}} disabled={!resourceIds.has(row.itemId)} accessibilityLabel={row.name+', '+row.owned+' of '+row.needed+' owned'} onPress={()=>{closeRecipe();onOpenResource(row.itemId);}} style={s.ingredient}>
      {row.knownItem?<ItemArtwork itemId={row.itemId} size={31}/>:<UiIcon name="inventory" size={31}/>}
      <View style={s.flex}><Text style={s.ingredientName}>{row.name}</Text><Text style={s.hint}>{a('Inventory + Bank')}</Text></View>
      <Text style={[s.ingredientAmount,{color:row.sufficient?C.good:C.warning}]}>{row.owned.toLocaleString(language)} / {row.needed.toLocaleString(language)}</Text>{resourceIds.has(row.itemId)?<UiIcon name="next" size={16}/>:null}
     </Pressable>):<Text style={s.body}>{a('No materials required.')}</Text>}
    <Text style={s.sectionTitle}>{a('Requirements')}</Text>
    <Text style={[s.body,{color:requirements.status==='locked'?C.warning:C.text}]}>{requirements.status==='locked'?requirements.detail:a('Skill requirements met. Check ingredients and Gold before crafting.')}</Text>
    {selected.recipe.requiredKnowledgeId?<Text style={s.hint}>{a('Blueprint or recipe knowledge may be required.')}</Text>:null}
    {selected.recipe.classId?<Text style={s.hint}>{a('Class')}: {selected.recipe.classId.replace(/_/g,' ')}</Text>:null}
    <Text style={s.hint}>{a('Actual crafting availability, queue capacity and costs are checked in Skills.')}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{disabled:requirements.classRestricted}} disabled={requirements.classRestricted} accessibilityLabel={requirements.classRestricted?a('Recipe unavailable for this class'):a('View recipe in Skills')} onPress={()=>{closeRecipe();onNavigateSource(requirements.destination);}} style={[s.action,requirements.classRestricted&&s.disabled]}><UiIcon name="skills" size={22}/><Text style={s.actionText}>{requirements.classRestricted?a('Requires another class'):a('View in Skills')}</Text>{!requirements.classRestricted?<UiIcon name="next" size={18}/>:null}</Pressable>
   </ScrollView>
  </GameModalSurface>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},content:{padding:spacing.md,paddingTop:6,paddingBottom:spacing.xl,gap:6},header:{gap:11,marginBottom:8},
 headingRow:{flexDirection:'row',alignItems:'center',gap:10},headingText:{flex:1,gap:3},title:{...typography.title,color:C.text},hint:{...typography.caption,color:C.muted},iconButton:{width:45,height:45,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 filterButton:{minHeight:43,maxWidth:132,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:9,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},filterButtonText:{fontSize:12,color:C.text,fontWeight:'700',flexShrink:1},filterMenu:{flexDirection:'row',flexWrap:'wrap',gap:6,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},filterOption:{width:'48%',flexGrow:1,borderWidth:1,borderColor:C.line,paddingHorizontal:10,minHeight:38,justifyContent:'center',backgroundColor:C.panel,borderRadius:9},chipActive:{backgroundColor:C.selection,borderColor:C.selectionLine},chipText:{color:C.muted,fontSize:12,fontWeight:'600'},chipTextActive:{color:C.text},
 summaryRow:{flexDirection:'row',justifyContent:'space-between'},summary:{fontSize:11,color:C.muted},row:{gap:6,marginBottom:6},
 tile:{height:118,backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:radii.sm,padding:4,alignItems:'center',justifyContent:'space-between'},tileName:{fontSize:10.5,lineHeight:13.5,color:C.text,textAlign:'center',fontWeight:'600',minHeight:27},artFrame:{width:52,height:52,maxWidth:'100%',backgroundColor:C.panel2,borderRadius:radii.sm,borderWidth:1,alignItems:'center',justifyContent:'center'},tileMeta:{fontSize:10,lineHeight:13,color:C.muted,fontWeight:'700'},
 ingredientFilter:{minHeight:36,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingHorizontal:9,borderRadius:radii.sm,backgroundColor:C.selection},ingredientFilterLabel:{fontSize:12,color:C.text,flexShrink:1},clearText:{color:C.info,fontSize:12,fontWeight:'700'},
 pressed:{opacity:.72},disabled:{opacity:.55},
 empty:{alignItems:'center',justifyContent:'center',padding:24,gap:12},detail:{padding:spacing.md,gap:11,paddingBottom:30},
 hero:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:C.panel,padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 heroArt:{width:74,height:74,backgroundColor:C.panel2,borderWidth:1,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},heroCopy:{flex:1,gap:4},outputName:{fontSize:14,fontWeight:'700',color:C.text},rarityText:{fontSize:12,fontWeight:'700'},
 metaRow:{flexDirection:'row',flexWrap:'wrap',gap:6},meta:{color:C.muted,backgroundColor:C.panel,fontSize:12,fontWeight:'600',padding:8,borderRadius:radii.sm},body:{fontSize:13,lineHeight:19,color:C.text},sectionTitle:{fontSize:13,fontWeight:'700',color:C.text,marginTop:4},
 ingredient:{flexDirection:'row',alignItems:'center',minHeight:51,gap:10,padding:9,backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:radii.md},
 ingredientName:{fontSize:13,color:C.text,fontWeight:'600'},ingredientAmount:{fontSize:12,fontWeight:'700'},flex:{flex:1},action:{minHeight:48,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panel,paddingHorizontal:12,flexDirection:'row',gap:10,alignItems:'center',justifyContent:'center'},actionText:{fontSize:13,fontWeight:'700',color:C.text},
 })};
