import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {contractBoardSummary} from '../core/contract-board-summary';
import {C,radii,spacing,typography} from '../theme/theme';
import {GameButton} from './GameButton';
import {StatBar} from './StatBar';

function remainingLabel(endsAtMs:number,nowMs:number){
 const seconds=Math.max(0,Math.ceil((endsAtMs-nowMs)/1000));
 const days=Math.floor(seconds/86400),hours=Math.floor((seconds%86400)/3600);
 return days>0?`${days}d ${hours}h`:`${Math.max(1,hours)}h`;
}

export function ContractBoardSummary({state,nowMs,onOpen}:{state:GameState;nowMs:number;onOpen:()=>void}){
 const summary=contractBoardSummary(state,nowMs),next=summary.nextOrder;
 if(!summary.total)return null;
 return <View style={[s.card,summary.pendingRewards>0&&s.ready]}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>CONTRACT BOARD · {summary.weekKey}</Text><Text style={s.title}>{summary.pendingRewards>0?`${summary.pendingRewards} reward grant${summary.pendingRewards===1?'':'s'} queued`:summary.complete===summary.total?'Weekly board complete':next?.title??'Weekly jobs'}</Text></View><Text style={summary.complete===summary.total?s.complete:s.count}>{summary.complete}/{summary.total}</Text></View>
  <StatBar reduceMotion={state.settings.reduceMotion} label="Weekly jobs completed" current={summary.complete} max={summary.total}/>
  <Text style={s.meta}>{summary.complete===summary.total?'All posted jobs are complete.':next?`Next: ${Math.max(0,next.target-next.progress)} remaining · ${next.reward.label}`:'No remaining job.'} · resets in {remainingLabel(summary.endsAtMs,nowMs)}</Text>
  <GameButton title={summary.pendingRewards>0?'Open Contract Board rewards':'Open Contract Board'} tone={summary.pendingRewards>0?'primary':'secondary'} onPress={onOpen}/>
 </View>;
}
const s=StyleSheet.create({card:{gap:8,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},ready:{borderLeftWidth:4,borderLeftColor:C.good},head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.bodyStrong,color:C.text},count:{...typography.title,color:C.accent},complete:{...typography.title,color:C.good},meta:{...typography.caption,color:C.muted,lineHeight:16}});
