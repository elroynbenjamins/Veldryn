import {useMemo} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {sharedText} from '../i18n/shared';

export function ConfirmModal({visible,title,message,confirmLabel,danger=false,reduceMotion=false,onConfirm,onCancel}:{visible:boolean;title:string;message:string;confirmLabel:string;danger?:boolean;reduceMotion?:boolean;onConfirm:()=>void;onCancel:()=>void}){
  const language=useGameLanguage();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackActions=width<360||fontScale>=1.25;
  return <GameModalSurface visible={visible} presentation="dialog" surfaceStyle={s.surface} reduceMotion={reduceMotion} onClose={onCancel} backdropLabel={sharedText(language,'Cancel confirmation')}>
    <GameModalHeader title={title} onClose={onCancel}/>
    <View style={s.content}><Text style={s.message}>{message}</Text></View>
    <View style={[s.actions,stackActions&&s.actionsStack]}><View style={[s.flex,stackActions&&s.actionStack]}><GameButton title={sharedText(language,'Cancel')} tone="secondary" onPress={onCancel}/></View><View style={[s.flex,stackActions&&s.actionStack]}><GameButton title={confirmLabel} tone={danger?'danger':'primary'} onPress={onConfirm}/></View></View>
  </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({surface:{padding:20,paddingBottom:24},content:{paddingTop:spacing.sm,paddingBottom:spacing.xl},message:{...typography.body,color:C.muted,lineHeight:22},actions:{flexDirection:'row',gap:spacing.md,flexShrink:0},actionsStack:{flexDirection:'column'},flex:{flex:1,minWidth:0},actionStack:{flex:0,width:'100%'}});}
