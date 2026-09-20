import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {CombatCompanionPanel} from '../components/CombatCompanionPanel';
import {ClassSkillsPanel} from '../components/ClassSkillsPanel';
import {MonsterMasteryPanel} from '../components/MonsterMasteryPanel';
import {ExplorationPanel} from '../components/ExplorationPanel';
import {AccountRosterPanel} from '../components/AccountRosterPanel';
import {C,spacing,typography} from '../theme/theme';
import {useGameTheme,type ThemePalette} from '../theme/app-theme';
import type {Language} from '../i18n';

export function CompanionsScreen({state,language,now,onCommand,onCreate}:{state:GameState;language:Language;now:number;onCommand:(command:GameCommand)=>Promise<void>;onCreate:()=>void}){
 const T=useGameTheme(),s=useMemo(()=>makeStyles(T),[T]);
 return <ScrollView contentContainerStyle={s.root}><Text style={s.kicker}>COMPANION SANCTUARY</Text><Text style={s.heading}>Companions</Text><Text style={s.intro}>Build your roster, train class techniques, and track the mastery that makes each companion stronger.</Text><AccountRosterPanel state={state} language={language} onCommand={onCommand} onCreate={onCreate}/><CombatCompanionPanel state={state} now={now} onCommand={onCommand}/><ExplorationPanel state={state} onCommand={onCommand}/><ClassSkillsPanel state={state} now={now} onCommand={onCommand}/><MonsterMasteryPanel state={state}/></ScrollView>;
}
const makeStyles=(T:ThemePalette)=>StyleSheet.create({root:{padding:spacing.md,gap:spacing.md,paddingBottom:spacing.xl},kicker:{...typography.caption,color:T.accent,fontWeight:'900',letterSpacing:1.4},heading:{...typography.hero,color:T.text,marginTop:-6},intro:{...typography.body,color:T.muted,maxWidth:420,marginBottom:spacing.xs}});
