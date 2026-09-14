import React from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {EXPLORATION_ROUTES} from '../content/exploration';
import {WORLD_ZONES} from '../content/world-map';
import {currentRegionId} from '../core/combat-region';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {C,typography} from '../theme/theme';
export function ExplorationPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){const c=state.character;if(!c)return null;const regionId=currentRegionId(state);return <Panel><Text style={s.title}>Exploration</Text><Text style={s.body}>Scout a region to earn Exploration XP and reveal its next encounter.</Text>{EXPLORATION_ROUTES.map(route=>{const zone=WORLD_ZONES.find(item=>item.id===route.zoneId);const ready=c.level>=route.requiredLevel&&regionId===route.zoneId;const found=!!route.unlockMonsterId&&state.unlockedMonsterIds.includes(route.unlockMonsterId);return <View key={route.id} style={s.row}><Text style={s.body}>{zone?.name??route.zoneId} · {route.name} · {route.seconds}s · {route.xp} XP{found?' · discovered':''}</Text><GameButton compact title={found?'Scout again':'Scout'} disabled={!ready} onPress={()=>void onCommand({type:'explore',args:{id:route.id}})}/></View>})}</Panel>}
const s=StyleSheet.create({title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},row:{gap:4,paddingVertical:4}});
