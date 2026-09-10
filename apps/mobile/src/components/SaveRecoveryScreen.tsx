import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {C,spacing,typography} from '../theme/theme';
import {Language,ot} from '../i18n';

export function SaveRecoveryScreen({message,onRetry,onStartFresh,language='en'}:{message:string;onRetry:()=>void;onStartFresh:()=>void;language?:Language}){
  return <View style={s.root} accessibilityLiveRegion="polite">
    <Text style={s.kicker}>{ot(language,'save.recoveryKicker')}</Text>
    <Text style={s.title}>{ot(language,'save.recoveryTitle')}</Text>
    <Text style={s.body}>{ot(language,'save.recoveryBody')}</Text>
    <View style={s.detail}><Text style={s.detailText}>{message}</Text></View>
    <GameButton title={ot(language,'save.retry')} onPress={onRetry}/>
    <GameButton title={ot(language,'save.startFresh')} tone="danger" onPress={onStartFresh}/>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,justifyContent:'center',padding:spacing.xl,gap:spacing.md,backgroundColor:C.bg},kicker:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},title:{...typography.hero,color:C.text},body:{...typography.body,color:C.muted},detail:{padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},detailText:{...typography.caption,color:C.warning}});
