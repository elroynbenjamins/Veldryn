import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

/** Shared one-row modal controls; no separate lock/favorite action row. */
export function InventoryItemHeaderControls({favorite=false,locked=false,onFavorite,onLock,onClose,disabled=false}:{
  favorite?:boolean;locked?:boolean;
  onFavorite?:()=>void|Promise<unknown>;onLock?:()=>void|Promise<unknown>;
  onClose:()=>void;disabled?:boolean;
}){
  const {gt}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  return <View style={s.row}>
    {onLock?<Pressable accessibilityRole="button" accessibilityLabel={gt(locked?'Unlock item':'Lock item')}
      accessibilityState={{selected:locked,disabled}} hitSlop={5} disabled={disabled}
      onPress={()=>{void onLock()}} style={({pressed})=>[s.button,locked&&s.protectedButton,pressed&&s.pressed]}>
      <View accessible={false} style={s.lockArt}>
        <View style={[s.shackle,locked?s.shackleClosed:s.shackleOpen]}/>
        <View style={[s.lockBody,locked&&s.lockBodyOn]}/>
      </View>
    </Pressable>:null}
    {onFavorite?<Pressable accessibilityRole="button" accessibilityLabel={gt(favorite?'Remove favorite':'Favorite')}
      accessibilityState={{selected:favorite,disabled}} hitSlop={5} disabled={disabled}
      onPress={()=>{void onFavorite()}} style={({pressed})=>[s.button,favorite&&s.protectedButton,pressed&&s.pressed]}>
      <Text accessible={false} style={[s.star,favorite&&s.starOn]}>{favorite?'★':'☆'}</Text>
    </Pressable>:null}
    <Pressable accessibilityRole="button" accessibilityLabel={gt('Close item quick inspect')} hitSlop={5}
      disabled={disabled} onPress={onClose} style={({pressed})=>[s.button,pressed&&s.pressed]}>
      <Text accessible={false} style={s.close}>×</Text>
    </Pressable>
  </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',gap:5,flexShrink:0},
  button:{width:36,height:40,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
  protectedButton:{borderColor:C.warning,backgroundColor:C.warningSurface},
  pressed:{opacity:.65},
  star:{fontSize:23,color:C.muted,lineHeight:27,fontWeight:'700'},
  starOn:{color:C.warning},
  close:{fontSize:23,color:C.text,fontWeight:'800',lineHeight:27},
  lockArt:{width:17,height:24,alignItems:'center',justifyContent:'flex-end',paddingBottom:2},
  shackle:{width:11,height:12,borderWidth:2,borderBottomWidth:0,borderColor:C.muted,borderTopLeftRadius:6,borderTopRightRadius:6,position:'absolute',top:1},
  shackleClosed:{left:3,borderColor:C.warning},
  shackleOpen:{left:7,transform:[{rotate:'-22deg'}]},
  lockBody:{height:12,width:16,borderRadius:3,borderWidth:1.5,borderColor:C.muted,backgroundColor:C.panel2},
  lockBodyOn:{backgroundColor:C.warning,borderColor:C.warning}
});}
