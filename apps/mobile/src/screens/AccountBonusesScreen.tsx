import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {accountBonusOverview} from '../core/account-bonuses';
import {Panel} from '../components/Panel';
import {C,radii,spacing,typography} from '../theme/theme';

function duration(seconds:number){
 const s=Math.max(0,Math.floor(seconds)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
 return h?h+'h '+m+'m':m?m+'m':s+'s';
}
function pct(value:number){return value.toFixed(value>=10?0:2)+'%'}

export function AccountBonusesScreen({state}:{state:GameState}){
 const overview=accountBonusOverview(state);
 const permanentSources=overview.sources.filter(row=>row.scope!=='temporary');
 return <ScrollView contentContainerStyle={s.root}>
  <Text style={s.kicker}>ACCOUNT & CHARACTER</Text>
  <Text accessibilityRole="header" style={s.heading}>Bonuses</Text>
  <Text style={s.copy}>A single view of modifiers that are actually active in gameplay right now. Collection ownership is account-wide; selected Faith and permanent boost sources follow the active character.</Text>

  {overview.temporary?<Panel>
   <View style={s.headRow}><View style={s.flex}><Text style={s.section}>TEMPORARY BOOST</Text><Text style={s.title}>{overview.temporary.label}</Text></View><Text style={s.temporary}>+{pct(overview.temporary.percent)}</Text></View>
   <Text style={s.copy}>{duration(overview.temporary.remainingSeconds)} qualifying activity time remaining. The timer only consumes time from eligible activities.</Text>
  </Panel>:null}

  <Panel>
   <Text style={s.section}>EFFECTIVE PERMANENT MODIFIERS</Text>
   {overview.modifiers.length?overview.modifiers.map(row=><View key={row.id} style={s.row}><View style={s.flex}><Text style={s.name}>{row.label}</Text><Text style={s.meta}>{row.direction==='reduction'?'Less taken / consumed':'Effective increase'}</Text></View><Text style={row.direction==='reduction'?s.reduction:s.value}>{row.direction==='reduction'?'−':'+'}{pct(row.percent)}</Text></View>):<Text style={s.empty}>No permanent gameplay modifiers are active on this character yet.</Text>}
  </Panel>

  <Panel>
   <Text style={s.section}>ACTIVE SOURCES</Text>
   {permanentSources.length?permanentSources.map(row=><View key={row.id} style={s.source}><View style={s.flex}><Text style={s.name}>{row.label}</Text><Text style={s.copy}>{row.detail}</Text></View><View style={[s.scope,row.scope==='account'?s.accountScope:s.characterScope]}><Text style={s.scopeText}>{row.scope==='account'?'ACCOUNT':'CHARACTER'}</Text></View></View>):<Text style={s.empty}>No permanent source is contributing a bonus yet.</Text>}
  </Panel>

  <Panel>
   <Text style={s.section}>WHAT COUNTS HERE</Text>
   <Text style={s.copy}>This screen reflects the same runtime multiplier calculation used by combat, skilling, rewards and other supported systems. Locked collectibles and inactive entitlements are not counted. Collection caps are already applied before the totals are shown.</Text>
  </Panel>
 </ScrollView>;
}

const s=StyleSheet.create({
 root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},
 kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
 heading:{...typography.hero,color:C.text},
 copy:{...typography.body,color:C.muted,lineHeight:20},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},
 title:{...typography.title,color:C.text,marginTop:2},
 flex:{flex:1,minWidth:0},
 headRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
 temporary:{color:C.good,fontSize:24,fontWeight:'900'},
 row:{minHeight:52,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:C.line},
 name:{...typography.bodyStrong,color:C.text},
 meta:{...typography.caption,color:C.muted},
 value:{...typography.bodyStrong,color:C.good,fontSize:16},
 reduction:{...typography.bodyStrong,color:C.info,fontSize:16},
 source:{minHeight:58,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:C.line},
 scope:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderRadius:radii.sm},
 accountScope:{borderColor:C.accent,backgroundColor:C.panel2},
 characterScope:{borderColor:C.info,backgroundColor:C.panel2},
 scopeText:{fontSize:8,color:C.text,fontWeight:'900',letterSpacing:.5},
 empty:{...typography.body,color:C.muted,paddingVertical:12},
});
