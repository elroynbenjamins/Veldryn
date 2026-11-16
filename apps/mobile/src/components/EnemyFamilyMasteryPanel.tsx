import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent} from '../i18n/companions';
import {formatLocalizedNumber} from '../i18n/translator';
import type {GameState} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {ENEMY_FAMILIES} from '../content/enemy-families';
import {itemDef} from '../content/items';
import {
 ENEMY_FAMILY_MASTERY_MILESTONES,enemyFamilyMasteryGuidance,
 enemyFamilyMasteryPointsPerKill,familyMasteryPointsForRank,
 FAMILY_MASTERY_MAX_POINTS,FAMILY_MASTERY_MAX_RANK,
} from '../core/enemy-family-mastery';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {StatBar} from './StatBar';
import {C,radii,spacing,typography} from '../theme/theme';

/** Second layer of monster mastery; individual families expand on demand. */
export function EnemyFamilyMasteryPanel({state}:{state:GameState}){
 const language=useGameLanguage(),t=(value:string)=>companionContent(language,value);
 const num=(value:number)=>formatLocalizedNumber(language,value);
 const percent=(value:number)=>formatLocalizedNumber(language,value*100,{minimumFractionDigits:0,maximumFractionDigits:2});
 const [open,setOpen]=useState(false),[expandedFamilyId,setExpandedFamilyId]=useState<string|undefined>();
 const seenIds=new Set([...state.unlockedMonsterIds,...Object.keys(state.character?.monsterMasteryPoints??{})]);
 const families=ENEMY_FAMILIES.filter(family=>family.monsterIds.length>0&&
  (family.monsterIds.some(id=>seenIds.has(id))||(state.character?.familyMasteryPoints?.[family.id]??0)>0))
  .map(family=>({...family,progress:enemyFamilyMasteryGuidance(state,family.id)}))
  .sort((a,b)=>b.progress.rank-a.progress.rank||b.progress.points-a.progress.points||a.name.localeCompare(b.name));
 return <Panel>
  <View style={styles.heading}>
   <Text style={styles.title}>{t('Enemy Type Mastery')}</Text>
   <Text style={styles.pace}>{t('1–6 PT / KILL')}</Text>
  </View>
  <Text style={styles.copy}>{t('Each ordinary kill also improves its enemy family. Harder enemies give more type mastery points. Both mastery bonuses stack.')}</Text>
  <View style={styles.stats}>
   <View style={styles.stat}><Text style={styles.statValue}>{families.length}</Text><Text style={styles.statLabel}>{t('TYPES')}</Text></View>
   <View style={styles.stat}><Text style={styles.statValue}>{families.reduce((total,f)=>total+f.progress.rank,0)}</Text><Text style={styles.statLabel}>{t('TOTAL RANKS')}</Text></View>
   <View style={styles.stat}><Text style={styles.statValue}>{families.filter(f=>f.progress.rank===FAMILY_MASTERY_MAX_RANK).length}</Text><Text style={styles.statLabel}>{t('MASTERED')}</Text></View>
  </View>
  <GameButton title={open?t('Hide type mastery'):t('View type mastery')} onPress={()=>setOpen(value=>!value)}/>
  {open&&<>
   <View style={styles.ladder}>
    <Text style={styles.ladderTitle}>{t('LONG-TERM MASTERY')} · {num(FAMILY_MASTERY_MAX_POINTS)} {t('POINTS TO RANK 30')}</Text>
    <Text style={styles.copy}>{t('Each rank grows more difficult. Damage grows after Rank 5; materials after Rank 15. Rewards depend on the enemy, not your character level.')}</Text>
    <View style={styles.milestoneChips}>{ENEMY_FAMILY_MASTERY_MILESTONES.map(row=>
     <View key={row.rank} style={styles.milestoneChip}>
      <Text style={styles.chipRank}>{t('RANK')} {row.rank}</Text>
      <Text style={styles.chipValue}>{num(familyMasteryPointsForRank(row.rank))} {t('pts')}</Text>
     </View>
    )}</View>
   </View>
   {families.length===0?<Text style={styles.copy}>{t('Defeat an ordinary enemy to discover its family.')}</Text>:null}
   {families.map(family=>{
    const m=family.progress,isExpanded=expandedFamilyId===family.id;
    const known=family.monsterIds.map(id=>MONSTERS.find(monster=>monster.id===id))
     .filter((monster):monster is (typeof MONSTERS)[number]=>!!monster&&seenIds.has(monster.id));
    const values=known.map(monster=>enemyFamilyMasteryPointsPerKill(monster.id));
    const minPoints=values.length?Math.min(...values):0,maxPoints=values.length?Math.max(...values):0;
    return <View key={family.id} style={styles.entry}>
     <Pressable accessibilityRole="button" accessibilityLabel={family.name+' '+t('mastery details')}
      accessibilityState={{expanded:isExpanded}} hitSlop={4}
      onPress={()=>setExpandedFamilyId(id=>id===family.id?undefined:family.id)}
      style={styles.heading}>
      <View style={styles.grow}>
       <Text style={styles.familyName}>{m.badgeUnlocked?'◆ ':''}{t(family.name)} · {t('Rank')} {m.rank}/{FAMILY_MASTERY_MAX_RANK}</Text>
       <Text style={styles.familyInfo}>{num(m.points)} / {num(FAMILY_MASTERY_MAX_POINTS)} {t('points')}
        {values.length?' · '+minPoints+(minPoints===maxPoints?'':'–'+maxPoints)+' '+t('per kill'):''}</Text>
      </View>
      <Text style={m.rank===FAMILY_MASTERY_MAX_RANK?styles.max:styles.chevron}>{m.rank===FAMILY_MASTERY_MAX_RANK?t('MAX'):isExpanded?'⌃':'⌄'}</Text>
     </Pressable>
     <StatBar reduceMotion={state.settings.reduceMotion}
      label={m.rank===FAMILY_MASTERY_MAX_RANK?t('Mastery complete'):`${num(m.pointsToNextRank)} ${t('points to next rank')}`}
      current={m.rank===FAMILY_MASTERY_MAX_RANK?m.currentRankTarget:m.currentRankProgress}
      max={m.currentRankTarget}/>
     <View style={styles.effectRow}>
      <Text style={styles.effect}>+{percent(m.damageBonus)}% {t('damage')}</Text>
      <Text style={styles.effect}>+{percent(m.materialBonus)}% {t('materials')}</Text>
      <Text style={styles.effectHint}>{t('Stacks with species')}</Text>
     </View>
     {isExpanded&&<>
      <Text style={styles.members}>{t('Encountered')} ({known.length}/{family.monsterIds.length}): {known.length?known.map(monster=>t(monster.name)).join(' · '):t('None yet')}</Text>
      {m.next?<View style={styles.milestone}>
       <Text style={styles.milestoneHeading}>{t('NEXT MILESTONE')} · {t('Rank')} {m.next.rank} · {num(familyMasteryPointsForRank(m.next.rank))} {t('points')}</Text>
       <Text style={styles.milestoneName}>{t(m.next.label)}</Text>
       <Text style={styles.copy}>{t(m.next.detail)}</Text>
       <Text style={styles.milestoneRemaining}>{num(m.pointsToNextMilestone)} {t('points remaining')}</Text>
      </View>:<Text style={styles.max}>{t('All family milestones unlocked.')}</Text>}
      {m.dropKnowledge?<View style={styles.knowledge}>
       <Text style={styles.milestoneHeading}>{t('KNOWN FAMILY DROPS')}</Text>
       {known.map(monster=><View key={monster.id} style={styles.dropGroup}>
        <View style={styles.dropHeading}>
         <Text style={styles.dropMonster}>{t(monster.name)}</Text>
         <Text style={styles.dropPoints}>+{enemyFamilyMasteryPointsPerKill(monster.id)} {t('pts/kill')}</Text>
        </View>
        {monster.drops.map(drop=><Text key={drop.itemId} style={styles.dropLine}>
         {t(itemDef(drop.itemId).name)} · {(drop.chance*100).toFixed(2)}% · {drop.min}–{drop.max}
        </Text>)}
       </View>)}
      </View>:<Text style={styles.locked}>{t('Reach family Rank 10 to reveal discovered members’ base drop tables.')}</Text>}
     </>}
    </View>;
   })}
  </>}
 </Panel>;
}

