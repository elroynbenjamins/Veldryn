import {useMemo} from 'react';
import {Text} from 'react-native';
import {useGuildFlowUiText} from '../i18n/guild-flow-ui';
import {guildMemberActivityStatus} from '../core/guild-member-last-active';
import {useGameTheme} from '../theme/ThemeContext';

/** A single extra roster line; never claims that a player is currently online. */
export function GuildMemberActivityLabel({lastActiveAt}:{lastActiveAt?:string|null}){
 const C=useGameTheme(),translate=useGuildFlowUiText();
 const state=useMemo(()=>guildMemberActivityStatus(lastActiveAt),[lastActiveAt]);
 return <Text accessibilityRole="text" style={{fontSize:11,lineHeight:16,marginTop:1,marginLeft:46,color:state.recent?C.good:C.muted}}>
  {translate(state.key,state.count===undefined?{}:{count:state.count})}
 </Text>;
}
