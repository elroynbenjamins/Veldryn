import {useGameplayText} from '../i18n/gameplay';
import {localizedItemName} from '../i18n/starter-item-names';
import {accountText} from '../i18n/account';
import {RecipeCard} from '../components/RecipeCard';
import {SearchField} from '../components/SearchField';
import {UiIcon} from '../components/UiIcon';
import {ActivityArtwork} from '../components/ActivityArtwork';
import {useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameState,GatheringSkillId,SkillId} from '../core/types';
import {GATHERING,RECIPES} from '../content/skills';
import {MONSTERS} from '../content/monsters';
import {HERB_NODES} from '../content/herbalism';
import {itemDef} from '../content/items';
import {recipeAvailability} from '../core/playability';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {NoviceWorkshop} from '../components/NoviceWorkshop';
import {formatGameNumber} from '../core/number-format';
import {ot} from '../i18n';
import {WORLD_ZONES} from '../content/world-map';
import {regionAreas,regionalArea} from '../content/regional-areas';
import {currentRegionId} from '../core/combat-region';
import {ResourceArtwork} from '../components/ResourceArtwork';
import {FaithPanel} from '../components/FaithPanel';
import {classSkillsFor} from '../content/class-skills';
import {characterClassSkills} from '../core/class-skills';
import {classSkillIcon} from '../theme/class-skill-assets';
import {classSkillBonuses,classSkillBonusLabel} from '../core/class-skill-presentation';
import {uiIcons} from '../theme/ui-icons';
import {COMPANION_SANCTUARY_TRAINING_XP_PER_DAY} from '../content/combat-companions';
import {companionSanctuaryUpgradeCost} from '../core/combat-companions';
import {assertCompanionIdle} from '../core/companion-runtime';
import {companionMasteryBonuses,companionMasteryProgress} from '../core/companion-mastery';
import {EquipmentCraftQueuePanel} from '../components/EquipmentCraftQueuePanel';
import {ForgeScreen} from './ForgeScreen';
import {useCraftActionFeedback} from '../components/useCraftActionFeedback';
import type {ForgeCraftResult} from '../core/game-commands';
import {progressWithinLevel,classCombatSkillProgressWithinLevel} from '../core/progression';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {ExplorationPanel} from '../components/ExplorationPanel';
import {GatheringActivityList} from '../components/GatheringActivityList';
import {ZoneSceneArtwork} from '../components/ZoneSceneArtwork';
import {CraftingRecipeBrowser} from '../components/CraftingRecipeBrowser';
import {EquipmentCraftingHeader,SmithingCollection} from '../components/SmithingCollection';
import {ConsumableWorkshop} from '../components/ConsumableWorkshop';
import {progressAnticipation} from '../core/progress-anticipation';
import {skillIdentity,type SkillIdentityTone} from '../core/profession-mastery-presentation';
import {HerbalismMethodPanel} from '../components/HerbalismMethodPanel';
import {EnchantingRefineryPanel} from '../components/EnchantingRefineryPanel';
import {skillMilestoneOverview} from '../core/skill-milestones';
import {filterSkillNavigatorEntries,skillNavigatorCategoryFor,skillNavigatorRouteFor,SKILL_NAVIGATOR_CATEGORIES,type SkillNavigatorCategory,type SkillNavigatorEntry} from '../core/skill-hub-navigator';
import {sharedText} from '../i18n/shared';
import {skillNavigatorText} from '../i18n/skill-navigator';
import {gatheringToolsFor} from '../content/gathering-tools';
import {equippedGatheringTools,equippedGatheringToolRoll,gatheringToolEffects} from '../core/gathering-tools';
import {gatheringToolContribution,gatheringToolPercent,gatheringToolTotalBreakdown} from '../core/gathering-tool-presentation';
import {validateGatheringToolRoll} from '../core/gathering-tool-rolls';
import {GatheringToolArtwork} from '../components/GatheringToolArtwork';
import {DisclosureMark} from '../components/DisclosureControl';
import {ActiveGatheringScene} from '../components/ActiveGatheringScene';
import {ToolRecipeInlinePanel} from '../components/ToolRecipeInlinePanel';

