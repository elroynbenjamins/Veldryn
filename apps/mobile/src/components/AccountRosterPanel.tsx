import React from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {accountCharacters,accountSkillLevel,unlockedCharacterSlots} from '../core/account-roster';
import type {GameCommand} from '../core/game-commands';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {C,equipmentColors,spacing,typography} from '../theme/theme';
import {Language,t} from '../i18n';
export function AccountRosterPanel({state,language,onCommand,onCreate}:{state:GameState;language:Language;onCommand:(command:GameCommand)=>Promise<void>;onCreate:()=>void}){const entries=accountCharacters(state),slots=unlockedCharacterSlots(state);return <Panel><Text style={s.title}>{t(language,'roster.title')}</Text><Text style={s.body}>{t(language,'roster.skillsSlots')} {accountSkillLevel(state)} · slots {entries.length}/{slots}</Text>{entries.map(entry=>{const active=entry.character.id===state.character?.id;return <View key={entry.character.id} style={s.row}><View style={s.copy}><Text style={s.body}>{entry.character.name} · {entry.character.classId}</Text>{active&&<View style={s.activeBadge}><Text style={s.active}>{t(language,'roster.active')}</Text></View>}</View>{!active&&<GameButton compact title={t(language,'roster.switch')} onPress={()=>void onCommand({type:'roster_switch',args:{id:entry.character.id}})}/>}</View>})}{entries.length<slots&&<GameButton title={t(language,'roster.create')} tone="secondary" onPress={onCreate}/>}</Panel>}
const s=StyleSheet.create({title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},copy:{flex:1,minWidth:0,gap:4},activeBadge:{alignSelf:'flex-start',paddingHorizontal:spacing.xs,paddingVertical:2,borderWidth:1,borderColor:equipmentColors.goldSoft,borderRadius:99,backgroundColor:'#27241b'},active:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:C.line}});
