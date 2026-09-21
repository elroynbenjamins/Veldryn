import {useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {SUNSCAR_REGIONAL_ENCOUNTERS_V1,runRegionalCombatV1,type RegionalCombatResultV1} from '../online/regional-combat';
import {itemDef} from '../content/items';

function rewardText(result:RegionalCombatResultV1){
 const reward=result.reward;if(!result.result.victory)return result.result.reason==='timeout'?'The encounter timed out. Improve your loadout and try again.':'Your character was defeated. Improve gear, Gems or class progression and retry.';
 if(!reward?.eligible)return 'Victory recorded. No Gem reward was rolled on this clear.';
 const parts:string[]=[];
 if(reward.gemItemId){let name=reward.gemItemId;try{name=itemDef(reward.gemItemId).name}catch{}parts.push((reward.pityTriggered?'Pity guaranteed · ':'')+name);}
 if(reward.recipeUnlockedId)parts.push('New Effect Gem recipe discovered');
 if(reward.duplicateRecipeDust)parts.push('Duplicate recipe · +'+reward.duplicateRecipeDust+' Gem Dust');
 if(reward.regionalCatalysts)parts.push('+'+reward.regionalCatalysts+' Regional Catalyst');
 return parts.length?parts.join(' · '):'Victory recorded. Gem pity progress updated.';
}

export function RegionalCombatPanel({state,onRewardsChanged}:{state:GameState;onRewardsChanged?:()=>Promise<void>|void}){
 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>styles(C),[C]);
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[last,setLast]=useState<{encounterId:string;result:RegionalCombatResultV1}|null>(null);
 const level=state.character?.level??0;
 const run=async(encounterId:string)=>{
  if(!state.character||busy)return;setBusy(encounterId);setNotice('');
  try{
   const result=await runRegionalCombatV1(state.character.id,encounterId);setLast({encounterId,result});setNotice(rewardText(result));
   await onRewardsChanged?.();
  }catch(error){setNotice(error instanceof Error?error.message:'Regional encounter failed. Please retry.');}
  finally{setBusy('');}
 };
 return <Panel accentSurface={E.panel}>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>SERVER-VERIFIED · SUNSCAR</Text><Text style={s.title}>Regional Encounters</Text></View><Text style={s.level}>LV {level}</Text></View>
  <Text style={s.copy}>These are active combat encounters, not idle hunts. Your current equipment, companion and Effect Gems are frozen server-side when the fight starts.</Text>
  <View style={s.list}>{SUNSCAR_REGIONAL_ENCOUNTERS_V1.map(encounter=>{
   const locked=level<encounter.level,active=busy===encounter.id,recent=last?.encounterId===encounter.id;
   return <View key={encounter.id} style={[s.card,recent&&s.recent]}>
    <View style={s.row}><View style={s.flex}><Text style={s.kind}>{encounter.kind==='regional_boss'?'REGIONAL BOSS':encounter.kind.toUpperCase()} · ZONE {encounter.zoneId.slice(-3)}</Text><Text style={s.name}>{encounter.name}</Text></View><Text style={locked?s.locked:s.ready}>{locked?'LV '+encounter.level:'READY'}</Text></View>
    <Text style={s.description}>{encounter.summary}</Text>
    {recent&&last?<Text style={last.result.result.victory?s.victory:s.defeat}>{last.result.result.victory?'VICTORY':'DEFEAT'} · {Math.max(1,Math.round(last.result.result.durationMs/1000))}s · {Math.round(last.result.result.damageDone).toLocaleString()} damage</Text>:null}
    <GameButton compact disabled={locked||Boolean(busy)} loading={active} title={active?'Resolving…':encounter.kind==='regional_boss'?'Challenge boss':'Challenge'} tone={encounter.kind==='regional_boss'?'primary':'secondary'} onPress={()=>void run(encounter.id)}/>
   </View>;
  })}</View>
  {!!notice&&<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{notice}</Text></View>}
  <Text style={s.foot}>Gem rolls, pity, recipes and catalysts are settled by the server after a verified victory. Failed fights do not advance Gem pity.</Text>
 </Panel>;
}
function styles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm},eyebrow:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},level:{...typography.caption,color:C.info,fontWeight:'900'},copy:{...typography.body,color:C.muted,marginTop:4},list:{gap:7,marginTop:8},card:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},recent:{borderColor:C.info},kind:{fontSize:9,lineHeight:12,color:E.goldSoft,fontWeight:'900',letterSpacing:.65},name:{...typography.bodyStrong,color:C.text,fontWeight:'900'},description:{...typography.caption,color:C.muted,lineHeight:16},locked:{...typography.caption,color:C.muted,fontWeight:'900'},ready:{...typography.caption,color:C.good,fontWeight:'900'},victory:{...typography.caption,color:C.good,fontWeight:'900'},defeat:{...typography.caption,color:C.warning,fontWeight:'900'},notice:{padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,borderRadius:radii.sm,marginTop:8},noticeText:{...typography.body,color:C.text},foot:{...typography.caption,color:C.muted,lineHeight:15,marginTop:7}
 });}
