import {useMemo,type ReactNode} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {CompactPlayerIdentity,type CompactIdentityStatusTone} from './CompactPlayerIdentity';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function SocialInvitationCard({
 name,accountId,guildTag,guild=false,status,statusTone='info',detail,expiry,warning,actions,
}:{
 name:string;accountId?:string;guildTag?:string|null;guild?:boolean;status:string;statusTone?:CompactIdentityStatusTone;detail:string;expiry?:string;warning?:string;actions?:ReactNode;
}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.card}>
  <CompactPlayerIdentity name={name} accountId={accountId} guildTag={guildTag} guild={guild} avatarSize={40} status={status} statusTone={statusTone}/>
  <View style={s.detailRow}><Text numberOfLines={2} style={s.detail}>{detail}</Text>{expiry?<Text style={s.expiry}>{expiry}</Text>:null}</View>
  {warning?<View style={s.warning}><Text style={s.warningText}>{warning}</Text></View>:null}
  {actions?<View style={s.actions}>{actions}</View>:null}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 card:{gap:8,paddingVertical:10,borderTopWidth:1,borderTopColor:C.line},
 detailRow:{flexDirection:'row',alignItems:'flex-start',gap:8,paddingLeft:48},
 detail:{flex:1,minWidth:0,fontSize:12,lineHeight:17,color:C.muted},
 expiry:{fontSize:11,lineHeight:15,color:C.muted,fontWeight:'800'},
 warning:{marginLeft:48,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,backgroundColor:C.warningSurface},
 warningText:{fontSize:11,lineHeight:15,color:C.warning,fontWeight:'800'},
 actions:{marginLeft:48,flexDirection:'row',flexWrap:'wrap',gap:6},
});}
