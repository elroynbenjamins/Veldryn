import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameGuideDefinition} from '../core/onboarding';
import {GameButton} from './GameButton';
import {C,spacing,typography} from '../theme/theme';

export function GuideTopicModal({definition,visible,onClose}:{definition?:GameGuideDefinition;visible:boolean;onClose:()=>void}){
  if(!definition)return null;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.backdrop}><Pressable accessibilityRole="button" accessibilityLabel="Close Game Guide" style={StyleSheet.absoluteFill} onPress={onClose}/><View accessibilityViewIsModal style={s.sheet}><ScrollView contentContainerStyle={s.content}><Text style={s.kicker}>GAME GUIDE</Text><Text accessibilityRole="header" style={s.title}>{definition.title}</Text><Text style={s.summary}>{definition.summary}</Text><Text style={s.detail}>This topic is informational. Normal game progression and server rules remain authoritative.</Text><GameButton title="Close" tone="secondary" onPress={onClose}/></ScrollView></View></View></Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.68)',justifyContent:'flex-end',padding:12},sheet:{maxHeight:'70%',width:'100%',maxWidth:720,alignSelf:'center',backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden'},content:{padding:spacing.lg,gap:spacing.md},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{fontSize:24,lineHeight:30,color:C.text,fontWeight:'900'},summary:{...typography.bodyStrong,color:C.text,lineHeight:22},detail:{...typography.caption,color:C.muted,lineHeight:18}});
