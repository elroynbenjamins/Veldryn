import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {EarlyFeatureUnlockMoment} from '../core/feature-unlocks';
import {GameButton} from './GameButton';
import {GameModalSurface} from './GameModalSurface';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function FeatureUnlockPopup({moment,reduceMotion=false,onOpen,onLater}:{moment?:EarlyFeatureUnlockMoment;reduceMotion?:boolean;onOpen:()=>void;onLater:()=>void}){
 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 return <GameModalSurface visible={!!moment} presentation="dialog" reduceMotion={reduceMotion} onClose={onLater} backdropLabel="Close feature unlock" surfaceStyle={s.card}>
  {moment?<ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <View style={[s.badge,{borderColor:E.goldSoft}]}><Text style={[s.badgeMark,{color:E.goldSoft}]}>✦</Text></View>
   <Text style={[s.eyebrow,{color:E.goldSoft}]}>{moment.eyebrow}</Text>
   <Text accessibilityRole="header" style={s.heading}>{moment.title}</Text>
   <Text style={s.copy}>{moment.description}</Text>
   <View style={s.points}>{moment.bullets.map((bullet,index)=><View key={index} style={s.point}><Text style={s.pointMark}>◆</Text><Text style={s.pointText}>{bullet}</Text></View>)}</View>
   <View style={s.actions}><GameButton title={moment.actionLabel} onPress={onOpen}/><GameButton title="Later" tone="secondary" onPress={onLater}/></View>
  </ScrollView>:null}
 </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 card:{maxWidth:430,padding:0,borderColor:C.accent,backgroundColor:C.bg},scroll:{maxHeight:'100%'},content:{gap:spacing.sm,padding:spacing.lg},
 badge:{width:48,height:48,alignSelf:'center',alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:24,backgroundColor:C.panel2},
 badgeMark:{fontSize:24,fontWeight:'900'},eyebrow:{...typography.caption,fontWeight:'900',letterSpacing:1.1,textAlign:'center'},heading:{...typography.hero,color:C.text,textAlign:'center'},copy:{...typography.body,color:C.muted,lineHeight:20,textAlign:'center'},
 points:{gap:6,marginTop:spacing.xs},point:{minHeight:42,flexDirection:'row',alignItems:'flex-start',gap:8,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},pointMark:{fontSize:10,color:C.accent,fontWeight:'900',marginTop:3},pointText:{flex:1,...typography.caption,color:C.text,lineHeight:17},actions:{gap:6,marginTop:spacing.xs},
});}
