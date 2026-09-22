import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,SkillId} from '../core/types';
import type {WorkingTowardDestination} from '../core/working-toward';
import {
 professionMasteryDiscoveryFilters,
 professionMasteryDiscoveryRecords,
 professionMasteryRecommendedTarget,
 skillIdentity,
 type ProfessionMasteryDiscoverySort,
 type ProfessionMasteryDiscoveryStatus,
} from '../core/profession-mastery-presentation';
import {formatGameNumber} from '../core/number-format';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {Panel} from './Panel';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const ROW_LIMIT=12;
const SORT_OPTIONS:{id:ProfessionMasteryDiscoverySort;label:string}[]=[
 {id:'closest_r50',label:'Closest to R50'},
 {id:'highest_rank',label:'Highest Rank'},
 {id:'name',label:'Name'},
];
const STATUS_OPTIONS:{id:ProfessionMasteryDiscoveryStatus;label:string}[]=[
 {id:'bonus_left',label:'Unearned bonuses'},
 {id:'all',label:'All trained'},
 {id:'mastered',label:'Mastered only'},
];

export function MasteryDiscoveryPanel({state,onNavigate}:{state:GameState;onNavigate?:(destination:WorkingTowardDestination)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [sort,setSort]=useState<ProfessionMasteryDiscoverySort>('closest_r50'),[status,setStatus]=useState<ProfessionMasteryDiscoveryStatus>('bonus_left');
 const [skillId,setSkillId]=useState<SkillId|undefined>(),[regionId,setRegionId]=useState<string|undefined>();
 const [filtersOpen,setFiltersOpen]=useState(false),[showAll,setShowAll]=useState(false);
 const options=professionMasteryDiscoveryFilters(state),rows=professionMasteryDiscoveryRecords(state,{sort,status,skillId,regionId}),target=professionMasteryRecommendedTarget(state);
 const visible=showAll?rows:rows.slice(0,ROW_LIMIT),sortLabel=SORT_OPTIONS.find(row=>row.id===sort)?.label??'Closest to R50',statusLabel=STATUS_OPTIONS.find(row=>row.id===status)?.label??'All trained';
 const skillLabel=skillId?options.skills.find(row=>row.id===skillId)?.label??skillIdentity(skillId).label:'All skills',regionLabel=regionId?options.regions.find(row=>row.id===regionId)?.label??regionId:'All regions';
 const activeCount=Number(sort!=='closest_r50')+Number(status!=='bonus_left')+Number(!!skillId)+Number(!!regionId);
 const reset=()=>{setSort('closest_r50');setStatus('bonus_left');setSkillId(undefined);setRegionId(undefined);setShowAll(false)};
 const chooseSort=(value:ProfessionMasteryDiscoverySort)=>{setSort(value);setShowAll(false)},chooseStatus=(value:ProfessionMasteryDiscoveryStatus)=>{setStatus(value);setShowAll(false)};
 const chooseSkill=(value:SkillId|undefined)=>{setSkillId(value);setShowAll(false)},chooseRegion=(value:string|undefined)=>{setRegionId(value);setShowAll(false)};
 return <>
  {target?<Panel accentColor={C.special}>
   <View style={s.recommendHead}><View style={s.flex}><Text style={s.recommendKicker}>RECOMMENDED MASTERY TARGET · OPTIONAL</Text><Text style={s.title}>{target.name}</Text><Text style={s.meta}>{skillIdentity(target.skillId).label}{target.regionLabel?' · '+target.regionLabel:''} · current R{target.rank}</Text></View><View style={s.targetRank}><Text style={s.targetRankValue}>R{target.targetRank}</Text><Text style={s.targetRankLabel}>TARGET</Text></View></View>
   <View style={s.recommendBody}><Text style={s.recommendReward}>{target.targetLabel}</Text><Text style={s.copy}>{target.reason} {formatGameNumber(target.pointsToTarget,state.settings.numberMode)} mastery actions remain.</Text></View>
   {onNavigate?<GameButton compact title="Open recommended activity" onPress={()=>onNavigate(target.destination)}/>:null}
  </Panel>:null}

  <Panel>
   <View style={s.browserHead}><View style={s.flex}><Text style={s.section}>MASTERY DISCOVERY</Text><Text style={s.copy}>Browse mastery you have already started. Unearned bonus visibility is derived from the existing R10/R20/R30/R40/R50 roadmap.</Text></View><Text style={s.resultCount}>{rows.length}</Text></View>
   <View style={s.filterSummary}><View style={s.flex}><Text numberOfLines={1} style={s.filterPrimary}>{sortLabel} · {statusLabel}</Text><Text numberOfLines={1} style={s.filterSecondary}>{skillLabel} · {regionLabel}</Text></View><View style={s.filterButton}><GameButton compact title={activeCount?'Filters · '+activeCount:'Filters'} tone="secondary" onPress={()=>setFiltersOpen(true)}/></View></View>
   {visible.length?<View style={s.rows}>{visible.map(row=>{
    const width=(row.mastered?100:Math.max(3,row.r50Progress*100))+'%';
    const nextText=row.mastered?'All mastery bonuses earned':row.nextBonus?'Next bonus R'+row.nextBonus.rank+' · '+row.nextBonus.label+' · '+formatGameNumber(row.pointsToNextBonus,state.settings.numberMode)+' actions':'All relevant bonuses earned · '+formatGameNumber(row.pointsToR50,state.settings.numberMode)+' to R50 record';
    const badge=row.mastered?'MASTERED':row.remainingBonusCount?row.remainingBonusCount+' BONUS'+(row.remainingBonusCount===1?'':'ES')+' LEFT':'R50 LEFT';
    return <Pressable key={row.actionId} accessibilityRole="button" accessibilityLabel={'Open mastery activity '+row.name} disabled={!onNavigate} onPress={()=>onNavigate?.(row.destination)} style={({pressed})=>[s.row,row.mastered&&s.rowMastered,pressed&&s.pressed]}>
     <View style={s.rowHead}><View style={s.flex}><Text numberOfLines={1} style={s.rowName}>{row.name}</Text><Text numberOfLines={1} style={s.meta}>{skillIdentity(row.skillId).label}{row.regionLabel?' · '+row.regionLabel:''}</Text></View><View style={s.rankBox}><Text style={row.mastered?s.rankDone:s.rank}>R{row.rank}</Text><Text style={s.rankLabel}>{badge}</Text></View></View>
     <View style={s.track}><View style={[s.fill,{width:width as any,backgroundColor:row.mastered?C.good:C.accent}]}/></View>
     <View style={s.rowFoot}><Text style={s.points}>{formatGameNumber(row.points,state.settings.numberMode)} mastery actions</Text><Text numberOfLines={2} style={row.mastered?s.nextDone:s.next}>{nextText}</Text></View>
    </Pressable>})}</View>:<Text style={s.empty}>{state.account.professionMasteryByAction&&Object.keys(state.account.professionMasteryByAction).length?'No trained mastery records match these filters.':'Train a gathering activity or recipe once to add it to mastery discovery.'}</Text>}
   {!showAll&&rows.length>ROW_LIMIT?<GameButton compact title={'Show all '+rows.length} tone="secondary" onPress={()=>setShowAll(true)}/>:showAll&&rows.length>ROW_LIMIT?<GameButton compact title="Show fewer" tone="secondary" onPress={()=>setShowAll(false)}/>:null}
  </Panel>

  <GameModalSurface visible={filtersOpen} reduceMotion={state.settings.reduceMotion} onClose={()=>setFiltersOpen(false)} backdropLabel="Close mastery filters" surfaceStyle={s.filterSheet}>
   <GameModalHeader eyebrow="MASTERY DISCOVERY" title="Sort & filter" onClose={()=>setFiltersOpen(false)}/>
   <ScrollView style={s.filterList} contentContainerStyle={s.filterListContent}>
    <Text style={s.filterGroupLabel}>SORT</Text>
    {SORT_OPTIONS.map(option=><FilterOption key={option.id} label={option.label} selected={sort===option.id} onPress={()=>chooseSort(option.id)}/>)}
    <Text style={s.filterGroupLabel}>STATUS</Text>
    {STATUS_OPTIONS.map(option=><FilterOption key={option.id} label={option.label} selected={status===option.id} onPress={()=>chooseStatus(option.id)}/>)}
    <Text style={s.filterGroupLabel}>SKILL</Text>
    <FilterOption label="All skills" selected={!skillId} onPress={()=>chooseSkill(undefined)}/>
    {options.skills.map(option=><FilterOption key={option.id} label={option.label} selected={skillId===option.id} onPress={()=>chooseSkill(option.id)}/>)}
    <Text style={s.filterGroupLabel}>REGION</Text>
    <FilterOption label="All regions" selected={!regionId} onPress={()=>chooseRegion(undefined)}/>
    {options.regions.map(option=><FilterOption key={option.id} label={option.label} selected={regionId===option.id} onPress={()=>chooseRegion(option.id)}/>)}
   </ScrollView>
   <View style={s.sheetActions}><View style={s.flexButton}><GameButton title="Reset" tone="secondary" onPress={reset}/></View><View style={s.flexButton}><GameButton title="Done" onPress={()=>setFiltersOpen(false)}/></View></View>
  </GameModalSurface>
 </>;
}

function FilterOption({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <Pressable accessibilityRole="radio" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.filterOption,selected&&s.filterOptionSelected,pressed&&s.pressed]}><Text style={[s.filterOptionText,selected&&s.filterOptionTextSelected]}>{label}</Text><Text style={[s.filterOptionMark,selected&&s.filterOptionMarkSelected]}>{selected?'✓':'›'}</Text></Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},flexButton:{flex:1},title:{...typography.title,color:C.text},copy:{...typography.body,color:C.muted,lineHeight:18},meta:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'700'},
 recommendHead:{flexDirection:'row',alignItems:'center',gap:8},recommendKicker:{...typography.caption,color:C.special,fontWeight:'900',letterSpacing:.75},targetRank:{minWidth:54,alignItems:'center',paddingHorizontal:7,paddingVertical:5,borderWidth:1,borderColor:C.special,borderRadius:9,backgroundColor:C.specialSurface},targetRankValue:{...typography.bodyStrong,color:C.special,fontWeight:'900'},targetRankLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},recommendBody:{gap:2,paddingVertical:3},recommendReward:{...typography.bodyStrong,color:C.special},
 browserHead:{flexDirection:'row',alignItems:'flex-start',gap:8},section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.85},resultCount:{minWidth:34,textAlign:'right',...typography.bodyStrong,color:C.info},filterSummary:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},filterPrimary:{...typography.bodyStrong,color:C.text},filterSecondary:{fontSize:9,color:C.muted,fontWeight:'700'},filterButton:{width:104},
 rows:{gap:6},row:{minHeight:72,gap:5,padding:8,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},rowMastered:{borderColor:C.good,backgroundColor:C.goodSurface},rowHead:{flexDirection:'row',alignItems:'center',gap:8},rowName:{...typography.bodyStrong,color:C.text},rankBox:{minWidth:68,alignItems:'flex-end'},rank:{fontSize:13,color:C.accent,fontWeight:'900'},rankDone:{fontSize:13,color:C.good,fontWeight:'900'},rankLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.35},track:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:C.bg},fill:{height:'100%',borderRadius:99},rowFoot:{flexDirection:'row',alignItems:'flex-start',gap:8},points:{fontSize:8.5,color:C.muted,fontWeight:'700'},next:{flex:1,fontSize:8.5,lineHeight:11,color:C.info,fontWeight:'800',textAlign:'right'},nextDone:{flex:1,fontSize:8.5,lineHeight:11,color:C.good,fontWeight:'800',textAlign:'right'},empty:{...typography.body,color:C.muted,paddingVertical:8},
 filterSheet:{maxHeight:'82%',gap:10},filterList:{maxHeight:480},filterListContent:{gap:5},filterGroupLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,paddingTop:5},filterOption:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},filterOptionSelected:{borderColor:C.accent,backgroundColor:C.accentSurface},filterOptionText:{flex:1,...typography.bodyStrong,color:C.text},filterOptionTextSelected:{color:C.text},filterOptionMark:{fontSize:18,color:C.muted,fontWeight:'900'},filterOptionMarkSelected:{color:C.accent},sheetActions:{flexDirection:'row',gap:8},pressed:{opacity:.74}
});}
