import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionMessage,companionTranslator,companionLabel,companionError} from '../i18n/companions';
import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {bestiaryProjection,type BestiaryStatus} from '../core/bestiary-v40';
import {SearchField} from '../components/SearchField';
import {GameButton} from '../components/GameButton';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {monsterMasteryGuidance} from '../core/monster-mastery-presentation';
import {ItemArtwork} from '../components/ItemArtwork';
import {itemDef} from '../content/items';
import {MONSTERS} from '../content/monsters';
import {MonsterPortraitFrame} from '../components/MonsterPortraitFrame';
import {GameModalSurface,GameModalHeader} from '../components/GameModalSurface';
const monstersById=new Map(MONSTERS.map(monster=>[monster.id,monster]));
import {v33EquipmentMaterialLabel} from '../core/equipment-loot-v33';

export function BestiaryScreen({state}:{state:GameState}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),twoColumns=width>=355&&fontScale<1.3;
 const language=useGameLanguage(),t=companionTranslator(language),label=(value:string)=>companionLabel(language,value);

 const projection=useMemo(()=>bestiaryProjection(state),[state]),zones=['all',...projection.zones.map(row=>row.zone)] as const;
 const [query,setQuery]=useState(''),[zone,setZone]=useState<string>('all'),[status,setStatus]=useState<'all'|BestiaryStatus>('all'),[filtersOpen,setFiltersOpen]=useState(false);
 const active=(zone==='all'?0:1)+(status==='all'?0:1);
 const rows=useMemo(()=>projection.entries.filter(entry=>(zone==='all'||entry.zone===zone)&&(status==='all'||entry.status===status)&&(!query.trim()||(entry.name+' '+entry.zone).toLowerCase().includes(query.trim().toLowerCase()))),[projection.entries,zone,status,query]);

 const detail=projection.entries.find(entry=>entry.id===detailId);
 const detailMonster=detail?monstersById.get(detail.id):undefined;
 const detailMastery=detail&&!detail.boss&&detail.status!=='unknown'?monsterMasteryGuidance(state,detail.id):undefined;
 return <>
 <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={s.kicker}>{t("ADVENTURER'S JOURNAL")}</Text>
  <Text accessibilityRole="header" style={s.heading}>{t("Bestiary")}</Text>
  <View style={s.summary}><View style={s.flex}><Text style={s.summaryLabel}>{t("DISCOVERED")}</Text><Text style={s.summaryValue}>{projection.discovered}<Text style={s.summaryTotal}>/{projection.total}</Text></Text></View><View style={s.progressSummary}><Text style={s.percent}>{projection.completionPercent}%</Text><View style={s.progressTrack}><View style={[s.progressFill,{width:`${Math.max(0,Math.min(100,projection.completionPercent))}%`}]}/></View></View></View>
  <SearchField value={query} onChangeText={setQuery} placeholder={t("Search creatures or regions…")} placeholderTextColor={C.muted}/>
  <View style={s.controls}><View style={s.flex}><GameButton title={t("Filters{value0} ▾", {value0: active ? t(" · {value0}", {value0: active}) : ''})} tone={active?'primary':'secondary'} onPress={()=>setFiltersOpen(true)}/></View><Text style={s.count}>{t("{value0} shown", {value0: rows.length})}</Text></View>
  <View style={s.grid}>{rows.map(entry=>{
    const monster=monstersById.get(entry.id);
    return <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={entry.status==='unknown'?t("Unknown Creature"):entry.name} accessibilityHint={t("Open creature details")} onPress={()=>setDetailId(entry.id)} style={({pressed})=>[s.tile,twoColumns?s.tileHalf:s.tileFull,pressed&&s.pressed]}>
      <View style={s.tileHead}>{entry.status!=='unknown'&&monster?<MonsterPortraitFrame monster={monster} size={twoColumns?66:56} framed={false} reduceMotion={state.settings.reduceMotion}/>:<View style={[s.unknownPortrait,twoColumns&&s.portraitLarge]}><Text style={s.unknownMark}>?</Text></View>}
        <View style={s.tileInfo}><Text numberOfLines={2} style={s.name}>{entry.status==='unknown'?t("Unknown Creature"):entry.name}</Text><Text numberOfLines={1} style={s.meta}>{entry.zone}</Text></View>
      </View>
      <View style={s.tileFoot}><Text numberOfLines={1} style={[s.status,entry.status==='unknown'?s.unknown:entry.status==='defeated'?s.defeated:s.discovered]}>{label(entry.status).toLocaleUpperCase(language)}</Text><Text style={s.level}>{t("Lv {value0}",{value0:entry.level})}{entry.boss?' · '+t("Boss"):''}</Text></View>
    </Pressable>;
  })}</View>
  {!rows.length?<View style={s.empty}><Text style={s.emptyTitle}>{t("No Bestiary entries match these filters.")}</Text><GameButton compact title={t("Reset")} tone="secondary" onPress={()=>{setQuery('');setZone('all');setStatus('all')}}/></View>:null}
 </ScrollView>
 <GameModalSurface visible={!!detail} onClose={()=>setDetailId(null)} reduceMotion={state.settings.reduceMotion} surfaceStyle={s.sheet}>
   <GameModalHeader title={detail?.status==='unknown'?t("Unknown Creature"):detail?.name??t("Bestiary")} onClose={()=>setDetailId(null)}/>
   {detail?<ScrollView style={s.detailScroll} contentContainerStyle={s.detailContent} showsVerticalScrollIndicator={false}>
     <View style={s.detailHero}><View style={s.detailPortrait}>{detail.status!=='unknown'&&detailMonster?<MonsterPortraitFrame monster={detailMonster} size={110} framed={false} reduceMotion={state.settings.reduceMotion}/>:<View style={s.detailUnknown}><Text style={s.detailUnknownText}>?</Text></View>}</View><View style={s.flex}><Text style={s.detailName}>{detail.status==='unknown'?t("Unknown Creature"):detail.name}</Text><Text style={s.meta}>{t("{value0} · Lv {value1}{value2}",{value0:detail.zone,value1:detail.level,value2:detail.boss?t(" · Boss"):''})}</Text><Text style={[s.status,detail.status==='unknown'?s.unknown:detail.status==='defeated'?s.defeated:s.discovered]}>{label(detail.status).toLocaleUpperCase(language)}</Text></View></View>
     {detail.status!=='unknown'?<>
       <View style={s.detailSection}><Text style={s.sectionLabel}>{t("Mastery")}</Text><Text style={s.detailText}>{detail.boss?t("Boss entry"):t("Rank {value0}/30 · {value1} mastery points",{value0:detailMastery?.rank??0,value1:detail.masteryPoints})}</Text>{detailMastery?<Text style={s.next}>{detailMastery.next?t("Next: Rank {value0} · {value1} · {value2} kills",{value0:detailMastery.next.rank,value1:companionContent(language,detailMastery.next.label),value2:detailMastery.killsToNextMilestone}):t("All mastery milestones complete")}</Text>:null}</View>
       <View style={s.detailSection}><Text style={s.sectionLabel}>{t("Known drops")}</Text>{detail.drops.length?<View style={s.dropGrid}>{detail.drops.map(drop=>{const item=itemDef(drop.itemId),gearMaterial=v33EquipmentMaterialLabel(drop.itemId);return <View key={drop.itemId} style={s.dropRow}><ItemArtwork itemId={drop.itemId} size={36}/><View style={s.flex}><Text style={s.dropName}>{item.name}</Text>{gearMaterial?<Text style={s.dropUse}>{label(gearMaterial)}</Text>:null}</View></View>})}</View>:<Text style={s.detailText}>{t("No known drops")}</Text>}</View>
     </>:<View style={s.detailSection}><Text style={s.detailText}>{t("Encounter this creature through normal progression to reveal its entry.")}</Text></View>}
   </ScrollView>:null}
 </GameModalSurface>
 <GameModalSurface visible={filtersOpen} onClose={()=>setFiltersOpen(false)} reduceMotion={state.settings.reduceMotion} surfaceStyle={s.sheet}>
  <GameModalHeader title={t("Bestiary Filters")} onClose={()=>setFiltersOpen(false)}/>
  <Text style={s.sectionLabel}>{t("Region")}</Text>
  <ScrollView style={s.optionList} showsVerticalScrollIndicator={false}>{zones.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{selected:zone===value}} onPress={()=>setZone(value)} style={[s.option,zone===value&&s.optionActive]}><Text style={s.optionText}>{zone===value?'✓ ':''}{value==='all'?t("Any region"):value}</Text></Pressable>)}</ScrollView>
  <Text style={s.sectionLabel}>{t("Status")}</Text>
  {(['all','unknown','discovered','defeated'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{selected:status===value}} onPress={()=>setStatus(value)} style={[s.option,status===value&&s.optionActive]}><Text style={s.optionText}>{status===value?'✓ ':''}{value==='all'?t("Any status"):label(value)}</Text></Pressable>)}
  <View style={s.actions}><View style={s.flex}><GameButton title={t("Reset")} tone="secondary" onPress={()=>{setZone('all');setStatus('all')}}/></View><View style={s.flex}><GameButton title={t("Apply Filters")} onPress={()=>setFiltersOpen(false)}/></View></View>
 </GameModalSurface>
 </>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},
 flex:{flex:1,minWidth:0},summary:{flexDirection:'row',alignItems:'center',padding:14,borderRadius:radii.lg,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,gap:16},summaryLabel:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:.8},summaryValue:{fontSize:27,color:C.text,fontWeight:'900'},summaryTotal:{fontSize:15,color:C.muted},progressSummary:{width:100,gap:6,alignItems:'flex-end'},percent:{fontSize:18,fontWeight:'900',color:C.text},progressTrack:{width:'100%',height:6,borderRadius:3,backgroundColor:C.panel2,overflow:'hidden'},progressFill:{height:'100%',backgroundColor:C.good},
 controls:{flexDirection:'row',alignItems:'center',gap:10},count:{color:C.muted,fontSize:11},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:9},
 tile:{borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel,padding:10,gap:9,minHeight:105},tileHalf:{width:'48.5%'},tileFull:{width:'100%'},tileHead:{flexDirection:'row',gap:8,alignItems:'center'},tileInfo:{flex:1,minWidth:0,gap:3},
 name:{...typography.bodyStrong,color:C.text,fontSize:13},meta:{...typography.caption,color:C.muted},status:{fontSize:10,fontWeight:'900'},unknown:{color:C.muted},discovered:{color:C.info},defeated:{color:C.good},level:{color:C.muted,fontSize:10},tileFoot:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5},unknownPortrait:{height:56,width:56,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},portraitLarge:{height:66,width:66},unknownMark:{fontSize:30,color:C.muted,fontWeight:'900'},pressed:{opacity:.78},
 empty:{alignItems:'center',gap:12,padding:20},emptyTitle:{...typography.caption,color:C.muted,textAlign:'center'},
 sheet:{maxHeight:'90%',padding:spacing.md,gap:10},detailScroll:{maxHeight:470,flexShrink:1},detailContent:{gap:12,paddingBottom:14},detailHero:{flexDirection:'row',alignItems:'center',gap:12,padding:10,backgroundColor:C.panel2,borderRadius:radii.lg},detailPortrait:{minWidth:110,alignItems:'center',justifyContent:'center'},detailName:{...typography.title,color:C.text},detailUnknown:{width:110,height:110,alignItems:'center',justifyContent:'center'},detailUnknownText:{fontSize:48,color:C.muted},detailSection:{gap:9},sectionLabel:{fontSize:11,color:C.accent,fontWeight:'900',letterSpacing:.7},detailText:{...typography.body,color:C.muted,lineHeight:20},next:{...typography.caption,color:C.info,lineHeight:18},dropGrid:{gap:6},dropRow:{flexDirection:'row',alignItems:'center',gap:10,padding:7,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},dropName:{...typography.bodyStrong,color:C.text},dropUse:{...typography.caption,color:C.info},
 optionList:{maxHeight:210,flexShrink:1},option:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:C.line},optionActive:{backgroundColor:C.panel2},optionText:{color:C.text,fontWeight:'700',textTransform:'capitalize'},actions:{flexDirection:'row',gap:8,marginTop:8,flexShrink:0}
});}