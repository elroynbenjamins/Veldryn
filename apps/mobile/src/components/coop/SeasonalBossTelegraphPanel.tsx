import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import type {CoopRunBossMechanicView,CoopRunBossRecapView} from '../../core/coop-presentation';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {FantasyPanel} from './CoopVisualKit';

/**
 * Room selection is the primary dungeon task. Keep boss guidance glanceable;
 * the full server-authored casts, phase thresholds and recap are opt-in.
 */
export function SeasonalBossTelegraphPanel({mechanic,recap,showPlan}:{mechanic?:CoopRunBossMechanicView;recap?:CoopRunBossRecapView;showPlan:boolean}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const [detailsOpen,setDetailsOpen]=useState(false);
 const [recapOpen,setRecapOpen]=useState(false);
 const telegraph=mechanic?.telegraph;
 const priorityCast=telegraph?.castAbilities.find(ability=>ability.interruptible)??telegraph?.castAbilities[0];
 const priorityPhase=telegraph?.phases[0];
 if(!mechanic&&!recap)return null;
 return <View style={s.stack}>
  {mechanic?<FantasyPanel variant={mechanic.tone==='danger'?'danger':mechanic.tone==='benefit'?'success':'default'}>
   <View style={s.head}>
    <View style={s.grow}>
     <Text style={s.kicker}>{showPlan?st('FINAL BOSS'):st('BOSS OUTLOOK')}</Text>
     <Text style={s.title} numberOfLines={1}>{showPlan&&telegraph?telegraph.bossName:mechanic.label}</Text>
    </View>
    {showPlan&&telegraph&&telegraph.phases.length>1?<Text style={s.phaseCount}>{telegraph.phases.length} {telegraph.phases.length===1?st('phase'):st('phases')}</Text>:null}
   </View>
   <Text style={s.copy} numberOfLines={detailsOpen?undefined:2}>{mechanic.summary}</Text>
   {showPlan&&telegraph&&!detailsOpen&&(priorityCast||priorityPhase)?<View style={s.glance}>
    {priorityCast?<View style={s.glanceRow}><Text style={[s.actionLabel,priorityCast.interruptible?s.interrupt:s.watch]}>{priorityCast.interruptible?st('INTERRUPT'):st('WATCH')}</Text><Text style={s.glanceValue} numberOfLines={1}>{priorityCast.label}</Text></View>:null}
    {priorityPhase?<View style={s.glanceRow}><Text style={s.threshold}>{priorityPhase.hpPct}% HP</Text><Text style={s.glanceValue} numberOfLines={1}>{priorityPhase.label}</Text></View>:null}
   </View>:null}
   {showPlan&&telegraph?<Pressable accessibilityRole="button" accessibilityLabel={detailsOpen?st('Hide boss details'):st('Boss details')} accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(open=>!open)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
    <Text style={s.disclosureLabel}>{detailsOpen?st('Hide boss details'):st('Boss details')}</Text><Text style={s.disclosureGlyph}>{detailsOpen?'−':'+'}</Text>
   </Pressable>:null}
   {showPlan&&telegraph&&detailsOpen?<View style={s.details}>
    {telegraph.phases.length?<View style={s.detailGroup}><Text style={s.detailTitle}>{st('PHASES')}</Text>{telegraph.phases.map(phase=><View key={phase.id} style={s.detailRow}>
     <Text style={s.threshold}>{phase.hpPct}% HP</Text><View style={s.grow}><Text style={s.detailValue}>{phase.label}</Text>{phase.objectiveSensitive?<Text style={s.detailHint}>{st('Objective-sensitive')}</Text>:null}</View>
    </View>)}</View>:null}
    {telegraph.castAbilities.length?<View style={s.detailGroup}><Text style={s.detailTitle}>{st('ABILITIES')}</Text>{telegraph.castAbilities.map(ability=><View key={ability.id} style={s.detailRow}>
     <Text style={[s.actionLabel,ability.interruptible?s.interrupt:s.watch]}>{ability.interruptible?st('INTERRUPT'):st('WATCH')}</Text>
     <View style={s.grow}><Text style={s.detailValue}>{ability.label}</Text><Text style={s.detailHint}>{(ability.castMs/1000).toFixed(1)}s {st('cast')} · {(ability.cooldownMs/1000).toFixed(1)}s {st('cooldown')}{ability.objectiveSensitive?' · '+st('Objective-sensitive'):''}</Text></View>
    </View>)}</View>:null}
    {telegraph.suppressedAbilities.length?<View style={s.detailGroup}><Text style={s.detailTitle}>{st('SUPPRESSED')}</Text>{telegraph.suppressedAbilities.map(ability=><Text key={ability.id} style={s.suppressed}>✓ {ability.label}</Text>)}</View>:null}
   </View>:null}
  </FantasyPanel>:null}
  {recap?<FantasyPanel variant="default">
   <Pressable accessibilityRole="button" accessibilityLabel={recapOpen?st('Hide boss recap'):st('Boss recap')} accessibilityState={{expanded:recapOpen}} onPress={()=>setRecapOpen(open=>!open)} style={({pressed})=>[s.recapHeader,pressed&&s.pressed]}>
    <View style={s.grow}><Text style={s.kicker}>{st('BOSS RECAP')}</Text><Text style={s.recapSummary}>{Math.max(0,recap.durationMs/1000).toFixed(1)}s · {recap.downs} {recap.downs===1?st('down'):st('downs')}</Text></View><Text style={s.disclosureGlyph}>{recapOpen?'−':'+'}</Text>
   </Pressable>
   {recapOpen?<View style={s.details}>
    <Text style={s.detailTitle}>{st('Phases triggered')}</Text><Text style={s.copy}>{recap.phasesTriggered.length?recap.phasesTriggered.join(' · '):st('No threshold phases triggered.')}</Text>
    <Text style={s.detailTitle}>{st('Boss casts seen')}</Text><Text style={s.copy}>{recap.abilitiesCast.length?recap.abilitiesCast.join(' · '):st('No boss casts started before the fight ended.')}</Text>
   </View>:null}
  </FantasyPanel>:null}
 </View>;
}

