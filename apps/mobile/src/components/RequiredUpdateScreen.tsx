import {Linking,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import type {AppUpdatePolicy} from '../online/app-update-policy';
import {GameButton} from './GameButton';
import {C,spacing,typography} from '../theme/theme';

export function RequiredUpdateScreen({policy}:{policy:AppUpdatePolicy}){
  return <SafeAreaView style={s.root}>
    <StatusBar style="light"/>
    <View style={s.card}>
      <Text style={s.kicker}>UPDATE REQUIRED</Text>
      <Text accessibilityRole="header" style={s.title}>{policy.title}</Text>
      <Text style={s.body}>{policy.message}</Text>
      <View style={s.versionRow}>
        <Text style={s.version}>Installed · {policy.currentVersion}</Text>
        <Text style={s.version}>Required · {policy.minimumVersion}</Text>
      </View>
      <GameButton title="Update VELDRYN" onPress={()=>void Linking.openURL(policy.androidStoreUrl)}/>
      <Text style={s.note}>Your account and characters remain safe. The game will continue normally after you install a supported version.</Text>
    </View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg,justifyContent:'center',padding:spacing.lg},
  card:{gap:spacing.md,padding:spacing.lg,borderWidth:1,borderColor:C.accent,borderRadius:16,backgroundColor:C.panel},
  kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.2},
  title:{...typography.title,color:C.text,fontSize:24},
  body:{...typography.body,color:C.muted,lineHeight:22},
  versionRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  version:{fontSize:11,color:C.info,fontWeight:'800'},
  note:{...typography.caption,color:C.muted,lineHeight:18,textAlign:'center'},
});
