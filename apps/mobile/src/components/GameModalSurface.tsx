import {type PropsWithChildren,type ReactNode,useMemo} from 'react';
import {Modal,Pressable,StyleSheet,Text,View,type StyleProp,type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Presentation='sheet'|'dialog';
export function GameModalSurface({visible,onClose,reduceMotion=false,presentation='sheet',children,surfaceStyle,backdropLabel='Close dialog'}:PropsWithChildren<{visible:boolean;onClose:()=>void;reduceMotion?:boolean;presentation?:Presentation;surfaceStyle?:StyleProp<ViewStyle>;backdropLabel?:string}>){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),insets=useSafeAreaInsets(),sheet=presentation==='sheet';
  return <Modal visible={visible} transparent statusBarTranslucent animationType={reduceMotion?'none':'fade'} onRequestClose={onClose}>
    <View style={[s.backdrop,!sheet&&s.center]}>
      <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View accessibilityViewIsModal style={[s.surface,sheet?s.sheet:s.dialog,sheet&&{paddingBottom:Math.max(spacing.lg,insets.bottom+spacing.sm)},surfaceStyle]}>
        {sheet?<View style={s.grabber}/>:null}
        {children}
      </View>
    </View>
  </Modal>;
}

export function GameModalHeader({eyebrow,title,onClose,closeDisabled=false,leading,trailing}:{eyebrow?:string;title:string;onClose:()=>void;closeDisabled?:boolean;leading?:ReactNode;trailing?:ReactNode}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  return <View style={s.header}>
    {leading}
    <View style={s.headerCopy}>{eyebrow?<Text style={s.eyebrow}>{eyebrow}</Text>:null}<Text accessibilityRole="header" style={s.title}>{title}</Text></View>
    {trailing}
    <Pressable accessibilityRole="button" accessibilityLabel="Close" accessibilityState={{disabled:closeDisabled}} disabled={closeDisabled} onPress={onClose} style={({pressed})=>[s.close,pressed&&!closeDisabled&&s.pressed,closeDisabled&&s.disabled]}>
      <Text style={s.closeText}>×</Text>
    </Pressable>
  </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
  backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:C.overlay},
  center:{justifyContent:'center',alignItems:'center',padding:spacing.lg},
  surface:{width:'100%',alignSelf:'center',backgroundColor:C.bg,borderWidth:1,borderColor:C.lineStrong},
  sheet:{maxWidth:720,maxHeight:'92%',paddingHorizontal:14,paddingTop:8,borderTopLeftRadius:radii.lg,borderTopRightRadius:radii.lg},
  dialog:{maxWidth:520,maxHeight:'90%',padding:spacing.lg,borderRadius:radii.lg},
  grabber:{width:42,height:4,alignSelf:'center',marginBottom:8,borderRadius:99,backgroundColor:C.lineStrong},
  header:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10},
  headerCopy:{flex:1,minWidth:0},
  eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},
  close:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:22},
  closeText:{fontSize:28,lineHeight:30,color:C.muted},
  pressed:{backgroundColor:C.panel2},
  disabled:{opacity:.4},
});}
