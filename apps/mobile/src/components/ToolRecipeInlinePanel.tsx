import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import type {GatheringToolDef} from '../content/gathering-tools';
import type {WorkingTowardDestination} from '../core/working-toward';
import {workingTowardItemSourceEntries} from '../core/working-toward';
import {MONSTERS} from '../content/monsters';
import {recipeAvailability} from '../core/playability';
import {formatGameNumber} from '../core/number-format';
import {localizedItemName} from '../i18n/starter-item-names';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
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
  const f=(amount:number)=>formatGameNumber(amount,state.settings.numberMode,language);
  const count=(id:string)=>[...state.inventory.stacks,...state.bank.stacks].reduce((total,stack)=>total+(stack.itemId===id?stack.quantity:0),0);
  const recipeId='CRAFT_'+tool.id,availability=recipeAvailability(state,recipeId);
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
      <View style={s.stat}><Text style={s.statLabel}>{gl('Gathering')+' '+gt('Level')}</Text><Text style={[s.statValue,{color:skillReady?C.good:C.warning}]}>{gl(tool.skillId)} {tool.unlockLevel}{skillReady?' ✓':''}</Text></View>
      <View style={s.stat}><Text style={s.statLabel}>{gt('Character level')}</Text><Text style={[s.statValue,{color:characterReady?C.good:C.warning}]}>{tool.requiredCharacterLevel}{characterReady?' ✓':''}</Text></View>
      <View style={s.stat}><Text style={s.statLabel}>{gt('Action speed')}</Text><Text style={[s.statValue,{color:C.info}]}>{Math.round((1-tool.actionTimeMultiplier)*100)}% {gt('faster')}</Text></View>
    </View>
    <Text style={[s.blueprintText,{color:learned?C.good:blueprintHeld?C.info:C.warning}]}>{blueprintStatus}</Text>
    {!learned&&tool.blueprint?<View style={s.sourcePanel}>
      <Text style={s.sourceHeadline}>{monster?monster.name+' · '+monster.zone:gt('Blueprint source unavailable')}</Text>
      <Text style={s.sourceCopy}>{drop?gt('Monster drop')+' · '+(drop.chance*100).toFixed(drop.chance<.01?2:1)+'%':gt('Blueprint required before first craft')}</Text>
      {blueprintDestination&&onNavigate?<GameButton compact tone="secondary" title={gt('Hunt source')} onPress={()=>onNavigate(blueprintDestination)}/>:null}
    </View>:null}
    <View style={s.materialHeading}>
      <Text style={s.sectionTitle}>{gt('Materials')}</Text>
      <Text style={s.small}>{gt('Owned / required')} · {gt('Inventory + Bank')}</Text>
    </View>
    {inputs.map(input=>{
      const enough=input.owned>=input.quantity,source=input.sources.find(row=>row.availability.canNavigate);
      return <View key={input.itemId} style={s.ingredient}>
        <ItemArtwork itemId={input.itemId} size={32}/>
        <View style={s.ingredientCopy}>
          <Text style={s.itemName}>{localizedItemName(language,input.itemId)}</Text>
          {!enough&&source?<Text numberOfLines={2} style={s.sourceCopy}>{source.destination.detail}</Text>:null}
          {!enough&&!source?<Text style={s.sourceCopy}>{gt('Source information unavailable')}</Text>:null}
        </View>
        <View style={s.right}>
          <Text style={[s.quantity,{color:enough?C.good:C.warning}]}>{f(input.owned)} / {f(input.quantity)}</Text>
          {!enough&&source&&onNavigate?<Pressable accessibilityRole="button" accessibilityLabel={gt('Find source')+': '+localizedItemName(language,input.itemId)} onPress={()=>onNavigate(source.destination)} style={({pressed})=>[s.sourceLink,pressed&&s.pressed]}><Text style={s.sourceLinkText}>{source.availability.label} ›</Text></Pressable>:null}
        </View>
      </View>;
    })}
    <View style={s.costRow}>
      <Text style={s.cost}>{f(tool.recipe.gold)} {gl('Gold')} · +{f(tool.recipe.xp)} XP</Text>
      <Text style={[s.cost,{color:goldReady?C.good:C.warning}]}>{goldReady?gt('Gold ready'):gt('Not enough gold')}</Text>
    </View>
    <Text accessibilityLiveRegion="polite" style={[s.status,{color:availability.ready?C.good:C.warning}]}>{availability.ready?gt('Ready to craft'):availability.reason}</Text>
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
  ingredient:{minHeight:52,flexDirection:'row',alignItems:'center',gap:9,paddingVertical:5,borderTopWidth:1,borderTopColor:C.line},
  ingredientCopy:{flex:1,minWidth:0,gap:3},itemName:{...typography.caption,color:C.text,fontWeight:'800'},
  right:{alignItems:'flex-end',gap:3,maxWidth:116},quantity:{...typography.caption,fontWeight:'900',textAlign:'right'},
  sourceLink:{minHeight:44,minWidth:58,justifyContent:'center',alignItems:'flex-end'},sourceLinkText:{...typography.caption,color:C.info,fontWeight:'800'},
  costRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:5,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},
  cost:{...typography.caption,color:C.text,fontWeight:'700'},
  status:{...typography.caption,fontWeight:'800'},actions:{flexDirection:'row',justifyContent:'flex-end'},
  actionsCompact:{flexDirection:'column'},openButton:{flexGrow:1},
  pressed:{opacity:.7}
});}
