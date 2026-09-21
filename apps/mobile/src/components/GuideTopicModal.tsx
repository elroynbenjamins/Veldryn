import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text} from 'react-native';
import type {GameGuideDefinition} from '../core/onboarding';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuideTopicModal({definition,visible,onClose}:{definition?:GameGuideDefinition;visible:boolean;onClose:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  if(!definition)return null;
  return <GameModalSurface visible={visible} onClose={onClose} backdropLabel="Close Game Guide">
    <GameModalHeader eyebrow="GAME GUIDE" title={definition.title} onClose={onClose}/>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.summary}>{definition.summary}</Text>
      <Text style={s.detail}>This topic is informational. Normal game progression and server rules remain authoritative.</Text>
      <GameButton compact title="Close" tone="secondary" onPress={onClose}/>
    </ScrollView>
  </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({content:{paddingBottom:spacing.md,gap:spacing.md},summary:{...typography.bodyStrong,color:C.text,lineHeight:22},detail:{...typography.caption,color:C.muted,lineHeight:18}});}
