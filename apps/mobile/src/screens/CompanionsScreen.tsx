import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import type {CompanionMaterialSourceTarget} from '../core/companion-presentation';
import {companionAttentionLabels,companionAttentionSummary} from '../core/companion-attention';
import {CombatCompanionPanel} from '../components/CombatCompanionPanel';
import {ClassSkillsPanel} from '../components/ClassSkillsPanel';
import {MonsterMasteryPanel} from '../components/MonsterMasteryPanel';
import {ExplorationPanel} from '../components/ExplorationPanel';
import {AccountRosterPanel} from '../components/AccountRosterPanel';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import type {Language} from '../i18n';
import {earlyFeatureGate} from '../core/early-feature-gates';
import {Panel} from '../components/Panel';

export function CompanionsScreen({state,language,now,onCommand,onCreate,onNavigateSource}:{state:GameState;language:Language;now:number;onCommand:(command:GameCommand)=>Promise<void>;onCreate:()=>void;onNavigateSource?:(source:CompanionMaterialSourceTarget)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const companionGate=earlyFeatureGate(state,'companions'),attention=companionGate.unlocked?companionAttentionSummary(state,now):{hasAttention:false} as ReturnType<typeof companionAttentionSummary>,labels=companionGate.unlocked?companionAttentionLabels(attention):[];
 return <ScrollView contentContainerStyle={s.root}><Text style={s.kicker}>COMPANION SANCTUARY</Text><Text style={s.heading}>Companions</Text>{companionGate.unlocked?<Text style={s.intro}>Build your roster, train techniques, climb monthly Trials and keep unused companions working through Sanctuary Expeditions.</Text>:<Panel><View style={s.lockedFeature}><Text style={s.lockGlyph}>🔒</Text><View style={s.lockCopy}><Text style={s.lockTitle}>Companion Sanctuary is locked</Text><Text style={s.intro}>{companionGate.requirement}</Text><Text style={s.lockDetail}>{companionGate.detail}</Text></View></View></Panel>}{companionGate.unlocked&&attention.hasAttention?<View style={s.attention}><Text style={s.attentionTitle}>✦ COMPANION ACTIONS READY</Text><Text style={s.attentionText}>{labels.slice(0,4).join(' · ')}{labels.length>4?' · +'+(labels.length-4)+' more':''}</Text></View>:null}{companionGate.unlocked?<CombatCompanionPanel state={state} now={now} onCommand={onCommand} onNavigateSource={onNavigateSource}/>:null}<View style={s.other}><Text style={s.otherKicker}>OTHER CHARACTER PROGRESSION</Text><Text style={s.otherCopy}>Account roster, exploration, class skills and monster mastery remain available below without crowding the Companion tabs.</Text></View><AccountRosterPanel state={state} language={language} onCommand={onCommand} onCreate={onCreate}/><ExplorationPanel state={state} onCommand={onCommand}/><ClassSkillsPanel state={state} now={now} onCommand={onCommand}/><MonsterMasteryPanel state={state}/></ScrollView>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{padding:spacing.md,gap:spacing.md,paddingBottom:spacing.xl},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.4},heading:{...typography.hero,color:C.text,marginTop:-6},intro:{...typography.body,color:C.muted,maxWidth:460,marginBottom:spacing.xs},attention:{padding:spacing.sm,borderWidth:1,borderColor:C.warning,borderRadius:10,backgroundColor:C.warningSurface,gap:2},attentionTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.8},attentionText:{...typography.caption,color:C.text},other:{marginTop:spacing.sm,paddingTop:spacing.md,borderTopWidth:1,borderTopColor:C.line,gap:2},otherKicker:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1},otherCopy:{...typography.caption,color:C.muted},lockedFeature:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:4},lockGlyph:{fontSize:30},lockCopy:{flex:1,minWidth:0,gap:3},lockTitle:{...typography.title,color:C.text},lockDetail:{...typography.caption,color:C.info,lineHeight:17}});}
