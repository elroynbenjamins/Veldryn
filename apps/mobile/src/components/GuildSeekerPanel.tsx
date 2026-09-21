import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GuildCrest} from './SocialIdentity';
import {RecruitmentListing} from './RecruitmentListing';
import type {RecruitmentCardView} from '../core/party-social';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildSeekerPanel({seekers,nowMs,onOpen,onPostMyAd}:{seekers:RecruitmentCardView[];nowMs:number;onOpen?:(id:string)=>void;onPostMyAd?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const visible=seekers.filter(item=>item.postType==='looking_for_guild'&&item.expiresAtMs>nowMs&&(!item.status||item.status==='active'));
 return <View style={s.content}>
  <View style={s.header}><GuildCrest size={40}/><View style={s.copy}><Text accessibilityRole="header" style={s.title}>Guild seekers</Text><Text style={s.sub}>{visible.length?visible.length+' active seeker'+(visible.length===1?'':'s'):'Players looking for their next Guild.'}</Text></View>{onPostMyAd?<View style={s.action}><GameButton compact title="Post mine" tone="secondary" onPress={onPostMyAd}/></View>:null}</View>
  {visible.map(card=><RecruitmentListing key={card.id} card={card} nowMs={nowMs} onPress={()=>onOpen?.(card.id)}/>)}
  {!visible.length?<View style={s.emptyCard}><Text style={s.emptyTitle}>No fresh Guild seekers</Text><Text style={s.empty}>Adjust filters or post your own Guild-seeker advert. Expired posts disappear automatically.</Text></View>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 content:{gap:spacing.sm},
 header:{minHeight:54,flexDirection:'row',gap:9,alignItems:'center'},
 copy:{flex:1,minWidth:0},title:{...typography.title,color:C.text},sub:{fontSize:10,lineHeight:14,color:C.muted},
 action:{width:96},
 emptyCard:{minHeight:72,alignItems:'center',justifyContent:'center',gap:3,padding:10,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 emptyTitle:{...typography.bodyStrong,color:C.text},empty:{fontSize:9,lineHeight:13,color:C.muted,textAlign:'center'},
});}
