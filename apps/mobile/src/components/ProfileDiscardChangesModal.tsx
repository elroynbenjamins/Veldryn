import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameTheme} from '../theme/ThemeContext';
import {typography} from '../theme/theme';

export function ProfileDiscardChangesModal({visible,reduceMotion,onKeepEditing,onDiscard}:{visible:boolean;reduceMotion:boolean;onKeepEditing:()=>void;onDiscard:()=>void}){
 const C=useGameTheme();
 return <GameModalSurface visible={visible} presentation="dialog" reduceMotion={reduceMotion} onClose={onKeepEditing} dismissOnBackdrop={false} backdropLabel="Keep editing profile">
  <GameModalHeader eyebrow="PROFILE CUSTOMIZATION" title="Discard profile changes?" onClose={onKeepEditing}/>
  <View style={s.body}><Text style={[s.copy,{color:C.muted}]}>You have unapplied appearance previews or unsaved profile settings.</Text><GameButton title="Keep editing" tone="secondary" onPress={onKeepEditing}/><GameButton title="Discard changes" tone="danger" onPress={onDiscard}/></View>
 </GameModalSurface>;
}
const s=StyleSheet.create({body:{gap:10,paddingTop:12},copy:{...typography.body,lineHeight:21}});