export function SkillsScreen({state,now=Date.now(),onGather,onQueueGather,onQueueRemove,onQueueMove,onQueueClear,onQueueStart,onCraft,onClaimCraft,onClaimAllCrafts,onCancelCraft,onMoveCraftWaiting,onCraftPrerequisites,onEquipTool,onCharacter,onInventory,onWithdrawTool,onViewToolRecipes,onNavigateCraftingSource,onSelectSkill,onBackToHub,onOpenCombat,onCommand=async()=>{},initialMode='gathering',initialSkill,initialAreaId,initialActionId,initialRecipeId,forgeResults,onDismissForgeResults}:{state:GameState;now?:number;onGather:(id:string)=>void;onQueueGather:(id:string)=>void;onQueueRemove:(index:number)=>void;onQueueMove:(index:number,direction:'up'|'down')=>void;onQueueClear:()=>void;onQueueStart:()=>void;onCraft:(id:string,quantity?:number)=>void|Promise<void>;onClaimCraft:(jobId:string)=>void;onClaimAllCrafts:()=>void;onCancelCraft:(jobId:string)=>void;onMoveCraftWaiting:(jobId:string,direction:'up'|'down')=>void;onCraftPrerequisites:(recipeId:string)=>void;onEquipTool:(id:string)=>void;onCharacter:()=>void;onInventory:()=>void;onWithdrawTool?:(id:string)=>void|Promise<void>;onViewToolRecipes:()=>void;onNavigateCraftingSource?:(destination:import('../core/working-toward').WorkingTowardDestination)=>void;onSelectSkill?:(id:string)=>void;onBackToHub?:()=>void;onOpenCombat?:()=>void;onCommand?:(command:import('../core/game-commands').GameCommand)=>Promise<void>;initialMode?:'gathering'|'crafting'|'novice'|'faith';initialSkill?:SkillId|string;initialAreaId?:string;initialActionId?:string;initialRecipeId?:string;forgeResults?:readonly ForgeCraftResult[]|null;onDismissForgeResults?:()=>void}){
 const {gt,gl,language}=useGameplayText();
 const {feedback:craftFeedback,run:runCraftAction}=useCraftActionFeedback();
 const onCraftWithFeedback=(id:string,quantity=1)=>{void runCraftAction(id,quantity,()=>onCraft(id,quantity));};
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const {width:windowWidth,fontScale}=useWindowDimensions(),compactTools=windowWidth<420||fontScale>=1.25;
  const baseGatheringDefs=[...GATHERING,...HERB_NODES],gatheringDefs=initialActionId?[...baseGatheringDefs].sort((a,b)=>a.id===initialActionId?-1:b.id===initialActionId?1:0):baseGatheringDefs;
  const mode=initialMode;
  const initialRecipe=initialRecipeId?RECIPES.find(row=>row.id===initialRecipeId):undefined,goalAction=initialActionId?gatheringDefs.find(row=>row.id===initialActionId):initialRecipe;
  const [openTools,setOpenTools]=useState<Record<string,boolean>>({});
   // One expanded recipe across every gathering tool tier; never reset the whole skill screen.
   const [expandedToolId,setExpandedToolId]=useState<string|null>(null);
   const [expandedToolDetailId,setExpandedToolDetailId]=useState<string|null>(null);
   const [toolMathOpen,setToolMathOpen]=useState(false);
  const region=WORLD_ZONES.find(zone=>zone.id===currentRegionId(state))??WORLD_ZONES[0];
  const availableAreas=regionAreas(region.id);
  const [selectedAreaId,setSelectedAreaId]=useState<string|undefined>(()=>regionalArea(region.id,initialAreaId)?.id);
  const selectedArea=regionalArea(region.id,selectedAreaId);
  if(mode==='gathering'&&initialSkill==='regional-gathering'){
    const gatheringSkillIds=(['mining','woodcutting','fishing','herbalism'] as GatheringSkillId[]).filter(skillId=>
      [...GATHERING,...HERB_NODES].some(node=>node.skillId===skillId&&node.zoneId===region.id)
    );
    return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <View style={[s.region,{borderColor:region.accent}]}>
        <ZoneSceneArtwork regionId={region.id}/>
        <View pointerEvents="none" style={s.regionShade}/>
        <View style={s.flex}><Text style={s.regionLabel}>{gl("CURRENT REGION GATHERING")}</Text><Text accessibilityRole="header" style={s.regionName}>{region.symbol} {region.name}</Text><Text style={s.regionSub}>{gt("All four gathering skills are shown here. Locked resources display their requirements.")}</Text></View>
      </View>
      {availableAreas.length>0?<View style={s.areaPicker}>
        <Pressable accessibilityRole="button" accessibilityState={{selected:!selectedArea}} onPress={()=>setSelectedAreaId(undefined)}
          style={[s.areaChip,!selectedArea&&s.areaChipSelected]}><Text style={[s.areaChipText,!selectedArea&&s.areaChipTextSelected]}>{gl('All')}</Text></Pressable>
        {availableAreas.map(area=><Pressable accessibilityRole="button" key={area.id}
          accessibilityLabel={area.name+' · Lv '+area.minLevel+'+'}
          accessibilityState={{selected:selectedArea?.id===area.id}}
          onPress={()=>setSelectedAreaId(area.id)}
          style={[s.areaChip,selectedArea?.id===area.id&&s.areaChipSelected,(state.character?.level??1)<area.minLevel&&s.areaChipLocked]}>
          <Text numberOfLines={1} style={[s.areaChipText,selectedArea?.id===area.id&&s.areaChipTextSelected]}>{area.name}{(state.character?.level??1)<area.minLevel?' · Lv '+area.minLevel:''}</Text>
        </Pressable>)}
      </View>:null}
      {gatheringSkillIds.map(skillId=>{
        const skill=state.skills.find(row=>row.skillId===skillId);
        if(!skill)return null;
        return <View key={skillId} style={s.group}>
          <View style={s.sectionHeading}><ActivityArtwork id={skillId} size={32}/><View style={s.flex}><Text style={s.name}>{gl(skillId)}</Text><Text style={s.sub}>{gt('Level {value}',{value:skill.level})}</Text></View></View>
          <GatheringActivityList state={state} skillId={skillId} skillLevel={skill.level} onGather={onGather} onNavigate={onNavigateCraftingSource} currentRegionOnly areaId={selectedArea?.id} showInstruction={false}/>
        </View>;
      })}
      {!gatheringSkillIds.length?<Text style={s.unavailable}>{gl("No gathering activities are available in this region yet.")}</Text>:null}
    </ScrollView>;
  }
  if(mode==='crafting'&&initialSkill==='forge')return <ForgeScreen state={state} now={now} onOpenProfession={id=>onSelectSkill?.(id)} queueProps={{state,onClaim:onClaimCraft,onClaimAll:onClaimAllCrafts,onCancel:onCancelCraft,onMoveWaiting:onMoveCraftWaiting,forgeResults,onDismissForgeResults,onSetAutoSell:enabled=>onCommand({type:'gear_autosell',args:{enabled}})}}/>;
  if(mode==='crafting'&&(initialSkill==='smithing'||initialSkill==='tailoring'))return <ScrollView contentContainerStyle={{padding:16,gap:14,paddingBottom:32,maxWidth:660,width:'100%',alignSelf:'center'}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
    <EquipmentCraftingHeader state={state} skillId={initialSkill}/>
    <SmithingCollection state={state} skillId={initialSkill} initialQuery={initialRecipe?.name??''} preferredRecipeId={initialRecipeId} onCraft={onCraftWithFeedback} craftFeedback={craftFeedback} onProcessingStart={(id,batches)=>onCommand({type:'processing_start',args:{id,batches,batchMode:'selected'}})} onNavigate={onNavigateCraftingSource} onCraftPrerequisites={onCraftPrerequisites} onOpenForge={()=>onSelectSkill?.('forge')} queueProps={{state,onClaim:onClaimCraft,onClaimAll:onClaimAllCrafts,onCancel:onCancelCraft,onMoveWaiting:onMoveCraftWaiting,forgeResults,onDismissForgeResults,onSetAutoSell:enabled=>onCommand({type:'gear_autosell',args:{enabled}})}}/>
  </ScrollView>;
  if(mode==='crafting'&&(initialSkill==='cooking'||initialSkill==='alchemy'))return <ScrollView contentContainerStyle={{padding:16,gap:14,paddingBottom:32,maxWidth:660,width:'100%',alignSelf:'center'}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
    <SkillHero state={state} skillId={initialSkill} kind={gt('Crafting skill')}/>
    <ConsumableWorkshop state={state} skillId={initialSkill} preferredRecipeId={initialRecipeId} onStart={(id,batches)=>onCommand({type:initialSkill==='alchemy'?'alchemy_start':'processing_start',args:{id,batches,batchMode:'selected'}})}/>
  </ScrollView>;
  if(!initialSkill||initialSkill==='companion-mastery')return <SkillHub state={state} now={now} onSelect={onSelectSkill??(()=>{})} onCombat={onOpenCombat} onCommand={onCommand} initialMasteryInfoOpen={initialSkill==='companion-mastery'} onMasteryClosed={onBackToHub}/>;
  if(initialSkill==='exploration')return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><SkillHero state={state} skillId="exploration" kind={gt("Discovery skill")}/><ExplorationPanel state={state} onCommand={onCommand}/></ScrollView>;
  const detailKind=initialSkill==='faith'?gt("Devotion skill"):(["mining","woodcutting","fishing","herbalism"] as string[]).includes(initialSkill)?gt("Gathering skill"):gt("Crafting skill");
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>

    <SkillHero state={state} skillId={initialSkill} kind={detailKind}/>



    {goalAction?<View style={s.goalTarget}><Text style={s.goalTargetLabel}>{gt("WORKING TOWARD TARGET")}</Text><Text style={s.goalTargetName}>{goalAction.name}</Text><Text style={s.sub}>{initialRecipe?gt("The recipe list is filtered to this target."):gt("The target activity is shown first in this skill.")}</Text></View>:null}
    {mode==='gathering'&&<View style={[s.region,{borderColor:region.accent}]}><ZoneSceneArtwork regionId={region.id}/><View pointerEvents="none" style={s.regionShade}/><View style={s.flex}><Text style={s.regionLabel}>{gt("CURRENT REGION")}</Text><Text style={s.regionName}>{region.symbol} {region.name}</Text><Text style={s.regionSub}>{gt("Ready here first, then reachable zones and locked resources.")}</Text></View></View>}
    {mode==='gathering'&&initialSkill==='herbalism'?<HerbalismMethodPanel state={state} onCommand={onCommand}/>:null}
    {(mode==='faith'||initialSkill==='faith')&&<FaithPanel state={state} onCommand={onCommand}/>}
    {mode==='novice'&&<NoviceWorkshop state={state} onCraft={onCraftWithFeedback} craftFeedback={craftFeedback} onCharacter={onCharacter}/>}
    {mode==='crafting'&&<>{initialSkill==='enchanting'?<><GameButton title={gt('Open Forge')} tone="secondary" onPress={()=>onSelectSkill?.('forge')}/><Text style={s.sub}>{gt("Forge work reserves materials and Gold when it starts. Equipment, gem refinement and gem combining share the same crafting slots; repeatable processing uses the Active Activity timer.")}</Text></>:<Text style={s.sub}>{gt("Materials are taken from Inventory first, then Bank.")}</Text>}</>}
    {mode==='crafting'&&initialSkill==='enchanting'?<EnchantingRefineryPanel state={state} onCommand={onCommand}/>:null}
    {mode!=='novice'&&mode!=='faith'&&initialSkill!=='faith'&&state.skills.filter(sk=>(!initialSkill||sk.skillId===initialSkill)&&(mode==='gathering'?gatheringDefs.some(g=>g.skillId===sk.skillId):RECIPES.some(r=>r.skillId===sk.skillId&&!r.noviceSetId))).map(sk=>{
      const gatheringSkill=sk.skillId as GatheringSkillId,equippedTools=mode==='gathering'?equippedGatheringTools(state,gatheringSkill):[];
      const equippedTool=equippedTools[equippedTools.length-1],effects=gatheringToolEffects(state,gatheringSkill),totals=gatheringToo
        {mode==='gathering'&&gatheringToolsFor(gatheringSkill).length>0&&<Panel style={s.toolPanel}>
          <Pressable accessibilityRole="button" accessibilityLabel={gt('Manage {skill} tools',{skill:gl(gatheringSkill)})}
            accessibilityState={{expanded:!!openTools[sk.skillId]}}
            onPress={()=>{setOpenTools(value=>({...value,[sk.skillId]:!value[sk.skillId]}));setExpandedToolId(null);setExpandedToolDetailId(null);setToolMathOpen(false);}}
            style={({pressed})=>[s.toolHeading,pressed&&s.pressed]}>
            {equippedTool?<GatheringToolArtwork itemId={equippedTool.id} size={compactTools?48:54}/>:<View style={[s.emptyTool,s.emptyToolCompact]}><ActivityArtwork id={gatheringSkill}/></View>}
            <View style={s.toolCopy}>
              <Text numberOfLines={2} style={s.toolName}>{gt('GATHERING TOOLS')} · {equippedTools.length}/4</Text>
              <Text style={s.toolRequirement}>{equippedTools.length?gt('{count} tools equipped',{count:equippedTools.length}):gt('No tool equipped')}</Text>
              <Text style={s.manageHint}>{gt(openTools[sk.skillId]?'Tap to hide tool tiers':'Tap to manage tool tiers')}</Text>
            </View><DisclosureMark expanded={!!openTools[sk.skillId]}/>
          </Pressable>
          <View style={s.toolMetrics}>
            <View style={s.toolMetric}><Text style={s.toolMetricLabel}>{gt('ACTION TIME')}</Text>
              <Text style={[s.toolMetricValue,{color:C.good}]}>{equippedTools.length?'−'+totalToolPercent+'%':'+15.0%'}</Text>
              <Text style={s.toolMetricCaption}>{equippedTools.length?gt('Shorter gathering actions'):gt('Slower without tools')}</Text>
            </View>
            <View style={s.toolMetric}><Text style={s.toolMetricLabel}>{gt('RARE FINDS')}</Text>
              <Text style={[s.toolMetricValue,{color:C.warning}]}>{'+'+gatheringToolPercent(totals.rarityChanceRelativePercent)+'%'}</Text>
              <Text style={s.toolMetricCaption}>{gt('relative chance')}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={gt('How tool bonuses work')}
            accessibilityState={{expanded:toolMathOpen}} onPress={()=>setToolMathOpen(open=>!open)}
            style={({pressed})=>[s.toolMathToggle,pressed&&s.pressed]}>
            <Text style={s.toolMathLink}>{gt('How tool bonuses work')}</Text><DisclosureMark expanded={toolMathOpen}/>
          </Pressable>
          {toolMathOpen?<View style={s.toolMathDetails}>
            <Text style={s.toolRequirement}>{gt('Tier bonuses {base}% · Speed rolls +{roll} points · Effective {total}%',{base:gatheringToolPercent(totals.rawTierPercent),roll:gatheringToolPercent(totals.speedRollGainPoints),total:totalToolPercent})}</Text>
            <Text style={s.toolRequirement}>{gt('Speed rolls reduce remaining action time. Total reduction cannot exceed 80%.')}{totals.capped?' · '+gt('Speed cap reached'):''}</Text>
            <Text style={s.toolRequirement}>{gt('Rare finds: +{percent}% relative chance (eligible gathering drops only)',{percent:gatheringToolPercent(totals.rarityChanceRelativePercent)})}</Text>
          </View>:null}
          {openTools[sk.skillId]?<View style={s.toolSectionHeader}><Text style={s.toolSectionTitle}>{gt('TOOL TIERS')}</Text><Text style={s.toolRequirement}>{equippedTools.length}/4</Text></View>:null}
        nce (eligible gathering drops only)',{percent:gatheringToolPercent(totals.rarityChanceRelativePercent)})}</Text>:null}
          </View>:null}{openTools[sk.skillId]&&gatheringToolsFor(gatheringSkill).map(tool=>{
          const equipped=equippedTools.some(entry=>entry.id===tool.id);
          const equippedCopy=equippedGatheringToolRoll(state,gatheringSkill,tool.tier);
          const contribution=gatheringToolContribution(tool,equippedCopy);
          const availableCopies=state.inventory.stacks.filter(stack=>stack.itemId===tool.id&&stack.quantity>0);
          const ownedCopies=availableCopies.map(stack=>({stack,copy:stack.instanceId?validateGatheringToolRoll(state.account.craftedGatheringToolInstances?.find(row=>row.id===stack.instanceId),tool.id):undefined}));
          const carried=state.inventory.stacks.some(stack=>stack.itemId===tool.id&&stack.quantity>0);
          const banked=state.bank.stacks.some(stack=>stack.itemId===tool.id&&stack.quantity>0);
          const skillReady=sk.level>=tool.unlockLevel,characterReady=(state.character?.level??0)>=tool.requiredCharacterLevel;
          const learned=!tool.blueprint||(state.account.unlockedKnowledgeIds??[]).includes(tool.blueprint.knowledgeId);
          const blueprintOwned=!!tool.blueprint&&[...state.inventory.stacks,...state.bank.stacks].some(stack=>stack.itemId===tool.blueprint!.itemId&&stack.quantity>0);
          const sourceMonster=tool.blueprint?MONSTERS.find(monster=>monster.id===tool.blueprint!.sourceMonsterId):undefined;
          const sourceRegionId=sourceMonster?WORLD_ZONES.find(zone=>zone.name===sourceMonster.zone)?.id:undefined;
          const actualBlueprintChance=sourceMonster?.drops.find(drop=>drop.itemId===tool.blueprint?.itemId)?.chance;
          const blueprintChanceText=actualBlueprintChance===undefined?'':(actualBlueprintChance*100).toFixed(actualBlueprintChance<.01?2:1)+'%';
          const recipeDestination={kind:'skills' as const,skillId:'smithing' as const,mode:'crafting' as const,recipeId:'CRAFT_'+tool.id,button:gt('Craft {name}',{name:tool.name}),detail:gt('Open the Smithing recipe for {name}.',{name:tool.name})};
          const blueprintDestination=sourceMonster&&sourceRegionId?{kind:'combat' as const,monsterId:sourceMonster.id,zoneName:sourceMonster.zone,regionId:sourceRegionId,button:gt('Hunt {name}',{name:sourceMonster.name}),detail:gt('{name} can drop the {tool} Blueprint.',{name:sourceMonster.name,tool:tool.name})+' '+sourceMonster.zone+(blueprintChanceText?' · '+blueprintChanceText:'')}:undefined;
          const title=equipped?gt("Unequip"):carried&&!characterReady?gt('Level {value}',{value:tool.requiredCharacterLevel}):carried&&!skillReady?gl(tool.skillId)+' '+tool.unlockLevel:carried?gt("Equip"):banked?gt("Withdraw"):tool.blueprint&&!learned&&!blueprintOwned?gt("Find Blueprint"):gt("Recipe");
          const disabled=!equipped&&carried&&(!skillReady||!characterReady);
          const expanded=expandedToolId===tool.id;
          const detailExpanded=expandedToolDetailId===tool.id;
          const toggleRecipe=()=>setExpandedToolId(current=>current===tool.id?null:tool.id);
          const action=equipped?()=>onCommand({type:'unequip_tool',args:{id:tool.id}}):carried?()=>onEquipTool(tool.id):banked?(onWithdrawTool?()=>onWithdrawTool(tool.id):onInventory):toggleRecipe;
          const actionTitle=expanded&&!carried&&!banked&&!equipped?gt('Hide Recipe'):title;
          const showDetailsToggle=equipped||carried||banked;
          const blueprintText=!tool.blueprint?gt("recipe known"):learned?gt("blueprint learned"):blueprintOwned?gt("blueprint owned"):sourceMonster?gt('Blueprint: {name}',{name:sourceMonster.name})+' · '+sourceMonster.zone+(blueprintChanceText?' ·return <View key={tool.id} style={[s.toolCard,detailExpanded&&s.toolCardExpanded]}>
            <Pressable accessibilityRole="button" accessibilityLabel={localizedItemName(language,tool.id)+' · '+(equipped?gt('Equipped'):gt('Not equipped'))}
              accessibilityHint={gt('Tap to inspect tool')} accessibilityState={{expanded:detailExpanded}}
              onPress={()=>{setExpandedToolDetailId(current=>current===tool.id?null:tool.id);setExpandedToolId(null);}}
              style={({pressed})=>[s.toolCardHeader,pressed&&s.pressed]}>
              <GatheringToolArtwork itemId={tool.id} size={48}/>
              <View style={s.toolCopy}>
                <Text numberOfLines={2} style={s.toolName}>T{tool.tier} · {localizedItemName(language,tool.id)}</Text>
                {equipped?<Text numberOfLines={2} style={s.toolSummary}>
                  {'−'+gatheringToolPercent(contribution.adjustedBasePercent)+'% '+gt('tier time')}
                  {equippedCopy?.bonus.stat==='rarity'?' · +'+gatheringToolPercent(contribution.rarityRollPercent)+'% '+gt('rare finds'):null}
                  {equippedCopy?.bonus.stat==='speed'?' · +'+gatheringToolPercent(contribution.speedRollPercent)+'% '+gt('speed roll'):null}
                </Text>:<Text numberOfLines={2} style={s.toolRequirement}>
                  {(carried||banked)?gt('Not equipped'):gt('Not owned')} · {gl(tool.skillId)} {tool.unlockLevel}
                </Text>}
              </View><DisclosureMark expanded={detailExpanded}/>
            </Pressable>
            {detailExpanded?<View style={s.toolCardDetails}>
              <View style={s.toolDetailPair}>
                <View style={s.toolDetailCell}><Text style={s.toolMetricLabel}>{gt('Tier speed bonus')}</Text><Text style={s.toolDetailValue}>{gatheringToolPercent(contribution.adjustedBasePercent)}%</Text></View>
                <View style={s.toolDetailCell}><Text style={s.toolMetricLabel}>{gt('Tool roll')}</Text><Text style={s.toolDetailValue}>{equipped?equippedCopy?equippedCopy.rarity+' · Q'+equippedCopy.quality:gt('Legacy · Q50'):gt('Not equipped')}</Text></View>
              </View>
              {equipped?<Text style={s.toolEffect}>{equippedCopy?'+'+gatheringToolPercent(equippedCopy.bonus.basisPoints/100)+'% '+gt(equippedCopy.bonus.stat==='speed'?'Gathering Speed':'Gathering Rarity Chance'):gt('Legacy · Uncommon · Q50 · Base bonus only')}</Text>:null}
              <Text style={s.toolRequirement}>{gt('Tier contribution: {base}% base → {adjusted}% with rarity and quality',{base:gatheringToolPercent(contribution.basePercent),adjusted:gatheringToolPercent(contribution.adjustedBasePercent)})}</Text>
              {equippedCopy?<Text style={s.toolRequirement}>{gt('Rarity {rarity}% · Quality {quality}% (relative to tier base)',{rarity:(contribution.rarityAdjustmentPercent>=0?'+':'')+gatheringToolPercent(contribution.rarityAdjustmentPercent),quality:(contribution.qualityAdjustmentPercent>=0?'+':'')+gatheringToolPercent(contribution.qualityAdjustmentPercent)})}</Text>:null}
              <Text style={s.toolRequirement}>{gl(tool.skillId)} {tool.unlockLevel} · {gt('Level {value}',{value:tool.requiredCharacterLevel})}</Text>
              <Text style={s.toolRequirement}>{blueprintText}{banked?' · '+gt('in Bank'):carried&&skillReady&&characterReady?' · '+gt('Ready'):''}</Text>
              <View style={s.toolInlineActions}>
                <View style={s.toolInlinePrimary}><GameButton title={actionTitle} accessibilityLabel={localizedItemName(language,tool.id)+': '+actionTitle} disabled={disabled} selected={equipped} tone={equipped?'primary':'secondary'} onPress={action}/></View>
                {showDetailsToggle?<Pressable accessibilityRole="button" accessibilityLabel={expanded?gt('Hide recipe details'):gt('Show recipe details')}
                  accessibilityHint={localizedItemName(language,tool.id)} accessibilityState={{expanded}}
                  onPress={toggleRecipe} style={({pressed})=>[s.toolRecipeToggle,expanded&&s.toolDetailsExpanded,pressed&&s.pressed]}>
                  <Text style={s.toolRecipeToggleText}>{gt('Recipe details')}</Text><DisclosureMark expanded={expanded}/>
                </Pressable>:null}
              </View>
              {expanded?<ToolRecipeInlinePanel state={state} tool={tool} blueprintDestination={blueprintDestination} onNavigate={onNavigateCraftingSource} onOpenSmithing={()=>onNavigateCraftingSource?onNavigateCraftingSource(recipeDestination):onViewToolRecipes()}/>:null}
              {ownedCopies.length>0&&(equipped||ownedCopies.length>1)?<View style={s.toolCopies}>
                <Text style={s.toolRequirement}>{gt('Owned copies')} · {gt('Select a tool roll to equip')}</Text>
                {ownedCopies.map(({stack,copy},copyIndex)=><View key={stack.instanceId??'legacy-'+copyIndex} style={[s.toolCopyOption,compactTools&&s.toolCopyOptionCompact]}>
                  <Text style={[s.toolRequirement,{flex:1}]} numberOfLines={3}>{copy?copy.rarity+' · Q'+copy.quality+' · +'+gatheringToolPercent(copy.bonus.basisPoints/100)+'% '+gt(copy.bonus.stat==='speed'?'Gathering Speed':'Gathering Rarity Chance')+' · '+gatheringToolPercent(gatheringToolContribution(tool,copy).adjustedBasePercent)+'% tier':gt('Legacy · Uncommon · Q50 · Base bonus only')}</Text>
                  <View style={s.toolCopyAction}><GameButton compact title={equipped?gt('Replace'):gt('Equip copy')} tone="secondary" onPress={()=>onCommand({type:'equip_tool',args:{id:tool.id,...(stack.instanceId?{instanceId:stack.instanceId}:{})}})}/></View>
                </View>)}
              </View>:null}
            </View>:null}
          </View>;ceId}:{})}})}/></View></View>)}</View>:null}
          </View>;
        })}</Panel>}
        {mode==='gathering'&&<ActiveGatheringScene state={state} nowMs={now} skillId={gatheringSkill}/>}
        {mode==='gathering'&&<GatheringActivityList state={state} skillId={gatheringSkill} skillLevel={sk.level} preferredActionId={initialActionId} onGather={onGather} onNavigate={onNavigateCraftingSource}/>}
        {mode==='crafting'&&<CraftingRecipeBrowser state={state} skillId={sk.skillId as 'smithing'|'cooking'|'alchemy'|'tailoring'|'enchanting'} initialQuery={initialRecipe?.name??''} preferredRecipeId={initialRecipeId} onCraft={onCraftWithFeedback} craftFeedback={craftFeedback} onAlchemyStart={(id,batches)=>onCommand({type:'alchemy_start',args:{id,batches,batchMode:'selected'}})} onProcessingStart={(id,batches)=>onCommand({type:'processing_start',args:{id,batches,batchMode:'selected'}})} onNavigate={onNavigateCraftingSource} onCraftPrerequisites={onCraftPrerequisites}/>}
      </View>;
    })}
  </ScrollView>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
    areaPicker:{flexDirection:'row',flexWrap:'wrap',gap:6,paddingVertical:3},
    areaChip:{minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,paddingHorizontal:10},
    areaChipSelected:{borderColor:C.accent,backgroundColor:C.selection},
    areaChipLocked:{opacity:.72},areaChipText:{fontSize:11,color:C.muted,fontWeight:'700'},areaChipTextSelected:{color:C.text,fontWeight:'800'},root:{padding:spacing.lg,gap:spacing.md},plannerToggle:{minHeight:54,flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:spacing.md,marginTop:spacing.sm,paddingHorizontal:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},plannerTitle:{...typography.bodyStrong,color:C.text},h:{...typography.hero,color:C.text},name:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},accentWord:{color:equipmentColors.goldSoft,fontWeight:'900'},infoWord:{color:C.info,fontWeight:'900'},weather:{...typography.caption,fontWeight:'900'},pacing:{...typography.caption,color:C.info},row:{flexDirection:'row',gap:spacing.sm},actionRow:{flexDirection:'row',gap:8},queueButton:{flex:1},startButton:{flex:2},chipRow:{flexDirection:'row',flexWrap:'wrap',gap:6},modeChip:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},modeChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},modeChipText:{fontSize:12,color:C.muted,fontWeight:'700'},modeChipTextSelected:{color:C.text},pressed:{opacity:.76},flex:{flex:1},group:{gap:spacing.md},output:{...typography.bodyStrong,color:C.accent},met:{...typography.caption,color:C.good},missing:{...typography.caption,color:C.warning},toolPanel:{gap:9},toolMetrics:{flexDirection:'row',gap:8},toolMetric:{flex:1,minWidth:0,padding:11,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,gap:3},toolMetricLabel:{...typography.caption,color:C.muted,fontWeight:'800',letterSpacing:.3},toolMetricValue:{...typography.title,fontSize:24,lineHeight:30,fontWeight:'900'},toolMetricCaption:{...typography.caption,color:C.muted},toolMathToggle:{minHeight:44,alignItems:'center',justifyContent:'center',gap:8,flexDirection:'row'},toolMathLink:{...typography.caption,color:C.info,fontWeight:'700'},toolMathDetails:{gap:5,padding:10,borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},toolSectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:5},toolSectionTitle:{...typography.caption,color:C.muted,fontWeight:'800',letterSpacing:.5},toolHeading:{minHeight:74,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:4}, manageHint:{...typography.caption,color:C.accent},emptyTool:{width:64,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.stage},emptyToolCompact:{width:52,height:52},
 toolCard:{borderWidth:1,borderColor:C.line,borderRadius:9,overflow:'hidden',backgroundColor:C.panel2},toolCardExpanded:{borderColor:C.selectionLine},toolCardHeader:{minHeight:72,flexDirection:'row',alignItems:'center',paddingHorizontal:9,paddingVertical:10,gap:10},toolSummary:{...typography.caption,color:C.good,flexShrink:1,fontWeight:'700'},toolCardDetails:{padding:10,paddingTop:12,gap:9,borderTopWidth:1,borderTopColor:C.line},toolDetailPair:{flexDirection:'row',gap:8},toolDetailCell:{flex:1,minWidth:0,gap:4},toolDetailValue:{...typography.bodyStrong,color:C.text,fontWeight:'800'},toolInlineActions:{flexDirection:'row',flexWrap:'wrap',gap:8},toolInlinePrimary:{flex:1,minWidth:130},toolRecipeToggle:{minHeight:48,flexDirection:'row',gap:6,paddingHorizontal:12,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},toolRecipeToggleText:{...typography.caption,color:C.info,fontWeight:'800'},toolCopyOptionCompact:{flexDirection:'column',alignItems:'stretch'},toolCopyAction:{minWidth:114,alignSelf:'stretch'},toolRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
 toolRowCompact:{flexDirection:'column',alignItems:'stretch',gap:8},
 toolRoll:{...typography.caption,color:C.good,fontWeight:'800'},
 toolTotalBreakdown:{gap:4,padding:10,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:9,marginBottom:4},
 toolTotalStrong:{...typography.caption,color:C.text,fontWeight:'800',flexShrink:1},
 toolCopies:{width:'100%',gap:6,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},
 toolCopyOption:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,padding:8,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},
 toolInfo:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:spacing.sm},
 toolCopy:{flex:1,minWidth:0,gap:3},
 toolName:{...typography.bodyStrong,color:C.text,flexShrink:1},
 toolEffect:{...typography.caption,color:C.info,flexShrink:1},
 toolRequirement:{...typography.caption,color:C.muted,fontWeight:'700',flexShrink:1},
 toolActions:{width:164,flexDirection:'row',alignItems:'center',gap:8},toolActionsCompact:{width:'100%'},
  toolButton:{flex:1,minWidth:0},toolButtonCompact:{flex:1},
  toolDetailsToggle:{width:52,minHeight:48,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:8,borderColor:C.line,backgroundColor:C.panel2},
  toolDetailsExpanded:{borderColor:C.selectionLine,backgroundColor:C.selection},sectionHeading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},region:{minHeight:120,position:'relative',overflow:'hidden',flexDirection:'row',alignItems:'center',padding:spacing.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:12},regionShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(4,12,18,.66)'},regionLabel:{...typography.caption,color:'#e2eee7',fontWeight:'900',letterSpacing:.8},regionName:{...typography.title,color:'#fff'},regionSub:{...typography.body,color:'#e8eee9'},goalTarget:{gap:2,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface},goalTargetLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},goalTargetName:{...typography.bodyStrong,color:C.text},skillHero:{gap:8,padding:spacing.md,borderWidth:1,borderColor:C.lineStrong,borderRadius:12,backgroundColor:C.panel},skillHeroNear:{borderColor:C.good},skillHeroTop:{flexDirection:'row',alignItems:'center',gap:spacing.sm},skillHeroKind:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.9},skillLevelBadge:{minWidth:58,alignItems:'center',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.accentSurface},skillLevelValue:{...typography.title,color:C.accent},skillLevelLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.8},skillProgressMeta:{flexDirection:'row',justifyContent:'space-between',gap:8},skillProgressText:{...typography.caption,color:C.muted},skillProgressTrack:{height:8,borderRadius:5,overflow:'hidden',backgroundColor:C.bg},skillProgressFill:{height:'100%',borderRadius:5,backgroundColor:C.good},skillProgressUrgent:{backgroundColor:C.accent},anticipationNear:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.4},anticipationUrgent:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.4},unavailable:{...typography.body,color:C.muted,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel}});}


