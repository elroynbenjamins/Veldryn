import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {AppState,BackHandler,Linking,SafeAreaView,StatusBar,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {fetchAppReleaseDecision,type AppReleaseDecision} from '../core/app-release-control';

export function AppReleaseGate({children}:{children:ReactNode}){
  const [decision,setDecision]=useState<AppReleaseDecision|null>(null);
  const [checking,setChecking]=useState(true);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    setChecking(true);setError('');
    try{setDecision(await fetchAppReleaseDecision());}
    catch(e){setDecision(null);setError(e instanceof Error?e.message:'Update check failed.');}
    finally{setChecking(false);}
  },[]);
  useEffect(()=>{void refresh();const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});return()=>sub.remove();},[refresh]);
  const blocked=Boolean(decision?.mandatory||decision?.maintenance);
  useEffect(()=>{if(!blocked)return;const sub=BackHandler.addEventListener('hardwareBackPress',()=>true);return()=>sub.remove();},[blocked]);

  if(checking&&!decision)return <View style={s.loading}/>;
  if(!blocked)return <>{children}</>;

  const control=decision?.control;
  const maintenance=decision?.maintenance===true;
  return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content"/>
    <View style={s.card}>
      <Text style={s.kicker}>{maintenance?'SERVER MAINTENANCE':'UPDATE REQUIRED'}</Text>
      <Text accessibilityRole="header" style={s.title}>{maintenance?'Asterfall is preparing':control?.updateTitle??'VELDRYN has been updated'}</Text>
      <Text style={s.body}>{maintenance?control?.maintenanceMessage:control?.updateMessage}</Text>
      {!maintenance&&control?<>
        <View style={s.versionRow}><Text style={s.versionLabel}>Installed</Text><Text style={s.version}>{decision?.currentVersion}</Text></View>
        <View style={s.versionRow}><Text style={s.versionLabel}>Required</Text><Text style={s.version}>{control.minimumVersion}</Text></View>
        <GameButton title="Update VELDRYN" onPress={()=>void Linking.openURL(control.storeUrl)}/>
      </>:<GameButton title="Check again" tone="secondary" onPress={()=>void refresh()}/>}
      {!!error&&<Text style={s.note}>{error}</Text>}
      <Text style={s.note}>{maintenance?'Your account and progress remain safe.':'The game will re-check the installed version when you return.'}</Text>
    </View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  loading:{flex:1,backgroundColor:'#101521'},
  root:{flex:1,backgroundColor:'#101521',justifyContent:'center',padding:20},
  card:{width:'100%',maxWidth:440,alignSelf:'center',gap:14,padding:20,borderWidth:1,borderColor:'#40546c',borderRadius:18,backgroundColor:'#172131'},
  kicker:{fontSize:11,fontWeight:'900',letterSpacing:1.5,color:'#f0b86c'},
  title:{fontSize:26,lineHeight:32,fontWeight:'900',color:'#f7e6bf'},
  body:{fontSize:15,lineHeight:22,color:'#c4cfdb'},
  versionRow:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#2f4054'},
  versionLabel:{fontSize:13,color:'#91a4b7'},version:{fontSize:13,fontWeight:'800',color:'#eef5f7'},
  note:{fontSize:12,lineHeight:18,color:'#91a4b7',textAlign:'center'},
});
