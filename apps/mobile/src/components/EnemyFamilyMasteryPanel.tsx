import React,{useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent} from '../i18n/companions';
import type {GameState} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {ENEMY_FAMILIES} from '../content/enemy-families';
import {itemDef} from '../content/items';
import {
 ENEMY_FAMILY_MASTERY_MILESTONES,
 enemyFamilyMasteryGuidance,FAMILY_MASTERY_MAX_RANK,FAMILY_MASTERY_POINTS_PER_RANK,
} from '../core/enemy-family-mastery';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {StatBar} from './StatBar';
import {C,radii,spacing,typography} from '../theme/theme';

/** Companion panel to species mastery. No editable ranks or direct grants. */
export function EnemyFamilyMasteryPanel({state}:{state:GameState}){
 const language=useGameLanguage(),t=(value:string)=>companionContent(language,value);
 const [open,setOpen]=useState(false);
 const seenIds=new Set([
  ...state.unlockedMonsterIds,
  ...Object.keys(state.character?.monsterMasteryPoints??{}),
 ]);
 // Empty future families (e.g. Orcs) never masquerade as available enemies.
 const families=ENEMY_FAMILIES.filter(family=>family.monsterIds.length>0&&
  (family.monsterIds.some(id=>seenIds.has(id))||(state.character?.familyMasteryPoints?.[family.id]??0)>0))
  .map(family=>({...family,progress:enemyFamilyMasteryGuidance(state,family.id)}))
  .sort((a,b)=>b.progress.rank-a.progress.rank||b.progress.points-a.progress.points||a.name.localeCompare(b.name));
 return <Panel>
  <View style={styles.heading}>
   <Text style={styles.title}>{t('Enemy Type Mastery')}</Text>
   <Text style={styles.pace}>{t('4× LONGER')}</Text>
  </View>
  <Text style={styles.copy}>{t('Every ordinary monster kill trains its species and its enemy type. Type mastery works across all members of a family and stacks with species bonuses.')}</Text>
  <View style={styles.stats}>
   <View style={styles.stat}><Text style={styles.statValue}>{families.length}</Text><Text style={styles.statLabel}>{t('DISCOVERED TYPES')}</Text></View>
   <View style={styles.stat}><Text style={styles.statValue}>{families.reduce((total,f)=>total+f.progress.rank,0)}</Text><Text style={styles.statLabel}>{t('TOTAL RANKS')}</Text></View>
   <View style={styles.stat}><Text style={styles.statValue}>{families.filter(f=>f.progress.rank>=FAMILY_MASTERY_MAX_RANK).length}</Text><Text style={styles.statLabel}>{t('MASTERED')}</Text></View>
  </View>
  <GameButton title={open?t('Hide type mastery'):t('View type mastery')} onPress={()=>setOpen(value=>!value)}/>
  {open&&<>
   <View style={styles.ladder}>
    <Text style={styles.ladderTitle}>{t('TYPE MASTERY LADDER · 100 KILLS / RANK')}</Text>
    {ENEMY_FAMILY_MASTERY_MILESTONES.map(milestone=><Text key={milestone.rank} style={styles.ladderRow}>
     {t('Rank')} {milestone.rank} · {milestone.label}
    </Text>)}
   </View>
   {families.length===0?<Text style={styles.copy}>{t('Defeat an ordinary enemy to discover its family.')}</Text>:null}
   {families.map(family=>{
    const m=family.progress;
    const known=family.monsterIds.map(id=>MONSTERS.find(monster=>monster.id===id))
     .filter((monster):monster is (typeof MONSTERS)[number]=>!!monster&&seenIds.has(monster.id));
    return <View key={family.id} style={styles.entry}>
     <View style={styles.heading}>
      <View style={styles.grow}>
       <Text style={styles.familyName}>{m.badgeUnlocked?'◆ ':''}{family.name}</Text>
       <Text style={styles.familyInfo}>{t('Rank')} {m.rank}/{FAMILY_MASTERY_MAX_RANK} · {m.points.toLocaleString(language)} / 3,000 {t('kills')}</Text>
      </View>
      {m.rank>=FAMILY_MASTERY_MAX_RANK?<Text style={styles.max}>{t('MAX')}</Text>:null}
     </View>
     <StatBar reduceMotion={state.settings.reduceMotion}
      label={m.rank>=FAMILY_MASTERY_MAX_RANK?t('Mastery complete'):`${m.killsToNextRank} ${t('kills to next rank')}`}
      current={m.rank>=FAMILY_MASTERY_MAX_RANK?FAMILY_MASTERY_POINTS_PER_RANK:m.points%FAMILY_MASTERY_POINTS_PER_RANK}
      max={FAMILY_MASTERY_POINTS_PER_RANK}/>
     <Text style={styles.copy}>+{Math.round(m.damageBonus*100)}% {t('damage')} · +{Math.round(m.materialBonus*100)}% {t('normal materials')} · {t('stacks with species')}</Text>
     <Text style={styles.members}>{t('Encountered')} ({known.length}/{family.monsterIds.length}): {known.length?known.map(monster=>monster.name).join(' · '):t('None yet')}</Text>
     {m.next?<View style={styles.milestone}>
      <Text style={styles.milestoneHeading}>{t('NEXT MILESTONE')} · {t('Rank')} {m.next.rank}</Text>
      <Text style={styles.milestoneName}>{m.next.label}</Text>
      <Text style={styles.copy}>{m.next.detail}</Text>
      <Text style={styles.milestoneRemaining}>{m.killsToNextMilestone.toLocaleString(language)} {t('kills remaining')}</Text>
     </View>:<Text style={styles.max}>{t('All family milestones unlocked.')}</Text>}
     {m.dropKnowledge?<View style={styles.knowledge}>
      <Text style={styles.milestoneHeading}>{t('KNOWN FAMILY DROPS')}</Text>
      {known.map(monster=><View key={monster.id} style={styles.dropGroup}>
       <Text style={styles.dropMonster}>{monster.name}</Text>
       {monster.drops.map(drop=><Text key={drop.itemId} style={styles.dropLine}>
        {itemDef(drop.itemId).name} · {(drop.chance*100).toFixed(2)}% · {drop.min}–{drop.max}
       </Text>)}
      </View>)}
     </View>:<Text style={styles.locked}>{t('Reach family Rank 10 to reveal discovered members’ base drop tables.')}</Text>}
    </View>;
   })}
  </>}
 </Panel>;
}

