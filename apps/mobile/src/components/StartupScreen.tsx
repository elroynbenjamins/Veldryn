import {ActivityIndicator,Image,Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {ImageStyle} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t,type Language} from '../i18n';
import {startupWordmark,type StartupScene} from '../theme/startup-art';
import {resolveTheme,type UiThemeId} from '../theme/theme';

/** Shown during real loading. Art failure cannot block save recovery. */
export function StartupScreen({scene,language,themeId}:{scene:StartupScene;language:Language;themeId?:UiThemeId}){
  const {width,height}=useWindowDimensions();
  const theme=resolveTheme(themeId);
  const logoWidth=Math.min(288,Math.max(160,width-48));
  const pixelStyle=(Platform.OS==='web'?{imageRendering:'pixelated'}:{}) as ImageStyle;
  const artShade=theme.dark?'rgba(3,4,5,.24)':'rgba(242,247,244,.10)';
  const bridgeSurface=theme.dark?'rgba(3,4,5,.90)':'rgba(242,247,244,.94)';
  return <View style={[s.root,{backgroundColor:theme.bg}]}>
    <StatusBar style={theme.dark?'light':'dark'}/>
    <Image source={scene.source} accessible={false} resizeMode="cover" fadeDuration={0}
      style={[StyleSheet.absoluteFill,s.background,pixelStyle]}/>
    <View pointerEvents="none" style={[s.shade,{backgroundColor:artShade}]}/>
    <SafeAreaView style={s.safe}>
      <View style={[s.brand,{paddingTop:Math.max(24,height*.045)}]}>
        <Image source={startupWordmark} accessibilityLabel="VELDRYN" resizeMode="contain" fadeDuration={0}
          style={[{width:logoWidth,height:logoWidth/3},pixelStyle]}/>
      </View>
      <View accessibilityLiveRegion="polite" accessibilityState={{busy:true}} style={[s.loading,{backgroundColor:bridgeSurface,borderTopColor:theme.line}]}>
        <View style={[s.divider,{backgroundColor:theme.accent}]}/>
        <ActivityIndicator color={theme.accent} size="small"/>
        <Text style={[s.label,{color:theme.dark?theme.accentSoft:theme.text}]}>{t(language,'coopUi.loading')}</Text>
      </View>
    </SafeAreaView>
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1},background:{width:'100%',height:'100%'},
  shade:{...StyleSheet.absoluteFill},
  safe:{flex:1,justifyContent:'space-between'},
  brand:{alignItems:'center',paddingHorizontal:24},
  loading:{alignItems:'center',gap:12,paddingTop:20,paddingBottom:32,paddingHorizontal:24,borderTopWidth:StyleSheet.hairlineWidth},
  divider:{width:96,height:2,marginBottom:4},
  label:{fontSize:16,fontWeight:'600',textAlign:'center'},
});
