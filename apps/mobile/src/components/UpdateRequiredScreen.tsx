import {useMemo} from 'react';
import {ActivityIndicator,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

export function UpdateRequiredScreen({title,message,currentVersion,minimumVersion,onUpdate,maintenance=false}:{title:string;message:string;currentVersion:string;minimumVersion?:string;onUpdate:()=>void;maintenance?:boolean}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  return <SafeAreaView style={s.root}><View style={s.card}>
    <Text style={s.kicker}>{maintenance?'SERVICE STATUS':'UPDATE REQUIRED'}</Text>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
    <Text style={s.message}>{message}</Text>
    {!maintenance?<><View style={s.versionRow}><Text style={s.versionLabel}>Installed</Text><Text style={s.versionValue}>{currentVersion}</Text></View>{minimumVersion?<View style={s.versionRow}><Text style={s.versionLabel}>Required</Text><Text style={s.versionValue}>{minimumVersion}+</Text></View>:null}<GameButton title="Update VELDRYN" onPress={onUpdate}/><Text style={s.note}>The game will continue normally after the supported version is installed.</Text></>:<><ActivityIndicator color={C.accent}/><Text style={s.note}>Try again after maintenance has finished.</Text></>}
  </View></SafeAreaView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg,justifyContent:'center',padding:20},
  card:{width:'100%',maxWidth:440,alignSelf:'center',gap:14,padding:20,borderWidth:1,borderColor:C.line,borderRadius:18,backgroundColor:C.panel},
  kicker:{fontSize:10,lineHeight:14,color:C.accent,fontWeight:'900',letterSpacing:1.4},
  title:{fontSize:25,lineHeight:32,color:C.text,fontWeight:'900'},
  message:{fontSize:15,lineHeight:22,color:C.muted},
  versionRow:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:8,borderBottomWidth:1,borderColor:C.line},
  versionLabel:{fontSize:12,color:C.muted,fontWeight:'700'},
  versionValue:{fontSize:12,color:C.text,fontWeight:'900'},
  note:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center'},
});}
