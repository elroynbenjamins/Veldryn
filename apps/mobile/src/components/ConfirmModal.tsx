import {useMemo} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {sharedText} from '../i18n/shared';

export function ConfirmModal({visible,title,message,confirmLabel,danger=false,reduceMotion=false,busy=false,onConfirm,onCancel}:{visible:boolean;title:string;message:string;confirmLabel:string;danger?:boolean;reduceMotion?:boolean;busy?:boolean;onConfirm:()=>void;onCancel:()=>void}){
  const language=useGameLanguage();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackActions=width<360||fontScale>=1.25;
  return <GameModalSurface visible={visible} presentation="dialog" surfaceStyle={s.surface} reduceMotion={reduceMotion} onClose={()=>{if(!busy)onCancel()}} dismissOnBackdrop={!busy} backdropLabel={sharedText(language,'Cancel confirmation')}>
    <GameModalHeader title={title} closeDisabled={busy} onClose={()=>{if(!busy)onCancel()}}/>
    <View style={s.content}><Text style={s.message}>{message}</Text></View>
    <View style={[s.actions,stackActions&&s.actionsStack]}><View style={[s.flex,stackActions&&s.actionStack]}><GameButton title={sharedText(language,'Cancel')} tone="secondary" disabled={busy} onPress={onCancel}/></View><View style={[s.flex,stackActions&&s.actionStack]}><GameButton title={confirmLabel} tone={danger?'danger':'primary'} loading={busy} onPress={onConfirm}/></View></View>
  </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({surface:{maxWidth:460,padding:spacing.md,paddingBottom:spacing.lg},content:{paddingTop:spacing.xs,paddingBottom:spacing.md},message:{...typography.body,color:C.muted,lineHeight:21},actions:{flexDirection:'row',gap:spacing.sm,flexShrink:0},actionsStack:{flexDirection:'column'},flex:{flex:1,minWidth:0},actionStack:{flex:0,width:'100%'}});}
