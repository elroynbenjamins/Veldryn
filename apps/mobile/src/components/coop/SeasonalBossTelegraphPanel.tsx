import {StyleSheet,Text,View} from 'react-native';
import type {CoopRunBossMechanicView,CoopRunBossRecapView} from '../../core/coop-presentation';
import {coopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel,StateChip} from './CoopVisualKit';

export function SeasonalBossTelegraphPanel({mechanic,recap,showPlan}:{mechanic?:CoopRunBossMechanicView;recap?:CoopRunBossRecapView;showPlan:boolean}){
 const telegraph=mechanic?.telegraph;
 if(!telegraph&&!recap)return null;
 return <View style={s.stack}>
  {telegraph&&showPlan?<FantasyPanel variant={mechanic?.tone==='danger'?'danger':mechanic?.tone==='benefit'?'success':'selected'}>
   <View style={s.head}><View style={s.grow}><Text style={s.kicker}>FINAL BOSS PLAN</Text><Text style={s.title}>{telegraph.bossName}</Text></View><StateChip label={`${telegraph.phases.length} PHASE${telegraph.phases.length===1?'':'S'}`} tone="selected"/></View>
   <Text style={s.label}>PHASE TRACKER</Text>
   <View style={s.phaseTrack}>{telegraph.phases.map(phase=><View key={phase.id} style={[s.phase,phase.objectiveSensitive&&s.phaseObjective]}><Text style={s.phasePct}>{phase.hpPct}%</Text><Text numberOfLines={2} style={s.phaseName}>{phase.label}</Text>{phase.objectiveSensitive?<Text style={s.objectiveTag}>OBJECTIVE</Text>:null}</View>)}</View>
   {telegraph.castAbilities.length?<View style={s.group}><Text style={s.label}>CAST TELEGRAPHS</Text>{telegraph.castAbilities.map(ability=><View key={ability.id} style={s.castRow}><StateChip label={ability.interruptible?'INTERRUPT':'WATCH'} tone={ability.interruptible?'danger':'warning'}/><View style={s.grow}><Text style={s.castName}>{ability.label}</Text><Text style={s.copy}>{(ability.castMs/1000).toFixed(1)}s cast · {(ability.cooldownMs/1000).toFixed(1)}s cooldown{ability.objectiveSensitive?' · objective-sensitive':''}</Text></View></View>)}</View>:null}
   {telegraph.suppressedAbilities.length?<View style={s.group}><Text style={s.label}>SUPPRESSED BY YOUR RUN</Text><View style={s.chips}>{telegraph.suppressedAbilities.map(ability=><StateChip key={ability.id} label={`${ability.label} · SUPPRESSED`} tone="success"/>)}</View></View>:null}
  </FantasyPanel>:null}
  {recap?<FantasyPanel variant="selected"><View style={s.head}><View style={s.grow}><Text style={s.kicker}>BOSS RECAP</Text><Text style={s.title}>{Math.max(0,recap.durationMs/1000).toFixed(1)}s encounter</Text></View><StateChip label={`${recap.downs} DOWN${recap.downs===1?'':'S'}`} tone={recap.downs>0?'warning':'success'}/></View>
   <Text style={s.recapLabel}>Phases triggered</Text><Text style={s.copy}>{recap.phasesTriggered.length?recap.phasesTriggered.join(' · '):'No threshold phases triggered.'}</Text>
   <Text style={s.recapLabel}>Boss casts seen</Text><Text style={s.copy}>{recap.abilitiesCast.length?recap.abilitiesCast.join(' · '):'No boss casts started before the fight ended.'}</Text>
  </FantasyPanel>:null}
 </View>;
}

const s=StyleSheet.create({
 stack:{gap:coopSpacing.sm},
 head:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},
 grow:{flex:1,minWidth:0},
 kicker:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',letterSpacing:.7},
 title:{...coopTypography.section,color:coopColors.text},
 copy:{...coopTypography.body,color:coopColors.textSecondary},
 label:{...coopTypography.meta,color:coopColors.cyan,fontWeight:'900',letterSpacing:.6,marginTop:coopSpacing.xs},
 phaseTrack:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.xs},
 phase:{width:'31%',minWidth:88,minHeight:66,padding:coopSpacing.xs,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:5,backgroundColor:coopColors.surfaceRaised,gap:2},
 phaseObjective:{borderColor:coopColors.cyan},
 phasePct:{...coopTypography.section,color:coopColors.gold},
 phaseName:{...coopTypography.meta,color:coopColors.text,fontWeight:'800'},
 objectiveTag:{fontSize:8,lineHeight:10,color:coopColors.cyan,fontWeight:'900',letterSpacing:.5},
 group:{gap:coopSpacing.xs},
 castRow:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,minHeight:44,paddingVertical:2},
 castName:{...coopTypography.body,color:coopColors.text,fontWeight:'900'},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.xs},
 recapLabel:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',marginTop:coopSpacing.xs},
});
