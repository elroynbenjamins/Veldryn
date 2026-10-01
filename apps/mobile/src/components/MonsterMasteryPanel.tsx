import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionMessage,companionTranslator,companionLabel,companionError} from '../i18n/companions';
import React,{useState} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {monsterMasteryGuidance,masterySummary,MONSTER_MASTERY_MILESTONES} from '../core/monster-mastery-presentation';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {StatBar} from './StatBar';
import {ItemArtwork} from './ItemArtwork';
import {v33EquipmentMaterialLabel} from '../core/equipment-loot-v33';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

export function MonsterMasteryPanel({state}:{state:GameState}){
 const language=useGameLanguage(),t=companionTranslator(language),label=(value:string)=>companionLabel(language,value);

 const [open,setOpen]=useState(false);
 const available=MONSTERS.filter(m=>!m.boss&&(state.unlockedMonsterIds.includes(m.id)||(state.character?.monsterMasteryPoints?.[m.id]??0)>0));
 const summary=masterySummary(state,available.map(monster=>monster.id));
 return <Panel>
  <Text style={s.title}>{t("Monster mastery")}</Text>
  <Text style={s.body}>{t("Each kill gives one species mastery point. Mastery improves combat bonuses, drop knowledge and badges.")}</Text>
  <View style={s.summary}><Summary label={t("TRACKED")} value={summary.species}/><Summary label={t("RANKS")} value={summary.totalRanks}/><Summary label={t("RANK 10+")} value={summary.rank10}/><Summary label={t("MASTERED")} value={summary.masteredSpecies}/></View>
  <GameButton title={open ? t("Hide mastery") : t("View species mastery")} onPress={()=>setOpen(!open)}/>
  {open&&<><View style={s.ladder}><Text style={s.ladderTitle}>{t("MASTERY LADDER")}</Text>{MONSTER_MASTERY_MILESTONES.map(row=><Text key={row.rank+row.label} style={s.ladderRow}>{t("Rank {value0} · {value1}", {value0: row.rank, value1: companionContent(language,row.label)})}</Text>)}</View>
   {available.map(m=>{const p=monsterMasteryGuidance(state,m.id),rankProgress=p.rank>=30?25:p.points%25;return <View key={m.id} style={s.entry}>
    <View style={s.head}><View style={s.flex}><Text style={s.name}>{p.badgeUnlocked ? '◆ ' : ''}{m.name}</Text><Text style={s.rank}>{t("Rank {value0}/30 · {value1} mastery points", {value0: p.rank, value1: p.points})}</Text></View>{p.rank>=30?<Text style={s.max}>{t("MAX")}</Text>:null}</View>
    <StatBar reduceMotion={state.settings.reduceMotion} label={p.rank>=30 ? t("Mastery complete") : t("{value0} kills to Rank {value1}", {value0: p.killsToNextRank, value1: p.rank+1})} current={rankProgress} max={25}/>
    <Text style={s.body}>{t("+{value0}% damage · +{value1}% normal materials", {value0: Math.round(p.damageBonus*100), value1: Math.round(p.materialBonus*100)})}</Text>
    {p.next?<View style={s.next}><Text style={s.nextLabel}>{t("NEXT MILESTONE · RANK {value0}", {value0: p.next.rank})}</Text><Text style={s.nextTitle}>{companionContent(language,p.next.label)}</Text><Text style={s.body}>{companionContent(language,p.next.detail)}</Text><Text style={s.nextKills}>{t("{value0} kills remaining", {value0: p.killsToNextMilestone})}</Text></View>:<Text style={s.complete}>{t("All species mastery milestones unlocked.")}</Text>}
    {p.dropKnowledge?<><Text style={s.dropTitle}>{t("KNOWN DROPS")}</Text><View style={s.dropList}>{m.drops.map(d=>{const item=itemDef(d.itemId),gearMaterial=v33EquipmentMaterialLabel(d.itemId);return <View key={d.itemId} style={s.dropRow}><ItemArtwork itemId={d.itemId} size={34}/><View style={s.flex}><Text style={s.dropName}>{item.name}</Text><Text style={s.dropMeta}>{(d.chance*100).toFixed(2)}% · {d.min}–{d.max}{gearMaterial ? ' · '+label(gearMaterial) : ''}</Text></View></View>})}</View></>:<Text style={s.locked}>{t("Reach Rank 10 to reveal the full base drop table.")}</Text>}
   </View>})}
  </>}
 </Panel>;
}
function Summary({label,value}:{label:string;value:number}){return <View style={s.summaryCell}><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text></View>}
const s=StyleSheet.create({
 title:{...typography.title,color:C.text},name:{...typography.bodyStrong,color:C.text,fontSize:15},rank:{...typography.caption,color:C.muted},body:{...typography.body,color:C.muted,lineHeight:19},
 entry:{gap:8,paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line},head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},max:{...typography.caption,color:C.good,fontWeight:'900'},conquered:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.6},
 summary:{flexDirection:'row',gap:6,flexWrap:'wrap'},summaryCell:{minWidth:68,flexGrow:1,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},summaryLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},summaryValue:{fontSize:16,color:C.text,fontWeight:'900'},
 ladder:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},ladderTitle:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.8},ladderRow:{...typography.caption,color:C.muted},
 challengeRow:{flexDirection:'row',flexWrap:'wrap',gap:5},challenge:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderRadius:99},challengeCleared:{borderColor:equipmentColors.goldSoft,backgroundColor:'#2b2417'},challengeOn:{borderColor:C.info,backgroundColor:'#132333'},challengeOff:{borderColor:C.line,backgroundColor:C.bg},challengeText:{fontSize:9,fontWeight:'900'},challengeTextCleared:{color:equipmentColors.goldSoft},challengeTextOn:{color:C.info},challengeTextOff:{color:C.muted},
 next:{gap:3,padding:9,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel2,borderRadius:6},nextLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.5},nextTitle:{...typography.bodyStrong,color:C.text},nextKills:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
 complete:{...typography.bodyStrong,color:C.good},dropTitle:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},dropList:{gap:5},dropRow:{minHeight:42,flexDirection:'row',alignItems:'center',gap:8,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},dropName:{...typography.caption,color:C.text,fontWeight:'800'},dropMeta:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'700'},locked:{...typography.caption,color:C.muted},
});
