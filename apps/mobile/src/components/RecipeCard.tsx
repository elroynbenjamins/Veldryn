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
import {equipmentCraftDurationSeconds,equipmentCraftQueueModel,timedEquipmentRecipe} from '../core/equipment-crafting-queue';
import {formatQueueTimeV31} from '../core/equipment-crafting-v31';
import {equipmentPrerequisiteCraftability} from '../core/equipment-crafting-prerequisites';

export function RecipeCard({state,recipe,status,onCraft,onNavigate,onCraftPrerequisites}:{state:GameState;recipe:Recipe;status:ReturnType<typeof recipeAvailability>;onCraft:(id:string)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void;onCraftPrerequisites?:(recipeId:string)=>void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const [expanded,setExpanded]=useState(false),output=itemDef(recipe.output.itemId),craftPath=output.type==='gear'?equipmentCraftingPath(state,output.id):undefined,timed=Boolean(timedEquipmentRecipe(recipe.id)),prereq=timed?equipmentPrerequisiteCraftability(state,recipe.id):undefined;
 const queue=timed?equipmentCraftQueueModel(state,Date.now()):undefined,duration=timed?equipmentCraftDurationSeconds(state,recipe.id):0,forgeFull=timed&&queue!.freeSlots<=0&&queue!.freeWaiting<=0,willWait=timed&&queue!.freeSlots<=0&&!forgeFull,craftReady=status.ready&&!forgeFull;
 const f=(value:number)=>formatGameNumber(value,state.settings.numberMode),skillLevel=state.skills.find(row=>row.skillId===recipe.skillId)?.level??1,characterLevel=state.character?.level??1;
 const skillLocked=skillLevel<recipe.level,characterLocked=characterLevel<(recipe.characterLevel??1),readyInputs=status.inputs.filter(i=>i.inventory+i.bank>=i.quantity).length;
 const statusText=forgeFull?'Forge + backlog full':skillLocked?'Unlocks at '+recipe.skillId+' level '+recipe.level:characterLocked?'Requires character level '+recipe.characterLevel:craftReady?(timed?(willWait?'Ready to queue':'Ready to start'):'Ready to craft'):status.reason;
 const statusStyle=craftReady?s.ready:skillLocked||characterLocked?s.locked:s.blocked;
 return <View style={s.card}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={recipe.name+(craftReady?', ready to craft':', '+statusText)} onPress={()=>setExpanded(value=>!value)} style={s.head}>
   <ItemArtwork itemId={output.id} size={48}/>
   <View style={s.copy}><Text style={s.title}>{output.name}</Text><Text style={s.sub}>Makes {f(recipe.output.quantity)} · +{f(recipe.xp)} XP · {f(recipe.gold)} Gold</Text><Text numberOfLines={2} style={statusStyle}>{statusText}{!craftReady&&!skillLocked&&!characterLocked&&status.inputs.length?' · '+readyInputs+'/'+status.inputs.length+' materials ready':''}</Text></View>
   <UiIcon name={expanded?'close':'next'} size={24}/>
  </Pressable>
  {expanded?<View style={s.details}>
   <Text style={s.sub}>Cost {f(recipe.gold)} Gold · +{f(recipe.xp)} skill XP</Text>
   {recipe.v33EquipmentTier?<Text style={s.v33Meta}>{recipe.v33EquipmentTier} · {recipe.v33Region} · {recipe.v33Path}</Text>:null}
   {output.type==='food'?<Text style={s.ready}>Restores {f(output.heal??0)} HP</Text>:null}
   {output.type==='gear'?<Text style={s.sub}>ATK {output.attack??0} · DEF {output.defense??0} · HP {output.hp??0}</Text>:null}
   {output.type==='tool'?<Text style={s.sub}>Tier {output.toolTier} · {Math.round((1-(output.actionTimeMultiplier??1))*100)}% shorter action time</Text>:null}
   <IngredientList inputs={status.inputs} numberMode={state.settings.numberMode} showStorage/>
   {craftPath&&onNavigate&&craftPath.ingredients.some(row=>row.missing>0)?<View style={s.sourceBox}><Text style={s.sourceTitle}>MISSING MATERIAL SOURCES</Text>{craftPath.ingredients.filter(row=>row.missing>0).map(row=><Pressable key={row.itemId} accessibilityRole="button" accessibilityLabel={'Find '+row.name} onPress={()=>onNavigate(row.source)} style={({pressed})=>[s.sourceRow,pressed&&s.pressed]}><View style={s.copy}><Text style={s.sourceName}>{row.name} · {row.missing} missing</Text><Text style={s.sub}>{row.availability.detail}</Text></View><Text style={[s.sourceState,row.availability.status==='ready'?s.sourceReady:row.availability.status==='travel'?s.sourceTravel:s.sourceLocked]}>{row.availability.label} ›</Text></Pressable>)}</View>:null}
   {timed&&prereq?.available&&onCraftPrerequisites?<GameButton title={'Craft prerequisites · '+prereq.processableMissing} tone="secondary" onPress={()=>onCraftPrerequisites(recipe.id)}/>:null}
   <View style={[s.statusCallout,craftReady?s.readySurface:s.missingSurface]}><Text style={statusStyle}>{forgeFull?'All '+(queue?.slotInfo.capacity??3)+' active slots and all '+(queue?.waitingCapacity??5)+' waiting spaces are occupied':timed&&status.ready?(willWait?'Active slots are busy · reserves materials and joins waiting '+(queue!.waiting+1)+'/'+queue!.waitingCapacity:'Uses one account-wide slot for '+formatQueueTimeV31(duration)):status.reason}</Text></View>
   <GameButton title={timed?(willWait?'Queue craft · '+formatQueueTimeV31(duration):'Start craft · '+formatQueueTimeV31(duration)):'Craft '+f(recipe.output.quantity)+'× '+output.name} disabled={!craftReady} onPress={()=>onCraft(recipe.id)}/>
  </View>:null}
 </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden'},head:{minHeight:96,flexDirection:'row',alignItems:'center',gap:12,padding:11},copy:{flex:1,minWidth:0,gap:3},title:{...typography.bodyStrong,fontSize:16,lineHeight:22,color:C.text},sub:{...typography.caption,color:C.muted},ready:{...typography.caption,color:C.good,fontWeight:'800'},locked:{...typography.caption,color:C.warning,fontWeight:'800'},blocked:{...typography.caption,color:C.info,fontWeight:'800'},
 statusCallout:{padding:spacing.sm,borderWidth:1,borderRadius:8},readySurface:{borderColor:C.good,backgroundColor:C.goodSurface},missingSurface:{borderColor:C.warning,backgroundColor:C.warningSurface},v33Meta:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
 sourceBox:{gap:4,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},sourceTitle:{fontSize:8,lineHeight:11,color:C.muted,fontWeight:'900',letterSpacing:.7},sourceRow:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,paddingVertical:5},sourceName:{...typography.caption,color:C.text,fontWeight:'800'},sourceState:{fontSize:8,lineHeight:11,fontWeight:'900'},sourceReady:{color:C.good},sourceTravel:{color:C.info},sourceLocked:{color:C.warning},pressed:{opacity:.72},details:{padding:14,gap:9,borderTopWidth:1,borderColor:C.line}
});}
