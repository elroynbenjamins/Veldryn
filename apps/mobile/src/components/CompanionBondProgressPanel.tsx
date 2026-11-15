import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {COMPANION_BOND_CONFIG,COMPANION_BOND_ESSENCE_REWARDS} from '../content/combat-companions';
import {companionBondProgress} from '../core/companion-bond-progress';
import type {OwnedCompanionProgress} from '../core/combat-companion-types';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionTranslator} from '../i18n/companions';
import {GameButton} from './GameButton';

const REWARD_LEVELS=[2,4,6,8,10] as const;
type RewardLevel=2|4|6|8;
type BondPanelProps={
 progress:Pick<OwnedCompanionProgress,'bondLevel'|'bondXp'>;
 companionId:string;
 claims:readonly string[];
 traitName:string;
 traitDescription:string;
 mode?:'compact'|'full';
 bondHallLevel?:number;
 busy?:boolean;
 onOpen?:()=>void;
 onClaim?:(level:RewardLevel)=>void;
};

/** Shared inline Training summary and detailed Bond reward sheet. */
export function CompanionBondProgressPanel({progress,companionId,claims,traitName,traitDescription,mode='compact',bondHallLevel=0,busy=false,onOpen,onClaim}:BondPanelProps){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),language=useGameLanguage(),t=companionTranslator(language);
 const value=(n:number)=>n.toLocaleString(language);
 const bond=companionBondProgress(progress.bondLevel,progress.bondXp);
 const claimable=([2,4,6,8] as const).filter(level=>bond.level>=level&&!claims.includes(companionId+':'+level));
 const upcoming=REWARD_LEVELS.find(level=>level>bond.level);
 const upcomingReward=upcoming===10?traitName:upcoming?value(COMPANION_BOND_ESSENCE_REWARDS[upcoming])+' '+t('Essence'):t('All rewards unlocked');
 const header=<>
  <View style={s.head}>
   <Text style={s.title}>{t('Bond')} {bond.level}/10</Text>
   <Text style={s.counter}>{bond.maxed?t('MAX BOND'):t('Level {value0}',{value0:bond.nextLevel??10})}</Text>
  </View>
  <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:bond.percent}} style={s.track}>
   <View style={[s.fill,{width:(bond.percent+'%') as any}]}/>
  </View>
  <View style={s.between}>
   <Text style={s.value}>{bond.maxed?t('Bond complete'):t('{value0} / {value1} Bond XP',{value0:value(bond.current),value1:value(bond.required)})}</Text>
   <Text style={s.remaining}>{bond.maxed?'100%':t('{value0} XP left',{value0:value(bond.remaining)})}</Text>
  </View>
 </>;
 if(mode==='compact')return <Pressable accessibilityRole="button" accessibilityLabel={t('Bond {value0} of 10. Open Bond rewards.',{value0:bond.level})} onPress={onOpen} style={({pressed})=>[s.card,pressed&&s.pressed]}>
   {header}
   {claimable.length?<Text style={s.claimReady}>{t('{value0} Bond reward(s) ready to claim',{value0:claimable.length})}</Text>:<Text style={s.next}>{bond.maxed?t('Unique trait unlocked'):t('Next reward: Bond {value0} · {value1}',{value0:upcoming??10,value1:upcomingReward})}</Text>}
   <Text style={s.open}>{t('Bond milestones & trait')} ›</Text>
  </Pressable>;
 const sourceXp=COMPANION_BOND_CONFIG.sourceXp;
 const hallBonus=Math.min(15,Math.max(0,Math.floor(bondHallLevel))*5);
 return <View style={s.full}>
  <View style={s.card}>{header}<Text style={s.hint}>{t('Bond grows by adventuring together. Companion Level XP is separate.')}</Text></View>
  {claimable.length?<View style={s.readyCard}><Text style={s.readyTitle}>{t('Ready to claim')} · {claimable.length}</Text>
   <Text style={s.hint}>{t('Collect the Essence earned from your Bond milestones below.')}</Text></View>:null}
  <Text style={s.section}>{t('Bond milestones')}</Text>
  <View style={s.milestones}>{REWARD_LEVELS.map(level=>{
   const isTrait=level===10;
   const claimed=isTrait?bond.level>=10:claims.includes(companionId+':'+level);
   const ready=!isTrait&&bond.level>=level&&!claimed;
   const next=!claimed&&!ready&&level===upcoming;
   const reward=isTrait?traitName:value(COMPANION_BOND_ESSENCE_REWARDS[level])+' '+t('Essence');
   const status=claimed?(isTrait?t('Unlocked'):t('Claimed')):ready?t('Ready to claim'):next?t('Next'):t('Locked');
   return <View key={level} style={[s.milestone,ready&&s.milestoneReady]}>
    <View style={[s.levelMark,claimed&&s.markDone,ready&&s.markReady]}><Text style={s.markText}>{claimed?'✓':level}</Text></View>
    <View style={s.details}><Text style={s.reward}>{reward}</Text><Text style={[s.status,ready&&s.claimReady,claimed&&s.claimed]}>{t('Bond {value0}',{value0:level})} · {status}</Text></View>
    {ready&&onClaim?<GameButton compact title={t('Claim')} disabled={busy} onPress={()=>onClaim(level as RewardLevel)}/>:null}
   </View>;
  })}</View>
  <View style={[s.trait,progress.bondLevel>=10&&s.traitUnlocked]}>
    <Text style={s.traitTitle}>{t('Bond 10 trait')} · {traitName}</Text>
    <Text style={s.hint}>{traitDescription}</Text>
    <Text style={s.traitStatus}>{bond.maxed?t('Unlocked and active'):t('Unlocks at Bond 10')}</Text>
  </View>
  <Text style={s.section}>{t('How to earn Bond XP')}</Text>
  <View style={s.sources}>
   {([['Battle',sourceXp.battle],['Boss',sourceXp.boss],['Dungeon',sourceXp.dungeon],['Objective',sourceXp.companion_objective]] as const).map(([name,xp])=><View key={name} style={s.source}>
    <Text style={s.sourceTitle}>{t(name)}</Text><Text style={s.sourceValue}>+{xp} XP</Text>
   </View>)}
  </View>
  {hallBonus?<Text style={s.hint}>{t('Bond Hall bonus')}: +{hallBonus}% {t('Bond XP')}</Text>:<Text style={s.hint}>{t('Upgrade the Sanctuary Bond Hall to earn up to 15% more Bond XP.')}</Text>}
  <Text style={s.hint}>{t('At Bond 7, techniques can unlock (or at Ascension II).')}</Text>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 full:{gap:9},card:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2,gap:6},
 pressed:{opacity:.8},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 title:{color:C.text,fontWeight:'900',fontSize:15},counter:{color:C.accent,fontWeight:'800',fontSize:11},
 track:{height:9,backgroundColor:C.bg,borderRadius:5,overflow:'hidden'},fill:{height:'100%',backgroundColor:C.good},
 between:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:4},value:{color:C.text,fontSize:11,fontWeight:'700'},
 remaining:{color:C.info,fontSize:11,fontWeight:'800'},next:{color:C.info,fontSize:11,fontWeight:'800'},
 claimReady:{color:C.good,fontSize:11,fontWeight:'900'},open:{color:C.accent,fontSize:11,fontWeight:'800',marginTop:2},
 section:{color:C.accent,fontWeight:'900',fontSize:11,letterSpacing:.7,marginTop:3},
 hint:{color:C.muted,fontSize:11,lineHeight:16},readyCard:{borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface,borderRadius:8,padding:10,gap:3},
 readyTitle:{color:C.good,fontWeight:'900',fontSize:12},milestones:{borderWidth:1,borderColor:C.line,borderRadius:9,overflow:'hidden'},
 milestone:{minHeight:51,paddingHorizontal:9,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:9,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.panel2},
 milestoneReady:{backgroundColor:C.goodSurface},
 levelMark:{width:29,height:29,justifyContent:'center',alignItems:'center',borderColor:C.line,borderWidth:1,borderRadius:6,backgroundColor:C.bg},
 markDone:{borderColor:C.good},markReady:{borderColor:C.accent},markText:{color:C.text,fontWeight:'900',fontSize:12},
 details:{flex:1,minWidth:0},reward:{color:C.text,fontSize:12,fontWeight:'800'},status:{color:C.muted,fontSize:10,fontWeight:'700'},claimed:{color:C.good},
 trait:{padding:11,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,gap:4},traitUnlocked:{borderColor:C.good},
 traitTitle:{color:C.accent,fontSize:12,fontWeight:'900'},traitStatus:{color:C.info,fontSize:10,fontWeight:'800'},
 sources:{flexDirection:'row',gap:6,flexWrap:'wrap'},source:{flexGrow:1,flexBasis:'45%',alignItems:'center',padding:8,gap:3,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,borderRadius:7},
 sourceTitle:{color:C.muted,fontSize:10,fontWeight:'800'},sourceValue:{color:C.good,fontSize:12,fontWeight:'900'},
 });}
