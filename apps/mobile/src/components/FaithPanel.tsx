import React,{useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {FAITH_TIERS,FAITH_BLESSINGS} from '../content/faith';
import {blessingRows,faithLevel,faithPracticeAvailability,holyWaterAvailable,normalizeFaith} from '../core/faith';
import {progressWithinLevel} from '../core/progression';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const PRACTICE_COUNTS=[1,10,50,100] as const;
const familyLabel=(family:string)=>family.charAt(0).toUpperCase()+family.slice(1);

export function FaithPanel({state,onCommand}:{state:GameState;onCommand:(c:GameCommand)=>Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const [count,setCount]=useState<number>(1),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const c=state.character;if(!c)return null;
 const faith=normalizeFaith(c.faith),level=faithLevel(state),water=holyWaterAvailable(state),progress=progressWithinLevel(Math.max(faith.xp,state.skills.find(row=>row.skillId==='faith')?.xp??0),level);
 const progressRatio=level>=100?1:Math.min(1,progress.current/Math.max(1,progress.need));
 const reservation=state.activity?.kind==='faith'?state.activity.faithPractice:undefined;
 const activeTierId=faith.practice?.tierId??reservation?.tierId,activeRemaining=faith.practice?.remaining??reservation?.remainingPractices??0;
 const activeTier=FAITH_TIERS.find(row=>row.id===activeTierId),active=!!activeTier&&activeRemaining>0;
 const selected=FAITH_BLESSINGS.find(row=>row.id===faith.selectedBlessingId);
 const visibleBlessings=blessingRows(state),stackActions=width<370||fontScale>=1.2;
 const run=async(command:GameCommand)=>{if(busy)return;setBusy(true);setError('');try{await onCommand(command);}catch(e){setError(e instanceof Error?e.message:'Action failed.');}finally{setBusy(false);}};
 return <>
  <Panel accentColor={C.special}>
   <View style={s.heroRow}><View style={s.flex}><Text style={s.eyebrow}>FAITH PRACTICE</Text><Text style={s.title}>Devotion</Text><Text style={s.body}>Holy Water is reserved when a practice starts. Unused Water is refunded when you stop or mastery ends the session.</Text></View><View style={s.waterBadge}><Text style={s.waterValue}>{water.toLocaleString()}</Text><Text style={s.waterLabel}>HOLY WATER</Text></View></View>
   <View style={s.progressMeta}><Text style={s.progressText}>{level>=100?'Faith mastered':`${progress.current.toLocaleString()} / ${progress.need.toLocaleString()} XP to next level`}</Text><Text style={s.level}>Lv {level}</Text></View>
   <View style={s.track}><View style={[s.fill,{width:`${Math.max(level>=100?100:3,progressRatio*100)}%`}]}/></View>
   {active&&activeTier?<View style={s.activeCard}><View style={s.between}><View style={s.flex}><Text style={s.activeLabel}>PRACTICE IN PROGRESS</Text><Text style={s.activeName}>{activeTier.name}</Text><Text style={s.body}>{activeRemaining} remaining · {activeTier.water} Holy Water each · {activeTier.seconds}s each</Text></View><Text style={s.activeCount}>{activeRemaining}</Text></View><GameButton compact title="Stop & refund unused" tone="secondary" disabled={busy} onPress={()=>void run({type:'stop'})}/></View>:null}
  </Panel>
  <Panel>
   <View style={s.sectionHeading}><View style={s.flex}><Text style={s.sectionLabel}>PRACTICE LENGTH</Text><Text style={s.body}>Choose how many repetitions to reserve before starting a tier.</Text></View><Text style={s.countValue}>×{count}</Text></View>
   <View style={s.countRow}>{PRACTICE_COUNTS.map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:count===value}} onPress={()=>setCount(value)} style={({pressed})=>[s.countChip,count===value&&s.countChipSelected,pressed&&s.pressed]}><Text style={[s.countText,count===value&&s.countTextSelected]}>×{value}</Text></Pressable>)}</View>
   {FAITH_TIERS.map(tier=>{const locked=tier.level>level,cost=tier.water*count,availability=faithPracticeAvailability(state,tier.id,count),selectedTier=activeTierId===tier.id;return <View key={tier.id} style={[s.practiceCard,selectedTier&&s.practiceCardActive,locked&&s.practiceCardLocked]}>
    <View style={s.between}><View style={s.flex}><View style={s.inline}><Text style={s.practiceName}>{tier.name}</Text>{locked?<Text style={s.lockTag}>LV {tier.level}</Text>:selectedTier?<Text style={s.activeTag}>ACTIVE</Text>:<Text style={s.readyTag}>READY</Text>}</View><Text style={s.practiceMeta}>{tier.xp.toLocaleString()} Faith XP · {tier.seconds}s each · {cost.toLocaleString()} Holy Water for ×{count}</Text></View></View>
    <GameButton compact title={active?'Practice already running':locked?`Requires Faith level ${tier.level}`:availability.ready?`Start ×${count}`:`Need ${cost.toLocaleString()} Holy Water`} disabled={busy||active||locked||!availability.ready||level>=100} tone={availability.ready&&!active&&!locked?'primary':'secondary'} onPress={()=>void run({type:'faith_practice',args:{tierId:tier.id,count}})}/>
   </View>})}
  </Panel>
  <Panel>
   <View style={s.sectionHeading}><View style={s.flex}><Text style={s.sectionLabel}>ACTIVE BLESSING</Text><Text style={s.selectedBlessing}>{selected?`${selected.name} · +${Math.round(selected.bonus*100)}% ${familyLabel(selected.family)}`:'No blessing selected'}</Text></View><View style={s.hideButton}><GameButton compact title={faith.hideWeakerBlessings?'Show all':'Hide weaker'} tone="secondary" disabled={busy} onPress={()=>void run({type:'faith_hide',args:{enabled:!faith.hideWeakerBlessings}})}/></View></View>
   <Text style={s.body}>Equip one blessing at a time. Star useful alternatives so they remain visible when weaker blessings are hidden.</Text>
   {visibleBlessings.map(blessing=>{const locked=blessing.level>level,favorite=faith.favoriteBlessingIds.includes(blessing.id),equipped=faith.selectedBlessingId===blessing.id;return <View key={blessing.id} style={[s.blessingRow,equipped&&s.blessingEquipped,locked&&s.blessingLocked]}>
    <Pressable accessibilityRole="button" accessibilityLabel={favorite?`Remove ${blessing.name} from favorites`:`Favorite ${blessing.name}`} accessibilityState={{selected:favorite,disabled:busy}} disabled={busy} onPress={()=>void run({type:'faith_favorite',args:{id:blessing.id,enabled:!favorite}})} style={({pressed})=>[s.starButton,pressed&&s.pressed]}><Text style={[s.star,favorite&&s.starActive]}>{favorite?'★':'☆'}</Text></Pressable>
    <View style={s.flex}><View style={s.inline}><Text style={s.blessingName}>{blessing.name}</Text>{equipped?<Text style={s.activeTag}>EQUIPPED</Text>:locked?<Text style={s.lockTag}>LV {blessing.level}</Text>:null}</View><Text style={s.blessingMeta}>+{Math.round(blessing.bonus*100)}% {familyLabel(blessing.family)} · unlocks at Faith {blessing.level}</Text></View>
    <View style={[s.blessingAction,stackActions&&s.blessingActionStack]}><GameButton compact title={equipped?'Active':locked?`Lv ${blessing.level}`:'Equip'} selected={equipped} disabled={busy||locked||equipped} tone={equipped?'primary':'secondary'} onPress={()=>void run({type:'faith_blessing',args:{id:blessing.id}})}/></View>
   </View>})}
   {error?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>:null}
  </Panel>
 </>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},heroRow:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},eyebrow:{...typography.caption,color:C.special,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},waterBadge:{minWidth:74,alignItems:'center',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.special,borderRadius:10,backgroundColor:C.specialSurface},waterValue:{...typography.title,color:C.special},waterLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.7},
 progressMeta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},progressText:{...typography.caption,color:C.muted},level:{...typography.bodyStrong,color:C.accent},track:{height:8,borderRadius:5,backgroundColor:C.bg,overflow:'hidden'},fill:{height:'100%',borderRadius:5,backgroundColor:C.special},
 activeCard:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.special,borderRadius:10,backgroundColor:C.specialSurface},activeLabel:{...typography.caption,color:C.special,fontWeight:'900',letterSpacing:.8},activeName:{...typography.bodyStrong,color:C.text},activeCount:{...typography.title,color:C.special},
 sectionHeading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},sectionLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},countValue:{...typography.title,color:C.accent},countRow:{flexDirection:'row',flexWrap:'wrap',gap:6},countChip:{minHeight:40,minWidth:58,paddingHorizontal:12,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},countChipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},countText:{...typography.bodyStrong,color:C.muted},countTextSelected:{color:C.text},pressed:{opacity:.72},
 practiceCard:{gap:7,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},practiceCardActive:{borderColor:C.special,backgroundColor:C.specialSurface},practiceCardLocked:{opacity:.7},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},inline:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6},practiceName:{...typography.bodyStrong,color:C.text},practiceMeta:{...typography.caption,color:C.muted},lockTag:{fontSize:9,color:C.warning,fontWeight:'900',letterSpacing:.7},readyTag:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.7},activeTag:{fontSize:9,color:C.special,fontWeight:'900',letterSpacing:.7},
 selectedBlessing:{...typography.bodyStrong,color:C.text},hideButton:{maxWidth:132},blessingRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderTopColor:C.line},blessingEquipped:{paddingHorizontal:8,borderWidth:1,borderColor:C.special,borderRadius:10,backgroundColor:C.specialSurface},blessingLocked:{opacity:.72},starButton:{width:40,height:40,alignItems:'center',justifyContent:'center'},star:{fontSize:24,color:C.muted},starActive:{color:C.accent},blessingName:{...typography.bodyStrong,color:C.text},blessingMeta:{...typography.caption,color:C.muted},blessingAction:{width:94},blessingActionStack:{width:86},error:{...typography.body,color:C.bad}
});}
