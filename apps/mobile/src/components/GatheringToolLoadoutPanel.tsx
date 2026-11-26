import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState,GatheringSkillId,ItemStack} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import type {WorkingTowardDestination} from '../core/working-toward';
import {gatheringToolsFor} from '../content/gathering-tools';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {equippedGatheringTools,equippedGatheringToolRoll,reservedGatheringTool,gatheringToolEffects} from '../core/gathering-tools';
import {gatheringToolContribution,gatheringToolTotalBreakdown,gatheringToolPercent} from '../core/gathering-tool-presentation';
import {gatheringToolBonusLabel,validateGatheringToolRoll} from '../core/gathering-tool-rolls';
import type {CraftedGatheringTool} from '../core/gathering-tool-rolls';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {useGameplayText} from '../i18n/gameplay';
import {localizedItemName} from '../i18n/starter-item-names';
import {GatheringToolArtwork} from './GatheringToolArtwork';
import {GameButton} from './GameButton';
import {DisclosureMark,DisclosureRow} from './DisclosureControl';
import {ToolRecipeInlinePanel} from './ToolRecipeInlinePanel';

type Tab='saved'|'bonuses'|'recipe';
type Tier=1|2|3|4;
interface Props{
 state:GameState;skillId:GatheringSkillId;
 onCommand:(command:GameCommand)=>Promise<void>;
 onInventory:()=>void;
 onWithdrawTool?:(id:string)=>void|Promise<void>;
 onViewToolRecipes:()=>void;
 onNavigateCraftingSource?:(destination:WorkingTowardDestination)=>void;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:.7,color:C.muted},
 sub:{fontSize:11,lineHeight:16,color:C.muted},
 info:{fontSize:12,color:C.info},
 good:{fontSize:12,color:C.good,fontWeight:'800'},
 title:{fontSize:16,color:C.text,fontWeight:'800',flexShrink:1},
 tiers:{gap:6},
 tier:{minWidth:0,minHeight:72,borderWidth:1,borderColor:C.lineStrong,borderRadius:9,backgroundColor:C.panel2,paddingVertical:8,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:8},
 tierCopy:{flex:1,minWidth:0,gap:3},
 tierSummary:{fontSize:11,color:C.info,flexShrink:1},
 metrics:{flexDirection:'row',flexWrap:'wrap',gap:6},
 metric:{flexGrow:1,flexBasis:88,minWidth:0,gap:3,padding:8,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:8},
 tierSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 tierLabel:{fontSize:11,color:C.text,fontWeight:'900'},
 tierCount:{fontSize:10,color:C.muted,fontWeight:'700',textAlign:'center'},
 tierActive:{color:C.good},
 details:{borderTopWidth:1,borderTopColor:C.line,paddingTop:12,gap:10},
 detailsHead:{flexDirection:'row',alignItems:'center',gap:9},
 detailsName:{fontSize:15,fontWeight:'800',color:C.text,flexShrink:1},
 headCopy:{flex:1,minWidth:0,gap:2},
 tabs:{flexDirection:'row',gap:4,borderBottomWidth:1,borderBottomColor:C.line,paddingBottom:7},
 tab:{flex:1,minWidth:0,minHeight:44,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'transparent',borderRadius:7},
 tabActive:{backgroundColor:C.selection,borderColor:C.lineStrong},
 tabText:{color:C.muted,fontSize:11,fontWeight:'800'},
 tabTextActive:{color:C.text},
 copy:{borderWidth:1,borderColor:C.lineStrong,borderRadius:9,backgroundColor:C.panel2,padding:10,gap:8},
 copyActive:{borderColor:C.good},
 copyHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7},
 copyLabel:{fontSize:13,color:C.text,fontWeight:'800'},
 copyBadge:{fontSize:10,fontWeight:'800',color:C.muted,borderWidth:1,borderColor:C.lineStrong,borderRadius:5,paddingHorizontal:6,paddingVertical:3},
 copyBadgeActive:{color:C.good,borderColor:C.good},
 copyActions:{flexDirection:'row',flexWrap:'wrap',gap:7},
 action:{flexGrow:1,flexBasis:128,minWidth:0},
 row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},
 rowLabel:{fontSize:12,color:C.muted,flexShrink:1},
 rowValue:{fontSize:12,color:C.text,fontWeight:'800',textAlign:'right',flexShrink:1},
 showTotals:{minHeight:44,padding:10,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,borderRadius:8,justifyContent:'center'},
 showTotalsText:{fontSize:11,color:C.info,fontWeight:'800'},
 totals:{gap:8,padding:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel2},
 totalValues:{flexDirection:'row',gap:5},
 total:{flex:1,minWidth:0,alignItems:'center',gap:4},
 totalNumber:{fontSize:17,color:C.text,fontWeight:'900'},
 totalCaption:{fontSize:10,color:C.muted,textAlign:'center'},
 note:{fontSize:11,lineHeight:17,color:C.muted},
 emptyHint:{fontSize:11,color:C.muted,lineHeight:17},
 inventoryChoice:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderTopWidth:1,borderTopColor:C.line},
 inventoryChoiceLabel:{flex:1,minWidth:0,fontSize:11,color:C.text},
 recipeView:{gap:8}
});}
function copyLabel(copy?:CraftedGatheringTool){
 return copy?copy.rarity+' · Q'+copy.quality+' · '+gatheringToolBonusLabel(copy):'Legacy · Uncommon · Q50 · Base bonus only';
}
/** Inventory copies are explicit receipts. No simulated bonuses are attached to
 * untracked legacy stacks. A generic stack may be consumed one at a time. */
