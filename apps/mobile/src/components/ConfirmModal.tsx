import {useMemo} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
import {GameButton} from './GameButton';
export function ConfirmModal({visible,title,message,confirmLabel,danger=false,onConfirm,onCancel}:{visible:boolean;title:string;message:string;confirmLabel:string;danger?:boolean;onConfirm:()=>void;onCancel:()=>void}){
  const {colors:C}=useTheme();const s=useMemo(()=>createStyles(C),[C]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={s.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={onCancel}/>
      <View style={s.card} accessibilityViewIsModal>
        <ScrollView style={s.content} contentContainerStyle={s.copy} bounces={false}>
          <Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.message}>{message}</Text>
        </ScrollView>
        <View style={s.actions}><GameButton title="Cancel" tone="secondary" onPress={onCancel}/><GameButton title={confirmLabel} tone={danger?'danger':'primary'} onPress={onConfirm}/></View>
      </View>
    </View>
  </Modal>;
}
const createStyles=(C:any)=>StyleSheet.create({backdrop:{flex:1,backgroundColor:C.overlay,justifyContent:'center',alignItems:'center',padding:spacing.lg},card:{width:'100%',maxWidth:480,maxHeight:'90%',backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,padding:spacing.lg,gap:spacing.md},content:{flexGrow:0,flexShrink:1},copy:{gap:spacing.md,paddingBottom:4},title:{...typography.title,color:C.text},message:{...typography.body,color:C.muted},actions:{gap:spacing.sm,flexShrink:0}});
