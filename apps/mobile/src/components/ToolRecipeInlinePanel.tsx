import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import type {GatheringToolDef} from '../content/gathering-tools';
import type {WorkingTowardDestination} from '../core/working-toward';
import {workingTowardItemSourceEntries} from '../core/working-toward';
import {MONSTERS} from '../content/monsters';
import {equipmentCraftAvailability,equipmentCraftDurationSeconds} from '../core/equipment-crafting-queue';
import {formatGameNumber} from '../core/number-format';
import {localizedItemName} from '../i18n/starter-item-names';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {typography,type ThemeColors} from '../theme/theme';
import {ItemArtwork} from './ItemArtwork';
import {GameButton} from './GameButton';

/** Read-only recipe preview. Smithing owns crafting and authoritative gameplay validation. */
export function ToolRecipeInlinePanel({state,tool,blueprintDestination,onNavigate,onOpenSmithing}:{
  state:GameState;tool:GatheringToolDef;blueprintDestination?:WorkingTowardDestination;
  onNavigate?:(destination:WorkingTowardDestination)=>void;onOpenSmithing:()=>void;
}){
  const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const {width,fontScale}=useWindowDimensions(),compact=width<380||fontScale>=1.25;
  const [otherSourcesOpen,setOtherSourcesOpen]=useState<Record<string,boolean>>({});
  const f=(amount:number)=>formatGameNumber(amount,state.settings.numberMode,language);
  const count=(id:string)=>[...state.inventory.stacks,...state.bank.stacks].reduce((total,stack)=>total+(stack.itemId===id?stack.quantity:0),0);
  const recipeId='CRAFT_'+tool.id,availability=equipmentCraftAvailability(state,recipeId),craftingSeconds=equipmentCraftDurationSeconds(state,recipeId);
  const craftingTime=craftingSeconds<60?Math.ceil(craftingSeconds)+'s':Math.ceil(craftingSeconds/60)+'m';
  const learned=!tool.blueprint||(state.account.unlockedKnowledgeIds??[]).includes(tool.blueprint.knowledgeId);
  const blueprintHeld=tool.blueprint?count(tool.blueprint.itemId)>0:false;
  const monster=tool.blueprint?MONSTERS.find(row=>row.id===tool.blueprint!.sourceMonsterId):undefined;
  const drop=monster?.drops.find(row=>row.itemId===tool.blueprint?.itemId);
  const skillLevel=state.skills.find(row=>row.skillId===tool.skillId)?.level??0;
  const characterLevel=state.character?.level??0;
  const skillReady=skillLevel>=tool.unlockLevel,characterReady=characterLevel>=tool.requiredCharacterLevel;
  const goldReady=(state.character?.gold??0)>=tool.recipe.gold;
  const inputs=tool.recipe.inputs.map(input=>({
    ...input,owned:count(input.itemId),
    sources:workingTowardItemSourceEntries(state,input.itemId),
  }));
  const missing=inputs.filter(row=>row.owned<row.quantity);
  const blueprintStatus=!tool.blueprint?gt('Recipe known'):learned?gt('Blueprint learned permanently'):blueprintHeld?gt('Blueprint owned · consumed once when recipe is learned'):gt('Blueprint required before first craft');
  return <View style={s.root} accessibilityLabel={localizedItemName(language,tool.id)+' '+gt('Recipe details')}>
    <View style={s.heading}>
      <View style={s.headingCopy}>
        <Text style={s.eyebrow}>{gt('CRAFTING RECIPE')} · {gl('Smithing')}</Text>
        <Text style={s.title}>{localizedItemName(language,tool.id)}</Text>
      </View>
      <Text style={[s.badge,{color:learned?C.good:blueprintHeld?C.info:C.warning,borderColor:learned?C.good:blueprintHeld?C.info:C.warning}]}>{learned?gt('KNOWN'):blueprintHeld?gt('OWNED'):gt('BLUEPRINT')}</Text>
    </View>
    <View style={s.statRow}>
      <View style={s.stat}><Text style={s.statLabel}>{gl(tool.skillId)}</Text><Text style={[s.statValue,{color:skillReady?C.good:C.warning}]}>{gt('Level {value}',{value:tool.unlockLevel})}{skillReady?' ✓':''}</Text></View>
      <View style={s.stat}><Text style={s.statLabel}>{gt('Character level')}</Text><Text style={[s.statValue,{color:characterReady?C.good:C.warning}]}>{tool.requiredCharacterLevel}{characterReady?' ✓':''}</Text></View>
      <View style={s.stat}><Text style={s.statLabel}>{gt('Action time')}</Text><Text style={[s.statValue,{color:C.info}]}>{Math.round((1-tool.actionTimeMultiplier)*100)}% {gt('shorter')}</Text></View>
    </View>
    <Text style={s.cost}>{gt('Crafting time')} · {craftingTime} · {gt('Forge')}</Text>
    <Text style={[s.blueprintText,{color:learned?C.good:blueprintHeld?C.info:C.warning}]}>{blueprintStatus}</Text>
    {!learned&&tool.blueprint&&!blueprintHeld?<View style={s.sourcePanel}>
      <Text style={s.sourceHeadline}>{monster?monster.name+' · '+monster.zone:gt('Blueprint source unavailable')}</Text>
      <Text style={s.sourceCopy}>{drop?gt('Monster drop')+' · '+(drop.chance*100).toFixed(drop.chance<.01?2:1)+'%':gt('Blueprint required before first craft')}</Text>
      {blueprintDestination&&onNavigate?<GameButton compact tone="secondary" title={gt('Hunt source')} onPress={()=>onNavigate(blueprintDestination)}/>:null}
    </View>:null}
    <View style={s.materialHeading}>
      <Text style={s.sectionTitle}>{gt('Materials')}</Text>
      <Text style={s.small}>{gt('Owned / required')} · {missing.length?missing.length+' '+gt('missing'):gt('All materials ready')} · {gt('Inventory + Bank')}</Text>
    </View>
    {inputs.map(input=>{
      const enough=input.owned>=input.quantity,source=input.sources.find(row=>row.availability.canNavigate);
      const others=input.sources.filter(row=>row!==source).slice(0,4);
      const progress=Math.max(0,Math.min(100,Math.round(input.owned/Math.max(1,input.quantity)*100)));
      return <View key={input.itemId} style={s.ingredientGroup}>
        <View style={s.ingredient}>
          <ItemArtwork itemId={input.itemId} size={32}/>
          <View style={s.ingredientCopy}>
            <Text style={s.itemName}>{localizedItemName(language,input.itemId)}</Text>
            <View style={s.materialTrack}><View style={[s.materialFill,{backgroundColor:enough?C.good:C.warning,width:(progress+'%') as `${number}%`}]}/></View>
            {!enough&&source?<Text numberOfLines={2} style={s.sourceCopy}>{source.availability.label} · {source.destination.detail}</Text>:null}
            {!enough&&!source?<Text style={s.sourceCopy}>{gt('Source information unavailable')}</Text>:null}
          </View>
          <View style={s.right}>
            <Text style={[s.quantity,{color:enough?C.good:C.warning}]}>{f(input.owned)} / {f(input.quantity)}</Text>
            {!enough&&source&&onNavigate?<Pressable accessibilityRole="button" accessibilityLabel={gt('Find source')+': '+localizedItemName(language,input.itemId)} onPress={()=>onNavigate(source.destination)} style={({pressed})=>[s.sourceLink,pressed&&s.pressed]}><Text style={s.sourceLinkText}>{gt('Find source')} ›</Text></Pressable>:null}
          </View>
        </View>
        {!enough&&others.length>0&&onNavigate?<Pressable accessibilityRole="button" accessibilityLabel={gt('Other sources')+': '+localizedItemName(language,input.itemId)} accessibilityState={{expanded:!!otherSourcesOpen[input.itemId]}} onPress={()=>setOtherSourcesOpen(value=>({...value,[input.itemId]:!value[input.itemId]}))} style={s.otherToggle}><Text style={s.otherLabel}>{gt('Other sources')} · {others.length} {otherSourcesOpen[input.itemId]?'⌃':'⌄'}</Text></Pressable>:null}
        {!enough&&otherSourcesOpen[input.itemId]&&onNavigate?others.map((row,index)=><Pressable key={row.type+row.title+index} accessibilityRole="button" accessibilityLabel={row.title+' · '+row.availability.label} accessibilityState={{disabled:!row.availability.canNavigate}} disabled={!row.availability.canNavigate} onPress={()=>onNavigate(row.destination)} style={({pressed})=>[s.otherRow,pressed&&s.pressed]}><View style={s.ingredientCopy}><Text style={s.otherName}>{row.typeLabel} · {row.title}</Text><Text numberOfLines={2} style={s.sourceCopy}>{row.destination.detail}</Text></View><Text style={s.otherState}>{row.availability.label}{row.availability.canNavigate?' ›':''}</Text></Pressable>):null}
      </View>;
    })}
    <View style={s.costRow}>
      <Text style={s.cost}>{gt('Gold')} {f(state.character?.gold??0)} / {f(tool.recipe.gold)} · +{f(tool.recipe.xp)} {gt('base XP')}</Text>
      <Text style={[s.cost,{color:goldReady?C.good:C.warning}]}>{goldReady?gt('Gold ready'):gt('Not enough gold')}</Text>
    </View>
    <Text accessibilityLiveRegion="polite" style={[s.status,{color:availability.ready?C.good:C.warning}]}>{availability.ready?gt('Ready to queue'):availability.reason}</Text>
    {missing.length===0&&learned&&goldReady&&!availability.ready?<Text style={s.small}>{gt('Crafting availability is checked in Smithing.')}</Text>:null}
    <View style={[s.actions,compact&&s.actionsCompact]}>
      <GameButton title={gt('Open in Smithing')} onPress={onOpenSmithing} tone="primary" style={s.openButton}/>
    </View>
  </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
  root:{gap:10,marginTop:8,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel2},
  heading:{flexDirection:'row',gap:8,alignItems:'flex-start',justifyContent:'space-between'},
  headingCopy:{flex:1,minWidth:0,gap:3},eyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.5},
  title:{...typography.bodyStrong,color:C.text,flexShrink:1},
  badge:{fontSize:9,fontWeight:'900',borderWidth:1,borderRadius:6,paddingHorizontal:7,paddingVertical:5,overflow:'hidden'},
  statRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  stat:{flex:1,minWidth:105,backgroundColor:C.panel,padding:7,borderRadius:8,borderWidth:1,borderColor:C.line,gap:3},
  statLabel:{...typography.caption,color:C.muted},statValue:{...typography.caption,fontWeight:'800'},
  blueprintText:{...typography.caption,fontWeight:'800'},
  sourcePanel:{padding:9,borderRadius:8,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel,gap:6},
  sourceHeadline:{...typography.bodyStrong,color:C.text},sourceCopy:{...typography.caption,color:C.muted,flexShrink:1},
  materialHeading:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'baseline',gap:5},
  sectionTitle:{...typography.bodyStrong,color:C.text},small:{...typography.caption,color:C.muted},
  ingredientGroup:{borderTopWidth:1,borderTopColor:C.line,paddingVertical:3},
  ingredient:{minHeight:52,flexDirection:'row',alignItems:'center',gap:9,paddingVertical:5},
  ingredientCopy:{flex:1,minWidth:0,gap:4},itemName:{...typography.caption,color:C.text,fontWeight:'800'},
  materialTrack:{height:4,borderRadius:4,overflow:'hidden',backgroundColor:C.line},
  materialFill:{height:'100%',borderRadius:4},
  right:{alignItems:'flex-end',gap:3,maxWidth:116},quantity:{...typography.caption,fontWeight:'900',textAlign:'right'},
  sourceLink:{minHeight:44,minWidth:62,justifyContent:'center',alignItems:'flex-end'},sourceLinkText:{...typography.caption,color:C.info,fontWeight:'800',textAlign:'right'},
  otherToggle:{minHeight:44,alignSelf:'flex-start',justifyContent:'center',paddingHorizontal:2},
  otherLabel:{...typography.caption,color:C.info,fontWeight:'800'},
  otherRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:8,marginBottom:3,borderRadius:7,backgroundColor:C.panel,borderWidth:1,borderColor:C.line},
  otherName:{...typography.caption,color:C.text,fontWeight:'800'},
  otherState:{...typography.caption,color:C.info,fontWeight:'800'},
  costRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:5,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},
  cost:{...typography.caption,color:C.text,fontWeight:'700'},
  status:{...typography.caption,fontWeight:'800'},actions:{flexDirection:'row',justifyContent:'flex-end'},
  actionsCompact:{flexDirection:'column'},openButton:{flexGrow:1},
  pressed:{opacity:.7}
});}
