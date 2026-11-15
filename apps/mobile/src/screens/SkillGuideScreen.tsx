import {useMemo,useState} from 'react';
import {FlatList,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {ActivityArtwork} from '../components/ActivityArtwork';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {GameTextInput} from '../components/GameTextInput';
import {UiIcon} from '../components/UiIcon';
import {classSkillsFor} from '../content/class-skills';
import {characterClassSkills} from '../core/class-skills';
import {classSkillBonuses,classSkillBonusLabel} from '../core/class-skill-presentation';
import {companionMasteryProgress} from '../core/companion-mastery';
import {skillMilestoneOverview,type SkillMilestoneKind} from '../core/skill-milestones';
import {characterProgressWithinLevel,progressWithinLevel} from '../core/progression';
import type {GameState,SkillId} from '../core/types';
import {skillGuideCopy,SKILL_GUIDE_IDS,type SkillGuideId} from '../i18n/skill-guide-copy';
import {skillGuideUi,type SkillGuideUiKey} from '../i18n/skill-guide-ui';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

type GuideCategory='Gathering'|'Crafting'|'Adventure'|'Combat'|'Companions';
type GuideFilter='All'|GuideCategory;
const FILTERS:readonly GuideFilter[]=['All','Gathering','Crafting','Adventure','Combat','Companions'];
const CATEGORIES:Record<SkillGuideId,GuideCategory>={
 mining:'Gathering',woodcutting:'Gathering',fishing:'Gathering',herbalism:'Gathering',
 smithing:'Crafting',cooking:'Crafting',alchemy:'Crafting',tailoring:'Crafting',enchanting:'Crafting',
 exploration:'Adventure',faith:'Adventure',combat:'Combat','companion-mastery':'Companions',companion:'Companions',
};
const MILESTONE_LABEL:Record<SkillMilestoneKind,SkillGuideUiKey>={
 gathering_node:'Gathering spot',tool:'Tool',recipe:'Recipe',method:'Method',
 service:'Service',faith_practice:'Practice',faith_blessing:'Blessing',cross_skill:'Cross-skill',
};
const isProfession=(id:SkillGuideId):id is SkillId=>id!=='combat'&&id!=='companion-mastery'&&id!=='companion';
const clamp=(ratio:number)=>Math.max(0,Math.min(1,Number.isFinite(ratio)?ratio:0));

/** Compact account reference: live progression and unlocks, no gameplay state mutations. */
export function SkillGuideScreen({state,onClose,onOpenSkill,onOpenCombat,onOpenMastery}:{state:GameState;onClose:()=>void;onOpenSkill:(id:string)=>void;onOpenCombat?:()=>void;onOpenMastery?:()=>void}){
 const {gl,language}=useGameplayText();
 const t=(key:SkillGuideUiKey)=>skillGuideUi(language,key);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const [query,setQuery]=useState(''),[searchOpen,setSearchOpen]=useState(false);
 const [filter,setFilter]=useState<GuideFilter>('All'),[filtersOpen,setFiltersOpen]=useState(false);
 const [selectedId,setSelectedId]=useState<SkillGuideId|null>(null);
 const textScale=state.settings.textScale??1;
 const columns=fontScale>=1.5||textScale>=1.5?2:width<330||fontScale>=1.2||textScale>=1.2?3:4;
 const screenWidth=Math.min(width,720),tileWidth=Math.max(60,(screenWidth-spacing.md*2-6*(columns-1))/columns);
 const selected=selectedId?skillGuideCopy(language,selectedId):undefined;
 const selectedCategory=selectedId?CATEGORIES[selectedId]:undefined;
 const mastery=companionMasteryProgress(state.account.companionMasteryXp);
 const levelOf=(id:SkillGuideId):number=>{
  if(id==='combat')return state.character?.level??1;
  if(id==='companion-mastery')return mastery.level;
  if(id==='companion')return state.account.companionSanctuary?.trainingGroundLevel??0;
  return state.skills.find(row=>row.skillId===id)?.level??1;
 };
 const progressFor=(id:SkillGuideId):number=>{
  if(id==='companion')return clamp(levelOf(id)/3);
  if(id==='companion-mastery')return mastery.level>=100?1:clamp(mastery.current/Math.max(1,mastery.need));
  if(id==='combat'){
   if(!state.character)return 0;
   const progress=characterProgressWithinLevel(state.character.xp,state.character.level);
   return state.character.level>=100?1:clamp(progress.current/Math.max(1,progress.need));
  }
  const skill=state.skills.find(row=>row.skillId===id);
  if(!skill)return 0;
  const progress=progressWithinLevel(skill.xp,skill.level);
  return skill.level>=100?1:clamp(progress.current/Math.max(1,progress.need));
 };
 const needle=query.trim().toLocaleLowerCase(language);
 const filtered=useMemo(()=>SKILL_GUIDE_IDS.filter(id=>{
  if(filter!=='All'&&CATEGORIES[id]!==filter)return false;
  if(!needle)return true;
  const row=skillGuideCopy(language,id);
  return [row.title,row.summary,row.training,row.usage,skillGuideUi(language,CATEGORIES[id])].some(value=>value.toLocaleLowerCase(language).includes(needle));
 }),[filter,needle,language]);
 const next=selectedId&&isProfession(selectedId)?skillMilestoneOverview(state,selectedId):undefined;
 const classDefinitions=selectedId==='combat'&&state.character?classSkillsFor(state.character.classId):[];
 const classLevels=selectedId==='combat'&&state.character?characterClassSkills(state.character):[];
 const canOpen=selectedId!==null&&(selectedId!=='companion-mastery'||!!onOpenMastery)&&(selectedId!=='combat'||!!onOpenCombat);
 const openSelected=()=>{
  if(!selectedId)return;
  const id=selectedId;
  setSelectedId(null);
  if(id==='combat')onOpenCombat?.();
  else if(id==='companion-mastery')onOpenMastery?.();
  else onOpenSkill(id);
 };
 const actionLabel=selectedId==='combat'?t('Open Combat'):selectedId==='companion'?t('Open Companions'):selectedId==='companion-mastery'?t('View mastery bonuses'):t('Open skill');
 const art=(id:SkillGuideId,size:number)=>id==='companion-mastery'?<UiIcon name="companions" size={size}/>:<ActivityArtwork id={id==='companion'?'training':id} size={size}/>;
 return <View style={s.screen}>
  <FlatList key={columns} style={s.list} data={filtered} numColumns={columns} keyExtractor={id=>id} renderItem={({item:id})=>{
   const copy=skillGuideCopy(language,id),level=levelOf(id),isFacility=id==='companion';
   return <Pressable accessibilityRole="button" accessibilityLabel={copy.title+', '+(isFacility?t('Facility'):t('Level'))+' '+level} accessibilityHint={t('Tap a skill for details')} onPress={()=>setSelectedId(id)} style={({pressed})=>[s.tile,{width:tileWidth},pressed&&s.pressed]}>
    <Text style={s.tileName} numberOfLines={2}>{copy.title}</Text>
    <View style={s.art}>{art(id,Math.min(43,Math.max(28,tileWidth-22)))}</View>
    <Text style={s.tileLevel} numberOfLines={1}>{isFacility?t('Facility')+' '+level+'/3':t('Lv')+' '+level}</Text>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.progressTrack}><View style={[s.progressFill,{width:(Math.round(progressFor(id)*100)+'%') as any}]}/></View>
   </Pressable>;
  }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} columnWrapperStyle={s.row} contentContainerStyle={s.content}
   ListHeaderComponent={<View style={s.header}>
    <View style={s.heading}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Back to Account')} onPress={onClose} style={s.backButton}><Text style={s.backGlyph}>‹</Text></Pressable>
     <View style={s.headingCopy}><Text accessibilityRole="header" style={s.title}>{t('Skill Guide')}</Text><Text style={s.caption}>{t('Browse skills, training and unlocks.')}</Text></View>
    </View>
    <View style={s.controls}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Filter skills')} accessibilityState={{expanded:filtersOpen}} onPress={()=>setFiltersOpen(v=>!v)} style={[s.filterButton,filter!=='All'&&s.activeButton]}><UiIcon name="filter" size={18}/><Text style={s.filterButtonLabel} numberOfLines={1}>{t(filter)}</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Search skills')} accessibilityState={{expanded:searchOpen}} onPress={()=>{setSearchOpen(v=>!v);setQuery('');}} style={s.iconButton}><UiIcon name="search" size={21}/></Pressable>
    </View>
    {searchOpen?<GameTextInput value={query} onChangeText={setQuery} placeholder={t('Search skills…')} accessibilityLabel={t('Search skills')} autoCorrect={false}/>:null}
    {filtersOpen?<View style={s.filters}>{FILTERS.map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:filter===value}} style={[s.filterChip,filter===value&&s.filterActive]} onPress={()=>{setFilter(value);setFiltersOpen(false);}}><Text numberOfLines={2} style={[s.filterText,filter===value&&s.selectedText]}>{t(value)}</Text></Pressable>)}</View>:null}
    <View style={s.summary}><Text style={s.small}>{filtered.length} {t('entries')}</Text><Text style={s.small}>{t('Tap a skill for details')}</Text></View>
   </View>}
   ListEmptyComponent={<View style={s.empty}><Text style={s.body}>{t('No skills match your search.')}</Text><Pressable onPress={()=>{setQuery('');setFilter('All');}} accessibilityRole="button" style={s.action}><Text style={s.actionText}>{t('Clear filters')}</Text></Pressable></View>}
   ListFooterComponent={<View style={s.footer}><Text style={s.small}>{t('Profession levels and companion progression are separate systems.')}</Text></View>}
  />
  <GameModalSurface visible={!!selected} presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={()=>setSelectedId(null)}>
   {selected&&selectedId?<><GameModalHeader eyebrow={selectedCategory?t(selectedCategory).toLocaleUpperCase(language):undefined} title={selected.title} onClose={()=>setSelectedId(null)}/>
    <ScrollView contentContainerStyle={s.detail} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     <View style={s.hero}>
      <View style={s.heroArt}>{art(selectedId,60)}</View>
      <View style={s.heroCopy}><Text style={s.category}>{selectedCategory?t(selectedCategory):''}</Text>
       <Text style={s.currentLevel}>{selectedId==='companion'?t('Training Ground')+' '+levelOf(selectedId)+'/3':t('Current level')+': '+levelOf(selectedId)}</Text>
       <Text style={s.body}>{selected.summary}</Text>
      </View>
     </View>
     <View style={s.infoBlock}><Text style={s.sectionTitle}>{t('How to train')}</Text><Text style={s.body}>{selected.training}</Text></View>
     <View style={s.infoBlock}><Text style={s.sectionTitle}>{t('Used for')}</Text><Text style={s.body}>{selected.usage}</Text></View>
     {selectedId==='combat'&&state.character&&classDefinitions.length>0?<View style={s.infoBlock}>
      <Text style={s.sectionTitle}>{t('Your class skills')}</Text>
      {classDefinitions.map(definition=>{
       const row=classLevels.find(value=>value.skillId===definition.id),bonuses=classSkillBonuses(state.character!,definition.id);
       return <View key={definition.id} style={s.milestone}><Text style={s.milestoneTitle}>{gl(definition.name)} · {t('Lv')} {row?.level??1}</Text>
        <Text style={s.small}>{gl(definition.theme)}</Text>
        {bonuses.map(bonus=><Text key={bonus.stat} style={s.small}>{gl(bonus.label)}: {classSkillBonusLabel(bonus.currentPercent)}</Text>)}
       </View>;
      })}
     </View>:null}
     <View style={s.tip}><Text style={s.tipTitle}>{t('Good to know').toLocaleUpperCase(language)}</Text><Text style={s.body}>{selected.tip}</Text></View>
     {isProfession(selectedId)?<View style={s.infoBlock}>
      <Text style={s.sectionTitle}>{t('Next unlocks')}{next?.nextLevel?' · '+t('Lv')+' '+next.nextLevel:''}</Text>
      {next?.next.length?next.next.slice(0,3).map(row=><View key={row.id} style={s.milestone}>
        <Text style={s.milestoneTitle} numberOfLines={2}>{gl(row.title)}</Text>
        <Text style={s.small}>{t(MILESTONE_LABEL[row.kind])} · {t('Lv')} {row.level}</Text>
       </View>):<Text style={s.small}>{t('No further unlocks listed.')}</Text>}
      {next?.next.length?<Text style={s.small}>{t('Other conditions may also apply.')}</Text>:null}
     </View>:null}
     {canOpen?<Pressable accessibilityRole="button" accessibilityLabel={actionLabel} style={s.action} onPress={openSelected}><Text style={s.actionText}>{actionLabel}</Text><UiIcon name="next" size={18}/></Pressable>:null}
    </ScrollView></>:null}
  </GameModalSurface>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},list:{flex:1,width:'100%',maxWidth:720,alignSelf:'center'},content:{padding:spacing.md,paddingBottom:spacing.xl},
 row:{gap:6,marginBottom:6},header:{gap:10,marginBottom:12},heading:{flexDirection:'row',alignItems:'center',gap:10},headingCopy:{flex:1,minWidth:0,gap:4},
 title:{...typography.title,color:C.text},caption:{...typography.caption,color:C.muted},
 backButton:{width:42,height:44,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderRadius:radii.md,borderWidth:1,borderColor:C.line},backGlyph:{fontSize:30,lineHeight:33,color:C.text},
 controls:{flexDirection:'row',justifyContent:'flex-end',gap:8},
 filterButton:{height:42,minWidth:112,maxWidth:185,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 filterButtonLabel:{flexShrink:1,color:C.text,fontSize:12,fontWeight:'800'},activeButton:{backgroundColor:C.selection,borderColor:C.selectionLine},
 iconButton:{width:45,height:42,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderRadius:radii.md,borderWidth:1,borderColor:C.line},
 filters:{flexDirection:'row',flexWrap:'wrap',gap:6,padding:8,backgroundColor:C.panel2,borderRadius:radii.md,borderWidth:1,borderColor:C.line},
 filterChip:{flexBasis:'30%',flexGrow:1,minHeight:40,alignItems:'center',justifyContent:'center',paddingHorizontal:5,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
 filterActive:{borderColor:C.selectionLine,backgroundColor:C.selection},filterText:{fontSize:11.5,fontWeight:'700',color:C.muted,textAlign:'center'},selectedText:{color:C.text},
 summary:{flexDirection:'row',justifyContent:'space-between',gap:8},small:{fontSize:11,lineHeight:16,color:C.muted},
 tile:{height:132,alignItems:'center',justifyContent:'space-between',gap:3,padding:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},
 tileName:{fontSize:10.5,lineHeight:14,minHeight:28,color:C.text,fontWeight:'700',textAlign:'center'},
 art:{width:50,height:50,maxWidth:'100%',alignItems:'center',justifyContent:'center',borderRadius:radii.sm,backgroundColor:C.panel2,borderWidth:1,borderColor:C.lineStrong},
 tileLevel:{fontSize:10.5,color:C.accent,fontWeight:'800',textAlign:'center'},progressTrack:{width:'92%',height:4,backgroundColor:C.bg,borderRadius:3,overflow:'hidden'},progressFill:{height:'100%',backgroundColor:C.good},
 pressed:{opacity:.7},empty:{alignItems:'center',padding:24,gap:10},footer:{paddingTop:12},
 detail:{gap:12,paddingTop:9,paddingBottom:28},hero:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 heroArt:{height:72,width:72,alignItems:'center',justifyContent:'center',borderRadius:radii.md,backgroundColor:C.panel2,borderWidth:1,borderColor:C.lineStrong},heroCopy:{flex:1,gap:4},
 category:{fontSize:11,fontWeight:'800',color:C.info},currentLevel:{fontSize:14,fontWeight:'900',color:C.accent},
 body:{fontSize:13,lineHeight:19,color:C.text},infoBlock:{gap:7},sectionTitle:{fontSize:13,fontWeight:'900',color:C.text,marginTop:3},
 tip:{padding:12,gap:6,borderRadius:radii.md,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},tipTitle:{fontSize:10,fontWeight:'900',color:C.info,letterSpacing:.6},
 milestone:{gap:3,padding:10,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},milestoneTitle:{fontSize:12,fontWeight:'800',color:C.text},
 action:{minHeight:46,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',paddingHorizontal:12,paddingVertical:8,backgroundColor:C.selection,borderWidth:1,borderColor:C.selectionLine,borderRadius:radii.md},
 actionText:{fontSize:13,fontWeight:'800',color:C.text},
});}
