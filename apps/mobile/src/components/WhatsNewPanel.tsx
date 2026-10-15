import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {APP_BUILD_INFO} from '../app-build';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameButton} from './GameButton';

// Increment the release ID and update these notes only when shipping player-facing changes.
// Mandatory/maintenance updates remain controlled by the existing server version gate.
export const WHATS_NEW_RELEASE_ID=[APP_BUILD_INFO.version,APP_BUILD_INFO.buildNumber??'dev','2026-10-ux-reliability'].join(':');
export const WHATS_NEW_ITEMS=[
 'Crafting: faster recipe searches and safer handling of unavailable recipes.',
 'Actions: clearer progress feedback and protection against repeat taps.',
 'Skills: improved stability for Cooking, Alchemy and Enchanting.',
 'Navigation: clearer information about current activities and rewards.',
] as const;

export function WhatsNewContent(){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <View style={s.body}>
  <Text style={s.version}>VELDRYN · {APP_BUILD_INFO.version}</Text>
  {WHATS_NEW_ITEMS.map((item,index)=><View key={index} style={s.row}><Text style={s.bullet}>✦</Text><Text style={s.item}>{item}</Text></View>)}
 </View>;
}
export function WhatsNewPanel({visible,onClose,reduceMotion=false}:{visible:boolean;onClose:()=>void;reduceMotion?:boolean}){
 return <GameModalSurface visible={visible} onClose={onClose} reduceMotion={reduceMotion} presentation="dialog">
   <GameModalHeader eyebrow="LATEST UPDATE" title="What's New" onClose={onClose}/>
   <WhatsNewContent/>
   <GameButton title="Continue" onPress={onClose}/>
 </GameModalSurface>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 body:{gap:spacing.sm,paddingVertical:spacing.md},
 version:{...typography.caption,color:C.accent,fontWeight:'900'},
 row:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
 bullet:{...typography.bodyStrong,color:C.accent},
 item:{...typography.body,color:C.text,flex:1},
});}
