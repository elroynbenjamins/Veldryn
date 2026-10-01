import {useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {COMPANION_TRIAL_BOSS_INTERVAL,COMPANION_TRIAL_FLOOR_COUNT,companionTrialRecommendedPower} from '../../../../backend/src/server/companions/content';
import {companionTrialEncounterTheme} from '../../../../backend/src/server/companions/trials';
import {companionTowerFloors} from '../core/companion-tower';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionTranslator} from '../i18n/companions';

export function CompanionTower({currentFloor,highestFloor,completed=false,onBossPress}:{currentFloor:number;highestFloor:number;completed?:boolean;onBossPress?:(floor:number)=>void}){
 const C=useGameTheme(),language=useGameLanguage(),t=companionTranslator(language);
 const activeChamber=Math.min(Math.ceil(COMPANION_TRIAL_FLOOR_COUNT/COMPANION_TRIAL_BOSS_INTERVAL)-1,Math.floor((Math.max(1,completed?COMPANION_TRIAL_FLOOR_COUNT:currentFloor)-1)/COMPANION_TRIAL_BOSS_INTERVAL));
 const [chamber,setChamber]=useState(activeChamber);
 useEffect(()=>setChamber(activeChamber),[activeChamber]);
 const chambers=COMPANION_TRIAL_FLOOR_COUNT/COMPANION_TRIAL_BOSS_INTERVAL;
 return <View style={[s.shell,{backgroundColor:C.panel2,borderColor:C.line}]}>
  <View style={s.header}><View style={s.flex}><Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{t('Trial Tower')}</Text><Text style={[s.copy,{color:C.muted}]}>{t('Climb to Floor {value0}',{value0:COMPANION_TRIAL_FLOOR_COUNT})}</Text></View><Text style={[s.total,{color:C.accent}]}>{highestFloor}/{COMPANION_TRIAL_FLOOR_COUNT}</Text></View>
  <View accessibilityRole="tablist" style={s.chambers}>{Array.from({length:chambers},(_,index)=><Pressable key={index} accessibilityRole="tab" accessibilityLabel={t('Floors {value0}–{value1}',{value0:index*5+1,value1:(index+1)*5})} accessibilityState={{selected:index===chamber}} onPress={()=>setChamber(index)} style={[s.chamber,{backgroundColor:index===chamber?C.selection:C.bg,borderColor:index===chamber?C.accent:C.line}]}><Text style={[s.chamberText,{color:index===chamber?C.accent:C.muted}]}>{(index+1)*5}</Text></Pressable>)}</View>
  <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:5,borderBottomColor:C.line,marginHorizontal:5}}>{Array.from({length:7},(_,index)=><View key={index} style={{width:22,height:14,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.line,borderTopLeftRadius:2,borderTopRightRadius:2}}/>)}</View>
  <View style={s.tower}><View pointerEvents="none" style={[s.spine,{backgroundColor:C.line}]}/>
   {companionTowerFloors(chamber,completed?0:currentFloor,highestFloor).map(row=>{
    const theme=companionTrialEncounterTheme(row.floor),tone=row.current?C.accent:row.cleared?C.good:C.muted;
    return <Pressable key={row.floor} disabled={!row.boss||!onBossPress} accessibilityRole={row.boss&&onBossPress?'button':undefined} onPress={()=>onBossPress?.(row.floor)} accessibilityLabel={t('Floor {value0}',{value0:row.floor})+' · '+t(row.current?'Next encounter':row.cleared?'Cleared':'Upcoming')} style={[s.floor,{backgroundColor:row.current?C.selection:C.panel,borderColor:row.current?C.accent:row.boss?C.warning:C.line},row.boss&&s.boss]}>
     <View style={[s.door,{borderColor:tone,backgroundColor:C.bg}]}><Text style={[s.number,{color:tone}]}>{row.floor}</Text><Text style={{color:tone}}>{row.boss?'◆':row.cleared?'✓':'·'}</Text></View>
     <View style={s.flex}><Text style={[s.eyebrow,{color:tone}]}>{t(row.current?'NEXT ENCOUNTER':row.boss?'BOSS CHECKPOINT':row.cleared?'CLEARED':'UPCOMING')}</Text><Text style={[s.name,{color:C.text}]}>{row.boss&&theme.bossName?theme.bossName:companionContent(language,theme.label)}</Text><Text style={[s.copy,{color:C.muted}]}>{t('Recommended Power {value0}',{value0:companionTrialRecommendedPower(row.floor).toLocaleString(language)})}</Text></View>
    </Pressable>;
   })}
  </View>
  <Text style={[s.copy,{color:C.muted,textAlign:'center'}]}>{t('Ascend from bottom to top · Boss every 5 floors')}</Text>
  {chamber!==activeChamber?<Pressable accessibilityRole="button" onPress={()=>setChamber(activeChamber)} style={[s.returnButton,{borderColor:C.line}]}><Text style={{color:C.accent,fontWeight:'700'}}>{t('Return to current floor')}</Text></Pressable>:null}
 </View>;
}
const s=StyleSheet.create({shell:{borderWidth:1,borderRadius:18,padding:14,gap:14,overflow:'hidden'},header:{flexDirection:'row',alignItems:'center',gap:12},flex:{flex:1,minWidth:0,gap:4},title:{fontSize:22,fontWeight:'800'},total:{fontSize:24,fontWeight:'800'},copy:{fontSize:12,lineHeight:18},chambers:{flexDirection:'row',gap:5},chamber:{flex:1,minHeight:44,borderWidth:1,borderRadius:8,alignItems:'center',justifyContent:'center'},chamberText:{fontSize:13,fontWeight:'700'},tower:{gap:12,paddingHorizontal:5},spine:{position:'absolute',top:10,bottom:10,width:3,left:36},floor:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderWidth:1,borderRadius:12,marginHorizontal:6},boss:{marginHorizontal:0,borderTopWidth:3},door:{width:48,minHeight:62,borderWidth:1,borderTopLeftRadius:24,borderTopRightRadius:24,alignItems:'center',justifyContent:'center'},number:{fontSize:23,fontWeight:'800'},eyebrow:{fontSize:10,lineHeight:15,fontWeight:'800',letterSpacing:.7},name:{fontSize:14,lineHeight:20,fontWeight:'700'},returnButton:{borderWidth:1,borderRadius:10,minHeight:44,alignItems:'center',justifyContent:'center'}});
