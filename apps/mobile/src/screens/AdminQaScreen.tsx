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

type Props={
  state:GameState;
  onChange?:(state:GameState)=>void|Promise<void>;
  onApplyQa?:(classId:ClassId)=>void|Promise<void>;
  onRefillQa?:()=>void|Promise<void>;
  onClose:()=>void;
  onOpenDungeon:()=>void;
};

export function AdminQaScreen({state,onChange,onApplyQa,onRefillQa,onClose,onOpenDungeon}:Props){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const [busy,setBusy]=useState(false),online=!!onApplyQa;
  const run=async(work:()=>void|Promise<void>)=>{if(busy)return;setBusy(true);try{await work()}catch(error){Alert.alert('Admin QA',error instanceof Error?error.message:String(error))}finally{setBusy(false)}};
  const apply=async(classId:ClassId)=>{
    if(onApplyQa){await onApplyQa(classId);return;}
    if(!onChange)throw new Error('Admin QA mutation is unavailable.');
    await onChange(buildAdminQaState(state,classId));
  };
  const refill=async()=>{
    if(onRefillQa){await onRefillQa();return;}
    if(!onChange)throw new Error('Admin QA refill is unavailable.');
    await onChange(refillAdminQaResources(state));
  };
  return <ScrollView contentContainerStyle={s.root}>
    <View style={s.header}><View style={{flex:1}}><Text style={s.eyebrow}>{online?'ONLINE ADMIN QA':'DEVELOPER / QA'}</Text><Text accessibilityRole="header" style={s.title}>Admin QA Console</Text><Text style={s.body}>Test-only access to progression, crafting and dungeon systems. Online actions are authorized by the server-side admin_qa role.</Text></View><GameButton title="Close" onPress={onClose}/></View>
    <View style={s.card}><Text style={s.cardTitle}>Full-access profile</Text><Text style={s.body}>Level 100, max test skills, all monsters/bosses unlocked, five character slots, VIP/VIP+/Supporter flags, large storage, premium currency and enough materials to exercise crafting recipes.</Text><GameButton title={state.character?'Apply / reset QA profile':'Create Admin QA character'} disabled={busy} onPress={()=>void run(()=>apply(state.character?.classId??'IRONWARDEN'))}/><GameButton title="Refill gold + materials" disabled={busy||!state.character} onPress={()=>void run(refill)}/></View>
    <View style={s.card}><Text style={s.cardTitle}>Class switcher</Text><Text style={s.body}>Reuse the same QA account and character ID while changing its class test profile, so all nine class-restricted equipment paths can be exercised.</Text><View style={s.grid}>{ADMIN_QA_CLASSES.map(classId=><View key={classId} style={s.cell}><GameButton title={labels[classId]} disabled={busy||state.character?.classId===classId} onPress={()=>void run(()=>apply(classId))}/></View>)}</View></View>
    <View style={s.card}><Text style={s.cardTitle}>Dungeon lab</Text><Text style={s.body}>Use the normal online dungeon runtime. Q-mode can fill missing roles from the tested QA Echo pool; Live mode still requires real connected clients.</Text><GameButton title="Open Dungeon" disabled={!state.character} onPress={onOpenDungeon}/></View>
    <View style={s.warning}><Text style={s.warningTitle}>QA isolation</Text><Text style={s.body}>Admin QA gameplay contributions are suppressed from the normal progression/ranking contribution pipeline. Keep this role limited to dedicated test accounts.</Text></View>
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
