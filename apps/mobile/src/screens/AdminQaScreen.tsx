import {useMemo,useState} from 'react';
import {Alert,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import type {ClassId,GameState} from '../core/types';
import {ADMIN_QA_CLASSES,buildAdminQaState,refillAdminQaResources} from '../dev/admin-qa-profile';

const labels:Record<ClassId,string>={
  IRONWARDEN:'Ironwarden',BASTION:'Bastion',DREADGUARD:'Dreadguard',DAWNKEEPER:'Dawnkeeper',
  WAYFINDER:'Wayfinder',RAVAGER:'Ravager',HEXWEAVER:'Hexweaver',KNIFE_DANCER:'Knife Dancer',STONECALLER:'Stonecaller',
};

export function AdminQaScreen({state,onChange,onClose,onOpenDungeon}:{state:GameState;onChange:(state:GameState)=>void|Promise<void>;onClose:()=>void;onOpenDungeon:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const [busy,setBusy]=useState(false);
  const run=async(work:()=>GameState|Promise<GameState>)=>{if(busy)return;setBusy(true);try{await onChange(await work())}catch(error){Alert.alert('Admin QA',error instanceof Error?error.message:String(error))}finally{setBusy(false)}};
  return <ScrollView contentContainerStyle={s.root}>
    <View style={s.header}><View style={{flex:1}}><Text style={s.eyebrow}>DEVELOPER / QA</Text><Text accessibilityRole="header" style={s.title}>Admin QA Console</Text><Text style={s.body}>This profile is for testing only. It unlocks progression gates and supplies materials without changing production balance rules.</Text></View><GameButton title="Close" onPress={onClose}/></View>
    <View style={s.card}><Text style={s.cardTitle}>Full-access profile</Text><Text style={s.body}>Level 100, all skills 99, all monsters/bosses unlocked, five character slots, VIP/VIP+/Supporter flags, large storage, premium currency and enough materials to exercise crafting recipes.</Text><GameButton title="Apply / reset QA profile" disabled={busy} onPress={()=>void run(()=>buildAdminQaState(state,state.character?.classId??'IRONWARDEN'))}/><GameButton title="Refill gold + materials" disabled={busy} onPress={()=>void run(()=>refillAdminQaResources(state))}/></View>
    <View style={s.card}><Text style={s.cardTitle}>Class switcher</Text><Text style={s.body}>Switch the active QA character in place so one test account can craft and equip class-restricted sets for all nine classes.</Text><View style={s.grid}>{ADMIN_QA_CLASSES.map(classId=><View key={classId} style={s.cell}><GameButton title={labels[classId]} disabled={busy||state.character?.classId===classId} onPress={()=>void run(()=>buildAdminQaState(state,classId))}/></View>)}</View></View>
    <View style={s.card}><Text style={s.cardTitle}>Dungeon lab</Text><Text style={s.body}>Open the normal Dungeon screen with the QA profile. In local development, dungeon browsing uses deterministic fixtures. For full run/claim testing, use the online QA Echo profiles documented in docs/ADMIN_QA_TESTING.md.</Text><GameButton title="Open Dungeon" onPress={onOpenDungeon}/></View>
    <View style={s.warning}><Text style={s.warningTitle}>Safety</Text><Text style={s.body}>QA accounts must be excluded from rankings, first-clear/world-first records, economy telemetry and live reward leaderboards. Do not grant this role to player accounts.</Text></View>
  </ScrollView>;
}

function styles(C:ThemeColors){return StyleSheet.create({
  root:{padding:spacing.md,gap:spacing.md,paddingBottom:spacing.xl},
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  eyebrow:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:1},
  title:{...typography.hero,color:C.text},
  body:{...typography.body,color:C.muted},
  card:{gap:spacing.sm,padding:spacing.md,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  cardTitle:{...typography.bodyStrong,color:C.text},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  cell:{minWidth:145,flexGrow:1,flexBasis:'45%'},
  warning:{gap:spacing.xs,padding:spacing.md,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.panel2},
  warningTitle:{...typography.bodyStrong,color:C.warning},
});}
