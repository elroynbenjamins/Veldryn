import type {ReactNode} from 'react';
import {Image,KeyboardAvoidingView,Platform,SafeAreaView,ScrollView,StatusBar as NativeStatusBar,StyleSheet,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {startupWordmark,type StartupScene} from '../theme/startup-art';

/** The same session artwork carries from loading into account entry. */
export function AccountWelcomeScreen({scene,children}:{scene:StartupScene;children:ReactNode}){
 return <View style={s.root}><StatusBar style="light"/>
  <Image source={scene.source} accessible={false} resizeMode="cover" fadeDuration={0} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
  <View pointerEvents="none" style={s.shade}/>
  <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':'height'}>
   <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}>
    <View style={s.column}><Image source={startupWordmark} accessibilityLabel="VELDRYN" resizeMode="contain" fadeDuration={0} style={s.logo}/>{children}</View>
   </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#101521'},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(7,15,28,.46)'},safe:{flex:1,paddingTop:Platform.OS==='android'?NativeStatusBar.currentHeight??24:0},flex:{flex:1},content:{flexGrow:1,justifyContent:'center',padding:20,paddingVertical:32},column:{width:'100%',maxWidth:440,alignSelf:'center',gap:20},logo:{width:'85%',maxWidth:288,height:96,alignSelf:'center'}});
