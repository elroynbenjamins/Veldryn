import {useMemo,useState} from 'react';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {bestiaryProjection} from '../core/bestiary-v40';
import {monsterCodexRegions,monsterCodexRegionForLocation} from '../core/monster-codex';
import {monsterMasteryGuidance,MONSTER_MASTERY_MILESTONES} from '../core/monster-mastery-presentation';
import {monsterMasteryCombatBonuses,MONSTER_MASTERY_MAX_KILLS} from '../core/monster-mastery';
import {ENEMY_FAMILIES,enemyFamilyById,enemyFamilyForMonster} from '../content/enemy-families';
import {enemyFamilyMasteryGuidance,enemyFamilyMasteryPointsPerKill,ENEMY_FAMILY_MASTERY_MILESTONES,FAMILY_MASTERY_MAX_POINTS} from '../core/enemy-family-mastery';
import {SearchField} from '../components/SearchField';
import {GameButton} from '../components/GameButton';
import {StatBar} from '../components/StatBar';
import {MonsterPortraitFrame} from '../components/MonsterPortraitFrame';
import {GameModalSurface,GameModalHeader} from '../components/GameModalSurface';
import {ItemArtwork} from '../components/ItemArtwork';
import {itemDef} from '../content/items';
import {v33EquipmentMaterialLabel} from '../core/equipment-loot-v33';
import {companionContent,companionLabel,companionTranslator} from '../i18n/companions';
import {formatLocalizedNumber} from '../i18n/translator';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type CodexTab='monsters'|'types'|'rewards';
type CodexFilter='all'|'known'|'unknown'|'mastered';

