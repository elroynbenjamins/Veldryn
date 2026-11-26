import {useGameplayText} from '../i18n/gameplay';
import {useMemo,useState} from 'react';
import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {RECIPES} from '../content/skills';
import {recipeAvailability} from '../core/playability';
import {isWinterHearthLightRecipe,winterHearthContentVisible} from '../core/winter-hearth-2026';
import {RecipeCard} from './RecipeCard';
import {SearchField} from './SearchField';
import {GameButton} from './GameButton';
import {C,radii,spacing,typography} from '../theme/theme';

type Profession='all'|'smithing'|'cooking';
type Sort='level'|'name';
export function InventoryCraftingPanel({state,onCraft}:{state:GameState;onCraft:(recipeId:string)=>void}){
 const {gt,gl,language}=useGameplayText();
 const [query,setQuery]=useState(''),[profession,setProfession]=useState<Profession>('all'),[craftableOnly,setCraftableOnly]=useState(false),[sort,setSort]=useState<Sort>('level'),[filtersOpen,setFiltersOpen]=useState(false),[limit,setLimit]=useState(20);
 const active=(profession==='all'?0:1)+(craftableOnly?1:0);
 const q=query.trim().toLowerCase(),winterHearthVisible=winterHearthContentVisible(state);
 // Cheap catalog filters first. Without the craftable filter, only visible
 // cards require a potentially expensive pure craft/queue availability check.
 const candidates=useMemo(()=>RECIPES.filter(recipe=>(!isWinterHearthLightRecipe(recipe.id)||winterHearthVisible)&&(profession==='all'||recipe.skillId===profession)&&(!q||(recipe.name+' '+recipe.output.itemId).toLowerCase().includes(q))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):a.level-b.level||a.name.localeCompare(b.name)),[profession,q,sort,winterHearthVisible]);
 const craftable=useMemo(()=>craftableOnly?candidates.map(recipe=>({recipe,status:recipeAvailability(state,recipe.id)})).filter(row=>row.status.ready):null,[state,candidates,craftableOnly]);
 const count=craftable?.length??candidates.length;
 const visible=useMemo(()=>craftable?craftable.slice(0,limit):candidates.slice(0,limit).map(recipe=>({recipe,status:recipeAvailability(state,recipe.id)})),[state,candidates,craftable,limit]);
 return <View style={s.root}>
  <Text style={s.title}>{gt("Crafting")}</Text>
  <SearchField value={query} onChangeText={value=>{setQuery(value);setLimit(20)}} placeholder={gt("Search recipes…")} placeholderTextColor={C.muted}/>
  <View style={s.toolbar}><View style={s.flex}><GameButton title={`${gt("Crafting Filters")}${active?` · ${active}`:''} · ${sort==='level'?gt("Level"):gt("Name")}`} tone={active?'primary':'secondary'} onPress={()=>setFiltersOpen(true)}/></View></View>
  <Text style={s.count}>{count} recipes shown</Text>
  {visible.map(({recipe,status})=><RecipeCard key={recipe.id} state={state} recipe={recipe} status={status} onCraft={onCraft}/>)}
  {count>limit?<GameButton title={`Show more recipes (${count-limit} remaining)`} tone="secondary" onPress={()=>setLimit(value=>value+20)}/>:null}
  {!count?<Text style={s.empty}>{gt("No recipes match these filters.")}</Text>:null}
  <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={()=>setFiltersOpen(false)}><View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setFiltersOpen(false)}/><View style={s.sheet}><Text style={s.title}>{gt("Crafting Filters")}</Text><Text style={s.label}>{gt("Profession")}</Text>{(['all','smithing','cooking'] as const).map(value=><Pressable key={value} onPress={()=>setProfession(value)} style={[s.option,profession===value&&s.optionActive]}><Text style={s.optionText}>{profession===value?'✓ ':''}{value==='all'?gt("All professions"):value[0].toUpperCase()+value.slice(1)}</Text></Pressable>)}<Text style={s.label}>{gt("Availability")}</Text><Pressable onPress={()=>setCraftableOnly(false)} style={[s.option,!craftableOnly&&s.optionActive]}><Text style={s.optionText}>{!craftableOnly?'✓ ':''}{gt("All recipes")}</Text></Pressable><Pressable onPress={()=>setCraftableOnly(true)} style={[s.option,craftableOnly&&s.optionActive]}><Text style={s.optionText}>{craftableOnly?'✓ ':''}{gt("Craftable now")}</Text></Pressable><Text style={s.label}>{gt("Sort by")}</Text>{(['level','name'] as const).map(value=><Pressable key={value} onPress={()=>setSort(value)} style={[s.option,sort===value&&s.optionActive]}><Text style={s.optionText}>{sort===value?'✓ ':''}{value==='level'?gt("Required level"):gt("Name")}</Text></Pressable>)}<View style={s.toolbar}><View style={s.flex}><GameButton title={gt("Reset")} tone="secondary" onPress={()=>{setProfession('all');setCraftableOnly(false);setSort('level')}}/></View><View style={s.flex}><GameButton title={gt("Apply Filters")} onPress={()=>setFiltersOpen(false)}/></View></View></View></View></Modal>
 </View>;
}
const s=StyleSheet.create({root:{gap:spacing.md},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},toolbar:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},count:{...typography.caption,color:C.muted},empty:{...typography.body,color:C.muted,textAlign:'center',padding:20},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},sheet:{backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,padding:spacing.lg,gap:8},label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:8},option:{minHeight:48,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},optionActive:{borderColor:C.accent,backgroundColor:C.panel2},optionText:{color:C.text,fontWeight:'800'}});