const makeStyles=(C:CoopColors)=>StyleSheet.create({
 stack:{gap:coopSpacing.sm},
 head:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},
 grow:{flex:1,minWidth:0},
 kicker:{fontSize:11,lineHeight:16,color:C.gold,fontWeight:'800',letterSpacing:.8},
 title:{fontSize:18,lineHeight:24,color:C.text,fontWeight:'800'},
 copy:{fontSize:13,lineHeight:19,color:C.textSecondary},
 phaseCount:{fontSize:11,lineHeight:16,color:C.textMuted,fontWeight:'700'},
 glance:{gap:6,paddingVertical:2},
 glanceRow:{minHeight:27,flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},
 actionLabel:{width:90,fontSize:10,lineHeight:16,fontWeight:'800',letterSpacing:.2},
 interrupt:{color:C.danger},
 watch:{color:C.warning},
 threshold:{width:90,fontSize:12,lineHeight:18,color:C.gold,fontWeight:'800'},
 glanceValue:{flex:1,minWidth:0,fontSize:13,lineHeight:18,color:C.text,fontWeight:'700'},
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line,marginTop:coopSpacing.xs},
 disclosureLabel:{flex:1,fontSize:13,lineHeight:18,color:C.gold,fontWeight:'700'},
 disclosureGlyph:{fontSize:21,lineHeight:25,color:C.textMuted},
 pressed:{opacity:.65},
 details:{gap:coopSpacing.sm,borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line,paddingTop:coopSpacing.sm},
 detailGroup:{gap:6},
 detailTitle:{fontSize:11,lineHeight:16,color:C.textMuted,fontWeight:'800',letterSpacing:.7},
 detailRow:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm,paddingVertical:4},
 detailValue:{fontSize:13,lineHeight:19,color:C.text,fontWeight:'700'},
 detailHint:{fontSize:11,lineHeight:17,color:C.textMuted},
 suppressed:{fontSize:12,lineHeight:18,color:C.success},
 recapHeader:{minHeight:44,flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},
 recapSummary:{fontSize:14,lineHeight:20,color:C.text,fontWeight:'700'},
});
