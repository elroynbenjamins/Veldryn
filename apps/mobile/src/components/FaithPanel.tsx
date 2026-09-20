import {useMemo} from 'react';
import React,{useState} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {FAITH_TIERS,FAITH_BLESSINGS} from '../content/faith';
import {faithLevel,normalizeFaith} from '../core/faith';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {C,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
export function FaithPanel({state,onCommand}:{state:GameState;onCommand:(c:GameCommand)=>Promise<void>}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);
 const [count,setCount]=useState(1);const c=state.character;if(!c)return null;const faith=normalizeFaith(c.faith),level=faithLevel(state);
 return <Panel><Text style={s.title}>Faith</Text><Text style={s.body}>Level {level}/100 · Holy Water is consumed only when a practice completes.</Text>
 {FAITH_TIERS.filter(t=>t.level<=level).map(t=><View key={t.id} style={s.row}><Text style={s.body}>{t.name} · {t.water} water · {t.xp} Faith XP</Text><GameButton title={`Practice ${count}`} onPress={()=>void onCommand({type:'faith_practice',args:{tierId:t.id,count}})} disabled={!!faith.practice}/></View>)}
 <Text style={s.body}>Active blessing</Text>{FAITH_BLESSINGS.filter(b=>b.level<=level).map(b=><GameButton key={b.id} title={`${faith.selectedBlessingId===b.id?'✓ ':''}${b.name} · +${Math.round(b.bonus*100)}% ${b.family}`} onPress={()=>void onCommand({type:'faith_blessing',args:{id:b.id}})} />)}
 {faith.practice?<Text style={s.body}>Practice in progress · {faith.practice.remaining} remaining</Text>:null}
 </Panel>;
}
const createStyles=(C:any,equipmentColors:any)=>StyleSheet.create({title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},row:{gap:4,paddingVertical:6}});
