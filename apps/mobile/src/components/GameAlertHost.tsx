import {useSyncExternalStore} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {gameAlerts} from '../core/game-alerts';
import {GameThemeProvider,useGameTheme} from '../theme/ThemeContext';
import {GameLanguageProvider,useGameLanguage} from '../i18n/GameLanguageProvider';
import {sharedText} from '../i18n/shared';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameButton} from './GameButton';

export function GameAlertHost(){
 const snapshot=useSyncExternalStore(gameAlerts.subscribe,gameAlerts.getSnapshot,gameAlerts.getSnapshot);
 return <GameThemeProvider themeId={snapshot.themeId}><GameLanguageProvider language={snapshot.language}><AlertDialog snapshot={snapshot}/></GameLanguageProvider></GameThemeProvider>;
}
function AlertDialog({snapshot}:{snapshot:ReturnType<typeof gameAlerts.getSnapshot>}){
 const C=useGameTheme(),language=useGameLanguage(),current=snapshot.queue[0];
 if(!current)return null;
 const close=()=>gameAlerts.dismiss(current.id);
 return <GameModalSurface visible onClose={close} presentation="dialog" reduceMotion={snapshot.reduceMotion} dismissOnBackdrop={current.options?.cancelable===true} surfaceStyle={{borderColor:C.accent,padding:18}}>
  <GameModalHeader eyebrow="VELDRYN" title={current.title} onClose={close}/>
  <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
   {current.message?<Text selectable style={{color:C.text,fontSize:15,lineHeight:22}}>{current.message}</Text>:null}
   <View style={styles.actions}>{current.buttons.map((button,index)=><GameButton key={index} title={button.text??sharedText(language,'OK')} tone={button.style==='destructive'?'danger':button.style==='cancel'?'secondary':'primary'} onPress={()=>gameAlerts.press(current.id,index)}/>)}</View>
  </ScrollView>
 </GameModalSurface>;
}
const styles=StyleSheet.create({body:{gap:18,paddingTop:12,paddingBottom:2},actions:{gap:8}});
