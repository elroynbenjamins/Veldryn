import {StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {MAX_RECENT_RARE_DISCOVERIES} from '../core/rare-idle-discoveries-v46';
import {C,spacing,typography} from '../theme/theme';

export function RareDiscoveriesPanel({state}:{state:GameState}){
 const rows=(state.account.rareDiscoveryState?.recentFinds??[]).slice().sort((a,b)=>b.foundAtMs-a.foundAtMs).slice(0,12);
 return <Panel>
  <View style={s.header}><View style={s.flex}><Text style={s.eyebrow}>RARE DISCOVERIES</Text><Text style={s.title}>Recent Finds</Text></View><Text style={s.count}>{state.account.rareDiscoveryState?.recentFinds.length??0}/{MAX_RECENT_RARE_DISCOVERIES}</Text></View>
  <Text style={s.copy}>Special idle/offline finds appear here when an authored discovery pool is enabled. Normal drops remain in the normal loot system.</Text>
  {rows.length?rows.map(row=><View key={row.findId} style={s.row}><View style={s.mark}><Text style={s.markText}>◇</Text></View><View style={s.flex}><Text style={s.name}>{row.discoveryName}</Text><Text style={s.meta}>{row.rarity.toUpperCase()} · {row.reward.label}{row.firstTime?' · NEW':''}</Text><Text style={s.date}>{new Date(row.foundAtMs).toLocaleString()}</Text></View></View>):<Text style={s.empty}>No rare discoveries yet. Discovery pools remain disabled until their canonical reward IDs are authored.</Text>}
 </Panel>;
}
const s=StyleSheet.create({header:{flexDirection:'row',gap:spacing.sm,alignItems:'center'},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},count:{color:C.muted,fontSize:11,fontWeight:'900'},copy:{...typography.caption,color:C.muted,lineHeight:18,marginTop:4},row:{flexDirection:'row',gap:8,alignItems:'center',paddingVertical:8,borderTopWidth:1,borderTopColor:C.line},mark:{width:38,height:38,borderRadius:19,borderWidth:1,borderColor:'#8961a5',backgroundColor:'#211729',alignItems:'center',justifyContent:'center'},markText:{color:'#d4a9ef',fontSize:20,fontWeight:'900'},name:{color:C.text,fontWeight:'900'},meta:{color:'#cba0f5',fontSize:10,fontWeight:'800'},date:{color:C.muted,fontSize:9,marginTop:2},empty:{...typography.body,color:C.muted,paddingVertical:8}});
