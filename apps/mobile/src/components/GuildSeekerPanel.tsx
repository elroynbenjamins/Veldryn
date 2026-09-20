import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GuildCrest} from './SocialIdentity';
import {RecruitmentListing} from './RecruitmentListing';
import type {RecruitmentCardView} from '../core/party-social';
import {C,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
export function GuildSeekerPanel({seekers,nowMs,onOpen,onPostMyAd}:{seekers:RecruitmentCardView[];nowMs:number;onOpen?:(id:string)=>void;onPostMyAd?:()=>void}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);
 const visible=seekers.filter(item=>item.postType==='looking_for_guild'&&item.expiresAtMs>nowMs&&(!item.status||item.status==='active'));
 return <View style={s.content}><View style={s.header}><GuildCrest/><View style={s.copy}><Text accessibilityRole="header" style={s.title}>Guild seekers</Text><Text style={s.sub}>Find players looking for their next guild.</Text></View></View>
  {onPostMyAd&&<GameButton title="Post my guild-seeker advert" tone="secondary" onPress={onPostMyAd}/>}
  {visible.map(card=><RecruitmentListing key={card.id} card={card} nowMs={nowMs} onPress={()=>onOpen?.(card.id)}/>)}
  {!visible.length&&<Text style={s.empty}>No fresh guild-seeker adverts match this search.</Text>}
 </View>;
}
const createStyles=(C:any,equipmentColors:any)=>StyleSheet.create({content:{gap:12},header:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:12},copy:{flex:1,minWidth:0},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},empty:{...typography.body,color:C.muted,padding:16,textAlign:'center'}});
