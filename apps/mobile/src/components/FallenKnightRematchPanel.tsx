import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {fallenKnightWeeklyStatus,FALLEN_KNIGHT_CLEAR_REWARD} from '../core/weekly-boss';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionTranslator} from '../i18n/companions';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

/** Weekly reward tracker is placed directly above the Fallen Knight encounter. */
export function FallenKnightRematchPanel({state}:{state:GameState}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),t=companionTranslator(useGameLanguage());
  const weekly=fallenKnightWeeklyStatus(state,Date.now()),bountyDone=weekly.bountyAwarded;
  const clear=FALLEN_KNIGHT_CLEAR_REWARD;
  return <View style={s.root}>
    <View style={s.heading}>
      <View style={s.fill}>
        <Text style={s.kicker}>{t('WEEKLY BOSS REWARDS')}</Text>
        <Text style={s.title}>{t('Fallen Knight rematches')}</Text>
      </View>
      <Text style={s.count}>{weekly.rewardedClears}/{weekly.cap}</Text>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel={t('Weekly rewarded victories')} accessibilityValue={{min:0,max:weekly.cap,now:weekly.rewardedClears}} style={s.track}>
      {Array.from({length:weekly.cap},(_,index)=><View key={index} style={[s.segment,index<weekly.rewardedClears?s.segmentFilled:s.segmentEmpty]}/>)}
    </View>
    <View style={s.bountyRow}>
      <Text style={s.bountyLabel}>{t('Oathglass Bounty')}</Text>
      <Text style={bountyDone?s.complete:s.pending}>{bountyDone?t('Completed'):t('Bonus on first victory')}</Text>
    </View>
    <Text style={s.reward}>{weekly.remaining>0?`${clear.gold} Gold · ${clear.xp} XP · ${clear.essence} Essence · 2 Oathglass Shards · 4 Gem Dust`:t('All weekly boss rewards collected.')}</Text>
    <Text style={s.reset}>{t('Resets every Monday · 00:00 UTC')}</Text>
  </View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
  root:{gap:7,padding:12,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.panel2},
  heading:{flexDirection:'row',alignItems:'center',gap:8},
  fill:{flex:1,minWidth:0},kicker:{fontSize:9,lineHeight:12,color:C.accent,fontWeight:'900',letterSpacing:.8},
  title:{fontSize:14,lineHeight:19,color:C.text,fontWeight:'800'},
  count:{fontSize:19,lineHeight:24,color:C.text,fontWeight:'900',fontVariant:['tabular-nums']},
  track:{height:6,flexDirection:'row',gap:4},
  segment:{flex:1,borderRadius:9},segmentFilled:{backgroundColor:C.good},segmentEmpty:{backgroundColor:C.line},
  bountyRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  bountyLabel:{fontSize:12,color:C.text,fontWeight:'700'},pending:{fontSize:11,color:C.info,fontWeight:'800'},
  complete:{fontSize:11,color:C.good,fontWeight:'800'},
  reward:{fontSize:11,lineHeight:16,color:C.muted},
  reset:{fontSize:10,lineHeight:14,color:C.muted},
});}
