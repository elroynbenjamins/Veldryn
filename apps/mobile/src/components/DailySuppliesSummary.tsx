import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {dailySuppliesHomeSummary} from '../core/daily-supplies-home';
import {GameButton} from './GameButton';
import {C,radii,spacing,typography} from '../theme/theme';

function duration(seconds:number){
 const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
 return hours?(minutes?`${hours}h ${minutes}m`:`${hours}h`):`${Math.max(1,minutes)}m`;
}

export function DailySuppliesSummary({state,nowMs,onOpen}:{state:GameState;nowMs:number;onOpen:()=>void}){
 const summary=dailySuppliesHomeSummary(state,nowMs);
 if(!summary.visible)return null;
 return <View style={[s.card,summary.canClaim&&s.ready]}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>DAILY SUPPLIES</Text><Text style={s.title}>{summary.canClaim?'Daily claim ready':summary.activeLabel??'Banked boosts ready'}</Text></View>{summary.canClaim?<Text style={s.readyText}>READY</Text>:summary.activeLabel?<Text style={s.activeText}>ACTIVE</Text>:null}</View>
  {summary.canClaim&&summary.claimLabel?<Text style={s.detail}>Today: {summary.claimLabel}</Text>:null}
  {summary.activeLabel?<Text style={s.detail}>{summary.activeLabel} · {duration(summary.activeRemainingSeconds??0)} qualifying time remaining</Text>:null}
  {summary.bankedCharges>0?<Text style={s.meta}>{summary.bankedCharges} banked boost charge{summary.bankedCharges===1?'':'s'} on {state.character?.name??'this character'}</Text>:null}
  <GameButton title={summary.canClaim?'Open & claim':'Manage Daily Supplies'} tone={summary.canClaim?'primary':'secondary'} onPress={onOpen}/>
 </View>;
}
const s=StyleSheet.create({card:{gap:7,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},ready:{borderLeftWidth:4,borderLeftColor:C.good},head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.bodyStrong,color:C.text},readyText:{...typography.caption,color:C.good,fontWeight:'900'},activeText:{...typography.caption,color:C.info,fontWeight:'900'},detail:{...typography.body,color:C.text},meta:{...typography.caption,color:C.muted}});
