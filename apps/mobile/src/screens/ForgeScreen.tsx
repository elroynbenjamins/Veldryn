import {useMemo,useState,type ComponentProps} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {equipmentCraftQueueModel} from '../core/equipment-crafting-queue';
import {forgeLevel,forgeSpeedBonus,forgeRarityBonusPercent,forgeRarePlusChance,FORGE_BASE_RARE_PLUS_CHANCE} from '../core/forge-mastery';
import {progressWithinLevel} from '../core/progression';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import {ActivityArtwork} from '../components/ActivityArtwork';
import {EquipmentCraftQueuePanel} from '../components/EquipmentCraftQueuePanel';

type Profession='smithing'|'tailoring'|'enchanting';
type Section='queue'|'mastery'|'recipes';
type Props={state:GameState;now:number;onOpenProfession:(id:Profession)=>void;queueProps:ComponentProps<typeof EquipmentCraftQueuePanel>};
const MILESTONES=[{level:25,luck:5},{level:50,luck:10},{level:75,luck:15}] as const;

/** One Forge screen, shared by every profession; recipe requirements stay with professions. */
export function ForgeScreen({state,now,onOpenProfession,queueProps}:Props){
 const C=useGameTheme(),{gt,gl}=useGameplayText(),styles=useMemo(()=>createStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions();
 const [section,setSection]=useState<Section>('queue');
 const [showQueueMastery,setShowQueueMastery]=useState(false);
 const level=forgeLevel(state),skill=state.skills.find(row=>row.skillId==='forge');
 const xp=progressWithinLevel(skill?.xp??0,level);
 const ratio=level===100?1:Math.max(0,Math.min(1,xp.current/Math.max(1,xp.need)));
 const speed=(forgeSpeedBonus(level)*100).toFixed(1);
 const luck=forgeRarityBonusPercent(level);
 const model=equipmentCraftQueueModel(state,now);
 const nextMilestone=MILESTONES.find(row=>row.level>level);
 const tabs=[{id:'queue' as const,label:gt('Crafting Queue')},{id:'mastery' as const,label:gt('Mastery')},{id:'recipes' as const,label:gt('Professions')}];
 const masteryOverview=<>
   <View style={styles.hero}>
    <View style={styles.heroLine}>
      <ActivityArtwork id="forge" size={42}/>
      <View style={styles.grow}>
       <Text accessibilityRole="header" style={styles.title}>{gt('Forge')}</Text>
       <Text style={styles.sub}>{gl('Level')} {level} / 100 · {gt('Crafting skill')}</Text>
      </View>
      <View style={styles.speedPanel}><Text style={styles.speedValue}>+{speed}%</Text><Text style={styles.tiny}>{gt('Crafting speed')}</Text></View>
    </View>
    <View style={styles.line}><Text style={styles.label}>{gt('Mastery progress')}</Text><Text style={styles.sub}>{level>=100?gt('Mastered'):Math.floor(xp.current).toLocaleString()+' / '+xp.need.toLocaleString()+' XP'}</Text></View>
    <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(ratio*100)}} style={styles.track}>
     <View style={[styles.fill,{width:`${ratio*100}%`}]}/>
    </View>
    <View style={styles.line}>
     <Text style={styles.sub}>{gt('Rare')}+ · {(forgeRarePlusChance(level)*100).toFixed(2)}% {gt('Chance')}</Text>
     <Text style={styles.sub}>{nextMilestone?gt('Next')+' · '+nextMilestone.level:level<100?gt('Next')+' · 100':gt('Mastered')}</Text>
    </View>
   </View>
   <View style={styles.milestones}>
    {MILESTONES.map(row=><View key={row.level} style={[styles.milestone,level>=row.level&&styles.earnedCard]}>
     <Text style={[styles.milestoneLevel,level>=row.level&&styles.earned]}>{level>=row.level?'✓ ':'◇ '}{gl('Level')} {row.level}</Text>
     <Text style={styles.tiny}>+{row.luck}% {gt('Rare')}+</Text>
    </View>)}
   </View>
 </>;
 return <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.root}>
   {section==='mastery'?masteryOverview:<View style={styles.compactHeader}>
     <ActivityArtwork id="forge" size={34}/>
     <View style={styles.grow}><Text accessibilityRole="header" style={styles.compactTitle}>{gt('Forge')}</Text><Text style={styles.sub}>{gl('Level')} {level} / 100 · {gt('Crafting speed')} +{speed}%</Text></View>
     <Text style={styles.compactReady}>{model.ready>0?model.ready+' '+gt('Ready'):nextMilestone?gt('Next')+' '+nextMilestone.level:gt('Mastered')}</Text>
   </View>}
   <View accessibilityRole="tablist" style={[styles.tabs,width<360||fontScale>=1.3?styles.tightTabs:null]}>
    {tabs.map(tab=><Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{selected:section===tab.id}} onPress={()=>setSection(tab.id)}
     style={[styles.tab,section===tab.id&&styles.selectedTab]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={[styles.tabText,section===tab.id&&styles.tabSelectedText]}>{tab.label}</Text>
      {tab.id==='queue'&&model.ready>0?<View style={styles.badge}><Text style={styles.badgeText}>{model.ready}</Text></View>:null}
     </Pressable>)}
   </View>
   {section==='queue'?<>
    <EquipmentCraftQueuePanel {...queueProps}/>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showQueueMastery}} onPress={()=>setShowQueueMastery(value=>!value)} style={styles.queueMasteryToggle}>
      <Text style={styles.queueMasteryLabel}>{gt('Forge')} · {gt('Mastery')} · {gl('Level')} {level}</Text><Text style={styles.queueMasteryLabel}>{showQueueMastery?'−':'+'}</Text>
    </Pressable>
    {showQueueMastery?masteryOverview:null}
    <Text style={styles.note}>{gt('Equipment and gem crafting share Forge slots. Materials and Gold are reserved when you start a job.')}</Text>
   </>:null}
   {section==='mastery'?<View style={styles.panel}>
    <Text style={styles.panelTitle}>{gt('Mastery benefits')}</Text>
    <View style={styles.line}><Text style={styles.label}>{gt('Crafting speed')}</Text><Text style={styles.value}>+{speed}%</Text></View>
    <View style={styles.rule}/>
    <View style={styles.line}><Text style={styles.label}>{gt('Rare')}+ · {gt('relative chance')}</Text><Text style={styles.value}>+{luck}%</Text></View>
    <View style={styles.rule}/>
    <View style={styles.line}><Text style={styles.label}>{gt('Base chance')} · {gt('Rare')}+</Text><Text style={styles.value}>{(FORGE_BASE_RARE_PLUS_CHANCE*100).toFixed(2)}%</Text></View>
    <View style={styles.line}><Text style={styles.label}>{gt('With Forge mastery')}</Text><Text style={styles.value}>{(forgeRarePlusChance(level)*100).toFixed(2)}%</Text></View>
    <Text style={styles.note}>{gt('Earn Forge XP when claiming crafted equipment. Smithing and Tailoring still earn profession XP. Speed and rarity bonuses are captured when a new job starts; older jobs are unaffected.')}</Text>
   </View>:null}
   {section==='recipes'?<View style={styles.panel}>
    <Text style={styles.panelTitle}>{gt('Choose a profession')}</Text>
    <Text style={styles.note}>{gt('Recipes retain their original skill requirements.')}</Text>
    {([['smithing','Smithing','Metal equipment and tools'],['tailoring','Tailoring','Cloth and leather equipment'],['enchanting','Enchanting','Gem refinement and combining']] as const).map(([id,label,detail])=>
     <Pressable key={id} accessibilityRole="button" accessibilityLabel={gt(label)} onPress={()=>onOpenProfession(id)} style={({pressed})=>[styles.profession,pressed&&styles.pressed]}>
      <View style={styles.grow}><Text style={styles.professionTitle}>{gt(label)}</Text><Text style={styles.sub}>{gt(detail)}</Text></View>
      <Text style={styles.arrow}>›</Text>
     </Pressable>)}
   </View>:null}
  </ScrollView>;
}
function createStyles(C:ReturnType<typeof useGameTheme>){return StyleSheet.create({
 root:{padding:14,paddingBottom:40,gap:12,maxWidth:660,width:'100%',alignSelf:'center'},
 compactHeader:{minHeight:60,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 compactTitle:{fontSize:19,fontWeight:'900',color:C.text},compactReady:{fontSize:11,fontWeight:'800',color:C.good,textAlign:'right',maxWidth:102},
 queueMasteryToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 queueMasteryLabel:{fontSize:12,fontWeight:'700',color:C.text},
 hero:{padding:13,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,gap:11},
 heroLine:{flexDirection:'row',alignItems:'center',gap:10},
 grow:{flex:1,minWidth:0},title:{fontSize:23,fontWeight:'900',color:C.text},
 sub:{fontSize:11,lineHeight:16,color:C.muted,flexShrink:1},
 speedPanel:{minWidth:82,alignItems:'flex-end'},speedValue:{fontSize:18,fontWeight:'900',color:C.accent},
 tiny:{fontSize:10,lineHeight:15,color:C.muted,textAlign:'center'},
 line:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 label:{fontSize:12,color:C.muted,flex:1},
 value:{fontSize:13,fontWeight:'800',color:C.text},
 track:{height:7,borderRadius:5,backgroundColor:C.line,overflow:'hidden'},fill:{height:7,borderRadius:5,backgroundColor:C.accent},
 milestones:{flexDirection:'row',gap:7},
 milestone:{flex:1,minWidth:0,alignItems:'center',gap:4,paddingHorizontal:3,paddingVertical:11,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 earnedCard:{borderColor:C.good,backgroundColor:C.goodSurface},
 milestoneLevel:{fontSize:11,fontWeight:'800',color:C.muted},earned:{color:C.good},
 tabs:{flexDirection:'row',gap:7},tightTabs:{gap:3},
 tab:{flex:1,minWidth:0,minHeight:48,paddingHorizontal:4,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:4,borderBottomWidth:2,borderBottomColor:C.line},
 selectedTab:{borderBottomColor:C.accent},tabText:{fontSize:12,fontWeight:'700',color:C.muted},tabSelectedText:{color:C.text},
 badge:{minWidth:17,paddingHorizontal:3,borderRadius:9,alignItems:'center',backgroundColor:C.good},
 badgeText:{fontSize:10,fontWeight:'800',color:C.bg},
 panel:{padding:13,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,gap:11},
 panelTitle:{fontSize:15,fontWeight:'800',color:C.text},rule:{height:1,backgroundColor:C.line},
 note:{fontSize:11,lineHeight:17,color:C.muted},
 profession:{minHeight:63,paddingHorizontal:12,paddingVertical:8,flexDirection:'row',alignItems:'center',borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 professionTitle:{fontSize:13,fontWeight:'800',color:C.text},arrow:{fontSize:23,fontWeight:'800',color:C.accent},pressed:{opacity:.7}
});}