function identityColor(C:ThemeColors,tone:SkillIdentityTone){return tone==='good'?C.good:tone==='info'?C.info:tone==='special'?C.special:tone==='warning'?C.warning:tone==='bad'?C.bad:C.accent}
function SkillHero({state,skillId,kind}:{state:GameState;skillId:string;kind:string}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),skill=state.skills.find(row=>row.skillId===skillId),identity=skillIdentity(skillId as SkillId),identityAccent=identityColor(C,identity.tone);
 const title=gl(skillId);
 if(!skill)return <View style={[s.skillHero,{borderColor:identityAccent}]}><ActivityArtwork id={skillId as any} size={52}/><View style={s.flex}><Text style={[s.skillHeroKind,{color:identityAccent}]}>{gl(identity.label)} · {kind.toUpperCase()}</Text><Text accessibilityRole="header" style={s.h}>{title}</Text><Text style={s.sub}>{gl(identity.descriptor)}</Text></View></View>;
 const progress=progressWithinLevel(skill.xp,skill.level),ratio=skill.level>=100?1:Math.min(1,progress.current/Math.max(1,progress.need)),anticipation=skill.level>=100?{band:'none' as const,remaining:0}:progressAnticipation(progress.current,progress.need,{nearAt:.88,urgentAt:.97});
 return <View style={[s.skillHero,{borderColor:identityAccent},anticipation.band!=='none'&&s.skillHeroNear]}><View style={s.skillHeroTop}><ActivityArtwork id={skillId as any} size={52}/><View style={s.flex}><Text style={[s.skillHeroKind,{color:identityAccent}]}>{gl(identity.label)} · {kind.toUpperCase()}</Text><Text accessibilityRole="header" style={s.h}>{title}</Text><Text style={s.sub}>{gl(identity.descriptor)} · {formatGameNumber(skill.xp,state.settings.numberMode,state.settings.language)} XP</Text></View><View style={[s.skillLevelBadge,{borderColor:identityAccent}]}><Text style={[s.skillLevelValue,{color:identityAccent}]}>{skill.level}</Text><Text style={s.skillLevelLabel}>{gt("Level").toLocaleUpperCase(language)}</Text></View></View><View style={s.skillProgressMeta}><Text style={s.skillProgressText}>{skill.level>=100?gt("Mastered"):`${formatGameNumber(progress.current,state.settings.numberMode,state.settings.language)} / ${formatGameNumber(progress.need,state.settings.numberMode,state.settings.language)} XP`}</Text><Text style={s.skillProgressText}>{skill.level>=100?100:Math.min(99,Math.floor(ratio*100))}%</Text></View><View style={s.skillProgressTrack}><View style={[s.skillProgressFill,anticipation.band==='urgent'&&s.skillProgressUrgent,{width:`${Math.max(skill.level>=100?100:3,ratio*100)}%`}]}/></View>{anticipation.band!=='none'?<Text accessibilityLiveRegion="polite" style={anticipation.band==='urgent'?s.anticipationUrgent:s.anticipationNear}>{anticipation.band==='urgent'?gt("FINAL STRETCH"):gt("ALMOST THERE")} · {gt('{xp} XP to Level {level}',{xp:formatGameNumber(Math.ceil(anticipation.remaining),state.settings.numberMode,state.settings.language),level:skill.level+1})}</Text>:null}</View>;
}

