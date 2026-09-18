import {useMemo,useState} from 'react';
import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {RECIPES} from '../content/skills';
import {recipeAvailability} from '../core/playability';
import {RecipeCard} from './RecipeCard';
import {SearchField} from './SearchField';
import {GameButton} from './GameButton';
import {C,radii,spacing,typography} from '../theme/theme';

type Profession='all'|'smithing'|'cooking';
type Sort='level'|'name';
export function InventoryCraftingPanel({state,onCraft}:{state:GameState;onCraft:(recipeId:string)=>void}){
 const [query,setQuery]=useState(''),[profession,setProfession]=useState<Profession>('all'),[craftableOnly,setCraftableOnly]=useState(false),[sort,setSort]=useState<Sort>('level'),[filtersOpen,setFiltersOpen]=useState(false),[limit,setLimit]=useState(20);
 const active=(profession==='all'?0:1)+(craftableOnly?1:0);
 const recipes=useMemo(()=>RECIPES.map(recipe=>({recipe,status:recipeAvailability(state,recipe.id)})).filter(({recipe,status})=>(profession==='all'||recipe.skillId===profession)&&(!craftableOnly||status.ready)&&(!query.trim()||(recipe.name+' '+recipe.output.itemId).toLowerCase().includes(query.trim().toLowerCase()))).sort((a,b)=>sort==='name'?a.recipe.name.localeCompare(b.recipe.name):a.recipe.level-b.recipe.level||a.recipe.name.localeCompare(b.recipe.name)),[state,profession,craftableOnly,query,sort]);
 return <View style={s.root}>
  <Text style={s.title}>Crafting</Text><Text style={s.sub}>Uses the same authoritative recipes and materials as skill crafting. Materials are taken from Inventory first, then Bank.</Text>
  <SearchField value={query} onChangeText={value=>{setQuery(value);setLimit(20)}} placeholder="Search recipes…" placeholderTextColor={C.muted}/>
  <View style={s.toolbar}><View style={s.flex}><GameButton title={`Filters${active?` · ${active}`:''} ▾`} tone={active?'primary':'secondary'} onPress={()=>setFiltersOpen(true)}/></View><View style={s.flex}><GameButton title={`Sort: ${sort==='level'?'Level':'Name'} ▾`} tone="secondary" onPress={()=>setFiltersOpen(true)}/></View></View>
  <Text style={s.count}>{recipes.length} recipes shown</Text>
  {recipes.slice(0,limit).map(({recipe,status})=><RecipeCard key={recipe.id} state={state} recipe={recipe} status={status} onCraft={onCraft}/>)}
  {recipes.length>limit?<GameButton title={`Show more recipes (${recipes.length-limit} remaining)`} tone="secondary" onPress={()=>setLimit(value=>value+20)}/>:null}
  {!recipes.length?<Text style={s.empty}>No recipes match these filters.</Text>:null}
  <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={()=>setFiltersOpen(false)}><View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setFiltersOpen(false)}/><View style={s.sheet}><Text style={s.title}>Crafting Filters</Text><Text style={s.label}>Profession</Text>{(['all','smithing','cooking'] as const).map(value=><Pressable key={value} onPress={()=>setProfession(value)} style={[s.option,profession===value&&s.optionActive]}><Text style={s.optionText}>{profession===value?'✓ ':''}{value==='all'?'All professions':value[0].toUpperCase()+value.slice(1)}</Text></Pressable>)}<Text style={s.label}>Availability</Text><Pressable onPress={()=>setCraftableOnly(false)} style={[s.option,!craftableOnly&&s.optionActive]}><Text style={s.optionText}>{!craftableOnly?'✓ ':''}All recipes</Text></Pressable><Pressable onPress={()=>setCraftableOnly(true)} style={[s.option,craftableOnly&&s.optionActive]}><Text style={s.optionText}>{craftableOnly?'✓ ':''}Craftable now</Text></Pressable><Text style={s.label}>Sort by</Text>{(['level','name'] as const).map(value=><Pressable key={value} onPress={()=>setSort(value)} style={[s.option,sort===value&&s.optionActive]}><Text style={s.optionText}>{sort===value?'✓ ':''}{value==='level'?'Required level':'Name'}</Text></Pressable>)}<View style={s.toolbar}><View style={s.flex}><GameButton title="Reset" tone="secondary" onPress={()=>{setProfession('all');setCraftableOnly(false);setSort('level')}}/></View><View style={s.flex}><GameButton title="Apply Filters" onPress={()=>setFiltersOpen(false)}/></View></View></View></View></Modal>
 </View>;
}
const s=StyleSheet.create({root:{gap:spacing.md},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},toolbar:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},count:{...typography.caption,color:C.muted},empty:{...typography.body,color:C.muted,textAlign:'center',padding:20},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},sheet:{backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,padding:spacing.lg,gap:8},label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:8},option:{minHeight:48,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},optionActive:{borderColor:C.accent,backgroundColor:C.panel2},optionText:{color:C.text,fontWeight:'800'}});
