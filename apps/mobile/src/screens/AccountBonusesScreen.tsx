import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {accountBonusOverview} from '../core/account-bonuses';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

function duration(seconds:number){
 const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
 if(hours)return minutes?hours+'h '+minutes+'m':hours+'h';
 return Math.max(1,minutes)+'m';
}
function pct(value:number){return (value>0?'+':'')+value.toFixed(2)+'%'}

export function AccountBonusesScreen({state,onDailySupplies,onCollections}:{state:GameState;onDailySupplies:()=>void;onCollections:()=>void}){
 const overview=accountBonusOverview(state);
 return <ScrollView contentContainerStyle={s.root}>
  <Text style={s.kicker}>ACCOUNT & CHARACTER MODIFIERS</Text>
  <Text accessibilityRole="header" style={s.heading}>Account Bonuses</Text>
  <Text style={s.copy}>A single view of bonuses the game is actually using. Account-wide collection passives are separated from selected/current-character effects, temporary Daily Supplies, and Offline Reserve.</Text>

  <Panel>
   <View style={s.between}><View style={s.flex}><Text style={s.title}>Account-wide collection passives</Text><Text style={s.copy}>Owned pets, profile backgrounds and borders contribute their passive family bonuses across the account.</Text></View><Text style={s.total}>{overview.ownedCounts.pets+overview.ownedCounts.backgrounds+overview.ownedCounts.borders}</Text></View>
   <View style={s.countRow}><CountCard label="Pets" value={overview.ownedCounts.pets}/><CountCard label="Backgrounds" value={overview.ownedCounts.backgrounds}/><CountCard label="Borders" value={overview.ownedCounts.borders}/></View>
   {overview.collectionRows.length?overview.collectionRows.map(row=><View key={row.target} style={s.bonusRow}><View style={s.flex}><Text style={s.bonusName}>{row.label}</Text><Text style={s.meta}>Passive {pct(row.passivePct)}{row.activePct?' · selected +'+row.activePct.toFixed(2)+'%':''}{row.suppressedPct?' · '+row.suppressedPct.toFixed(2)+'% capped':''}</Text></View><Text style={s.value}>{pct(row.totalPct)}</Text></View>):<Text style={s.empty}>No account-wide collectible bonuses are active yet.</Text>}
   <GameButton title="Open Collections" tone="secondary" onPress={onCollections}/>
  </Panel>

  <Panel>
   <Text style={s.title}>Current character effective modifiers</Text>
   <Text style={s.copy}>These values come directly from the same multiplier function used by combat and skilling. They already include applicable collection bonuses, selected Faith blessing, approved permanent skin bonuses and character-owned permanent boosts.</Text>
   {overview.effectiveRows.length?<View style={s.grid}>{overview.effectiveRows.map(row=><View key={row.id} style={s.effect}><Text style={s.effectLabel}>{row.label}</Text><Text style={[s.effectValue,row.deltaPct<0&&s.negative]}>{row.value}</Text></View>)}</View>:<Text style={s.empty}>No effective permanent modifiers above baseline on this character.</Text>}
  </Panel>

  <Panel>
   <Text style={s.title}>Current character bonus sources</Text>
   {overview.sourceRows.length?overview.sourceRows.map(row=><View key={row.id} style={s.source}><View style={s.sourceMark}/><View style={s.flex}><Text style={s.sourceName}>{row.label}</Text><Text style={s.meta}>{row.detail}</Text></View></View>):<Text style={s.empty}>No selected or character-specific permanent bonus sources are active.</Text>}
  </Panel>

  <Panel>
   <View style={s.between}><View style={s.flex}><Text style={s.title}>Temporary Daily Supplies</Text><Text style={s.copy}>Temporary +10% boosts are deliberately not included in the permanent modifier list above.</Text></View>{overview.dailySupply?<Text style={s.tempBadge}>ACTIVE</Text>:null}</View>
   {overview.dailySupply?<View style={s.temp}><Text style={s.tempName}>+{overview.dailySupply.bonusPct}% {overview.dailySupply.label}</Text><Text style={s.meta}>{duration(overview.dailySupply.remainingSeconds)} qualifying activity time remaining</Text></View>:<Text style={s.empty}>No Daily Supplies boost is active on this character.</Text>}
   <GameButton title="Manage Daily Supplies" tone="secondary" onPress={onDailySupplies}/>
  </Panel>

  <Panel>
   <View style={s.between}><View style={s.flex}><Text style={s.title}>Offline Reserve</Text><Text style={s.copy}>A separate time-cap system. Percentage boosts do not extend it.</Text></View><Text style={s.reserve}>{overview.offline.hours}h</Text></View>
   <View style={s.reserveTrack}><View style={[s.reserveFill,{width:(Math.max(2,overview.offline.hours/overview.offline.maxHours*100)+'%') as any}]}/></View>
   <Text style={s.meta}>Base {overview.offline.baseHours}h · Current {overview.offline.hours}h · Maximum {overview.offline.maxHours}h</Text>
   {overview.offline.sources.map(source=><View key={source.id} style={s.offlineRow}><Text style={source.earned?s.earned:s.locked}>{source.earned?'✓':'○'}</Text><Text style={[s.flex,source.earned?s.offlineName:s.offlineLocked]}>{source.name}</Text><Text style={source.earned?s.earned:s.locked}>{source.earned?'+2h':'—'}</Text></View>)}
  </Panel>

  <Text style={s.footnote}>Equipment stats, temporary encounter effects and other activity-specific calculations are intentionally not duplicated here. This screen summarizes persistent account/character modifiers plus the currently active Daily Supplies boost.</Text>
 </ScrollView>;
}