const styles=StyleSheet.create({
 title:{...typography.title,color:C.text},
 heading:{flexDirection:'row',alignItems:'center',gap:8},
 grow:{flex:1,minWidth:0},
 pace:{fontSize:10,color:C.muted,fontWeight:'900',letterSpacing:.5},
 copy:{...typography.body,color:C.muted,lineHeight:19},
 stats:{flexDirection:'row',gap:6},
 stat:{flex:1,backgroundColor:C.panel2,borderColor:C.line,borderWidth:1,borderRadius:radii.sm,padding:8},
 statValue:{fontSize:17,fontWeight:'900',color:C.text},
 statLabel:{fontSize:9,fontWeight:'800',color:C.muted},
 ladder:{padding:spacing.sm,gap:4,borderWidth:1,borderRadius:radii.md,borderColor:C.line,backgroundColor:C.panel2},
 ladderTitle:{...typography.caption,fontWeight:'900',color:C.text},
 ladderRow:{...typography.caption,color:C.muted},
 entry:{gap:7,paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line},
 familyName:{...typography.bodyStrong,fontSize:15,color:C.text},
 familyInfo:{...typography.caption,color:C.muted},
 members:{...typography.caption,color:C.muted,lineHeight:17},
 max:{...typography.caption,color:C.good,fontWeight:'900'},
 milestone:{gap:4,padding:9,backgroundColor:C.panel2,borderLeftWidth:3,borderLeftColor:C.info,borderRadius:radii.sm},
 milestoneHeading:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.3},
 milestoneName:{...typography.bodyStrong,color:C.text},
 milestoneRemaining:{...typography.caption,fontWeight:'900',color:C.text},
 locked:{...typography.caption,color:C.muted},
 knowledge:{gap:5},
 dropGroup:{gap:2,backgroundColor:C.panel2,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
 dropMonster:{...typography.caption,fontWeight:'900',color:C.text},
 dropLine:{...typography.caption,color:C.muted},
});
