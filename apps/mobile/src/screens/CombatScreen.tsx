import {LineworkIcon} from '../components/LineworkIcon';
import {HuntingPreview} from '../components/HuntingPreview';
import {encounterLockRequirement,encounterUnlocked,regionEncounters} from '../core/world-navigation';
import {useGameplayText} from '../i18n/gameplay';
import {Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useEffect,useMemo,useState} from 'react';
import type {CombatTacticId,GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import type {HuntGoalId} from '../core/hunt-goals';
import {WORLD_ZONES} from '../content/world-map';
import {regionAreas,regionalArea} from '../content/regional-areas';
import {currentCombatRegionId} from '../core/combat-region';
import {characterProgressWithinLevel} from '../core/progression';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from '../components/GameButton';
import {EquipmentSlotPicker} from '../components/EquipmentSlotPicker';
import {localizedItemName} from '../i18n/starter-item-names';
import {EquipmentArtwork} from '../components/EquipmentArtwork';
import {itemDef} from '../content/items';
import {gearEnhancement} from '../core/equipment-enhancement';
import {craftedGearDisplayQuality,craftedGearInstances,equippedCraftedGearRarity} from '../core/crafted-gear-instances';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {RegionEncounterList} from '../components/RegionEncounterList';
import {StatBar} from '../components/StatBar';
import {ActionQueuePanel} from '../components/ActionQueuePanel';
import {CombatXpSplit} from '../components/CombatXpSplit';
import {MonsterMasteryPanel} from '../components/MonsterMasteryPanel';
import {progressionT} from '../i18n/progression';

export function CombatScreen({state,onCommand,onOpenInventory,onChangeRegion,onStart,onQueue,onQueueRemove,onQueueMove,onQueueClear,onQueueStart,onBoss,initialMonsterId,initialAreaId}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>;onOpenInventory?:()=>void;onChangeRegion:()=>void;onStart:(id:string,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueue:(id:string,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueueRemove:(index:number)=>void;onQueueMove:(index:number,direction:'up'|'down')=>void;onQueueClear:()=>void;onQueueStart:()=>void;onBoss:()=>void;initialMonsterId?:string;initialAreaId?:string}){
 const {gt}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const character=state.character!,progress=characterProgressWithinLevel(character.xp,character.level);
  const zone=WORLD_ZONES.find(entry=>entry.id===currentCombatRegionId(state))??WORLD_ZONES[0];
  const areas=regionAreas(zone.id);
  const [selectedAreaId,setSelectedAreaId]=useState<string|undefined>(()=>regionalArea(zone.id,initialAreaId)?.id);
  const area=regionalArea(zone.id,selectedAreaId);
  const encounters=regionEncounters(state,zone.name,'',false,area?.id),preview=encounters.find(m=>m.id===(state.activity?.kind==='combat'?state.activity.targetId:initialMonsterId))??encounters[0];
  const explorationLock=encounters.map(monster=>({monster,lock:encounterLockRequirement(state,monster)})).find(row=>row.lock?.kind==='exploration');
  const [showTraining,setShowTraining]=useState(false),[inspectedId,setInspectedId]=useState<string>(),[weaponPickerOpen,setWeaponPickerOpen]=useState(false);
  const detail=encounters.find(m=>m.id===inspectedId)??preview;
  const weaponId=character.equipment.weapon;
  const weapon=weaponId?itemDef(weaponId):undefined;
  const weaponName=weaponId?localizedItemName(state.settings.language,weaponId):gt('Empty slot');
  const weaponRank=weaponId?gearEnhancement(state,weaponId).rank:0;
  const weaponRarity=weapon?rarityMeta(equippedCraftedGearRarity(state,'weapon')??itemRarity(weapon)):undefined;
  const weaponCopyId=character.equipmentInstanceIds?.weapon;
  const weaponCopy=weaponCopyId?craftedGearInstances(state).find(copy=>copy.id===weaponCopyId):undefined;
  const weaponMeta=[weaponRarity?.label,weaponCopy?'Q'+craftedGearDisplayQuality(weaponCopy):undefined].filter(Boolean).join(' · ');
  const isHunting=state.activity?.kind==='combat';
  useEffect(()=>{setInspectedId(undefined);setSelectedAreaId(regionalArea(zone.id,initialAreaId)?.id)},[zone.id,initialAreaId]);
  useEffect(()=>{setInspectedId(undefined)},[selectedAreaId]);
  return <View style={{flex:1,minHeight:0,backgroundColor:C.bg}}><ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.header}>
      <View style={s.breadcrumb}><Pressable accessibilityRole="button" onPress={onChangeRegion} hitSlop={8}><Text style={s.worldLink}>{gt("World")} /</Text></Pressable><Text accessibilityRole="header" style={s.regionName}>{zone.name}</Text></View>
      <GameButton compact title={gt("Change")} tone="secondary" onPress={onChangeRegion}/>
    </View>
    {areas.length>0?<View style={s.areaPicker}>
      <Pressable accessibilityRole="button" accessibilityState={{selected:!area}} onPress={()=>setSelectedAreaId(undefined)}
        style={[s.areaChip,!area&&s.areaChipSelected]}><Text style={[s.areaChipText,!area&&s.areaChipTextSelected]}>{'All'}</Text></Pressable>
      {areas.map(entry=>{
        // Encounter entitlement is cumulative through the furthest unlocked
        // region. Do not leave an area's tab disabled after its monsters unlock.
        const hasUnlockedHunts=regionEncounters(state,zone.name,'',true,entry.id).length>0;
        const locked=character.level<entry.minLevel&&!hasUnlockedHunts;
        return <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={entry.name+' · Lv '+entry.minLevel+'+'}
          accessibilityState={{disabled:locked,selected:area?.id===entry.id}}
          disabled={locked} onPress={()=>setSelectedAreaId(entry.id)}
          style={[s.areaChip,area?.id===entry.id&&s.areaChipSelected,locked&&s.areaChipLocked]}>
          <Text numberOfLines={1} style={[s.areaChipText,area?.id===entry.id&&s.areaChipTextSelected]}>{entry.name}</Text>
        </Pressable>;
      })}
    </View>:null}
    <View style={s.xpRow}><View style={s.levelBadge}><Text style={s.levelBadgeText}>{gt("Level {value}",{value:character.level})}</Text></View><View style={s.flex}><StatBar rounded reduceMotion={state.settings.reduceMotion} label={gt("Combat XP")} current={progress.current} max={progress.need}/></View></View>
    <Pressable accessibilityRole="button" accessibilityLabel={gt('Weapon')+' · '+weaponName+' · '+gt('Compare & Swap')}
      accessibilityHint={isHunting?gt('Weapon swaps keep your hunt running. Health is not restored.'):undefined}
      onPress={()=>setWeaponPickerOpen(true)} style={({pressed})=>[s.weaponQuickAccess,pressed&&s.weaponQuickPressed]}>
      <View style={s.weaponQuickArt}>{weapon?<EquipmentArtwork item={weapon} rarity={weaponRarity?.id} size={38} framed={false}/>:<LineworkIcon name="inventory" size={26}/>}</View>
      <View style={s.flex}>
        <Text style={s.weaponQuickLabel}>{gt('Weapon')}{isHunting?' · '+gt('Combat'):''}</Text>
        <Text numberOfLines={1} style={s.weaponQuickName}>{weaponName}{weaponRank?' +'+weaponRank:''}</Text>
        {weaponMeta?<Text numberOfLines={1} style={s.weaponQuickMeta}>{weaponMeta}</Text>:null}
      </View>
      <View style={s.weaponQuickActionGroup}><Text numberOfLines={2} style={s.weaponQuickAction}>{gt('Compare & Swap')}</Text><Text style={s.weaponQuickArrow}>›</Text></View>
    </Pressable>
    {preview?<HuntingPreview state={state} monster={preview} regionId={zone.id}/>:null}
    <View style={s.enemiesHeading}><Text style={[s.section,s.flex]}>{gt("ENEMIES IN {region}",{region:(area?.name??zone.name).toUpperCase()})}</Text><Text style={s.sub}>{gt("{count} enemies",{count:encounters.length})}</Text></View>
    {explorationLock?.lock?.kind==='exploration'?<View style={s.unlockGuide}><Text style={s.unlockGuideTitle}>{progressionT(state.settings.language,"HOW TO UNLOCK")}</Text><Text style={s.unlockGuideText}>{progressionT(state.settings.language,"Level reached. Unlock {name} in Skills → Exploration → {route}.",{name:explorationLock.monster.name,route:explorationLock.lock.routeName})}</Text></View>:null}
    <RegionEncounterList key={area?.id??zone.id} state={state} zone={zone} areaId={area?.id} presentation="all" initialExpandedId={initialMonsterId} onInspect={id=>{setInspectedId(id);setShowTraining(false);}} onStart={(id,tactic,goal)=>{setInspectedId(id);onStart(id,tactic,goal);}} onBoss={onBoss}/>
    <ActionQueuePanel state={state} onRemove={onQueueRemove} onMove={onQueueMove} onClear={onQueueClear} onStartNext={onQueueStart}/>
    <View style={s.afterMonsters}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showTraining}} onPress={()=>setShowTraining(value=>!value)} style={s.trainingToggle}><LineworkIcon name="skills" size={23}/><View style={s.flex}><Text style={s.dockTitle}>{gt("Training XP")}</Text></View><Text style={s.trainingMark}>{showTraining?'⌃':'⌄'}</Text></Pressable>
      {showTraining?<CombatXpSplit state={state} onCommand={onCommand}/>:null}
    </View>
    <MonsterMasteryPanel state={state}/>
  </ScrollView>{weaponPickerOpen?<EquipmentSlotPicker state={state} slot="weapon" onEquip={itemId=>onCommand({type:"equip",args:{id:itemId}})} onEquipInstance={instanceId=>onCommand({type:"gear_equip",args:{instanceId}})} onEquipPouch={itemId=>onCommand({type:"equipment_pouch_equip",args:{itemId}})} onInventory={onOpenInventory?()=>{setWeaponPickerOpen(false);onOpenInventory()}:undefined} onClose={()=>setWeaponPickerOpen(false)}/>:null}</View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{flexGrow:1,padding:spacing.lg,gap:spacing.sm,paddingBottom:spacing.xl},weaponQuickAccess:{minHeight:60,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:spacing.sm,paddingVertical:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:equipmentColors.panel},weaponQuickPressed:{backgroundColor:C.selection},weaponQuickArt:{width:42,height:42,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,overflow:'hidden'},weaponQuickLabel:{...typography.caption,fontSize:10,color:C.muted,fontWeight:'800'},weaponQuickName:{...typography.bodyStrong,color:C.text},weaponQuickMeta:{...typography.caption,fontSize:10,color:C.muted},weaponQuickActionGroup:{maxWidth:111,flexDirection:'row',alignItems:'center',gap:3},weaponQuickAction:{...typography.caption,color:C.accent,fontWeight:'800',textAlign:'right',flexShrink:1},weaponQuickArrow:{fontSize:20,color:C.accent},