function CountCard({label,value}:{label:string;value:number}){return <View style={s.countCard}><Text style={s.countValue}>{value}</Text><Text style={s.countLabel}>{label}</Text></View>}

const s=StyleSheet.create({
 root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
 heading:{...typography.hero,color:C.text},
 title:{...typography.title,color:C.text},
 copy:{...typography.body,color:C.muted,lineHeight:20},
 meta:{...typography.caption,color:C.muted,lineHeight:16},
 between:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10},
 flex:{flex:1,minWidth:0},
 total:{color:C.accent,fontSize:26,fontWeight:'900'},
 countRow:{flexDirection:'row',gap:7,marginVertical:4},
 countCard:{flex:1,minHeight:58,alignItems:'center',justifyContent:'center',gap:2,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 countValue:{color:C.accent,fontSize:18,fontWeight:'900'},
 countLabel:{...typography.caption,color:C.muted},
 bonusRow:{minHeight:54,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,paddingVertical:7},
 bonusName:{...typography.bodyStrong,color:C.text},
 value:{color:C.good,fontSize:15,fontWeight:'900'},
 empty:{...typography.body,color:C.muted,paddingVertical:8},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:4},
 effect:{width:'48%',minWidth:140,minHeight:62,justifyContent:'center',padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 effectLabel:{...typography.caption,color:C.muted,fontWeight:'800'},
 effectValue:{color:C.good,fontSize:18,fontWeight:'900',marginTop:3},
 negative:{color:C.warning},
 source:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,paddingVertical:7},
 sourceMark:{width:7,height:7,borderRadius:4,backgroundColor:C.accent},
 sourceName:{...typography.bodyStrong,color:C.text},
 tempBadge:{...typography.caption,color:C.good,fontWeight:'900'},
 temp:{gap:3,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.good,backgroundColor:'#172b24',borderRadius:radii.sm},
 tempName:{...typography.bodyStrong,color:C.good},
 reserve:{color:C.accent,fontSize:25,fontWeight:'900'},
 reserveTrack:{height:8,overflow:'hidden',borderRadius:4,backgroundColor:C.bg,borderWidth:1,borderColor:C.line},
 reserveFill:{height:'100%',backgroundColor:C.accent},
 offlineRow:{minHeight:38,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line},
 offlineName:{...typography.caption,color:C.text},
 offlineLocked:{...typography.caption,color:C.muted},
 earned:{color:C.good,fontSize:11,fontWeight:'900'},
 locked:{color:C.muted,fontSize:11,fontWeight:'800'},
 footnote:{...typography.caption,color:C.muted,lineHeight:17,paddingHorizontal:4},
});