const styles=StyleSheet.create({
 title:{...typography.title,color:C.text},
 heading:{flexDirection:'row',alignItems:'center',gap:8,minHeight:34},
 grow:{flex:1,minWidth:0},
 pace:{fontSize:10,color:C.muted,fontWeight:'900',letterSpacing:.3},
 copy:{...typography.caption,color:C.muted,lineHeight:17},
 stats:{flexDirection:'row',gap:6},
 stat:{flex:1,backgroundColor:C.panel2,borderColor:C.line,borderWidth:1,borderRadius:radii.sm,padding:8},
 statValue:{fontSize:17,fontWeight:'900',color:C.text},
 statLabel:{fontSize:9,fontWeight:'800',color:C.muted},
 ladder:{padding:spacing.sm,gap:6,borderWidth:1,borderRadius:radii.md,borderColor:C.line,backgroundColor:C.panel2},
 ladderTitle:{...typography.caption,fontWeight:'900',color:C.text},
 milestoneChips:{flexDirection:'row',flexWrap:'wrap',gap:5},
 milestoneChip:{minWidth:83,flexGrow:1,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,padding:6,backgroundColor:C.bg,gap:2},
 chipRank:{fontSize:9,color:C.muted,fontWeight:'800'},
 chipValue:{...typography.caption,color:C.text,fontWeight:'800'},
 entry:{gap:6,paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.line},
 familyName:{...typography.bodyStrong,fontSize:14,color:C.text},
 familyInfo:{...typography.caption,color:C.muted},
 effectRow:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 effect:{...typography.caption,color:C.text,fontWeight:'800'},
 effectHint:{...typography.caption,color:C.muted},
 chevron:{fontSize:20,color:C.muted,minWidth:22,textAlign:'center'},
 members:{...typography.caption,color:C.muted,lineHeight:17},
 max:{...typography.caption,color:C.good,fontWeight:'900'},
 milestone:{gap:4,padding:9,backgroundColor:C.panel2,borderLeftWidth:3,borderLeftColor:C.info,borderRadius:radii.sm},
 milestoneHeading:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.3},
 milestoneName:{...typography.bodyStrong,color:C.text},
 milestoneRemaining:{...typography.caption,fontWeight:'900',color:C.text},
 locked:{...typography.caption,color:C.muted},
 knowledge:{gap:5},
 dropGroup:{gap:3,backgroundColor:C.panel2,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
 dropHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
 dropMonster:{...typography.caption,fontWeight:'900',color:C.text,flex:1},
 dropPoints:{...typography.caption,color:C.info,fontWeight:'800'},
 dropLine:{...typography.caption,color:C.muted},
});