areaPicker:{flexDirection:'row',flexWrap:'wrap',gap:6,paddingVertical:3},areaChip:{minHeight:36,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2,paddingHorizontal:10},
areaChipSelected:{borderColor:C.accent,backgroundColor:C.selection},areaChipLocked:{opacity:.45},areaChipText:{fontSize:11,color:C.muted,fontWeight:'700'},areaChipTextSelected:{color:C.text,fontWeight:'800'},unlockGuide:{gap:4,paddingHorizontal:spacing.sm,paddingVertical:10,borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:C.infoSurface},unlockGuideTitle:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.7},unlockGuideText:{...typography.body,color:C.text},afterMonsters:{gap:8,paddingTop:spacing.xs},huntingPanel:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:equipmentColors.panel},huntingLabel:{...typography.caption,color:C.muted,fontWeight:'800',letterSpacing:.7},huntingActions:{flexDirection:'row',gap:8},dockTitle:{fontFamily:Platform.OS==='web'?'system-ui':'sans-serif',fontSize:14,lineHeight:19,fontWeight:'600',color:C.text},enemiesHeading:{flexDirection:'row',alignItems:'center',gap:10,marginTop:2},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.md,minHeight:48},breadcrumb:{flex:1,minWidth:0,flexDirection:'row',alignItems:'baseline',flexWrap:'wrap',columnGap:5},worldLink:{...typography.body,color:C.muted},regionName:{fontFamily:Platform.OS==='web'?'system-ui':'sans-serif',fontSize:20,lineHeight:27,fontWeight:'500',color:C.text},xpRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},levelBadge:{paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},levelBadgeText:{...typography.caption,color:C.text,fontWeight:'700'},flex:{flex:1,minWidth:0},sub:{...typography.caption,color:C.muted},trainingToggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:equipmentColors.panel},trainingMark:{width:24,color:C.muted,fontSize:23,textAlign:'center',fontWeight:'700'},section:{...typography.caption,color:C.muted,fontWeight:'700',letterSpacing:.6}});}
