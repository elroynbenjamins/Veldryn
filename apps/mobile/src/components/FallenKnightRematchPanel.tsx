import {Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {fallenKnightWeeklyStatus,FALLEN_KNIGHT_CLEAR_REWARD} from '../core/weekly-boss';
import {companionRematchBondstoneStatus} from '../core/companion-runtime';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionTranslator} from '../i18n/companions';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

// The encounter's normal boss action already routes story-cleared players to rematches.
export function FallenKnightRematchPanel({state,onRematch}:{state:GameState;onRematch:()=>void}){
 const C=useGameTheme(),t=companionTranslator(useGameLanguage()),now=Date.now();
 const weekly=fallenKnightWeeklyStatus(state,now),stones=companionRematchBondstoneStatus(state,now);
 return <View style={{padding:12,gap:10,borderTopWidth:1,borderColor:C.line}}>
  <Text style={{color:C.text,fontWeight:'700'}}>{t('Fallen Knight weekly rematch')}</Text>
  <Text style={{color:C.muted}}>{t('After the story victory, up to {value0} rewarded rematch wins are available each UTC week. Rematches resolve immediately, can be one-shot by sufficiently strong builds, and do not replay the story phase presentation.',{value0:weekly.cap})}</Text>
  <Text style={{color:C.muted}}>{t('Weekly clears: {value0}/{value1} · Oathglass Bounty: {value2}/{value3} · Bondstones: {value4}/{value5}',{value0:weekly.rewardedClears,value1:weekly.cap,value2:Math.min(weekly.rewardedClears,weekly.bountyTarget),value3:weekly.bountyTarget,value4:stones.used,value5:stones.cap})}</Text>
  <Text style={{color:C.muted}}>{FALLEN_KNIGHT_CLEAR_REWARD.gold} Gold · {FALLEN_KNIGHT_CLEAR_REWARD.xp} XP · {FALLEN_KNIGHT_CLEAR_REWARD.essence} {t('Essence')}</Text>
  <GameButton title={weekly.remaining<=0?t('Weekly rematches complete'):t('Rematch Fallen Knight · {value0} left',{value0:weekly.remaining})} disabled={weekly.remaining<=0||(state.character?.level??0)<25} onPress={onRematch}/>
 </View>;
}
