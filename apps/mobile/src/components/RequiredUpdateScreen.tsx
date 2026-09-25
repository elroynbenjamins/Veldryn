import {useEffect,useState} from 'react';
import {BackHandler,Linking,Platform,Pressable,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import type {AppReleaseDecision,AppReleasePolicy} from '../core/app-release';

export function RequiredUpdateScreen({decision,policy,onRetry,retrying=false}:{decision:AppReleaseDecision;policy:AppReleasePolicy;onRetry:()=>Promise<void>|void;retrying?:boolean}){
  const [opening,setOpening]=useState(false);
  const maintenance=decision.status==='maintenance';
  const storeUrl=Platform.OS==='ios'?policy.iosStoreUrl:policy.androidStoreUrl;
  useEffect(()=>{
    if(Platform.OS!=='android')return;
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>true);
    return()=>subscription.remove();
  },[]);
  const openStore=async()=>{
    if(!storeUrl||opening)return;
    setOpening(true);
    try{await Linking.openURL(storeUrl)}finally{setOpening(false)}
  };
  return <SafeAreaView style={s.safe}>
    <View style={s.card}>
      <View style={s.emblem}><Text style={s.emblemText}>{maintenance?'◆':'↑'}</Text></View>
      <Text accessibilityRole="header" style={s.title}>{maintenance?policy.maintenanceTitle:policy.updateTitle}</Text>
      <Text style={s.message}>{maintenance?policy.maintenanceMessage:policy.updateMessage}</Text>
      {!maintenance?<View style={s.versionBox}><Text style={s.versionLabel}>INSTALLED</Text><Text style={s.versionValue}>{decision.installedVersion}{decision.installedBuild!==undefined?` (${decision.installedBuild})`:''}</Text><View style={s.divider}/><Text style={s.versionLabel}>MINIMUM</Text><Text style={s.versionValue}>{decision.minimumVersion}{decision.minimumBuild!==undefined?` (${decision.minimumBuild})`:''}</Text><View style={s.divider}/><Text style={s.versionLabel}>LATEST</Text><Text style={s.versionValue}>{decision.latestVersion}{decision.latestBuild!==undefined?` (${decision.latestBuild})`:''}</Text></View>:null}
      {!maintenance&&storeUrl?<Pressable accessibilityRole="button" disabled={opening} onPress={()=>void openStore()} style={({pressed})=>[s.primary,pressed&&s.pressed,opening&&s.disabled]}><Text style={s.primaryText}>{opening?'Opening store…':'Update VELDRYN'}</Text></Pressable>:null}
      <Pressable accessibilityRole="button" disabled={retrying} onPress={()=>void onRetry()} style={({pressed})=>[s.secondary,pressed&&s.pressed,retrying&&s.disabled]}><Text style={s.secondaryText}>{retrying?'Checking…':maintenance?'Check service status':'I updated — check again'}</Text></Pressable>
      <Text style={s.note}>{maintenance?'Your account and progress are unaffected while the realm is unavailable.':'This screen cannot be dismissed while your installed version is below the supported minimum.'}</Text>
    </View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#0b1420',alignItems:'center',justifyContent:'center',padding:20},
  card:{width:'100%',maxWidth:430,padding:22,borderWidth:1,borderColor:'#35465c',borderRadius:20,backgroundColor:'#142131',gap:14,alignItems:'stretch'},
  emblem:{width:58,height:58,borderRadius:29,alignItems:'center',justifyContent:'center',alignSelf:'center',borderWidth:1,borderColor:'#cea363',backgroundColor:'#1b2b3c'},
  emblemText:{fontSize:26,color:'#f0d49a',fontWeight:'900'},title:{fontSize:25,lineHeight:31,color:'#f5e8ce',fontWeight:'900',textAlign:'center'},message:{fontSize:15,lineHeight:22,color:'#b7c4d2',textAlign:'center'},
  versionBox:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap',padding:11,borderRadius:12,backgroundColor:'#0f1a28'},versionLabel:{fontSize:9,color:'#8093a8',fontWeight:'900',letterSpacing:.8},versionValue:{fontSize:12,color:'#e9f2f8',fontWeight:'800'},divider:{width:1,height:18,backgroundColor:'#35465c'},
  primary:{minHeight:50,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#cea363',paddingHorizontal:16},primaryText:{fontSize:15,color:'#101521',fontWeight:'900'},
  secondary:{minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#53677f',paddingHorizontal:16},secondaryText:{fontSize:14,color:'#d7e4ef',fontWeight:'800'},
  pressed:{opacity:.78},disabled:{opacity:.5},note:{fontSize:11,lineHeight:17,color:'#8093a8',textAlign:'center'},
});
