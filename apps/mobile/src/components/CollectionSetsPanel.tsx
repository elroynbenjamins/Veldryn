import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {collectionSetViews,newCollectionSetState} from '../core/collection-sets-v45';
import {collectionOwnershipSnapshotFromGameState} from '../core/long-term-progression-runtime';
import {Panel} from './Panel';
import {C,radii,spacing,typography} from '../theme/theme';

export function CollectionSetsPanel({state}:{state:GameState}){
 const accountId=state.account.collectionSetState?.accountId??state.account.journalState?.accountId??('account:'+state.createdAtMs);
 const sets=state.account.collectionSetState??newCollectionSetState(accountId);
 const rows=collectionSetViews(sets,collectionOwnershipSnapshotFromGameState(state));
 if(!rows.length)return null;
 return <Panel><View style={s.heading}><View style={s.flex}><Text style={s.title}>Collection Sets</Text><Text style={s.sub}>Set completion reads your existing ownership. It does not create a second inventory.</Text></View><Text style={s.count}>{rows.filter(row=>row.complete).length}/{rows.length}</Text></View>{rows.map(row=><View key={row.definition.id} style={[s.card,row.complete&&s.completed]}><View style={s.between}><Text style={s.name}>{row.definition.name}</Text><Text style={row.complete?s.done:s.progress}>{row.owned}/{row.total}</Text></View><Text style={s.sub}>{row.definition.description}</Text><View style={s.track}><View style={[s.fill,{width:((row.total?row.owned/row.total:1)*100+'%') as any}]}/></View><View style={s.members}>{row.members.map(member=><View key={member.key} style={[s.member,member.owned&&s.memberOwned]}><Text numberOfLines={1} style={s.memberText}>{member.owned?'✓ ':'○ '}{member.label}</Text></View>)}</View><Text style={s.reward}>{row.complete?'Completed · ':''}Reward: {row.definition.reward.label}</Text></View>)}</Panel>;
}
const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1},title:{...typography.title,color:C.text},sub:{...typography.caption,color:C.muted,lineHeight:17},count:{color:C.accent,fontWeight:'900'},card:{paddingVertical:10,borderTopWidth:1,borderTopColor:C.line,gap:5},completed:{opacity:1},between:{flexDirection:'row',justifyContent:'space-between',gap:8},name:{color:C.text,fontWeight:'900'},done:{color:C.good,fontWeight:'900'},progress:{color:C.info,fontWeight:'900'},track:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},fill:{height:'100%',backgroundColor:C.good},members:{flexDirection:'row',flexWrap:'wrap',gap:5},member:{maxWidth:'48%',paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},memberOwned:{borderColor:C.good},memberText:{color:C.muted,fontSize:10},reward:{color:C.accent,fontSize:11,fontWeight:'800'}});