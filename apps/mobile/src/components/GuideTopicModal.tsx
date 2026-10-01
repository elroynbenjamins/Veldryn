import {accountText} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GAME_GUIDE_STEPS,type GameGuideDestination,type GameGuideDefinition} from '../core/onboarding';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuideTopicModal({language:languageOverride,definition,visible,onClose,onOpen}:{language?:Language;definition?:GameGuideDefinition;visible:boolean;onClose:()=>void;onOpen?:(destination:GameGuideDestination)=>void}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  if(!definition)return null;
  return <GameModalSurface visible={visible} onClose={onClose} backdropLabel={a("Close Game Guide")}>
    <GameModalHeader eyebrow={a("GAME GUIDE")} title={a(definition.title)} onClose={onClose}/>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <Text style={s.summary}>{a(definition.summary)}</Text>
      {GAME_GUIDE_STEPS[definition.id].map((step,index)=><View key={step} style={s.step}><Text style={s.number}>{index+1}</Text><Text style={s.detail}>{a(step)}</Text></View>)}
      {onOpen?<GameButton title={a("Open {screen}",{screen:a(definition.destination==='Progression'?'Working Toward':definition.destination==='More'?'Account':definition.destination==='Coop'?'Co-op Dungeons':definition.destination)})} onPress={()=>onOpen(definition.destination)}/>:null}
      <GameButton compact title={a("Close")} tone="secondary" onPress={onClose}/>
    </ScrollView>
  </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({content:{paddingBottom:spacing.md,gap:spacing.md},summary:{...typography.bodyStrong,color:C.text,lineHeight:22},step:{flexDirection:"row",gap:12,alignItems:"flex-start"},number:{...typography.bodyStrong,color:C.accent,minWidth:20},detail:{...typography.body,color:C.text,lineHeight:22,flex:1}});}
