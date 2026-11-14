import {useGameplayText} from '../i18n/gameplay';
import {localizedItemName} from '../i18n/starter-item-names';
import {accountText} from '../i18n/account';
import {RecipeCard} from '../components/RecipeCard';
import {SearchField} from '../components/SearchField';
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
import {ActivityQueuePlanner} from '../components/ActivityQueuePlanner';
import {EquipmentCraftQueuePanel} from '../components/EquipmentCraftQueuePanel';
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
import {skillMilestoneOverview,skillTrainingFocus} from '../core/skill-milestones';
import {gatheringToolsFor} from '../content/gathering-tools';
import {equippedGatheringTool} from '../core/gathering-tools';
import {GatheringToolArtwork} from '../components/GatheringToolArtwork';
import {DisclosureMark} from '../components/DisclosureControl';
import {ActiveGatheringScene} from '../components/ActiveGatheringScene';

export function SkillsScreen({state,now=Date.now(),onGather,onQueueGather,onQueueRemove,onQueueMove,onQueueClear,onQueueStart,onCraft,onClaimCraft,onClaimAllCrafts,onCancelCraft,onMoveCraftWaiting,onCraftPrerequisites,onEquipTool,onCharacter,onInventory,onViewToolRecipes,onNavigateCraftingSource,onSelectSkill,onBackToHub,onOpenCombat,onCommand=async()=>{},initialMode='gathering',initialSkill,initialAreaId,initialActionId,initialRecipeId,forgeResults,onDismissForgeResults}:{state:GameState;now?:number;onGather:(id:string)=>void;onQueueGather:(id:string)=>void;onQueueRemove:(index:number)=>void;onQueueMove:(index:number,direction:'up'|'down')=>void;onQueueClear:()=>void;onQueueStart:()=>void;onCraft:(id:string)=>void;onClaimCraft:(jobId:string)=>void;onClaimAllCrafts:()=>void;onCancelCraft:(jobId:string)=>void;onMoveCraftWaiting:(jobId:string,direction:'up'|'down')=>void;onCraftPrerequisites:(recipeId:string)=>void;onEquipTool:(id:string)=>void;onCharacter:()=>void;onInventory:()=>void;onViewToolRecipes:()=>void;onNavigateCraftingSource?:(destination:import('../core/working-toward').WorkingTowardDestination)=>void;onSelectSkill?:(id:string)=>void;onBackToHub?:()=>void;onOpenCombat?:()=>void;onCommand?:(command:import('../core/game-commands').GameCommand)=>Promise<void>;initialMode?:'gathering'|'crafting'|'novice'|'faith';initialSkill?:SkillId|string;initialAreaId?:string;initialActionId?:string;initialRecipeId?:string;forgeResults?:readonly ForgeCraftResult[]|null;onDismissForgeResults?:()=>void}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const {width:windowWidth,fontScale}=useWindowDimensions(),compactTools=windowWidth<420||fontScale>=1.25;
  const baseGatheringDefs=[...GATHERING,...HERB_NODES],gatheringDefs=initialActionId?[...baseGatheringDefs].sort((a,b)=>a.id===initialActionId?-1:b.id===initialActionId?1:0):baseGatheringDefs;
  const mode=initialMode;
  const initialRecipe=initialRecipeId?RECIPES.find(row=>row.id===initialRecipeId):undefined,goalAction=initialActionId?gatheringDefs.find(row=>row.id===initialActionId):initialRecipe;
  const [openTools,setOpenTools]=useState<Record<string,boolean>>({});
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
        <View style={s.flex}><Text style={s.regionLabel}>{gl("CURRENT REGION GATHERING")}</Text><Text accessibilityRole="header" style={s.regionName}>{region.symbol} {region.name}</Text><Text style={s.regionSub}>{gl("All gathering activities available in this region are shown together.")}</Text></View>
      </View>
      {availableAreas.length>0?<View style={s.areaPicker}>
        <Pressable accessibilityRole="button" accessibilityState={{selected:!selectedArea}} onPress={()=>setSelectedAreaId(undefined)}
          style={[s.areaChip,!selectedArea&&s.areaChipSelected]}><Text style={[s.areaChipText,!selectedArea&&s.areaChipTextSelected]}>{gl('All')}</Text></Pressable>
        {availableAreas.map(area=><Pressable accessibilityRole="button" key={area.id}
          accessibilityLabel={area.name+' · Lv '+area.minLevel+'+'}
          accessibilityState={{disabled:(state.character?.level??1)<area.minLevel,selected:selectedArea?.id===area.id}}
          disabled={(state.character?.level??1)<area.minLevel}
          onPress={()=>setSelectedAreaId(area.id)}
          style={[s.areaChip,selectedArea?.id===area.id&&s.areaChipSelected,(state.character?.level??1)<area.minLevel&&s.areaChipLocked]}>
          <Text numberOfLines={1} style={[s.areaChipText,selectedArea?.id===area.id&&s.areaChipTextSelected]}>{area.name}</Text>
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
  if(mode==='crafting'&&(initialSkill==='smithing'||initialSkill==='tailoring'))return <ScrollView contentContainerStyle={{padding:16,gap:14,paddingBottom:32,maxWidth:660,width:'100%',alignSelf:'center'}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
    <EquipmentCraftingHeader state={state} skillId={initialSkill}/>
    <SmithingCollection state={state} skillId={initialSkill} initialQuery={initialRecipe?.name??''} preferredRecipeId={initialRecipeId} onCraft={onCraft} onProcessingStart={id=>onCommand({type:'processing_start',args:{id}})} onNavigate={onNavigateCraftingSource} onCraftPrerequisites={onCraftPrerequisites} queueProps={{state,onClaim:onClaimCraft,onClaimAll:onClaimAllCrafts,onCancel:onCancelCraft,onMoveWaiting:onMoveCraftWaiting,forgeResults,onDismissForgeResults,onSetAutoSell:enabled=>onCommand({type:'gear_autosell',args:{enabled}})}}/>
  </ScrollView>;
  if(mode==='crafting'&&(initialSkill==='cooking'||initialSkill==='alchemy'))return <ScrollView contentContainerStyle={{padding:16,gap:14,paddingBottom:32,maxWidth:660,width:'100%',alignSelf:'center'}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
    <SkillHero state={state} skillId={initialSkill} kind={gt('Crafting skill')}/>
    <ConsumableWorkshop state={state} skillId={initialSkill} preferredRecipeId={initialRecipeId} onStart={id=>onCommand({type:initialSkill==='alchemy'?'alchemy_start':'processing_start',args:{id}})}/>
  </ScrollView>;
  if(!initialSkill||initialSkill==='companion-mastery')return <SkillHub state={state} now={now} onSelect={onSelectSkill??(()=>{})} onCombat={onOpenCombat} onCommand={onCommand} initialMasteryInfoOpen={initialSkill==='companion-mastery'} onMasteryClosed={onBackToHub}/>;
  if(initialSkill==='exploration')return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><SkillHero state={state} skillId="exploration" kind={gt("Discovery skill")}/><ExplorationPanel state={state} onCommand={onCommand}/></ScrollView>;
  const detailKind=initialSkill==='faith'?gt("Devotion skill"):(["mining","woodcutting","fishing","herbalism"] as string[]).includes(initialSkill)?gt("Gathering skill"):gt("Crafting skill");
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>

    <SkillHero state={state} skillId={initialSkill} kind={detailKind}/>



    {goalAction?<View style={s.goalTarget}><Text style={s.goalTargetLabel}>{gt("WORKING TOWARD TARGET")}</Text><Text style={s.goalTargetName}>{goalAction.name}</Text><Text style={s.sub}>{initialRecipe?gt("The recipe list is filtered to this target."):gt("The target activity is shown first in this skill.")}</Text></View>:null}
    {mode==='gathering'&&<View style={[s.region,{borderColor:region.accent}]}><ZoneSceneArtwork regionId={region.id}/><View pointerEvents="none" style={s.regionShade}/><View style={s.flex}><Text style={s.regionLabel}>{gt("CURRENT REGION")}</Text><Text style={s.regionName}>{region.symbol} {region.name}</Text><Text style={s.regionSub}>{gt("Only gathering nodes in this region are shown.")}</Text></View></View>}
    {mode==='gathering'&&initialSkill==='herbalism'?<HerbalismMethodPanel state={state} onCommand={onCommand}/>:null}
    {(mode==='faith'||initialSkill==='faith')&&<FaithPanel state={state} onCommand={onCommand}/>}
    {mode==='novice'&&<NoviceWorkshop state={state} onCraft={onCraft} onCharacter={onCharacter}/>}
    {mode==='crafting'&&<>{(initialSkill==='smithing'||initialSkill==='tailoring'||initialSkill==='enchanting')?<><EquipmentCraftQueuePanel state={state} onClaim={onClaimCraft} onClaimAll={onClaimAllCrafts} onCancel={onCancelCraft} onMoveWaiting={onMoveCraftWaiting} forgeResults={forgeResults} onDismissForgeResults={onDismissForgeResults} onSetAutoSell={enabled=>onCommand({type:'gear_autosell',args:{enabled}})}/><Text style={s.sub}>{gt("Forge work reserves materials and Gold when it starts. Equipment, gem refinement and gem combining share the same crafting slots; repeatable processing uses the Active Activity timer.")}</Text></>:<Text style={s.sub}>{gt("Materials are taken from Inventory first, then Bank.")}</Text>}</>}
    {mode==='crafting'&&initialSkill==='enchanting'?<EnchantingRefineryPanel state={state} onCommand={onCommand}/>:null}
    {mode!=='novice'&&mode!=='faith'&&initialSkill!=='faith'&&state.skills.filter(sk=>(!initialSkill||sk.skillId===initialSkill)&&(mode==='gathering'?gatheringDefs.some(g=>g.skillId===sk.skillId):RECIPES.some(r=>r.skillId===sk.skillId&&!r.noviceSetId))).map(sk=>{
      const gatheringSkill=sk.skillId as GatheringSkillId,equippedTool=mode==='gathering'?equippedGatheringTool(state,gatheringSkill):undefined;
      return <View key={sk.skillId} style={s.group}>
        {mode==='gathering'&&<Panel><Pressable accessibilityRole="button" accessibilityLabel={gt('Manage {skill} tools',{skill:gl(gatheringSkill)})} accessibilityState={{expanded:!!openTools[sk.skillId]}} onPress={()=>setOpenTools(value=>({...value,[sk.skillId]:!value[sk.skillId]}))} style={s.toolHeading}>{equippedTool?<GatheringToolArtwork itemId={equippedTool.id} size={compactTools?52:64}/>:<View style={[s.emptyTool,compactTools&&s.emptyToolCompact]}><ActivityArtwork id={gatheringSkill}/></View>}<View style={s.toolCopy}><Text numberOfLines={2} style={s.name}>{equippedTool?.name??gt("No tool equipped")}</Text><Text numberOfLines={2} style={s.sub}>{equippedTool?gt('Tier {tier} · {percent}% shorter action time',{tier:equippedTool.tier,percent:Math.round((1-equippedTool.actionTimeMultiplier)*100)}):gt("No tool · 15% slower gathering")}</Text><Text style={s.manageHint}>{gt(openTools[sk.skillId]?'Tap to hide tool tiers':'Tap to manage tool tiers')}</Text></View><DisclosureMark expanded={!!openTools[sk.skillId]}/></Pressable>{openTools[sk.skillId]&&gatheringToolsFor(gatheringSkill).map(tool=>{
          const equipped=equippedTool?.id===tool.id;
          const carried=state.inventory.stacks.some(stack=>stack.itemId===tool.id&&stack.quantity>0);
          const banked=state.bank.stacks.some(stack=>stack.itemId===tool.id&&stack.quantity>0);
          const skillReady=sk.level>=tool.unlockLevel,characterReady=(state.character?.level??0)>=tool.requiredCharacterLevel;
          const learned=!tool.blueprint||(state.account.unlockedKnowledgeIds??[]).includes(tool.blueprint.knowledgeId);
          const blueprintOwned=!!tool.blueprint&&[...state.inventory.stacks,...state.bank.stacks].some(stack=>stack.itemId===tool.blueprint!.itemId&&stack.quantity>0);
          const sourceMonster=tool.blueprint?MONSTERS.find(monster=>monster.id===tool.blueprint!.sourceMonsterId):undefined;
          const sourceRegionId=sourceMonster?WORLD_ZONES.find(zone=>zone.name===sourceMonster.zone)?.id:undefined;
          const recipeDestination={kind:'skills' as const,skillId:'smithing' as const,mode:'crafting' as const,recipeId:'CRAFT_'+tool.id,button:gt('Craft {name}',{name:tool.name}),detail:gt('Open the Smithing recipe for {name}.',{name:tool.name})};
          const blueprintDestination=sourceMonster&&sourceRegionId?{kind:'combat' as const,monsterId:sourceMonster.id,zoneName:sourceMonster.zone,regionId:sourceRegionId,button:gt('Hunt {name}',{name:sourceMonster.name}),detail:gt('{name} can drop the {tool} Blueprint · {chance}% base chance.',{name:sourceMonster.name,tool:tool.name,chance:Math.round((tool.blueprint?.dropChance??0)*100)})}:undefined;
          const title=equipped?gt("Equipped"):carried&&!characterReady?gt('Level {value}',{value:tool.requiredCharacterLevel}):carried&&!skillReady?gl(tool.skillId)+' '+tool.unlockLevel:carried?gt("Equip"):banked?gt("Withdraw"):tool.blueprint&&!learned&&!blueprintOwned?gt("Find Blueprint"):gt("Recipe");
          const disabled=equipped||(carried&&(!skillReady||!characterReady));
          const action=carried?()=>onEquipTool(tool.id):banked?onInventory:tool.blueprint&&!learned&&!blueprintOwned&&blueprintDestination&&onNavigateCraftingSource?()=>onNavigateCraftingSource(blueprintDestination):onNavigateCraftingSource?()=>onNavigateCraftingSource(recipeDestination):onViewToolRecipes;
          const blueprintText=!tool.blueprint?gt("recipe known"):learned?gt("blueprint learned"):blueprintOwned?gt("blueprint owned"):sourceMonster?gt('Blueprint: {name} · {chance}% drop',{name:sourceMonster.name,chance:Math.round(tool.blueprint.dropChance*100)}):gt("blueprint required");
          return <View key={tool.id} style={[s.toolRow,compactTools&&s.toolRowCompact]}>
           <View style={s.toolInfo}><GatheringToolArtwork itemId={tool.id} size={48}/><View style={s.toolCopy}>
            <Text numberOfLines={2} style={s.toolName}>T{tool.tier} · {localizedItemName(language,tool.id)}</Text>
            <Text style={s.toolEffect}>{gt('{percent}% faster · {skill} {level} · Level {character}',{percent:Math.round((1-tool.actionTimeMultiplier)*100),skill:gl(tool.skillId),level:tool.unlockLevel,character:tool.requiredCharacterLevel})}</Text>
            <Text style={s.toolRequirement}>{blueprintText}{banked?' · '+gt('in Bank'):carried&&skillReady&&characterReady?' · '+gt('Ready'):''}</Text>
           </View></View>
           <View style={[s.toolButton,compactTools&&s.toolButtonCompact]}><GameButton title={title} disabled={disabled} selected={equipped} tone={equipped?'primary':'secondary'} onPress={action}/></View>
          </View>;
        })}</Panel>}
        {mode==='gathering'&&<ActiveGatheringScene state={state} nowMs={now} skillId={gatheringSkill}/>}
        {mode==='gathering'&&<GatheringActivityList state={state} skillId={gatheringSkill} skillLevel={sk.level} preferredActionId={initialActionId} onGather={onGather} onNavigate={onNavigateCraftingSource}/>}
        {mode==='crafting'&&<CraftingRecipeBrowser state={state} skillId={sk.skillId as 'smithing'|'cooking'|'alchemy'|'tailoring'|'enchanting'} initialQuery={initialRecipe?.name??''} preferredRecipeId={initialRecipeId} onCraft={onCraft} onAlchemyStart={id=>onCommand({type:'alchemy_start',args:{id}})} onProcessingStart={id=>onCommand({type:'processing_start',args:{id}})} onNavigate={onNavigateCraftingSource} onCraftPrerequisites={onCraftPrerequisites}/>}
      </View>;
    })}
  </ScrollView>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
    areaPicker:{flexDirection:'row',flexWrap:'wrap',gap:6,paddingVertical:3},
    areaChip:{minHeight:36,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,paddingHorizontal:10},
    areaChipSelected:{borderColor:C.accent,backgroundColor:C.selection},
    areaChipLocked:{opacity:.45},areaChipText:{fontSize:11,color:C.muted,fontWeight:'700'},areaChipTextSelected:{color:C.text,fontWeight:'800'},root:{padding:spacing.lg,gap:spacing.md},plannerToggle:{minHeight:54,flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:spacing.md,marginTop:spacing.sm,paddingHorizontal:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},plannerTitle:{...typography.bodyStrong,color:C.text},h:{...typography.hero,color:C.text},name:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},accentWord:{color:equipmentColors.goldSoft,fontWeight:'900'},infoWord:{color:C.info,fontWeight:'900'},weather:{...typography.caption,fontWeight:'900'},pacing:{...typography.caption,color:C.info},row:{flexDirection:'row',gap:spacing.sm},actionRow:{flexDirection:'row',gap:8},queueButton:{flex:1},startButton:{flex:2},chipRow:{flexDirection:'row',flexWrap:'wrap',gap:6},modeChip:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},modeChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},modeChipText:{fontSize:12,color:C.muted,fontWeight:'700'},modeChipTextSelected:{color:C.text},pressed:{opacity:.76},flex:{flex:1},group:{gap:spacing.md},output:{...typography.bodyStrong,color:C.accent},met:{...typography.caption,color:C.good},missing:{...typography.caption,color:C.warning},toolHeading:{minHeight:74,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:4}, manageHint:{...typography.caption,color:C.accent},emptyTool:{width:64,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.stage},emptyToolCompact:{width:52,height:52},
 toolRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
 toolRowCompact:{flexDirection:'column',alignItems:'stretch',gap:8},
 toolInfo:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:spacing.sm},
 toolCopy:{flex:1,minWidth:0,gap:3},
 toolName:{...typography.bodyStrong,color:C.text,flexShrink:1},
 toolEffect:{...typography.caption,color:C.info,flexShrink:1},
 toolRequirement:{...typography.caption,color:C.muted,fontWeight:'700',flexShrink:1},
 toolButton:{width:104},toolButtonCompact:{width:'100%'},sectionHeading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},region:{minHeight:120,position:'relative',overflow:'hidden',flexDirection:'row',alignItems:'center',padding:spacing.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:12},regionShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(4,12,18,.66)'},regionLabel:{...typography.caption,color:'#e2eee7',fontWeight:'900',letterSpacing:.8},regionName:{...typography.title,color:'#fff'},regionSub:{...typography.body,color:'#e8eee9'},goalTarget:{gap:2,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface},goalTargetLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},goalTargetName:{...typography.bodyStrong,color:C.text},skillHero:{gap:8,padding:spacing.md,borderWidth:1,borderColor:C.lineStrong,borderRadius:12,backgroundColor:C.panel},skillHeroNear:{borderColor:C.good},skillHeroTop:{flexDirection:'row',alignItems:'center',gap:spacing.sm},skillHeroKind:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.9},skillLevelBadge:{minWidth:58,alignItems:'center',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.accentSurface},skillLevelValue:{...typography.title,color:C.accent},skillLevelLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.8},skillProgressMeta:{flexDirection:'row',justifyContent:'space-between',gap:8},skillProgressText:{...typography.caption,color:C.muted},skillProgressTrack:{height:8,borderRadius:5,overflow:'hidden',backgroundColor:C.bg},skillProgressFill:{height:'100%',borderRadius:5,backgroundColor:C.good},skillProgressUrgent:{backgroundColor:C.accent},anticipationNear:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.4},anticipationUrgent:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.4},unavailable:{...typography.body,color:C.muted,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel}});}


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
 hub:{padding:spacing.md,gap:10,paddingBottom:spacing.xl},hubTitle:{...typography.hero,color:C.text},hubSub:{...typography.body,color:C.muted},summary:{flexDirection:'row',flexWrap:'wrap',gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},summaryCell:{flex:1,minWidth:86},summaryLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.8},summaryValue:{...typography.title,color:C.accent},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:4},sectionLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},sectionCount:{...typography.caption,color:C.info,fontWeight:'800'},cardGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},skillCard:{width:'48%',minWidth:138,minHeight:112,padding:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,gap:6},combatCard:{flex:1,width:undefined,minWidth:0},combatTop:{flexDirection:'column',alignItems:'flex-start'},combatLink:{borderColor:C.selectionLine,backgroundColor:C.selection,justifyContent:'center'},combatLinkText:{...typography.bodyStrong,color:C.selectionLine},skillCardWide:{width:'100%',minWidth:0},skillTop:{minHeight:38,flexDirection:'row',alignItems:'center',gap:8},skillCopy:{flex:1,minWidth:0},skillIcon:{width:36,height:36},cardPressed:{opacity:.72},skillName:{...typography.bodyStrong,color:C.text},skillKind:{...typography.caption,color:C.info},levelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},skillLevel:{...typography.bodyStrong,color:C.accent},xpHint:{fontSize:10,color:C.muted,fontWeight:'700'},xpHintUrgent:{color:C.accent,fontWeight:'900'},openMark:{fontSize:20,lineHeight:20,color:C.muted,fontWeight:'700'},skillTrack:{height:6,backgroundColor:C.bg,borderRadius:3,overflow:'hidden'},skillFill:{height:'100%',backgroundColor:C.good},related:{paddingTop:4,borderTopWidth:1,borderTopColor:C.line},modalBody:{gap:6,paddingTop:0,paddingBottom:2},modalTheme:{...typography.bodyStrong,color:C.accent},modalCopy:{...typography.body,color:C.muted,lineHeight:18},modalStat:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:2},modalLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},modalValue:{...typography.title,color:C.text},modalProgressTrack:{height:8,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2},modalProgressFill:{height:'100%',backgroundColor:C.accent},modalProgressText:{...typography.caption,color:C.muted,lineHeight:15},focusCard:{minHeight:82,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderLeftWidth:3,borderColor:C.line,borderLeftColor:C.info,borderRadius:12,backgroundColor:C.infoSurface},focusCopy:{flex:1,minWidth:0,gap:2},focusKicker:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.75},focusTitle:{...typography.bodyStrong,color:C.text},focusDetail:{...typography.caption,color:C.muted,lineHeight:16},focusLevel:{minWidth:58,alignItems:'center',gap:1},focusLevelValue:{...typography.bodyStrong,color:C.info},focusLevelLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},skillNext:{fontSize:9,color:C.info,fontWeight:'800',letterSpacing:.25}
});}
function SkillHub({state,now,onSelect,onCombat,onCommand,initialMasteryInfoOpen=false,onMasteryClosed}:{state:GameState;now:number;onSelect:(id:string)=>void;onCombat?:()=>void;onCommand:(command:import('../core/game-commands').GameCommand)=>Promise<void>;initialMasteryInfoOpen?:boolean;onMasteryClosed?:()=>void}){
 const {gt,gl,language}=useGameplayText();
 const a=(source:string,params?:Record<string,string|number>)=>accountText(language,source,params);
 const C=useGameTheme(),hubStyles=useMemo(()=>makeHubStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackCards=width<350||fontScale>=1.25;
 const [classSkillId,setClassSkillId]=useState<string>();
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
 const classRows=state.character?characterClassSkills(state.character):[],focus=skillTrainingFocus(state);
 const cards=(rows:ReadonlyArray<{id:string;name:string;level:number;kind:string;xp?:number}>,includeCombat=false)=><View style={hubStyles.cardGrid}>{includeCombat?<Pressable accessibilityRole="button" accessibilityLabel={gt("Open Combat")} accessibilityHint={gt("Choose an enemy and set your combat skill XP split")} accessibilityState={{disabled:!onCombat}} disabled={!onCombat} onPress={onCombat} style={({pressed})=>[hubStyles.skillCard,!stackCards&&hubStyles.combatCard,stackCards&&hubStyles.skillCardWide,hubStyles.combatLink,pressed&&hubStyles.cardPressed]}><ActivityArtwork id="combat" size={36}/><Text style={hubStyles.skillName}>{gt("Combat")}</Text><Text style={hubStyles.skillKind}>{gt("Fight & train")}</Text><Text style={hubStyles.combatLinkText}>{gt("Open ›")}</Text></Pressable>:null}{rows.map(card=>{const icon=(card.id==='companion'||card.id==='companion-mastery')?uiIcons.companions:card.id.startsWith('class:')?classSkillIcon(card.id.slice(6)):null;const isSanctuary=card.id==='companion',isMastery=card.id==='companion-mastery',p=isMastery?{current:mastery.current,need:mastery.need}:card.xp===undefined?undefined:card.id.startsWith('class:')?classCombatSkillProgressWithinLevel(card.xp,card.level):progressWithinLevel(card.xp,card.level),ratio=isSanctuary?Math.max(0,Math.min(1,card.level/3)):isMastery?(mastery.need?Math.min(1,mastery.current/mastery.need):1):card.level>=100?1:p?Math.min(1,p.current/Math.max(1,p.need)):Math.min(1,card.level/100),anticipation=p&&card.level<100?progressAnticipation(p.current,p.need,{nearAt:.92,urgentAt:.98}):undefined,skillRow=state.skills.find(row=>row.skillId===card.id),milestone=skillRow?skillMilestoneOverview(state,skillRow.skillId):undefined;return <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={gt('{name}, {kind}, level {level}',{name:gl(card.name),kind:gl(card.kind),level:card.level})} accessibilityHint={gt('Open {name} information',{name:gl(card.name)})} onPress={()=>isSanctuary?setTrainingInfoOpen(true):isMastery?setMasteryInfoOpen(true):card.id.startsWith('class:')?setClassSkillId(card.id.slice(6)):onSelect(card.id)} style={({pressed})=>[hubStyles.skillCard,includeCombat&&!stackCards&&hubStyles.combatCard,stackCards&&hubStyles.skillCardWide,pressed&&hubStyles.cardPressed]}><View style={[hubStyles.skillTop,includeCombat&&!stackCards&&hubStyles.combatTop]}>{icon?<Image source={icon} resizeMode="contain" style={hubStyles.skillIcon}/>:<ActivityArtwork id={card.id as any} size={36}/>}<View style={hubStyles.skillCopy}><Text numberOfLines={includeCombat||stackCards?2:1} style={hubStyles.skillName}>{gl(card.name)}</Text><Text numberOfLines={1} style={hubStyles.skillKind}>{gl(card.kind)}</Text></View></View><View style={hubStyles.levelRow}><View><Text style={hubStyles.skillLevel}>{isSanctuary?gt('Facility Lv {level}/3',{level:card.level}):gt('Level {value}',{value:card.level})}</Text>{isSanctuary?<Text style={hubStyles.xpHint}>{gt('{xp} XP/day per idle companion',{xp:facilityXpPerDay})}</Text>:null}{p&&card.level<100?<Text style={[hubStyles.xpHint,anticipation?.band==='urgent'&&hubStyles.xpHintUrgent]}>{anticipation?.band==='urgent'?gt('{xp} XP left',{xp:Math.ceil(anticipation.remaining).toLocaleString(language)}):gt('{percent}% to next',{percent:Math.min(99,Math.floor(ratio*100))})}</Text>:null}</View><Text style={hubStyles.openMark}>›</Text></View><View style={hubStyles.skillTrack}><View style={[hubStyles.skillFill,{width:`${Math.max(isSanctuary?0:card.level>=100?100:3,ratio*100)}%`}]}/></View>{milestone?.nextLevel&&milestone.next[0]?<Text numberOfLines={1} style={hubStyles.skillNext}>{gt('NEXT LV {level} · {title}',{level:milestone.nextLevel,title:gl(milestone.next[0].title)})}</Text>:null}</Pressable>})}</View>;
 const combat=classRows.map((row,i)=>({id:`class:${row.skillId}`,name:classSkillsFor(state.character!.classId)[i]?.name??row.skillId,level:row.level,xp:row.xp,kind:"combat skill"}));
 const skilling=state.skills.filter(sk=>["mining","woodcutting","fishing","herbalism","exploration"].includes(sk.skillId)).map(sk=>({id:sk.skillId,name:gl(sk.skillId),level:sk.level,xp:sk.xp,kind:sk.skillId==='exploration'?"adventure skill":"gathering"}));
 const crafting=state.skills.filter(sk=>["smithing","cooking","alchemy","tailoring","enchanting","faith"].includes(sk.skillId)).map(sk=>({id:sk.skillId,name:gl(sk.skillId),level:sk.level,xp:sk.xp,kind:sk.skillId==='faith'?"devotion":"crafting"}));
 const tracked=[...state.skills,...classRows,{level:mastery.level}],total=tracked.reduce((sum,row)=>sum+row.level,0),highest=Math.max(1,...tracked.map(row=>row.level)),mastered=tracked.filter(row=>row.level>=100).length;
 const section=(label:string,rows:ReadonlyArray<{id:string;name:string;level:number;kind:string;xp?:number}>,includeCombat=false)=><><View style={hubStyles.sectionHeading}><Text style={hubStyles.sectionLabel}>{label}</Text><Text style={hubStyles.sectionCount}>{rows.length}</Text></View>{cards(rows,includeCombat)}</>;
 const selectedDefinition=state.character&&classSkillId?classSkillsFor(state.character.classId).find(definition=>definition.id===classSkillId):undefined;
 const selectedRow=classRows.find(row=>row.skillId===classSkillId);
 const selectedProgress=selectedRow?classCombatSkillProgressWithinLevel(selectedRow.xp,selectedRow.level):undefined;
 const selectedBonuses=state.character&&classSkillId?classSkillBonuses(state.character,classSkillId):[];
 return <><ScrollView contentContainerStyle={hubStyles.hub} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><Text accessibilityRole="header" style={hubStyles.hubTitle}>{gt("Skills")}</Text><Text style={hubStyles.hubSub}>{gt("Train gathering and crafting, manage class specializations, and see exactly how close each skill is to its next level.")}</Text><View style={hubStyles.summary}><View style={hubStyles.summaryCell}><Text style={hubStyles.summaryLabel}>{gt("SKILL TOTAL")}</Text><Text style={hubStyles.summaryValue}>{total}</Text></View><View style={hubStyles.summaryCell}><Text style={hubStyles.summaryLabel}>{gt("HIGHEST")}</Text><Text style={hubStyles.summaryValue}>{highest}</Text></View><View style={hubStyles.summaryCell}><Text style={hubStyles.summaryLabel}>{gt("Mastered").toLocaleUpperCase(language)}</Text><Text style={hubStyles.summaryValue}>{mastered}</Text></View></View>{focus?<Pressable accessibilityRole="button" accessibilityLabel={gt('Recommended training: {skill}',{skill:gl(focus.skillName)})} accessibilityHint={gt('Open {name}',{name:gl(focus.skillName)})} onPress={()=>onSelect(focus.skillId)} style={({pressed})=>[hubStyles.focusCard,pressed&&hubStyles.cardPressed]}><View style={hubStyles.focusCopy}><Text style={hubStyles.focusKicker}>{gt("TRAINING FOCUS · RECOMMENDED")}</Text><Text style={hubStyles.focusTitle}>{gl(focus.skillName)} · {gl(focus.milestoneTitles[0])}</Text><Text style={hubStyles.focusDetail}>{focus.tutorial?gt('Gather and collect rewards to reach skill level 2.'):gt('In {levels} skill levels · {count} unlocks at Lv {level} · current level {percent}% complete',{levels:focus.levelsAway,count:focus.milestoneCount,level:focus.nextLevel,percent:focus.currentLevelProgressPct})}</Text></View><View style={hubStyles.focusLevel}><Text style={hubStyles.focusLevelValue}>{focus.currentLevel}→{focus.nextLevel}</Text><Text style={hubStyles.focusLevelLabel}>{gt("Level").toLocaleUpperCase(language)}</Text><Text style={hubStyles.openMark}>›</Text></View></Pressable>:null}<ActivityQueuePlanner state={state} onCommand={onCommand}/>{section(gt("COMBAT SKILLS"),combat,true)}{section(gt("SKILLING"),skilling)}{section(gt("CRAFTING & OTHER"),crafting)}<View style={hubStyles.related}><View style={hubStyles.sectionHeading}><Text style={hubStyles.sectionLabel}>{gt("RELATED PROGRESSION")}</Text></View>{cards([{id:'companion-mastery',name:'Companion Mastery',level:mastery.level,xp:mastery.xp,kind:'Account-wide companion skill'},{id:'companion',name:'Companion Training',level:facilityLevel,kind:'Sanctuary facility'}])}</View></ScrollView><GameModalSurface visible={masteryInfoOpen} presentation="dialog" onClose={closeMasteryInfo}>
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
 </GameModalSurface><GameModalSurface visible={!!selectedDefinition} presentation="dialog" onClose={()=>setClassSkillId(undefined)}>{selectedDefinition&&selectedRow&&selectedProgress?<><GameModalHeader eyebrow={gt("Combat skill").toLocaleUpperCase(language)} title={selectedDefinition.name} onClose={()=>setClassSkillId(undefined)}/><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={{flexShrink:1}} contentContainerStyle={hubStyles.modalBody}><Image accessible={false} source={classSkillIcon(selectedDefinition.id)} resizeMode="contain" style={{width:64,height:64,alignSelf:'center'}}/><Text style={hubStyles.modalTheme}>{gl(selectedDefinition.theme)}</Text><Text style={hubStyles.modalCopy}>{gt("A class specialization that improves your combat performance. Class skill XP is earned through combat using the split selected on the Combat screen.")}</Text>{selectedBonuses.map(bonus=><View key={bonus.stat} style={hubStyles.modalStat}><View style={{flex:1,minWidth:0}}><Text style={hubStyles.modalLabel}>{gl(bonus.label)}</Text><Text style={hubStyles.modalProgressText}>{gt("AT LEVEL 100:")} {classSkillBonusLabel(bonus.maxPercent)}</Text></View><Text style={hubStyles.modalValue}>{classSkillBonusLabel(bonus.currentPercent)}</Text></View>)}<View style={hubStyles.modalStat}><Text style={hubStyles.modalLabel}>{gt("CURRENT LEVEL")}</Text><Text style={hubStyles.modalValue}>{selectedRow.level}</Text></View><View style={hubStyles.modalProgressTrack}><View style={[hubStyles.modalProgressFill,{width:`${Math.min(100,selectedRow.level>=100?100:selectedProgress.current/Math.max(1,selectedProgress.need)*100)}%`}]}/></View><Text style={hubStyles.modalProgressText}>{selectedRow.level>=100?gt("Mastered"):gt('{current} / {need} XP to next level',{current:selectedProgress.current.toLocaleString(language),need:selectedProgress.need.toLocaleString(language)})}</Text></ScrollView></>:null}</GameModalSurface></>;
}