export function BestiaryScreen({state}:{state:GameState}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions(),compact=width<355||fontScale>=1.3;
 const language=useGameLanguage(),translator=companionTranslator(language),t=(source:string,params?:Record<string,string|number>)=>translator(source as Parameters<typeof translator>[0],params),translated=(text:string)=>companionContent(language,text);
 const number=(value:number)=>formatLocalizedNumber(language,value);
 const percent=(value:number)=>formatLocalizedNumber(language,value*100,{maximumFractionDigits:2});
 const projection=useMemo(()=>bestiaryProjection(state),[state]);
 const regions=useMemo(()=>monsterCodexRegions(projection),[projection]);
 const [tab,setTab]=useState<CodexTab>('monsters');
 const [expandedRegion,setExpandedRegion]=useState<string|null>(()=>monsterCodexRegionForLocation(state.currentRegionId));
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<CodexFilter>('all');
 const [detailId,setDetailId]=useState<string|null>(null),[expandedFamilyId,setExpandedFamilyId]=useState<string|null>(null);
 const published=regions.filter(region=>region.available),visibleTotal=published.reduce((n,r)=>n+r.total,0);
 const discovered=published.reduce((n,r)=>n+r.discovered,0);
 const completion=visibleTotal?Math.round(discovered/visibleTotal*100):100;
 const allRows=published.flatMap(region=>region.zones.flatMap(zone=>zone.monsters));
 const mastered=allRows.filter(row=>!row.monster.boss&&monsterMasteryGuidance(state,row.monster.id).rank===30).length;
 const trimmed=query.trim().toLocaleLowerCase(language),autoExpand=!!trimmed||filter!=='all';
 const matching=useMemo(()=>regions.map(region=>({...region,zones:region.zones.map(zone=>({...zone,monsters:zone.monsters.filter(row=>{
  const known=row.entry.status!=='unknown'||row.entry.masteryPoints>0;
  const defeated=row.entry.status==='defeated'||row.entry.masteryPoints>0;
  const rank=row.monster.boss?0:monsterMasteryGuidance(state,row.monster.id).rank;
  if(filter==='known'&&!defeated)return false;
  if(filter==='unknown'&&known)return false;
  if(filter==='mastered'&&rank<30)return false;
  return !trimmed||((known?row.monster.name+' '+(enemyFamilyForMonster(row.monster.id)?.name??''):'')+' '+zone.name+' '+region.name).toLocaleLowerCase(language).includes(trimmed);
 })})).filter(zone=>zone.monsters.length>0)})).filter(region=>!autoExpand||region.zones.length>0),[regions,filter,trimmed,state,language]);
 const selected=allRows.find(row=>row.monster.id===detailId);
 const selectedKnown=!!selected&&(selected.entry.status!=='unknown'||selected.entry.masteryPoints>0);
 const species=selected&&selectedKnown&&!selected.monster.boss?monsterMasteryGuidance(state,selected.monster.id):undefined;
 const bonuses=selected&&species?monsterMasteryCombatBonuses(state,selected.monster.id):undefined;
 const familyName=bonuses?.familyId?enemyFamilyById(bonuses.familyId)?.name:undefined;
 const completeDrops=!!species?.dropKnowledge||!!bonuses?.family?.dropKnowledge;
 const releasedMonsterIds=new Set(allRows.map(row=>row.monster.id));
 const seenIds=new Set([...state.unlockedMonsterIds,...Object.keys(state.character?.monsterMasteryPoints??{})].filter(id=>releasedMonsterIds.has(id)));
 const families=ENEMY_FAMILIES.filter(family=>family.monsterIds.some(id=>releasedMonsterIds.has(id))).map(family=>{
  const members=family.monsterIds.filter(id=>seenIds.has(id));
  const known=members.length>0||(state.character?.familyMasteryPoints?.[family.id]??0)>0;
  const progress=enemyFamilyMasteryGuidance(state,family.id);
  return {...family,known,progress,members};
 }).sort((a,b)=>Number(b.known)-Number(a.known)||b.progress.rank-a.progress.rank||a.name.localeCompare(b.name));
 const tabChoices:readonly {id:CodexTab;label:string}[]=[{id:'monsters',label:'Monsters'},{id:'types',label:'Types'},{id:'rewards',label:'Rewards'}];
 return <>
 <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={s.kicker}>{t("ADVENTURER'S JOURNAL")}</Text>
  <Text accessibilityRole="header" style={s.heading}>{t('Monster Codex')}</Text>
  <Text style={s.description}>{t('Hunt. Discover. Master. Every creature and enemy family in one place.')}</Text>
  <View style={s.summary}>
   <View style={s.flex}><Text style={s.summaryLabel}>{t('DISCOVERED')}</Text><Text style={s.summaryValue}>{number(discovered)}<Text style={s.summaryTotal}>/{number(visibleTotal)}</Text></Text></View>
   <View style={s.summaryRight}><Text style={s.percent}>{completion}%</Text><View accessibilityRole="progressbar" accessibilityLabel={t("Discovery progress")} accessibilityValue={{min:0,max:100,now:completion}} style={s.progressTrack}><View style={[s.progressFill,{width:String(completion)+'%'}]}/></View></View>
  </View>
  <View accessibilityRole="tablist" style={s.tabs}>{tabChoices.map(choice=><Pressable key={choice.id} accessibilityRole="tab" accessibilityState={{selected:tab===choice.id}} onPress={()=>setTab(choice.id)} style={[s.tab,tab===choice.id&&s.tabActive]}><Text numberOfLines={1} style={[s.tabText,tab===choice.id&&s.tabTextActive]}>{t(choice.label)}</Text></Pressable>)}</View>
  {tab==='monsters'?<>
   <SearchField value={query} onChangeText={setQuery} placeholder={t('Search creatures or regions…')} placeholderTextColor={C.muted}/>
   <View style={s.filters}>{([
    ['all','All'],['known','Defeated'],['unknown','Unknown'],['mastered','Mastered']
   ] as const).map(([id,title])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:filter===id}} onPress={()=>setFilter(id)} style={[s.filter,filter===id&&s.filterActive]}><Text style={[s.filterText,filter===id&&s.filterTextActive]}>{t(title)}</Text></Pressable>)}</View>
   <View style={s.listHead}><Text style={s.sectionTitle}>{t('REGIONS & ZONES')}</Text>
    <View style={s.listMeta}><Text style={s.tiny}>{t('Mastered')}: {number(mastered)}</Text>{autoExpand?<Pressable accessibilityRole="button" accessibilityLabel={t('Reset filters')} onPress={()=>{setQuery('');setFilter('all')}} style={s.resetLink}><Text style={s.resetText}>{t('Reset')}</Text></Pressable>:null}</View>
   </View>
   {autoExpand?<Text style={s.matchHint}>{t('Matching creatures')}: {number(matching.reduce((sum,region)=>sum+region.zones.reduce((count,zone)=>count+zone.monsters.length,0),0))}</Text>:null}
   {matching.map(region=>{
    const open=autoExpand||expandedRegion===region.id;
    const regionTotal=region.zones.reduce((n,z)=>n+z.monsters.length,0);
    const regionDiscovered=region.zones.reduce((n,z)=>n+z.monsters.filter(row=>row.entry.status!=='unknown'||row.entry.masteryPoints>0).length,0);
    return <View key={region.id} style={s.region}>
     <Pressable accessibilityRole="button" accessibilityLabel={region.name} accessibilityState={{expanded:open,disabled:!region.available||autoExpand}} disabled={!region.available||autoExpand} onPress={()=>setExpandedRegion(current=>current===region.id?null:region.id)} style={s.regionHeader}>
      <View style={s.regionIcon}><Text style={s.regionSymbol}>{region.id==='ASTERFALL'?'✦':region.id==='SUNSCAR'?'☼':region.id==='FROSTMARCH'?'❄':'◇'}</Text></View>
      <View style={s.flex}><Text numberOfLines={2} style={s.regionName}>{t(region.name)}</Text><Text style={s.meta}>{region.available?t('Lv {value0}–{value1}',{value0:region.minLevel,value1:region.maxLevel}):t('In development')}</Text></View>
      <Text style={s.regionCount}>{region.available?number(autoExpand?regionDiscovered:region.discovered)+'/'+number(autoExpand?regionTotal:region.total):t('LOCKED')}</Text>
      <Text style={s.chevron}>{region.available?(open?'⌃':'⌄'):'•'}</Text>
     </Pressable>
     {region.available&&open?<View style={s.regionBody}>
      {region.zones.map(zone=><View key={zone.id} style={s.zone}>
       <View style={s.zoneHeader}><Text numberOfLines={2} style={s.zoneTitle}>{t(zone.name)}</Text><Text style={s.zoneCount}>{number(zone.monsters.filter(row=>row.entry.status!=='unknown'||row.entry.masteryPoints>0).length)}/{number(zone.monsters.length)}</Text></View>
       {zone.monsters.map(row=>{
        const known=row.entry.status!=='unknown'||row.entry.masteryPoints>0;
        const defeated=row.entry.status==='defeated'||row.entry.masteryPoints>0;
        const rank=known&&!row.monster.boss?monsterMasteryGuidance(state,row.monster.id).rank:0;
        return <Pressable key={row.monster.id} accessibilityRole="button" accessibilityLabel={known?row.monster.name:t('Unknown Creature')} accessibilityHint={t('Open creature details')} onPress={()=>setDetailId(row.monster.id)} style={({pressed})=>[s.monsterRow,pressed&&s.pressed]}>
         <View style={s.portrait}>{known?<MonsterPortraitFrame monster={row.monster} size={compact?43:48} framed={false} reduceMotion={state.settings.reduceMotion}/>:<Text style={s.unknownMark}>?</Text>}</View>
         <View style={s.flex}><Text numberOfLines={1} style={s.monsterName}>{known?translated(row.monster.name):t('Unknown Creature')}</Text><Text numberOfLines={1} style={s.meta}>{known?(row.monster.boss?t('Boss'):t('Lv {value0}',{value0:row.monster.level}))+' · '+(defeated?t('Defeated'):t('Discovered')):t('Not discovered')}</Text></View>
         <View style={s.monsterRight}><View style={s.rankColumn}><Text style={[s.rank,rank===30&&s.complete]}>{row.monster.boss?t('BOSS'):known?'R'+rank+'/30':'—'}</Text>{known&&!row.monster.boss?<Text style={s.killsValue}>{number(row.entry.masteryPoints)}/{number(MONSTER_MASTERY_MAX_KILLS)}</Text>:null}</View><Text style={s.chevron}>›</Text></View>
        </Pressable>;
       })}
      </View>)}
     </View>:null}
    </View>;
   })}
   {!matching.length?<View style={s.empty}><Text style={s.meta}>{t('No Codex entries match these filters.')}</Text><GameButton compact tone="secondary" title={t('Reset')} onPress={()=>{setQuery('');setFilter('all')}}/></View>:null}
  </>:tab==='types'?<>
   <Text style={s.description}>{t('Every eligible kill also advances one enemy type. Species and type bonuses stack.')}</Text>
   {families.map(family=>{
    const open=expandedFamilyId===family.id;
    return <View key={family.id} style={s.family}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:open,disabled:!family.known}} disabled={!family.known} onPress={()=>setExpandedFamilyId(current=>current===family.id?null:family.id)} style={s.familyHeader}>
      <View style={s.typeIcon}><Text style={s.typeMark}>{family.known?'◆':'?'}</Text></View>
      <View style={s.flex}><Text style={s.regionName}>{family.known?translated(family.name):t('Undiscovered type')}</Text><Text style={s.meta}>{family.known?t('Rank {value0}/30',{value0:family.progress.rank}):t('Encounter enemies to discover')}</Text></View>
      <Text style={s.chevron}>{family.known?(open?'⌃':'⌄'):'•'}</Text>
     </Pressable>
     {family.known?<View style={s.familyProgress}>
      <View style={s.progressLabel}><Text style={s.meta}>{t('Type mastery')}</Text><Text style={s.meta}>{number(family.progress.points)}/{number(FAMILY_MASTERY_MAX_POINTS)}</Text></View>
      <StatBar reduceMotion={state.settings.reduceMotion} current={family.progress.currentRankProgress} max={family.progress.currentRankTarget} label={family.progress.rank>=30?t('Mastery complete'):t('{value0} points to next rank',{value0:family.progress.pointsToNextRank})}/>
      {open?<View style={s.familyDetails}>
       <Text style={s.detailText}>{translated(family.description)}</Text>
       <View style={s.bonusRow}><Text style={s.bonus}>+{percent(family.progress.damageBonus)}% {t('damage')}</Text><Text style={s.bonus}>+{percent(family.progress.materialBonus)}% {t('normal materials')}</Text></View>
       <Text style={s.detailTitle}>{t('DISCOVERED MEMBERS')}</Text>
       {family.members.length?family.members.map(id=>{
        const monster=allRows.find(row=>row.monster.id===id)?.monster;
        return monster?<Pressable key={id} accessibilityRole="button" accessibilityLabel={translated(monster.name)} accessibilityHint={t('Open creature details')} onPress={()=>setDetailId(id)} style={({pressed})=>[s.memberRow,pressed&&s.pressed]}><View style={s.flex}><Text numberOfLines={1} style={s.memberName}>{translated(monster.name)}</Text><Text style={s.meta}>+{enemyFamilyMasteryPointsPerKill(id)} {t('pts/kill')}</Text></View><Text style={s.chevron}>›</Text></Pressable>:null;
       }):<Text style={s.meta}>{t('No members discovered yet')}</Text>}
       <Text style={s.detailTitle}>{t('NEXT MILESTONE')}</Text>
       <Text style={s.detailText}>{family.progress.next?translated(family.progress.next.label)+' · '+number(family.progress.pointsToNextMilestone)+' '+t('points remaining'):t('All family milestones unlocked.')}</Text>
       {family.progress.dropKnowledge?<Text style={s.detailText}>{t('Drop knowledge unlocked for encountered family members. Open their monster entries to inspect drops and rates.')}</Text>:<Text style={s.mutedNote}>{t('Reach Rank 10 to reveal discovered members’ base drop tables.')}</Text>}
      </View>:null}
     </View>:null}
    </View>;
   })}
  </>:<>
   <Text style={s.description}>{t('Two independent mastery paths. These rewards come from your existing kills and do not need to be claimed.')}</Text>
   <View style={s.rewardSummary}><Text style={s.sectionTitle}>{t('SPECIES MASTERY')}</Text><Text style={s.meta}>{t('30 ranks · 1,500 kills per species')}</Text></View>
   {MONSTER_MASTERY_MILESTONES.map(milestone=><View key={'species'+milestone.rank} style={s.rewardRow}><View style={s.milestoneRank}><Text style={s.milestoneNumber}>{'R'}{milestone.rank}</Text></View><View style={s.flex}><Text style={s.rewardTitle}>{translated(milestone.label)}</Text><Text style={s.meta}>{translated(milestone.detail)}</Text></View></View>)}
   <View style={s.rewardSummary}><Text style={s.sectionTitle}>{t('TYPE MASTERY')}</Text><Text style={s.meta}>{t('30 ranks · 50,000 points per type')}</Text></View>
   {ENEMY_FAMILY_MASTERY_MILESTONES.map(milestone=><View key={'family'+milestone.rank} style={s.rewardRow}><View style={s.milestoneRank}><Text style={s.milestoneNumber}>{'R'}{milestone.rank}</Text></View><View style={s.flex}><Text style={s.rewardTitle}>{translated(milestone.label)}</Text><Text style={s.meta}>{translated(milestone.detail)}</Text></View></View>)}
   <Text style={s.mutedNote}>{t('Type mastery awards 1–6 points per eligible kill according to enemy difficulty. Boss entries do not grant ordinary monster mastery.')}</Text>
  </>}
 </ScrollView>
 <GameModalSurface visible={!!selected} onClose={()=>setDetailId(null)} reduceMotion={state.settings.reduceMotion} surfaceStyle={s.sheet}>
  <GameModalHeader title={selectedKnown&&selected?translated(selected.monster.name):t('Unknown Creature')} onClose={()=>setDetailId(null)}/>
  {selected?<ScrollView style={s.detailScroll} contentContainerStyle={s.detailContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.detailHero}>
    <View style={s.detailPortrait}>{selectedKnown?<MonsterPortraitFrame monster={selected.monster} size={96} framed={false} reduceMotion={state.settings.reduceMotion}/>:<Text style={s.unknownLarge}>?</Text>}</View>
    <View style={s.flex}><Text style={s.detailName}>{selectedKnown?translated(selected.monster.name):t('Unknown Creature')}</Text><Text style={s.meta}>{t(selected.monster.zone)} · {selectedKnown?t('Lv {value0}',{value0:selected.monster.level}):'???'}{selected.monster.boss?' · '+t('Boss'):''}</Text><Text style={s.status}>{selectedKnown?t(selected.entry.masteryPoints>0||selected.entry.status==='defeated'?'Defeated':'Discovered'):t('Unknown')}</Text></View>
   </View>
   {!selectedKnown?<Text style={s.detailText}>{t('Encounter this creature through normal progression to reveal its entry.')}</Text>:<>
    {species?<View style={s.detailSection}>
     <View style={s.progressLabel}><Text style={s.detailTitle}>{t('SPECIES MASTERY')}{' · R'}{species.rank}/30</Text><Text style={s.meta}>{number(species.points)}/{number(MONSTER_MASTERY_MAX_KILLS)}</Text></View>
     <StatBar reduceMotion={state.settings.reduceMotion} current={species.currentRankProgress} max={species.currentRankTarget} label={species.rank>=30?t('Mastery complete'):t('{value0} kills to next rank',{value0:species.killsToNextRank})}/>
     <View style={s.bonusRow}><Text style={s.bonus}>+{percent(species.damageBonus)}% {t('damage')}</Text><Text style={s.bonus}>+{percent(species.materialBonus)}% {t('normal materials')}</Text></View>
     {species.next?<Text style={s.next}>{t('Next')}{': R'}{species.next.rank} · {translated(species.next.label)} · {number(species.killsToNextMilestone)} {t('kills remaining')}</Text>:<Text style={s.complete}>{t('All species mastery milestones unlocked.')}</Text>}
     {bonuses?.family&&<View style={s.typeLinkGroup}><Text style={s.detailText}>{t('Enemy type')}: {translated(familyName??'')}{' · R'}{bonuses.family.rank}/30 · +{percent(bonuses.family.damageBonus)}% {t('type damage')}</Text><Pressable accessibilityRole="button" onPress={()=>{setDetailId(null);setExpandedFamilyId(bonuses.familyId??null);setTab('types')}} style={s.typeLink}><Text style={s.typeLinkText}>{t('View type mastery')}{' ›'}</Text></Pressable></View>}
    </View>:<Text style={s.detailText}>{t('Boss entry · ordinary species and type mastery do not apply.')}</Text>}
    <View style={s.detailSection}><Text style={s.detailTitle}>{t('KNOWN DROPS')}</Text>
     <Text style={s.mutedNote}>{completeDrops||selected.monster.boss?t('Base drop rates shown. Bonuses may improve your actual rewards.'):t('Drop rate details unlock at species or type Rank 10.')}</Text>
     {selected.entry.drops.length?selected.entry.drops.map(drop=>{
      const item=itemDef(drop.itemId),material=v33EquipmentMaterialLabel(drop.itemId);
      return <View key={drop.itemId} style={s.dropRow}>
       <ItemArtwork itemId={drop.itemId} size={36}/>
       <View style={s.flex}><Text style={s.dropName}>{translated(item.name)}</Text><Text style={s.meta}>{completeDrops||selected.monster.boss?(drop.chance*100).toFixed(2)+'% · '+drop.min+'–'+drop.max: t('Rates unlock at mastery Rank 10')}{material?' · '+companionLabel(language,material):''}</Text></View>
      </View>;
     }):<Text style={s.meta}>{t('No known drops')}</Text>}
    </View>
   </>}
  </ScrollView>:null}
 </GameModalSurface>
 </>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.md,paddingBottom:110},flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},description:{...typography.caption,color:C.muted,lineHeight:18},
 summary:{flexDirection:'row',alignItems:'center',gap:14,padding:13,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,borderRadius:radii.lg},
 summaryLabel:{fontSize:10,fontWeight:'900',color:C.accent,letterSpacing:.6},summaryValue:{fontSize:26,fontWeight:'900',color:C.text},summaryTotal:{fontSize:13,color:C.muted},
 summaryRight:{width:96,gap:5,alignItems:'flex-end'},percent:{fontSize:17,color:C.text,fontWeight:'900'},
 progressTrack:{height:7,width:'100%',backgroundColor:C.panel2,borderRadius:5,overflow:'hidden'},progressFill:{height:'100%',backgroundColor:C.good},
 tabs:{flexDirection:'row',gap:5,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 tab:{flex:1,minHeight:42,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,paddingHorizontal:4},
 tabActive:{backgroundColor:C.selection,borderWidth:1,borderColor:C.accent},tabText:{fontSize:12,color:C.muted,fontWeight:'800'},tabTextActive:{color:C.text},
 filters:{flexDirection:'row',flexWrap:'wrap',gap:6},filter:{minHeight:36,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,paddingHorizontal:12,backgroundColor:C.panel},filterActive:{borderColor:C.accent,backgroundColor:C.selection},filterText:{...typography.caption,color:C.muted},filterTextActive:{color:C.text,fontWeight:'900'},
 listHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:32},listMeta:{flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'},resetLink:{minHeight:32,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},resetText:{fontSize:11,color:C.accent,fontWeight:'800'},matchHint:{...typography.caption,color:C.muted,marginTop:-7},sectionTitle:{fontSize:11,color:C.accent,fontWeight:'900',letterSpacing:.7},tiny:{fontSize:10,color:C.muted},
 region:{borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel,overflow:'hidden'},regionHeader:{flexDirection:'row',alignItems:'center',gap:10,padding:12,minHeight:62},
 regionIcon:{width:38,height:38,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},regionSymbol:{fontSize:21,color:C.accent,fontWeight:'900'},
 regionName:{...typography.bodyStrong,color:C.text},regionCount:{fontSize:11,fontWeight:'800',color:C.info,flexShrink:0},chevron:{width:16,fontSize:20,textAlign:'center',color:C.muted},
 regionBody:{paddingHorizontal:9,paddingVertical:9,gap:12,borderTopWidth:1,borderTopColor:C.line},
 zone:{gap:6},zoneHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:30,paddingVertical:4,paddingHorizontal:4},zoneTitle:{...typography.caption,color:C.accent,fontWeight:'900',flex:1},zoneCount:{...typography.caption,color:C.muted},
 monsterRow:{minHeight:62,flexDirection:'row',alignItems:'center',gap:9,padding:8,borderRadius:radii.md,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},
 portrait:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,backgroundColor:C.bg},unknownMark:{fontSize:26,color:C.muted,fontWeight:'900'},
 monsterName:{fontSize:13,fontWeight:'800',color:C.text},meta:{...typography.caption,color:C.muted,lineHeight:17},monsterRight:{flexDirection:'row',alignItems:'center',gap:4},rankColumn:{alignItems:'flex-end',gap:3},killsValue:{fontSize:9,color:C.muted,fontWeight:'700'},rank:{fontSize:12,color:C.info,fontWeight:'900'},
 complete:{color:C.good,fontWeight:'900'},pressed:{opacity:.75},empty:{padding:16,alignItems:'center',gap:9},
 family:{borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel,overflow:'hidden'},
 familyHeader:{flexDirection:'row',alignItems:'center',gap:10,padding:12,minHeight:62},typeIcon:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,backgroundColor:C.panel2},typeMark:{fontSize:20,color:C.accent,fontWeight:'900'},
 familyProgress:{gap:8,paddingHorizontal:12,paddingBottom:12},progressLabel:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 familyDetails:{gap:10,paddingTop:10,borderTopWidth:1,borderTopColor:C.line},detailText:{...typography.body,color:C.muted,lineHeight:20},detailTitle:{fontSize:11,color:C.accent,fontWeight:'900',letterSpacing:.6},bonusRow:{flexDirection:'row',flexWrap:'wrap',gap:6},bonus:{fontSize:10,color:C.info,fontWeight:'800',paddingVertical:5,paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:6,backgroundColor:C.panel2},
 memberRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9,minHeight:44,paddingVertical:7,borderBottomWidth:1,borderBottomColor:C.line},memberName:{fontSize:12,color:C.text,fontWeight:'700'},
 mutedNote:{...typography.caption,color:C.muted,lineHeight:18},
 rewardSummary:{gap:4,paddingTop:7},rewardRow:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 milestoneRank:{minWidth:46,paddingHorizontal:8,paddingVertical:7,borderWidth:1,borderColor:C.accent,borderRadius:radii.sm,alignItems:'center'},milestoneNumber:{fontSize:12,fontWeight:'900',color:C.accent},rewardTitle:{fontSize:13,color:C.text,fontWeight:'800'},
 sheet:{maxHeight:'92%',padding:spacing.md,gap:9},detailScroll:{maxHeight:520,flexShrink:1},detailContent:{gap:12,paddingBottom:14},
 detailHero:{flexDirection:'row',alignItems:'center',gap:12,padding:9,borderRadius:radii.lg,backgroundColor:C.panel2},detailPortrait:{width:96,height:96,alignItems:'center',justifyContent:'center'},unknownLarge:{fontSize:46,fontWeight:'900',color:C.muted},detailName:{...typography.title,color:C.text},status:{fontSize:10,color:C.good,fontWeight:'900'},
 detailSection:{gap:9},typeLinkGroup:{gap:5},typeLink:{alignSelf:'flex-start',minHeight:44,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderRadius:radii.sm,borderColor:C.accent,backgroundColor:C.selection},typeLinkText:{fontSize:12,fontWeight:'800',color:C.accent},next:{...typography.caption,color:C.info,lineHeight:19},dropRow:{flexDirection:'row',gap:10,alignItems:'center',padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},dropName:{...typography.bodyStrong,color:C.text}
});}
