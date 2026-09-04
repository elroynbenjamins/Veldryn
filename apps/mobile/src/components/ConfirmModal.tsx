import React from 'react';
import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';
import {GameButton} from './GameButton';

export function ConfirmModal({visible,title,message,confirmLabel,danger=false,onConfirm,onCancel}:{visible:boolean;title:string;message:string;confirmLabel:string;danger?:boolean;onConfirm:()=>void;onCancel:()=>void}){
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <Pressable style={s.backdrop} accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel}>
      <Pressable style={s.card} accessibilityRole="none" onPress={()=>{}}>
        <Text style={s.title}>{title}</Text><Text style={s.message}>{message}</Text>
        <View style={s.actions}><GameButton title="Cancel" tone="secondary" onPress={onCancel}/><GameButton title={confirmLabel} tone={danger?'danger':'primary'} onPress={onConfirm}/></View>
      </Pressable>
    </Pressable>
  </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(4,8,14,.82)',justifyContent:'center',padding:spacing.xl},card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,padding:spacing.lg,gap:spacing.md},title:{...typography.title,color:C.text},message:{...typography.body,color:C.muted},actions:{gap:spacing.sm}});
