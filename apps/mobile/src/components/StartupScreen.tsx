import {ActivityIndicator,Image,Platform,SafeAreaView,StatusBar as NativeStatusBar,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {ImageStyle} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {t,type Language} from '../i18n';
import {startupWordmark,type StartupScene} from '../theme/startup-art';

/** Shown during real loading. Art failure cannot block save recovery. */
export function StartupScreen({scene,language}:{scene:StartupScene;language:Language}){
  const {width,height}=useWindowDimensions();
  const logoWidth=Math.min(288,Math.max(160,width-48));
  const pixelStyle=(Platform.OS==='web'?{imageRendering:'pixelated'}:{}) as ImageStyle;
  return <View style={s.root}>
    <StatusBar style="light"/>
    <Image source={scene.source} accessible={false} resizeMode="cover" fadeDuration={0}
      style={[StyleSheet.absoluteFill,s.background,pixelStyle]}/>
    <View pointerEvents="none" style={s.shade}/>
    <SafeAreaView style={s.safe}>
      <View style={[s.brand,{paddingTop:Math.max(24,height*.045)}]}>
        <Image source={startupWordmark} accessibilityLabel="VELDRYN" resizeMode="contain" fadeDuration={0}
          style={[{width:logoWidth,height:logoWidth/3},pixelStyle]}/>
      </View>
      <View accessibilityLiveRegion="polite" accessibilityState={{busy:true}} style={s.loading}>
        <View style={s.divider}/>
        <ActivityIndicator color="#A2E5ED" size="small"/>
        <Text style={s.label}>{t(language,'coopUi.loading')}</Text>
      </View>
    </SafeAreaView>
  </View>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#101521'},background:{width:'100%',height:'100%'},
  shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(7,15,28,.12)'},
  safe:{flex:1,justifyContent:'space-between',paddingTop:Platform.OS==='android'?NativeStatusBar.currentHeight??24:0},
  brand:{alignItems:'center',paddingHorizontal:24},
  loading:{alignItems:'center',gap:12,paddingTop:20,paddingBottom:32,paddingHorizontal:24,backgroundColor:'rgba(7,15,28,.86)'},
  divider:{width:96,height:2,backgroundColor:'#CEA363',marginBottom:4},
  label:{fontSize:16,fontWeight:'600',color:'#F0D49A',textAlign:'center'},
});
