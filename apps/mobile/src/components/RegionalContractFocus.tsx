import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {contractBoardRegionFocus} from '../core/contract-board-summary';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

export function RegionalContractFocus({state,regionId,onOpenOrder,onOpenBoard}:{state:GameState;regionId:string;onOpenOrder?:(order:WeeklyOrder)=>void;onOpenBoard?:(order?:WeeklyOrder)=>void}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),focus=contractBoardRegionFocus(state,regionId),order=focus.nextOrder;
 if(!focus.total)return null;
 const remaining=order?Math.max(0,order.target-order.progress):0;
 const direct=order&&order.kind!=='regional'&&!!onOpenOrder;
 return <View style={s.card}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{t("REGIONAL CONTRACTS ·")} {focus.complete}/{focus.total}</Text><Text numberOfLines={1} style={s.title}>{order?.title??t("All local weekly jobs complete")}</Text></View>{order?<Text style={s.progress}>{remaining}  {t("LEFT")}</Text>:<Text style={s.done}>{t("DONE")}</Text>}</View>
  <Text numberOfLines={2} style={s.detail}>{order?(order.brief??order.source.label)+' · '+order.reward.label:t("This region has no unfinished Contract Board work this week.")}</Text>
  {order?<View style={s.actions}><View style={s.primary}><GameButton compact title={order.kind==='regional'?t("View regional problem"):t("Continue contract")} disabled={order.kind==='regional'?!onOpenBoard:!onOpenOrder} onPress={()=>order.kind==='regional'?onOpenBoard?.(order):onOpenOrder?.(order)}/></View>{direct&&onOpenBoard?<View style={s.secondary}><GameButton compact title={t("Board")} tone="secondary" onPress={onOpenBoard}/></View>:null}</View>:onOpenBoard?<GameButton compact title={t("Open Contract Board")} tone="secondary" onPress={onOpenBoard}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 card:{gap:5,padding:spacing.sm,borderWidth:1,borderLeftWidth:3,borderColor:C.line,borderLeftColor:C.info,borderRadius:8,backgroundColor:C.infoSurface},
 head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{fontSize:8.5,color:C.info,fontWeight:'900',letterSpacing:.65},title:{...typography.bodyStrong,color:C.text},progress:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.5},done:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.5},
 detail:{...typography.caption,color:C.muted,lineHeight:16},actions:{flexDirection:'row',alignItems:'stretch',gap:6},primary:{flex:1,minWidth:0},secondary:{width:82},
});}
