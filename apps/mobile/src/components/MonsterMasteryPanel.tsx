import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionTranslator,companionLabel} from '../i18n/companions';
import {formatLocalizedNumber} from '../i18n/translator';
import type {GameState} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {monsterMasteryGuidance,masterySummary,MONSTER_MASTERY_MILESTONES} from '../core/monster-mastery-presentation';
import {monsterMasteryCombatBonuses,monsterMasteryKillsForRank,MONSTER_MASTERY_MAX_KILLS} from '../core/monster-mastery';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {StatBar} from './StatBar';
import {ItemArtwork} from './ItemArtwork';
import {v33EquipmentMaterialLabel} from '../core/equipment-loot-v33';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

/** Collapsible per-species presentation: a long bestiary no longer floods the
 * Combat screen, and progress comes from the same nonlinear rank thresholds
 * used by actual combat rewards and companion unlock requirements.
 */
export function MonsterMasteryPanel({state}:{state:GameState}){
 const language=useGameLanguage(),t=companionTranslator(language);
 const localized=(value:string)=>companionContent(language,value),label=(value:string)=>companionLabel(language,value);
 const num=(value:number)=>formatLocalizedNumber(language,value);
 const percent=(value:number)=>formatLocalizedNumber(language,value*100,{minimumFractionDigits:0,maximumFractionDigits:2});
 const [open,setOpen]=useState(false),[expandedSpeciesId,setExpandedSpeciesId]=useState<string|undefined>();
 const available=MONSTERS.filter(m=>!m.boss&&(state.unlockedMonsterIds.includes(m.id)||(state.character?.monsterMasteryPoints?.[m.id]??0)>0));
 const summary=masterySummary(state,available.map(monster=>monster.id));
 return <Panel>
  <Text style={styles.title}>{t("Monster mastery")}</Text>
  <Text style={styles.body}>{t("Each kill gives one species mastery point. Mastery improves combat bonuses, drop knowledge and badges.")}</Text>
  <View style={styles.summary}>
   <Summary label={t("TRACKED")} value={summary.species}/>
   <Summary label={t("RANKS")} value={summary.totalRanks}/>
   <Summary label={t("RANK 10+")} value={summary.rank10}/>
   <Summary label={t("MASTERED")} value={summary.masteredSpecies}/>
  </View>
  <GameButton title={open?t("Hide mastery"):t("View species mastery")} onPress={()=>setOpen(value=>!value)}/>
  {open&&<>
   <View style={styles.ladder}>
    <Text style={styles.ladderTitle}>{t("MASTERY LADDER")} · {num(MONSTER_MASTERY_MAX_KILLS)} {localized('kills to Rank 30')}</Text>
    <Text style={styles.body}>{localized('Rank costs grow gradually. Damage increases after Rank 5 and material yield after Rank 15.')}</Text>
    <View style={styles.milestones}>{MONSTER_MASTERY_MILESTONES.map(row=>
     <View key={row.rank+row.label} style={styles.milestoneChip}>
      <Text style={styles.milestoneRank}>{localized('RANK')} {row.rank}</Text>
      <Text style={styles.milestoneKills}>{num(monsterMasteryKillsForRank(row.rank))} {localized('kills')}</Text>
     </View>
    )}</View>
   </View>
   {available.map(monster=>{
    const p=monsterMasteryGuidance(state,monster.id);
    const {family,familyId}=monsterMasteryCombatBonuses(state,monster.id);
    const familyKnowledge=family?.dropKnowledge??false;
    const expanded=expandedSpeciesId===monster.id;
    return <View key={monster.id} style={styles.entry}>
     <Pressable accessibilityRole="button" accessibilityLabel={monster.name+' '+localized('mastery details')}
      accessibilityState={{expanded}} hitSlop={4}
      onPress={()=>setExpandedSpeciesId(id=>id===monster.id?undefined:monster.id)}
      style={styles.head}>
      <View style={styles.flex}>
       <Text style={styles.name}>{p.badgeUnlocked?'◆ ':''}{localized(monster.name)} · {localized('Rank')} {p.rank}/30</Text>
       <Text style={styles.rank}>{num(p.points)} / {num(MONSTER_MASTERY_MAX_KILLS)} {localized('kills')}</Text>
      </View>
      <Text style={p.rank===30?styles.max:styles.chevron}>{p.rank===30?t('MAX'):expanded?'⌃':'⌄'}</Text>
     </Pressable>
     <StatBar reduceMotion={state.settings.reduceMotion}
      label={p.rank>=30?t("Mastery complete"):t("{value0} kills to Rank {value1}",{value0:p.killsToNextRank,value1:p.rank+1})}
      current={p.rank>=30?p.currentRankTarget:p.currentRankProgress}
      max={p.currentRankTarget}/>
     <View style={styles.bonusRow}>
      <Text style={styles.bonus}>+{percent(p.damageBonus)}% {localized('damage')}</Text>
      <Text style={styles.bonus}>+{percent(p.materialBonus)}% {localized('normal materials')}</Text>
     </View>
     {expanded&&<>
      {family&&<Text style={styles.familyStack}>{localized('Enemy type')} {familyId} · +{percent(family.damageBonus)}% {localized('damage')} · +{percent(family.materialBonus)}% {localized('normal materials')}</Text>}
      {p.next?<View style={styles.next}>
       <Text style={styles.nextLabel}>{t("NEXT MILESTONE · RANK {value0}",{value0:p.next.rank})} · {num(monsterMasteryKillsForRank(p.next.rank))} {localized('kills')}</Text>
       <Text style={styles.nextTitle}>{localized(p.next.label)}</Text>
       <Text style={styles.body}>{localized(p.next.detail)}</Text>
       <Text style={styles.nextKills}>{t("{value0} kills remaining",{value0:p.killsToNextMilestone})}</Text>
      </View>:<Text style={styles.complete}>{t("All species mastery milestones unlocked.")}</Text>}
      {(p.dropKnowledge||familyKnowledge)?<>
       <Text style={styles.dropTitle}>{t("KNOWN DROPS")}{familyKnowledge&&!p.dropKnowledge?' · '+localized('TYPE KNOWLEDGE'):''}</Text>
       <View style={styles.dropList}>{monster.drops.map(drop=>{
        const item=itemDef(drop.itemId),gearMaterial=v33EquipmentMaterialLabel(drop.itemId);
        return <View key={drop.itemId} style={styles.dropRow}>
         <ItemArtwork itemId={drop.itemId} size={34}/>
         <View style={styles.flex}>
          <Text style={styles.dropName}>{localized(item.name)}</Text>
          <Text style={styles.dropMeta}>{(drop.chance*100).toFixed(2)}% · {drop.min}–{drop.max}{gearMaterial?' · '+label(gearMaterial):''}</Text>
         </View>
        </View>;
       })}</View>
      </>:<Text style={styles.locked}>{localized("Reach species or enemy type Rank 10 to reveal the full base drop table.")}</Text>}
     </>}
    </View>;
   })}
  </>}
 </Panel>;
}
function Summary({label,value}:{label:string;value:number}){return <View style={styles.summaryCell}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>}
const styles=StyleSheet.create({
 title:{...typography.title,color:C.text},
 body:{...typography.caption,color:C.muted,lineHeight:17},
 summary:{flexDirection:'row',gap:6,flexWrap:'wrap'},
 summaryCell:{minWidth:68,flexGrow:1,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 summaryLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},
 summaryValue:{fontSize:16,color:C.text,fontWeight:'900'},
 ladder:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 ladderTitle:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
 milestones:{flexDirection:'row',flexWrap:'wrap',gap:5},
 milestoneChip:{minWidth:83,flexGrow:1,gap:2,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.bg},
 milestoneRank:{fontSize:9,fontWeight:'800',color:C.muted},
 milestoneKills:{...typography.caption,color:C.text,fontWeight:'800'},
 entry:{gap:6,paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.line},
 head:{minHeight:34,flexDirection:'row',alignItems:'center',gap:8},
 flex:{flex:1,minWidth:0},
 name:{...typography.bodyStrong,color:C.text,fontSize:14},
 rank:{...typography.caption,color:C.muted},
 max:{...typography.caption,color:C.good,fontWeight:'900'},
 chevron:{fontSize:20,color:C.muted,minWidth:22,textAlign:'center'},
 bonusRow:{flexDirection:'row',gap:10,flexWrap:'wrap'},
 bonus:{...typography.caption,color:C.text,fontWeight:'800'},
 familyStack:{...typography.caption,color:C.info},
 next:{gap:3,padding:9,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel2,borderRadius:6},
 nextLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.3},
 nextTitle:{...typography.bodyStrong,color:C.text},
 nextKills:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
 complete:{...typography.bodyStrong,color:C.good},
 dropTitle:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
 dropList:{gap:5},
 dropRow:{minHeight:42,flexDirection:'row',alignItems:'center',gap:8,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 dropName:{...typography.caption,color:C.text,fontWeight:'800'},
 dropMeta:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'700'},
 locked:{...typography.caption,color:C.muted},
});
