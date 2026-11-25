import {useGameplayText} from '../i18n/gameplay';
import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState,SkillId} from '../core/types';
import {RECIPES} from '../content/skills';
import {itemDef} from '../content/items';
import {recipeMatchesLocalizedSearch} from '../i18n/crafting-recipe-names';
import {recipeAvailability} from '../core/playability';
import {alchemyAvailability} from '../core/alchemy';
import {isTimedProcessingRecipe,processingAvailability} from '../core/processing';
import {isWinterHearthLightRecipe,winterHearthContentVisible} from '../core/winter-hearth-2026';
import {equipmentCraftAvailability,timedEquipmentRecipe} from '../core/equipment-crafting-queue';
import type {WorkingTowardDestination} from '../core/working-toward';
import {RecipeCard} from './RecipeCard';
import type {CraftActionFeedback} from './useCraftActionFeedback';
import {groupTwoVariantCraftingRecipes} from '../core/crafting-recipe-variants';
import {SearchField} from './SearchField';
import {GameButton} from './GameButton';
import {DisclosureControl} from './DisclosureControl';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type CraftingSkillId=Extract<SkillId,'smithing'|'cooking'|'alchemy'|'tailoring'|'enchanting'>;
type RecipeStatus={ready:boolean;reason:string;inputs:Array<{itemId:string;quantity:number;inventory:number;bank:number}>};
type Row={recipe:(typeof RECIPES)[number];status:RecipeStatus};
type GroupedRows={key:string;rows:Row[]};
const recipeGroups=new Map<string,(typeof RECIPES)>();