function inventoryCopies(state:GameState,itemId:string){
 return state.inventory.stacks.filter(stack=>stack.itemId===itemId&&stack.quantity>0)
  .flatMap(stack=>{
   const copy=stack.instanceId?validateGatheringToolRoll(state.account.craftedGatheringToolInstances?.find(row=>row.id===stack.instanceId),itemId):undefined;
   return stack.instanceId&&!copy?[]:[{stack,copy}];
  });
}
export function GatheringToolLoadoutPanel({state,skillId,onCommand,onInventory,onWithdrawTool,onViewToolRecipes,onNavigateCraftingSource}:Props){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions(),small=width<360||fontScale>=1.3;
 const [opened,setOpened]=useState<Tier|null>(null);
 const [tab,setTab]=useState<Tab>('saved');
 const [totalsOpen,setTotalsOpen]=useState(false);
 const tools=gatheringToolsFor(skillId);
 if(!tools.length)return null;
 const equipped=equippedGatheringTools(state,skillId);
 const effects=gatheringToolEffects(state,skillId),totals=gatheringToolTotalBreakdown(effects);
 const storedCount=tools.reduce((sum,tool)=>sum+(equipped.some(entry=>entry.tier===tool.tier)?1:0)+(reservedGatheringTool(state,skillId,tool.tier)?1:0),0);
 const dispatch=(type:string,args:Record<string,unknown>)=>{void onCommand({type,args});};
 const selectTier=(tier:Tier)=>{setOpened(current=>current===tier?null:tier);setTab('saved');};
 const selected=opened===null?undefined:tools.find(tool=>tool.tier===opened);
 const active=selected?equipped.find(row=>row.tier===selected.tier):undefined;
 const activeCopy=selected?equippedGatheringToolRoll(state,skillId,selected.tier):undefined;
 const saved=selected?reservedGatheringTool(state,skillId,selected.tier):undefined;
 const held=selected?inventoryCopies(state,selected.id):[];
 const inBank=selected?state.bank.stacks.some(row=>row.itemId===selected.id&&row.quantity>0):false;
 const skillLevel=state.skills.find(row=>row.skillId===skillId)?.level??0;
 const characterLevel=state.character?.level??0;
 const skillReady=selected?skillLevel>=selected.unlockLevel:false;
 const characterReady=selected?characterLevel>=selected.requiredCharacterLevel:false;
 const canEquip=skillReady&&characterReady;
 const sourceMonster=selected?.blueprint?MONSTERS.find(row=>row.id===selected.blueprint?.sourceMonsterId):undefined;
 const sourceRegionId=sourceMonster?WORLD_ZONES.find(zone=>zone.name===sourceMonster.zone)?.id:undefined;
 const sourceChance=sourceMonster?.drops.find(row=>row.itemId===selected?.blueprint?.itemId)?.chance;
 const blueprintDestination=sourceMonster&&sourceRegionId&&selected?{
  kind:'combat' as const,monsterId:sourceMonster.id,zoneName:sourceMonster.zone,regionId:sourceRegionId,
  button:gt('Hunt {name}',{name:sourceMonster.name}),
  detail:gt('{name} can drop the {tool} Blueprint.',{name:sourceMonster.name,tool:selected.name})+' '+sourceMonster.zone+(sourceChance!==undefined?' · '+(sourceChance*100).toFixed(sourceChance<.01?2:1)+'%':'')
 }:undefined;
 const openSmithing=()=>{
  if(selected&&onNavigateCraftingSource)onNavigateCraftingSource({
   kind:'skills',skillId:'smithing',mode:'crafting',recipeId:'CRAFT_'+selected.id,
   button:gt('Craft {name}',{name:selected.name}),detail:gt('Open the Smithing recipe for {name}.',{name:selected.name})
  });
  else onViewToolRecipes();
 };
 const activeContribution=selected?gatheringToolContribution(selected,activeCopy):undefined;
 return <View style={s.root}>
  <View style={s.header}>
   <View style={{flex:1,minWidth:0,gap:3}}>
    <Text style={s.eyebrow}>{gt('TOOL TIERS · SELECT TO INSPECT')}</Text>
    <Text style={s.sub}>{storedCount} {gt('saved copies')} · {gt('Up to 2 per tier')}</Text>
   </View>
   <Text style={s.sub}>T1–T4</Text>
  </View>
  <View style={s.metrics}>
   <View style={s.metric}><Text style={s.eyebrow}>{gt('ACTION TIME')}</Text><Text style={[s.totalNumber,{color:effects.count?C.good:C.warning}]}>{effects.count?'−'+gatheringToolPercent(totals.effectivePercent)+'%':'+15%'}</Text><Text style={s.sub}>{effects.count?gt('Shorter gathering actions'):gt('Slower without tools')}</Text></View>
   <View style={s.metric}><Text style={s.eyebrow}>{gt('RARE FINDS')}</Text><Text style={[s.totalNumber,{color:C.info}]}>+{gatheringToolPercent(totals.rarityChanceRelativePercent)}%</Text><Text style={s.sub}>{gt('relative chance')}</Text></View>
   <View style={s.metric}><Text style={s.eyebrow}>{gl(skillId)} XP</Text><Text style={s.totalNumber}>+{gatheringToolPercent(totals.skillXpRelativePercent)}%</Text></View>
  </View>
  <View style={s.tiers}>
   {tools.map(tool=>{
    const isActive=equipped.some(entry=>entry.tier===tool.tier);
    const hasReserve=!!reservedGatheringTool(state,skillId,tool.tier);
    const count=Number(isActive)+Number(hasReserve);
    const copy=isActive?equippedGatheringToolRoll(state,skillId,tool.tier):undefined;
    const contribution=isActive?gatheringToolContribution(tool,copy):undefined;
    return <DisclosureRow key={tool.id}
      label={'Tier '+tool.tier+' · '+localizedItemName(language,tool.id)+' · '+count+' of 2 '+gt('saved copies')}
      expanded={opened===tool.tier}
      onPress={()=>selectTier(tool.tier)}
      style={[s.tier,opened===tool.tier&&s.tierSelected]} pressedStyle={{opacity:.75}}>
      <GatheringToolArtwork itemId={tool.id} size={small?38:42}/>
      <View style={s.tierCopy}>
       <Text style={s.tierLabel}>T{tool.tier} · {localizedItemName(language,tool.id)}</Text>
       <Text style={[s.tierCount,isActive&&s.tierActive]}>{count}/2 {gt('saved')} · {isActive?gt('ACTIVE'):gt('Not equipped')}</Text>
       {contribution?<Text style={s.tierSummary}>{'−'+gatheringToolPercent(contribution.adjustedBasePercent)+'% '+gt('tier time')}{copy?' · '+gatheringToolBonusLabel(copy):''}</Text>:null}
      </View><DisclosureMark expanded={opened===tool.tier}/>
     </DisclosureRow>;
   })}
  </View>
  {selected?<View style={s.details}>
    <View style={s.detailsHead}>
     <GatheringToolArtwork itemId={selected.id} size={52}/>
     <View style={s.headCopy}>
      <Text style={s.eyebrow}>{gt('TIER {tier}',{tier:selected.tier})} · {Number(!!active)+Number(!!saved)}/2</Text>
      <Text style={s.detailsName}>{localizedItemName(language,selected.id)}</Text>
      <Text style={s.info}>{Math.round((1-selected.actionTimeMultiplier)*100)}% {gt('shorter action time')}</Text>
     </View>
    </View>
    <View style={s.tabs}>
     {([['saved',gt('Saved Tools')],['bonuses',gt('Bonuses')],['recipe',gt('Recipe')]] as const).map(([key,label])=>
      <Pressable key={key} accessibilityRole="tab" accessibilityState={{selected:tab===key}} onPress={()=>setTab(key)}
        style={({pressed})=>[s.tab,tab===key&&s.tabActive,pressed&&{opacity:.72}]}>
       <Text style={[s.tabText,tab===key&&s.tabTextActive]} numberOfLines={2}>{label}</Text>
      </Pressable>)}
    </View>
    {tab==='saved'?<View style={{gap:8}}>
      <Text style={s.note}>{gt('Only the active tool contributes bonuses. The reserve stays outside Inventory until withdrawn.')}</Text>
      <View style={[s.copy,active&&s.copyActive]}>
       <View style={s.copyHead}><Text style={s.copyLabel}>{gt('ACTIVE TOOL')}</Text><Text style={[s.copyBadge,active&&s.copyBadgeActive]}>{active?gt('ACTIVE'):gt('EMPTY')}</Text></View>
       {active?<><Text style={s.good}>{copyLabel(activeCopy)}</Text>
        <Text style={s.sub}>{gt('This copy currently contributes to gathering.')}</Text>
        <View style={s.copyActions}><View style={s.action}><GameButton compact title={gt('Move to Inventory')} tone="secondary" onPress={()=>dispatch('unequip_tool',{id:active.id})}/></View><View style={s.action}><GameButton compact title={gt('To Bank')} tone="secondary" onPress={()=>dispatch('unequip_tool',{id:active.id,to:'bank'})}/></View></View>
       </>:<Text style={s.emptyHint}>{gt('Choose an inventory copy below to equip this tier.')}</Text>}
      </View>
      <View style={s.copy}>
       <View style={s.copyHead}><Text style={s.copyLabel}>{gt('SAVED RESERVE')}</Text><Text style={s.copyBadge}>{saved?gt('SAVED'):gt('EMPTY')}</Text></View>
       {saved?<><Text style={s.info}>{copyLabel(saved.copy)}</Text>
        <Text style={s.sub}>{gt('Stored safely; grants no bonus until activated.')}</Text>
        <View style={s.copyActions}>
         <View style={s.action}><GameButton title={gt('Activate')} selected tone="primary" onPress={()=>dispatch('tool_vault_activate',{skillId,tier:selected.tier})} disabled={!canEquip}/></View>
         <View style={s.action}><GameButton compact title={gt('Move to Inventory')} tone="secondary" onPress={()=>dispatch('tool_vault_withdraw',{skillId,tier:selected.tier})}/></View>
         <View style={s.action}><GameButton compact title={gt('To Bank')} tone="secondary" onPress={()=>dispatch('tool_vault_withdraw',{skillId,tier:selected.tier,to:'bank'})}/></View>
        </View>
       </>:<Text style={s.emptyHint}>{gt('Save a second copy here to switch without using Inventory.')}</Text>}
      </View>
      {(!active||!saved)?<View style={{gap:7}}>
       <Text style={s.eyebrow}>{gt('AVAILABLE IN INVENTORY')}</Text>
       {held.map(({stack,copy},index)=><View key={stack.instanceId??'legacy-'+index} style={s.inventoryChoice}>
        <Text numberOfLines={3} style={s.inventoryChoiceLabel}>{copyLabel(copy)}{stack.quantity>1?' · ×'+stack.quantity:''}</Text>
        <View style={{minWidth:92}}><GameButton compact title={!active?gt('Equip'):gt('Save')} tone="secondary" disabled={!active&&!canEquip} onPress={()=>dispatch(active?'tool_vault_save':'equip_tool',{id:selected.id,...(stack.instanceId?{instanceId:stack.instanceId}:{})})}/></View>
       </View>)}
       {!held.length?<Text style={s.emptyHint}>{gt('No additional copy in Inventory. Craft one in Smithing or withdraw one from Bank.')}</Text>:null}
       {inBank&&onWithdrawTool?<GameButton title={gt('Withdraw from Bank')} tone="secondary" onPress={()=>{void onWithdrawTool(selected.id);}}/>:null}
       {inBank&&!onWithdrawTool?<GameButton title={gt('Open Inventory')} tone="secondary" onPress={onInventory}/>:null}
       <GameButton title={gt('Craft another tool')} tone="secondary" onPress={openSmithing}/>
      </View>:null}
     </View>:null}
    {tab==='bonuses'?<View style={{gap:4}}>
      <View style={s.row}><Text style={s.rowLabel}>{gt('Base tier speed')}</Text><Text style={s.rowValue}>{Math.round((1-selected.actionTimeMultiplier)*100)}%</Text></View>
      <View style={s.row}><Text style={s.rowLabel}>{gt('Rarity and Quality')}</Text><Text style={s.rowValue}>{activeCopy?activeCopy.rarity+' · Q'+activeCopy.quality:active?'Legacy · Q50':gt('No active copy')}</Text></View>
      <View style={s.row}><Text style={s.rowLabel}>{gt('Adjusted tier reduction')}</Text><Text style={s.rowValue}>{activeContribution&&active?gatheringToolPercent(activeContribution.adjustedBasePercent)+'%':'—'}</Text></View>
      <View style={s.row}><Text style={s.rowLabel}>{gt('Random bonus roll')}</Text><Text style={s.rowValue}>{activeCopy?gatheringToolBonusLabel(activeCopy):gt('None')}</Text></View>
      <View style={s.row}><Text style={s.rowLabel}>{gl(skillId)} {gt('required')}</Text><Text style={s.rowValue}>{selected.unlockLevel}</Text></View>
      <View style={s.row}><Text style={s.rowLabel}>{gt('Character level required')}</Text><Text style={s.rowValue}>{selected.requiredCharacterLevel}</Text></View>
      <Text style={s.note}>{gt('Tier speed bonuses add across equipped tiers. Speed rolls reduce the remaining time; rare-find and skill XP rolls apply only to this skill.')}</Text>
     </View>:null}
    {tab==='recipe'?<ToolRecipeInlinePanel state={state} tool={selected} blueprintDestination={blueprintDestination}
      onNavigate={onNavigateCraftingSource} onOpenSmithing={openSmithing}/>:null}
   </View>:null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:totalsOpen}} onPress={()=>setTotalsOpen(v=>!v)} style={s.showTotals}>
     <Text style={s.showTotalsText}>{gt('How tool bonuses work')} {totalsOpen?'⌃':'⌄'}</Text>
    </Pressable>
    {totalsOpen?<View style={s.totals}>
      <Text style={s.eyebrow}>{gt('COMBINED EQUIPPED BONUSES')}</Text>
      <Text style={s.note}>{gt('Tier contributions')}: {gatheringToolPercent(totals.rawTierPercent)}% · {gt('Speed rolls')}: +{gatheringToolPercent(totals.speedRollGainPoints)} {gt('points')} · {gt('Effective')}: {gatheringToolPercent(totals.effectivePercent)}%.</Text>
      <Text style={s.note}>{gt('Only active copies count. Skill XP rolls stack additively within this skill, capped at +60%. Gathering speed is capped at 80%.')}</Text>
     </View>:null}
 </View>;
}
