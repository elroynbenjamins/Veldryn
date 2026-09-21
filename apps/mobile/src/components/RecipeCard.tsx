import {useState,useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import {GameState} from '../core/types';
import {recipeAvailability} from '../core/playability';
import {formatGameNumber} from '../core/number-format';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ItemArtwork} from './ItemArtwork';
import {IngredientList} from './IngredientList';
import {GameButton} from './GameButton';
import {UiIcon} from './UiIcon';
import {equipmentCraftingPath} from '../core/equipment-crafting-path';
import type {WorkingTowardDestination} from '../core/working-toward';
export function RecipeCard({state,recipe,status,onCraft,onNavigate}:{state:GameState;recipe:Recipe;status:ReturnType<typeof recipeAvailability>;onCraft:(id:string)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const [expanded,setExpanded]=useState(false),output=itemDef(recipe.output.itemId),craftPath=output.type==='gear'?equipmentCraftingPath(state,output.id):undefined;
 const f=(value:number)=>formatGameNumber(value,state.settings.numberMode);
 const readyInputs=status.inputs.filter(i=>i.inventory+i.bank>=i.quantity).length;
 return <View style={s.card}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={recipe.name+(status.ready?', ready to craft':', requirements missing')} onPress={()=>setExpanded(v=>!v)} style={s.head}>
   <ItemArtwork itemId={output.id} size={48}/><View style={s.copy}><Text style={s.title}>{output.name}</Text><Text style={s.sub}>Makes {f(recipe.output.quantity)} · {recipe.skillId} Lv. {recipe.level}</Text><Text style={status.ready?s.ready:s.sub}>{status.ready?'Ready to craft':`${readyInputs}/${status.inputs.length} materials ready`}</Text></View><UiIcon name={expanded?'close':'next'} size={24}/>
  </Pressable>
  {expanded&&<View style={s.details}><Text style={s.sub}>{f(recipe.gold)} gold · +{f(recipe.xp)} skill XP</Text>{recipe.v33EquipmentTier&&<Text style={s.v33Meta}>{recipe.v33EquipmentTier} · {recipe.v33Region} · {recipe.v33Path}</Text>}{output.type==='food'&&<Text style={s.ready}>Restores {f(output.heal??0)} HP</Text>}{output.type==='gear'&&<Text style={s.sub}>ATK {output.attack??0} · DEF {output.defense??0} · HP {output.hp??0}</Text>}{output.type==='tool'&&<Text style={s.sub}>Tier {output.toolTier} · {Math.round((1-(output.actionTimeMultiplier??1))*100)}% shorter action time</Text>}
   <IngredientList inputs={status.inputs} numberMode={state.settings.numberMode} showStorage/>
   {craftPath&&onNavigate&&craftPath.ingredients.some(row=>row.missing>0)&&<View style={s.sourceBox}><Text style={s.sourceTitle}>MISSING MATERIAL SOURCES</Text>{craftPath.ingredients.filter(row=>row.missing>0).map(row=><Pressable key={row.itemId} accessibilityRole="button" accessibilityLabel={'Find '+row.name} onPress={()=>onNavigate(row.source)} style={({pressed})=>[s.sourceRow,pressed&&s.pressed]}><View style={s.copy}><Text style={s.sourceName}>{row.name} · {row.missing} missing</Text><Text style={s.sub}>{row.availability.detail}</Text></View><Text style={[s.sourceState,row.availability.status==='ready'?s.sourceReady:row.availability.status==='travel'?s.sourceTravel:s.sourceLocked]}>{row.availability.label} ›</Text></Pressable>)}</View>}
   <View style={[s.statusCallout,status.ready?s.readySurface:s.missingSurface]}><Text style={status.ready?s.ready:s.reason}>{status.reason}</Text></View><GameButton title={`Craft ${f(recipe.output.quantity)}× ${output.name}`} disabled={!status.ready} onPress={()=>onCraft(recipe.id)}/>
  </View>}
 </View>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden'},head:{minHeight:100,flexDirection:'row',alignItems:'center',gap:12,padding:12},copy:{flex:1,minWidth:0,gap:3},title:{...typography.bodyStrong,fontSize:16,lineHeight:23,color:C.text},sub:{...typography.caption,color:C.muted},statusCallout:{padding:spacing.sm,borderWidth:1,borderRadius:8},readySurface:{borderColor:C.good,backgroundColor:C.goodSurface},missingSurface:{borderColor:C.warning,backgroundColor:C.warningSurface},ready:{...typography.caption,color:C.good},reason:{...typography.body,color:C.warning},v33Meta:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},sourceBox:{gap:4,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},sourceTitle:{fontSize:8,lineHeight:11,color:C.muted,fontWeight:'900',letterSpacing:.7},sourceRow:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,paddingVertical:5},sourceName:{...typography.caption,color:C.text,fontWeight:'800'},sourceState:{fontSize:8,lineHeight:11,fontWeight:'900'},sourceReady:{color:C.good},sourceTravel:{color:C.info},sourceLocked:{color:C.warning},pressed:{opacity:.72},details:{padding:16,gap:10,borderTopWidth:1,borderColor:C.line}});}