export function CraftingRecipeBrowser({state,skillId,initialQuery='',preferredRecipeId,category,onCraft,craftFeedback,onAlchemyStart,onProcessingStart,onNavigate,onCraftPrerequisites,onTrackPreparation}:{state:GameState;skillId:CraftingSkillId;initialQuery?:string;preferredRecipeId?:string;category?:'materials'|'tools';onCraft:(id:string,quantity?:number)=>void|Promise<void>;craftFeedback?:CraftActionFeedback;onAlchemyStart?:(id:string,batches?:number)=>Promise<void>|void;onProcessingStart?:(id:string,batches?:number)=>Promise<void>|void;onNavigate?:(destination:WorkingTowardDestination)=>void;onCraftPrerequisites?:(recipeId:string)=>void;onTrackPreparation?:(recipe:(typeof RECIPES)[number],batches:number,initialStepCount:number)=>Promise<void>|void}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [query,setQuery]=useState(initialQuery),[readyOnly,setReadyOnly]=useState(false),[guildMaterialsOnly,setGuildMaterialsOnly]=useState(false),[filterOpen,setFilterOpen]=useState(false),[limit,setLimit]=useState(12);
 const [selectedVariants,setSelectedVariants]=useState<Record<string,string>>({});
  // Keep a single expanded recipe across READY NOW, NEEDS REQUIREMENTS and LOCKED.
  // Undefined means the initial deep-linked recipe may open automatically; null means all closed.
  const [expandedRecipeKey,setExpandedRecipeKey]=useState<string|null|undefined>(undefined);
 const skill=state.skills.find(row=>row.skillId===skillId),skillLevel=skill?.level??1,characterLevel=state.character?.level??1;
 // Filter recipes before expensive inventory, bank, alchemy and equipment checks.
 // Typing into search now evaluates only recipes that can actually be shown.
 const q=query.trim().toLowerCase();
 const recipes=useMemo(()=>{
  const key=skillId+':'+state.character?.classId,cached=recipeGroups.get(key);if(cached)return cached;
  const group=RECIPES.filter(recipe=>recipe.skillId===skillId&&!recipe.noviceSetId&&(!isWinterHearthLightRecipe(recipe.id)||winterHearthContentVisible(state))&&(!recipe.classId||!!recipe.v33SetId||recipe.classId===state.character?.classId)).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
  recipeGroups.set(key,group);return group;
 },[skillId,state.character?.classId,state.account.liveEvent?.eventId,state.account.liveEvent?.enabled]);
 const stored=useMemo(()=>{
  const inventory=new Map<string,number>(),bank=new Map<string,number>();
  for(const row of state.inventory.stacks)inventory.set(row.itemId,(inventory.get(row.itemId)??0)+row.quantity);
  for(const row of state.bank.stacks)bank.set(row.itemId,(bank.get(row.itemId)??0)+row.quantity);
  return {inventory,bank};
 },[state.inventory.stacks,state.bank.stacks]);
 const variantGroups=useMemo(()=>groupTwoVariantCraftingRecipes(recipes),[recipes]);
  const initialExpandedKey=variantGroups.find(group=>group.recipes.some(recipe=>recipe.id===preferredRecipeId))?.key??null;
  const openRecipeKey=expandedRecipeKey===undefined?initialExpandedKey:expandedRecipeKey;
 const visibleGroups=useMemo(()=>variantGroups.filter(group=>{
  try{
   if(guildMaterialsOnly&&!itemDef(group.recipes[0].output.itemId).guildOnly)return false;
   if(category){
    const isTool=itemDef(group.recipes[0].output.itemId).type==='tool';
    if(category==='tools'?!isTool:isTool||!!group.recipes[0].v33SetId)return false;
   }
   // Searching an alternate route still opens the same unified output card.
   return group.recipes.some(recipe=>recipeMatchesLocalizedSearch(language,recipe,q));
  }catch(error){console.warn('[CraftingRecipeBrowser] Invalid recipe output',group.key,error);return false;}
 }),[variantGroups,category,q,guildMaterialsOnly,language]);
 const matching:GroupedRows[]=useMemo(()=>visibleGroups.map(group=>({key:group.key,rows:group.recipes.map(recipe=>{
  try{
   if(recipe.level>skillLevel||(recipe.characterLevel??1)>characterLevel)return {recipe,status:{ready:false,reason:recipe.level>skillLevel?gt('Requires {skill} level {level}.',{skill:gl(recipe.skillId),level:recipe.level}):gt('Requires character level {level}.',{level:recipe.characterLevel??1}),inputs:recipe.inputs.map(input=>({...input,inventory:stored.inventory.get(input.itemId)??0,bank:stored.bank.get(input.itemId)??0}))}};
   const processing=isTimedProcessingRecipe(recipe.id),timedEquipment=Boolean(timedEquipmentRecipe(recipe.id));
   const status=skillId==='alchemy'?alchemyAvailability(state,recipe.id):processing?processingAvailability(state,recipe.id,undefined,true):timedEquipment?equipmentCraftAvailability(state,recipe.id):recipeAvailability(state,recipe.id);
   return {recipe,status};
  }catch(error){
   console.warn('[CraftingRecipeBrowser] Recipe unavailable:',recipe.id,error);
   return {recipe,status:{ready:false,reason:gt("Recipe temporarily unavailable."),inputs:[]}};
  }
 })})),[visibleGroups,state,skillId,skillLevel,characterLevel,stored,gt,gl]);
 // A craftable stays under READY NOW when either source is craftable.
 const ready=matching.filter(group=>group.rows.some(row=>row.status.ready));
 const locked=matching.filter(group=>!group.rows.some(row=>row.status.ready)&&group.rows.every(row=>row.recipe.level>skillLevel||(row.recipe.characterLevel??1)>characterLevel));
 const needs=matching.filter(group=>!ready.includes(group)&&!locked.includes(group));
 const groups:{label:string;tone:'ready'|'needs'|'locked';rows:GroupedRows[]}[]=readyOnly?[{label:gt("READY NOW"),tone:'ready',rows:ready}]:[{label:gt("READY NOW"),tone:'ready',rows:ready},{label:gt("NEEDS REQUIREMENTS"),tone:'needs',rows:needs},{label:gt("LOCKED"),tone:'locked',rows:locked}].filter(group=>group.rows.length>0) as {label:string;tone:'ready'|'needs'|'locked';rows:GroupedRows[]}[];
 const perGroup=Math.max(4,Math.ceil(limit/Math.max(1,groups.length))),hasMore=groups.some(group=>group.rows.length>perGroup);
 const selectedRow=(group:GroupedRows):Row=>{
  const explicit=group.rows.find(row=>row.recipe.id===selectedVariants[group.key]);
  if(explicit)return explicit;
  const preferred=group.rows.find(row=>row.recipe.id===preferredRecipeId);
  if(preferred)return preferred;
  // A material-ready route is the sensible first selection, but players can
  // deliberately switch to an unavailable route to inspect requirements.
  const searched=q?group.rows.filter(row=>recipeMatchesLocalizedSearch(language,row.recipe,q)):[];
  // A query for an exact alternative opens that method. A shared item-name
  // query instead defaults to whichever route can be crafted right now.
  return (searched.length===1?searched[0]:undefined)??group.rows.find(row=>row.status.ready)??searched[0]??group.rows[0];
 };
 return <View style={s.root}>
  <View style={s.searchRow}><View style={s.flex}><SearchField accessibilityLabel={gt("Search recipes")} value={query} onChangeText={value=>{setQuery(value);setLimit(12);}} placeholder={gt("Search recipes…")}/></View><DisclosureControl label={gt("Filters")+(readyOnly||guildMaterialsOnly?' · '+(Number(readyOnly)+Number(guildMaterialsOnly)):'')} expanded={filterOpen} onPress={()=>setFilterOpen(value=>!value)} compact/></View>
  {(skillId==='smithing'||skillId==='tailoring')?<Pressable accessibilityRole="button" accessibilityState={{selected:guildMaterialsOnly}} onPress={()=>{setGuildMaterialsOnly(value=>!value);setLimit(12);}} style={({pressed})=>[s.guildToggle,guildMaterialsOnly&&s.guildToggleSelected,pressed&&s.pressed]}><Text style={[s.guildToggleText,guildMaterialsOnly&&s.guildToggleTextActive]}>{guildMaterialsOnly?'✓ ':''}{gl('Guild materials')}</Text><Text style={s.guildToggleHint}>{gl('Craft supplies for Guild Construction')} ›</Text></Pressable>:null}
  {filterOpen?<View style={s.filterPanel}><Pressable accessibilityRole="button" accessibilityState={{selected:readyOnly}} onPress={()=>{setReadyOnly(value=>!value);setLimit(12);}} style={({pressed})=>[s.filterRow,readyOnly&&s.filterRowActive,pressed&&s.pressed]}><View style={s.flex}><Text style={s.filterTitle}>{gt("Craftable only")}</Text><Text style={s.filterHint}>{gt("Hide locked and missing-requirement recipes.")}</Text></View><Text style={[s.filterValue,readyOnly&&s.filterValueActive]}>{readyOnly?gt("ON"):gt("OFF")}</Text></Pressable></View>:null}
  {groups.map(group=><View key={group.label} style={s.group}><View style={s.groupHead}><Text style={[s.groupLabel,group.tone==='ready'?s.ready:group.tone==='needs'?s.needs:s.locked]}>{group.label}</Text><Text style={s.groupCount}>{group.rows.length}</Text></View>{group.rows.slice(0,perGroup).map(recipeGroup=>{const selected=selectedRow(recipeGroup);return <RecipeCard key={recipeGroup.key} state={state} recipe={selected.recipe} status={selected.status} variantRecipes={recipeGroup.rows.length===2?recipeGroup.rows.map(row=>row.recipe):undefined} onSelectVariant={id=>setSelectedVariants(current=>({...current,[recipeGroup.key]:id}))} onCraft={onCraft} craftFeedback={craftFeedback} onNavigate={onNavigate} onCraftPrerequisites={onCraftPrerequisites} onTrackPreparation={onTrackPreparation} alchemy={skillId==='alchemy'} onAlchemyStart={onAlchemyStart} onProcessingStart={onProcessingStart} controlledExpanded={openRecipeKey===recipeGroup.key} onExpandedChange={open=>setExpandedRecipeKey(open?recipeGroup.key:null)}/>})}</View>)}
  {hasMore?<GameButton title={gt("Show more recipes")} tone="secondary" onPress={()=>setLimit(value=>value+12)}/>:null}
  {matching.length===0?<Text style={s.empty}>{query.trim()?gt("No recipes match your search."):readyOnly?gt("No recipes are ready. Open Filters to show locked and missing-requirement recipes."):gt("No recipes available.")}</Text>:null}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.md},flex:{flex:1,minWidth:0},workshop:{gap:8,padding:10,borderWidth:1,borderRadius:12,backgroundColor:C.panel},workshopHead:{flexDirection:'row',alignItems:'center',gap:8},workshopLabel:{fontSize:9,fontWeight:'900',letterSpacing:.9},workshopCopy:{...typography.caption,color:C.muted},workshopReady:{...typography.caption,fontWeight:'900'},workshopStats:{flexDirection:'row',gap:8,paddingTop:7,borderTopWidth:1,borderTopColor:C.line},stat:{flex:1,minWidth:0},statAction:{padding:5,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},statLabel:{fontSize:8.5,color:C.muted,fontWeight:'900',letterSpacing:.65},statValue:{...typography.bodyStrong,color:C.text},statHint:{fontSize:10,color:C.muted},
 searchRow:{flexDirection:'row',alignItems:'center',gap:8},filterToggle:{minHeight:44,paddingHorizontal:11,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},filterToggleActive:{borderColor:C.selectionLine,backgroundColor:C.selection},filterToggleText:{fontSize:11,color:C.text,fontWeight:'900'},filterPanel:{padding:8,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},filterRow:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},filterRowActive:{borderColor:C.selectionLine,backgroundColor:C.selection},filterTitle:{...typography.bodyStrong,color:C.text},filterHint:{...typography.caption,color:C.muted},filterValue:{...typography.caption,color:C.muted,fontWeight:'900'},filterValueActive:{color:C.good},pressed:{opacity:.76},
 guildToggle:{minHeight:44,borderRadius:10,paddingHorizontal:10,paddingVertical:8,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},guildToggleSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},guildToggleText:{fontSize:12,color:C.text,fontWeight:'900'},guildToggleTextActive:{color:C.good},guildToggleHint:{fontSize:10,color:C.muted,flexShrink:1,textAlign:'right'},
 group:{gap:8},groupHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:2},groupLabel:{...typography.caption,fontWeight:'900',letterSpacing:.8},groupCount:{...typography.caption,color:C.muted,fontWeight:'800'},ready:{color:C.good},needs:{color:C.info},locked:{color:C.warning},empty:{...typography.body,color:C.muted,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel}
});}
