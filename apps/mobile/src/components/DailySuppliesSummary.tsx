import {accountText,accountDuration} from '../i18n/account';
import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {dailySuppliesHomeSummary} from '../core/daily-supplies-home';
import {GameButton} from './GameButton';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function duration(seconds:number){
 const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
 return hours?(minutes?`${hours}h ${minutes}m`:`${hours}h`):`${Math.max(1,minutes)}m`;
}

export function DailySuppliesSummary({state,nowMs,onOpen}:{state:GameState;nowMs:number;onOpen:()=>void}){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const summary=dailySuppliesHomeSummary(state,nowMs);
 if(!summary.visible)return null;
 return <View style={[s.card,summary.canClaim&&s.ready]}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{a("DAILY SUPPLIES")}</Text><Text style={s.title}>{summary.canClaim?a("Daily claim ready"):(summary.activeLabel?a(summary.activeLabel):a('Banked boosts ready'))}</Text></View>{summary.canClaim?<Text style={s.readyText}>{a("READY")}</Text>:summary.activeLabel?<Text style={s.activeText}>{a("ACTIVE")}</Text>:null}</View>
  {summary.canClaim&&summary.claimLabel?<Text style={s.detail}>{a('Today: {reward}',{reward:a(summary.claimLabel)})}</Text>:null}
  {summary.activeLabel?<Text style={s.detail}>{a(summary.activeLabel)} · {a('{time} qualifying time remaining',{time:accountDuration(language,summary.activeRemainingSeconds??0)})}</Text>:null}
  {summary.bankedCharges>0?<Text style={s.meta}>{a('{count} banked boost charges on {name}',{count:summary.bankedCharges,name:state.character?.name??a('this character')})}</Text>:null}
  <GameButton compact title={summary.canClaim?a("Open & claim"):a("Manage Daily Supplies")} tone={summary.canClaim?'primary':'secondary'} onPress={onOpen}/>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({card:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},ready:{borderLeftWidth:4,borderLeftColor:C.good},head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.bodyStrong,color:C.text},readyText:{...typography.caption,color:C.good,fontWeight:'900'},activeText:{...typography.caption,color:C.info,fontWeight:'900'},detail:{...typography.body,color:C.text},meta:{...typography.caption,color:C.muted}});}