function makeHubStyles(C:ThemeColors){return StyleSheet.create({
 hub:{padding:spacing.md,gap:10,paddingBottom:spacing.xl,maxWidth:660,width:'100%',alignSelf:'center'},hubTitle:{...typography.hero,color:C.text},hubSub:{...typography.body,color:C.muted},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:4},sectionLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},sectionCount:{...typography.caption,color:C.info,fontWeight:'800'},skillIcon:{width:36,height:36},cardPressed:{opacity:.72},skillName:{...typography.bodyStrong,color:C.text},skillKind:{...typography.caption,color:C.info},skillLevel:{...typography.bodyStrong,color:C.accent},openMark:{fontSize:20,lineHeight:20,color:C.muted,fontWeight:'700'},modalBody:{gap:6,paddingTop:0,paddingBottom:2},modalTheme:{...typography.bodyStrong,color:C.accent},modalCopy:{...typography.body,color:C.muted,lineHeight:18},modalStat:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:2},modalLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},modalValue:{...typography.title,color:C.text},modalProgressTrack:{height:8,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2},modalProgressFill:{height:'100%',backgroundColor:C.accent},modalProgressText:{...typography.caption,color:C.muted,lineHeight:15},skillNext:{fontSize:9,color:C.info,fontWeight:'800',letterSpacing:.25},
 navigatorHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 navigatorTotal:{...typography.caption,color:C.accent,fontWeight:'900'},
 navigatorToolbar:{flexDirection:'row',alignItems:'center',gap:8},
 navigatorFilter:{minHeight:48,width:'42%',maxWidth:180,minWidth:100,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,paddingHorizontal:10},
 navigatorFilterText:{...typography.bodyStrong,color:C.text,flex:1,minWidth:0},
 navigatorChevron:{fontSize:17,color:C.muted},
 navigatorSearch:{flex:1,minWidth:0},
 navigatorSearchToggle:{minHeight:48,minWidth:48,justifyContent:'center',alignItems:'center',borderRadius:10,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},
 navigatorSearchWide:{width:'100%',flex:undefined},
 navigatorRow:{minHeight:72,padding:10,gap:7,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 navigatorTop:{flexDirection:'row',alignItems:'center',gap:9},
 navigatorCopy:{flex:1,minWidth:0,gap:2},
 navigatorTrailing:{alignItems:'flex-end',gap:3},
 navigatorProgress:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
 navigatorTrack:{height:5,flex:1,minWidth:80,backgroundColor:C.panel2,borderRadius:4,overflow:'hidden'},
 navigatorFill:{height:'100%',backgroundColor:C.good},
 navigatorHint:{...typography.caption,color:C.muted,fontSize:10,flexShrink:1},
 navigatorSection:{gap:7},
 navigatorEmpty:{padding:18,gap:10,alignItems:'center',borderColor:C.line,borderWidth:1,borderRadius:10,backgroundColor:C.panel},
 navigatorOption:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingHorizontal:12,paddingVertical:9,borderBottomWidth:1,borderBottomColor:C.line},
 navigatorOptionSelected:{backgroundColor:C.selection},
 navigatorOptionText:{...typography.bodyStrong,color:C.text},
 navigatorOptionMeta:{...typography.caption,color:C.muted},
 navigatorOptionList:{maxHeight:'70%'},
 navigatorOverview:{gap:12,paddingBottom:12,paddingTop:8}
});}
function SkillHub({state,now,onSelect,onCombat,onCommand,initialMasteryInfoOpen=false,onMasteryClosed}:{state:GameState;now:number;onSelect:(id:string)=>void;onCombat?:()=>void;onCommand:(command:import('../core/game-commands').GameCommand)=>Promise<void>;initialMasteryInfoOpen?:boolean;onMasteryClosed?:()=>void}){
 const {gt,gl,language}=useGameplayText();
 const a=(source:string,params?:Record<string,string|number>)=>accountText(language,source,params);
 const n=(key:Parameters<typeof skillNavigatorText>[1])=>skillNavigatorText(language,key);
 const C=useGameTheme(),hubStyles=useMemo(()=>makeHubStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions();
 const narrowNavigator=width<380||fontScale>=1.3||state.settings.textScale>=1.3;
 const [searchExpanded,setSearchExpanded]=useState(false);
 const [classSkillId,setClassSkillId]=useState<string>();
 const [overviewSkillId,setOverviewSkillId]=useState<string|null>(null);
 const [category,setCategory]=useState<'all'|SkillNavigatorCategory>('all');
 const [categoryPickerOpen,setCategoryPickerOpen]=useState(false);
 const [searchQuery,setSearchQuery]=useState('');
 const [trainingInfoOpen,setTrainingInfoOpen]=useState(false);
 const [masteryInfoOpen,setMasteryInfoOpen]=useState(initialMasteryInfoOpen);
 const closeMasteryInfo=()=>{setMasteryInfoOpen(false);if(initialMasteryInfoOpen)onMasteryClosed?.();};
 const mastery=companionMasteryProgress(state.account.companionMasteryXp),masteryBonuses=companionMasteryBonuses(state.account.companionMasteryXp);
 const facilityLevel=Math.max(0,Math.min(3,state.account.companionSanctuary?.trainingGroundLevel??0));
 const facilityXpPerDay=COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[facilityLevel];
 const facilityCost=companionSanctuaryUpgradeCost(state,'trainingGround');
 const lastTraining=state.account.companionSanctuary?.lastTrainingClaimAtMs;
 const trainingDaysReady=facilityLevel>0&&typeof lastTraining==='number'?Math.min(7,Math.floor(Math.max(0,now-lastTraining)/86400000)):0;
 const idleCompanions=(state.account.unlockedCombatCompanionIds??[]).filter(id=>{if(!state.account.combatCompanionProgress?.[id])return false;try{assertCompanionIdle(state,id);return true;}catch{return false;}});
 const trainingClaimReady=trainingDaysReady>0&&idleCompanions.length>0;
 const trainingCostOwned=(id:string)=>(state.account.companionMaterials?.[id]??0)+state.inventory.stacks.filter(item=>item.itemId===id).reduce((sum,item)=>sum+Math.max(0,item.quantity),0)+state.bank.stacks.filter(item=>item.itemId===id).reduce((sum,item)=>sum+Math.max(0,item.quantity),0);
 const trainingUpgradeReady=!!facilityCost&&(state.character?.gold??0)>=facilityCost.gold&&(state.account.companionEssence??0)>=facilityCost.companionEssence&&(!facilityCost.materialId||trainingCostOwned(facilityCost.materialId)>=facilityCost.materialQuantity);
 const classRows=state.character?characterClassSkills(state.character):[];

 // Only XP-bearing professions and the two existing class disciplines appear as
 // trainable skills. Selectable 2.0 abilities/talents remain in Character → Builds.
 // Adding a new profession needs no redesign: unknown profession ids use 'other'.
 const combatRows:SkillNavigatorEntry[]=[
  {id:'combat',name:gt('Combat'),subtitle:gt('Fight & train'),category:'combat',route:'combat'},
  ...classRows.map((row,i)=>({id:'class:'+row.skillId,name:classSkillsFor(state.character!.classId)[i]?.name??row.skillId,
   level:row.level,xp:row.xp,subtitle:gt('Combat skill'),category:'combat' as const,route:'discipline' as const}))
 ];
 const professionRows:SkillNavigatorEntry[]=state.skills.map(row=>{
  const category=skillNavigatorCategoryFor(row.skillId);
  return {id:row.skillId,name:row.skillId==='forge'?gt('Forge'):gl(row.skillId),level:row.level,xp:row.xp,
   subtitle:category==='other'?n('Other'):gl(row.skillId==='faith'?'devotion':row.skillId==='exploration'?'adventure skill':category==='crafting'?'crafting':'gathering'),
   category,route:skillNavigatorRouteFor(row.skillId)};
 });
 const companionRows:SkillNavigatorEntry[]=[
  {id:'companion-mastery',name:gl('Companion Mastery'),subtitle:n('Account-wide companion skill'),category:'companions',route:'companion-mastery',level:mastery.level,xp:mastery.xp}
 ];
 const allEntries=[...combatRows,...professionRows,...companionRows];
 const categoryLabels:Record<SkillNavigatorCategory,string>={
  combat:gl('Combat'),gathering:gl('Gathering'),crafting:gl('Crafting'),other:n('Other'),companions:gl('Companions')
 };
 const categoryOptions=[{id:'all' as const,label:gl('All'),count:allEntries.length},
  ...SKILL_NAVIGATOR_CATEGORIES.map(id=>({id,label:categoryLabels[id],count:allEntries.filter(row=>row.category===id).length})).filter(option=>option.count>0)];
 const groups=SKILL_NAVIGATOR_CATEGORIES.map(id=>({
  id,label:categoryLabels[id],rows:filterSkillNavigatorEntries(allEntries,id,searchQuery,language)
 })).filter(group=>(category==='all'||category===group.id)&&group.rows.length>0);
 const visibleCount=groups.reduce((sum,group)=>sum+group.rows.length,0);
 const overviewSkill=allEntries.find(entry=>entry.id===overviewSkillId&&entry.route==='overview');
 const overviewProgress=overviewSkill?.xp!==undefined?progressWithinLevel(overviewSkill.xp,overviewSkill.level??1):undefined;
 const openEntry=(entry:SkillNavigatorEntry)=>{
  switch(entry.route){
   case 'combat':onCombat?.();break;
   case 'discipline':setClassSkillId(entry.id.slice('class:'.length));break;
   case 'companion-mastery':setMasteryInfoOpen(true);break;
   case 'sanctuary':setTrainingInfoOpen(true);break;
   case 'overview':setOverviewSkillId(entry.id);break;
   default:onSelect(entry.id);
  }
 };
 const renderEntry=(entry:SkillNavigatorEntry)=>{
  const isSanctuary=entry.route==='sanctuary',isMastery=entry.route==='companion-mastery',isDiscipline=entry.route==='discipline';
  const level=entry.level??0;
  const p=isMastery?{current:mastery.current,need:mastery.need}:entry.xp===undefined?undefined:isDiscipline?classCombatSkillProgressWithinLevel(entry.xp,level):progressWithinLevel(entry.xp,level);
  const ratio=isSanctuary?Math.min(1,level/3):level>=100?1:p?Math.min(1,p.current/Math.max(1,p.need)):0;
  const anticipation=p&&level<100?progressAnticipation(p.current,p.need,{nearAt:.92,urgentAt:.98}):undefined;
  const skillRow=entry.route==='skill'?state.skills.find(row=>row.skillId===entry.id):undefined;
  const milestone=skillRow?skillMilestoneOverview(state,skillRow.skillId):undefined;
  const icon=entry.route==='companion-mastery'||isSanctuary?uiIcons.companions:isDiscipline?classSkillIcon(entry.id.slice('class:'.length)):entry.route==='overview'?uiIcons.skills:null;
  const disabled=entry.route==='combat'&&!onCombat;
  return <Pressable key={entry.id} accessibilityRole="button"
   accessibilityLabel={entry.route==='combat'?gt('Open Combat'):gt('{name}, {kind}, level {level}',{name:entry.name,kind:entry.subtitle,level})}
   accessibilityHint={entry.route==='combat'?gt('Choose an enemy and set your combat skill XP split'):gt('Open {name} information',{name:entry.name})}
   accessibilityState={{disabled}} disabled={disabled} onPress={()=>openEntry(entry)}
   style={({pressed})=>[hubStyles.navigatorRow,pressed&&hubStyles.cardPressed,disabled&&{opacity:.45}]}>
    <View style={hubStyles.navigatorTop}>
     {icon?<Image source={icon} resizeMode="contain" style={hubStyles.skillIcon}/>:<ActivityArtwork id={entry.id as any} size={36}/>}
     <View style={hubStyles.navigatorCopy}>
      <Text numberOfLines={narrowNavigator?2:1} style={hubStyles.skillName}>{entry.name}</Text>
      <Text numberOfLines={narrowNavigator?2:1} style={hubStyles.skillKind}>{entry.subtitle}</Text>
     </View>
     <View style={hubStyles.navigatorTrailing}>
      {entry.route!=='combat'?<Text style={hubStyles.skillLevel}>{isSanctuary?gt('Facility Lv {level}/3',{level}):gt('Level {value}',{value:level})}</Text>:null}
     </View>
     <Text style={hubStyles.openMark}>›</Text>
    </View>
    {entry.route!=='combat'?<View style={hubStyles.navigatorProgress}>
     <View style={hubStyles.navigatorTrack}><View style={[hubStyles.navigatorFill,{width:(Math.max(isSanctuary?0:level>=100?100:3,ratio*100))+'%'}]}/></View>
     <Text style={hubStyles.navigatorHint}>{isSanctuary?gt('{xp} XP/day per idle companion',{xp:facilityXpPerDay}):level>=100?gt('Mastered'):p?anticipation?.band==='urgent'?gt('{xp} XP left',{xp:Math.ceil(anticipation.remaining).toLocaleString(language)}):gt('{percent}% to next',{percent:Math.min(99,Math.floor(ratio*100))}):''}</Text>
    </View>:null}
    {milestone?.nextLevel&&milestone.next[0]?<Text numberOfLines={1} style={hubStyles.skillNext}>{gt('NEXT LV {level} · {title}',{level:milestone.nextLevel,title:gl(milestone.next[0].title)})}</Text>:null}
   </Pressable>;
 };
 const tracked=[...state.skills,...classRows,{level:mastery.level}],total=tracked.reduce((sum,row)=>sum+row.level,0);
 const selectedDefinition=state.character&&classSkillId?classSkillsFor(state.character.classId).find(definition=>definition.id===classSkillId):undefined;
 const selectedRow=classRows.find(row=>row.skillId===classSkillId);
 const selectedProgress=selectedRow?classCombatSkillProgressWithinLevel(selectedRow.xp,selectedRow.level):undefined;
 const selectedBonuses=state.character&&classSkillId?classSkillBonuses(state.character,classSkillId):[];
 return <><ScrollView contentContainerStyle={hubStyles.hub} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
  <View style={hubStyles.navigatorHeader}><Text accessibilityRole="header" style={hubStyles.hubTitle}>{gt('Skills')}</Text><Text style={hubStyles.navigatorTotal}>{gt('SKILL TOTAL')} {total.toLocaleString(language)}</Text></View>
  <View style={hubStyles.navigatorToolbar}>
   <Pressable accessibilityRole="button" accessibilityLabel={n('Filter')+': '+(category==='all'?gl('All'):categoryLabels[category])}
    accessibilityState={{expanded:categoryPickerOpen}} onPress={()=>setCategoryPickerOpen(true)} style={({pressed})=>[hubStyles.navigatorFilter,pressed&&hubStyles.cardPressed]}>
    <Text numberOfLines={1} style={hubStyles.navigatorFilterText}>{category==='all'?gl('All'):categoryLabels[category]}</Text><Text style={hubStyles.navigatorChevron}>⌄</Text>
   </Pressable>
   {narrowNavigator?<Pressable accessibilityRole="button" accessibilityLabel={sharedText(language,'Search')}
    accessibilityState={{expanded:searchExpanded}} onPress={()=>setSearchExpanded(open=>!open)}
    style={({pressed})=>[hubStyles.navigatorSearchToggle,pressed&&hubStyles.cardPressed]}>
     <UiIcon name="search" size={22}/>
    </Pressable>:<SearchField style={hubStyles.navigatorSearch} value={searchQuery} onChangeText={setSearchQuery}
     placeholder={sharedText(language,'Search')} accessibilityLabel={sharedText(language,'Search')}/>}
  </View>
  {narrowNavigator&&searchExpanded?<SearchField style={hubStyles.navigatorSearchWide} value={searchQuery}
   onChangeText={setSearchQuery} placeholder={sharedText(language,'Search')} accessibilityLabel={sharedText(language,'Search')}/>:null}
  {visibleCount?<View style={hubStyles.navigatorSection}>
   {groups.map(group=><View key={group.id} style={hubStyles.navigatorSection}>
    <View style={hubStyles.sectionHeading}><Text style={hubStyles.sectionLabel}>{group.label.toLocaleUpperCase(language)}</Text><Text style={hubStyles.sectionCount}>{group.rows.length}</Text></View>
    {group.rows.map(renderEntry)}
   </View>)}
  </View>:<View style={hubStyles.navigatorEmpty}><Text style={hubStyles.hubSub}>{n('No matching skills')}</Text>
   <GameButton compact title={gt('Clear filters')} tone="secondary" onPress={()=>{setCategory('all');setSearchQuery('');}}/>
  </View>}
 </ScrollView>
 <GameModalSurface visible={categoryPickerOpen} presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={()=>setCategoryPickerOpen(false)}>
  <GameModalHeader title={gt('Skills')} eyebrow={n('Filter').toLocaleUpperCase(language)} onClose={()=>setCategoryPickerOpen(false)}/>
  <ScrollView style={hubStyles.navigatorOptionList} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   {categoryOptions.map(option=><Pressable key={option.id} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{selected:category===option.id}}
    onPress={()=>{setCategory(option.id);setCategoryPickerOpen(false);}} style={[hubStyles.navigatorOption,category===option.id&&hubStyles.navigatorOptionSelected]}>
     <Text style={hubStyles.navigatorOptionText}>{option.label}</Text><Text style={hubStyles.navigatorOptionMeta}>{option.count}{category===option.id?' ✓':''}</Text>
   </Pressable>)}
  </ScrollView>
 </GameModalSurface>
 <GameModalSurface visible={!!overviewSkill} presentation="dialog" reduceMotion={state.settings.reduceMotion} onClose={()=>setOverviewSkillId(null)}>
  <GameModalHeader eyebrow={n('Skill overview').toLocaleUpperCase(language)} title={overviewSkill?.name??gt('Skills')} onClose={()=>setOverviewSkillId(null)}/>
  {overviewSkill?<View style={hubStyles.navigatorOverview}>
   <Text style={hubStyles.modalTheme}>{gt('Level {value}',{value:overviewSkill.level??1})}</Text>
   {overviewProgress&&overviewSkill.level!==undefined?<View style={hubStyles.navigatorSection}>
    <View style={hubStyles.navigatorTrack}><View style={[hubStyles.navigatorFill,{width:`${Math.min(100,(overviewSkill.level>=100?1:overviewProgress.current/Math.max(1,overviewProgress.need))*100)}%`}]}/></View>
    <Text style={hubStyles.modalProgressText}>{overviewSkill.level>=100?gt('Mastered'):gt('{current} / {need} XP to next level',{current:overviewProgress.current.toLocaleString(language),need:overviewProgress.need.toLocaleString(language)})}</Text>
   </View>:null}
   <Text style={hubStyles.modalCopy}>{n('This skill has no dedicated activity screen. Its earned XP and levels are still tracked.')}</Text>
  </View>:null}
 </GameModalSurface>
  <GameModalSurface visible={masteryInfoOpen} presentation="dialog" onClose={closeMasteryInfo}>
 <GameModalHeader eyebrow={a('ACCOUNT-WIDE SKILL')} title={a('Companion Mastery')} onClose={closeMasteryInfo}/>
 <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{flexShrink:1}} contentContainerStyle={hubStyles.modalBody}>
  <Text style={hubStyles.modalCopy}>{a("Strengthen all companions through completed Expeditions, successful Trial floors and claimed Training Ground rewards. Mastery is shared across your characters.")}</Text>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("MASTERY LEVEL")}</Text><Text style={hubStyles.modalValue}>{mastery.level}/100</Text></View>
  <View style={hubStyles.modalProgressTrack}><View style={[hubStyles.modalProgressFill,{width:(mastery.need?Math.min(100,100*mastery.current/mastery.need):100)+'%'}]}/></View>
  <Text style={hubStyles.modalProgressText}>{mastery.need?a('{current} / {need} XP to next level',{current:mastery.current.toLocaleString(language),need:mastery.need.toLocaleString(language)}):a('Mastery reached · all bonuses unlocked')}</Text>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("COMPANION HP / ATTACK / DEFENSE")}</Text><Text style={hubStyles.modalValue}>+{(masteryBonuses.statPct*100).toFixed(2)}%</Text></View>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("COMPANION XP EARNED")}</Text><Text style={hubStyles.modalValue}>+{(masteryBonuses.companionXpPct*100).toFixed(2)}%</Text></View>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("EQUIPPED COMPANION ASSIST")}</Text><Text style={hubStyles.modalValue}>+{(masteryBonuses.assistPct*100).toFixed(2)}%</Text></View>
  <Text style={hubStyles.modalTheme}>{a("At Level 100")}</Text>
  <Text style={hubStyles.modalCopy}>{a("+5% HP, Attack and Defense for all companions · +10% companion XP · +5% companion assist effectiveness. These are bonuses to companion values, not an extra 5% of your character's raw stats.")}</Text>
  <Text style={hubStyles.modalTheme}>{a("How to earn Mastery XP")}</Text>
  <Text style={hubStyles.modalCopy}>{a("Claim finished Expeditions, defeat Trial floors and collect completed Training Ground days. Failed or abandoned activities grant no Mastery XP. Repeated claims cannot earn the same reward twice.")}</Text>
  <Text style={hubStyles.modalCopy}>{a("Training Ground upgrades are separate from this skill. Combat bonuses also apply to companions fighting in Trials and are reflected in Expedition Power previews.")}</Text>
 </ScrollView>
 </GameModalSurface><GameModalSurface visible={trainingInfoOpen} presentation="dialog" onClose={()=>setTrainingInfoOpen(false)}>
 <GameModalHeader eyebrow={a('SANCTUARY FACILITY')} title={a('Companion Training')} onClose={()=>setTrainingInfoOpen(false)}/>
 <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{flexShrink:1}} contentContainerStyle={hubStyles.modalBody}>
  <Text style={hubStyles.modalCopy}>{a("The Training Ground is a Sanctuary upgrade, not a separate XP-based skill. Upgrade it to gain more Companion XP from each daily training claim.")}</Text>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("TRAINING GROUND")}</Text><Text style={hubStyles.modalValue}>{facilityLevel}/3</Text></View>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("XP PER ELIGIBLE COMPANION / DAY")}</Text><Text style={hubStyles.modalValue}>{facilityXpPerDay}</Text></View>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("DAYS READY TO CLAIM")}</Text><Text style={hubStyles.modalValue}>{trainingDaysReady}/7</Text></View>
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("ELIGIBLE COMPANIONS")}</Text><Text style={hubStyles.modalValue}>{idleCompanions.length}</Text></View>
  <Text style={hubStyles.modalCopy}>{a("Training accrues every 24 hours, up to seven days. Companions on Expeditions or active Trials do not receive this claim.")}</Text>
  {facilityCost?<><Text style={hubStyles.modalTheme}>{a("Next Training Ground upgrade")}</Text>
   <Text style={hubStyles.modalCopy}>{facilityCost.gold.toLocaleString(language)} {gl('Gold')} · {facilityCost.companionEssence.toLocaleString(language)} {gl('Companion Essence')}{facilityCost.materialId?' · '+facilityCost.materialQuantity+' '+localizedItemName(language,facilityCost.materialId):''}</Text>
   <Text style={hubStyles.modalCopy}>{a('Next level: {amount} XP/day · {status}',{amount:COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[Math.min(3,facilityLevel+1)],status:a(trainingUpgradeReady?'Materials ready':'Collect the listed materials first')})}</Text>
   <GameButton title={a('Upgrade Training Ground')} disabled={!trainingUpgradeReady} onPress={()=>onCommand({type:'companion_upgrade',args:{id:'trainingGround'}})}/>
  </>:<Text style={hubStyles.modalTheme}>{a(facilityLevel===3?'Training Ground fully upgraded':'Build a Training Ground in your Sanctuary')}</Text>}
  <View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{a("READY XP PER COMPANION")}</Text><Text style={hubStyles.modalValue}>{trainingDaysReady*facilityXpPerDay}</Text></View>
  <GameButton title={a('Claim Companion Training')} disabled={!trainingClaimReady} onPress={()=>onCommand({type:'companion_training'})}/>
  <GameButton tone="secondary" title={a('Open Companions & Sanctuary')} onPress={()=>{setTrainingInfoOpen(false);onSelect('companion');}}/>
  <Text style={hubStyles.modalCopy}>{a("Individual companions become stronger through leveling, Bond, Ascension and abilities. This facility supports their XP growth; it does not directly increase combat stats.")}</Text>
 </ScrollView>
 </GameModalSurface><GameModalSurface visible={!!selectedDefinition} presentation="dialog" onClose={()=>setClassSkillId(undefined)}>{selectedDefinition&&selectedRow&&selectedProgress?<><GameModalHeader eyebrow={gt("Combat skill").toLocaleUpperCase(language)} title={selectedDefinition.name} onClose={()=>setClassSkillId(undefined)}/><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{flexShrink:1}} contentContainerStyle={hubStyles.modalBody}><Image accessible={false} source={classSkillIcon(selectedDefinition.id)} resizeMode="contain" style={{width:64,height:64,alignSelf:'center'}}/><Text style={hubStyles.modalTheme}>{selectedBonuses.map(bonus=>gl(bonus.label)).join(' · ')}</Text><Text style={hubStyles.modalCopy}>{gt("A class specialization that improves your combat performance. Class skill XP is earned through combat using the split selected on the Combat screen.")}</Text>{selectedBonuses.map(bonus=><View key={bonus.stat} style={hubStyles.modalStat}><View style={{flex:1,minWidth:0}}><Text style={hubStyles.modalLabel}>{gl(bonus.label)}</Text><Text style={hubStyles.modalProgressText}>{gt("AT LEVEL 100:")} {classSkillBonusLabel(bonus.maxPercent)}</Text></View><Text style={hubStyles.modalValue}>{classSkillBonusLabel(bonus.currentPercent)}</Text></View>)}<View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{gt("CURRENT LEVEL")}</Text><Text style={hubStyles.modalValue}>{selectedRow.level}</Text></View><View style={hubStyles.modalProgressTrack}><View style={[hubStyles.modalProgressFill,{width:`${Math.min(100,selectedRow.level>=100?100:selectedProgress.current/Math.max(1,selectedProgress.need)*100)}%`}]}/></View><Text style={hubStyles.modalProgressText}>{selectedRow.level>=100?gt("Mastered"):gt('{current} / {need} XP to next level',{current:selectedProgress.current.toLocaleString(language),need:selectedProgress.need.toLocaleString(language)})}</Text></ScrollView></>:null}</GameModalSurface></>;
}
