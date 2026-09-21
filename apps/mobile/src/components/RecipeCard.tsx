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
export function RecipeCard({state,recipe,status,onCraft}:{state:GameState;recipe:Recipe;status:ReturnType<typeof recipeAvailability>;onCraft:(id:string)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const [expanded,setExpanded]=useState(false),output=itemDef(recipe.output.itemId);
 const f=(value:number)=>formatGameNumber(value,state.settings.numberMode);
 const readyInputs=status.inputs.filter(i=>i.inventory+i.bank>=i.quantity).length;
 return <View style={s.card}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={recipe.name+(status.ready?', ready to craft':', requirements missing')} onPress={()=>setExpanded(v=>!v)} style={s.head}>
   <ItemArtwork itemId={output.id} size={48}/><View style={s.copy}><Text style={s.title}>{output.name}</Text><Text style={s.sub}>Makes {f(recipe.output.quantity)} · {recipe.skillId} Lv. {recipe.level}</Text><Text style={status.ready?s.ready:s.sub}>{status.ready?'Ready to craft':`${readyInputs}/${status.inputs.length} materials ready`}</Text></View><UiIcon name={expanded?'close':'next'} size={24}/>
  </Pressable>
  {expanded&&<View style={s.details}><Text style={s.sub}>{f(recipe.gold)} gold · +{f(recipe.xp)} skill XP</Text>{output.type==='food'&&<Text style={s.ready}>Restores {f(output.heal??0)} HP</Text>}{output.type==='gear'&&<Text style={s.sub}>ATK {output.attack??0} · DEF {output.defense??0} · HP {output.hp??0}</Text>}{output.type==='tool'&&<Text style={s.sub}>Tier {output.toolTier} · {Math.round((1-(output.actionTimeMultiplier??1))*100)}% shorter action time</Text>}
   <IngredientList inputs={status.inputs} numberMode={state.settings.numberMode} showStorage/>
   <View style={[s.statusCallout,status.ready?s.readySurface:s.missingSurface]}><Text style={status.ready?s.ready:s.reason}>{status.reason}</Text></View><GameButton title={`Craft ${f(recipe.output.quantity)}× ${output.name}`} disabled={!status.ready} onPress={()=>onCraft(recipe.id)}/>
  </View>}
 </View>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden'},head:{minHeight:100,flexDirection:'row',alignItems:'center',gap:12,padding:12},copy:{flex:1,minWidth:0,gap:3},title:{...typography.bodyStrong,fontSize:16,lineHeight:23,color:C.text},sub:{...typography.caption,color:C.muted},statusCallout:{padding:spacing.sm,borderWidth:1,borderRadius:8},readySurface:{borderColor:C.good,backgroundColor:C.goodSurface},missingSurface:{borderColor:C.warning,backgroundColor:C.warningSurface},ready:{...typography.caption,color:C.good},reason:{...typography.body,color:C.warning},details:{padding:16,gap:10,borderTopWidth:1,borderColor:C.line}});}
