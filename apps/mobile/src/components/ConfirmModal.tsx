import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

export function ConfirmModal({visible,title,message,confirmLabel,danger=false,reduceMotion=false,onConfirm,onCancel}:{visible:boolean;title:string;message:string;confirmLabel:string;danger?:boolean;reduceMotion?:boolean;onConfirm:()=>void;onCancel:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  return <GameModalSurface visible={visible} presentation="dialog" reduceMotion={reduceMotion} onClose={onCancel} backdropLabel="Cancel confirmation">
    <GameModalHeader title={title} onClose={onCancel}/>
    <ScrollView style={s.content} contentContainerStyle={s.copy} bounces={false} showsVerticalScrollIndicator={false}>
      <Text style={s.message}>{message}</Text>
    </ScrollView>
    <View style={s.actions}><View style={s.flex}><GameButton title="Cancel" tone="secondary" onPress={onCancel}/></View><View style={s.flex}><GameButton title={confirmLabel} tone={danger?'danger':'primary'} onPress={onConfirm}/></View></View>
  </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({content:{flexGrow:0,flexShrink:1},copy:{paddingVertical:spacing.xs},message:{...typography.body,color:C.muted,lineHeight:20},actions:{flexDirection:'row',gap:spacing.sm,flexShrink:0},flex:{flex:1,minWidth:0}});}
