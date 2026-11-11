import {profileT,profileSourceText} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useMemo,type ReactNode} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {WardrobeRow} from '../../core/profile-wardrobe';
import type {ProfileCustomizationDestination} from '../../core/profile-customization';
import {radii,spacing,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {GameButton} from '../GameButton';
import {GameModalHeader,GameModalSurface} from '../GameModalSurface';

/** Every locked tile can explain itself: what it is, where it comes from, and the two
 * things a player can do about it — try it on, or go to the source that grants it. */
export function ProfileUnlockSheet({row,artwork,reduceMotion,tryingOn,onTryOn,onClose,onNavigateSource}:{
 row:WardrobeRow|null;artwork?:ReactNode;reduceMotion?:boolean;tryingOn:boolean;
 onTryOn:()=>void;onClose:()=>void;onNavigateSource?:(destination:ProfileCustomizationDestination)=>void;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <GameModalSurface visible={!!row} reduceMotion={reduceMotion} onClose={onClose} backdropLabel={profileT(language,"Close the unlock details")} surfaceStyle={s.sheet}>
  <GameModalHeader eyebrow={profileT(language,"HOW TO UNLOCK")} title={row?.name??''} onClose={onClose}/>
  {row?<>
   <View style={s.head}>
    {artwork?<View style={s.art}>{artwork}</View>:null}
    <View style={s.copy}>
     <Text style={s.label}>{profileSourceText(language,row.sourceLabel??row.group)}</Text>
     <Text style={s.detail}>{profileSourceText(language,row.sourceDetail??'')}</Text>
    </View>
   </View>
   <Text style={s.note}>{tryingOn
    ?profileT(language,"You are trying this on. It shows on your stage and in the audience preview, but it is not equipped and nothing is saved.")
    :profileT(language,"Locked cosmetics can be tried on without being equipped, so you can see what you are working towards.")}</Text>
   <View style={s.actions}>
    <View style={s.action}><GameButton compact title={tryingOn?profileT(language,"Stop trying on"):profileT(language,"Try it on")} tone="secondary" onPress={onTryOn}/></View>
    {onNavigateSource&&row.destination?<View style={s.action}><GameButton compact title={profileSourceText(language,row.actionLabel??'Open source')} onPress={()=>onNavigateSource(row.destination!)}/></View>:null}
   </View>
  </>:null}
 </GameModalSurface>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 sheet:{paddingHorizontal:spacing.lg,backgroundColor:C.bg,borderColor:C.warning,gap:10},
 head:{flexDirection:'row',alignItems:'center',gap:12},
 art:{width:78,height:78,borderRadius:radii.md,overflow:'hidden',borderWidth:1,borderColor:C.warning,backgroundColor:C.stage},
 copy:{flex:1,minWidth:0,gap:3},
 label:{...typography.bodyStrong,color:C.warning},
 detail:{...typography.caption,color:C.muted,lineHeight:17},
 note:{...typography.caption,color:C.muted,lineHeight:17},
 actions:{flexDirection:'row',gap:8},
 action:{flex:1},
});}
