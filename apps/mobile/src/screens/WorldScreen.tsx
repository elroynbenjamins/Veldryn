import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import type {GameState} from '../core/types';
import {currentRegionId} from '../core/combat-region';
import {WorldChapterNavigator} from '../components/WorldChapterNavigator';
import {GameButton} from '../components/GameButton';
import {RegionalCombatPanel} from '../components/RegionalCombatPanel';
import {RegionalJournalPanel} from '../components/RegionalJournalPanel';
import {RegionalStoryLeadsPanel} from '../components/RegionalStoryLeadsPanel';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {frostmarchCardsV21,frostmarchProgressFromState,type RegionProgressV21} from '../core/region-content-v21';
import {loadActiveFrostmarchContentVersionV21,loadFrostmarchProgressV21} from '../online/regional-content-v21';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';

type Props={
  state:GameState;
  onTravel:(regionId:string)=>void;
  onOpenCombat:(zoneId?:string)=>void;
  onOpenSkills:(areaId?:string)=>void;
  onCoop?:(dungeonId?:string)=>void;
  dungeonContent?:ReactNode;
  dungeonFlowActive?:boolean;
  onRegionalRewardsChanged?:()=>Promise<void>|void;
  onOpenWeeklyOrder?:(order:WeeklyOrder)=>void;
  onOpenContracts?:(order?:WeeklyOrder)=>void;
  goalRegionId?:string;
};

export function WorldScreen({state,onTravel,onOpenCombat,onOpenSkills,onCoop,dungeonContent,dungeonFlowActive=false,onRegionalRewardsChanged,goalRegionId}:Props){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const currentId=currentRegionId(state),level=state.character?.level??1;
  const sunscar=currentId==='SUNSCAR',frostmarch=currentId==='FROSTMARCH';
  const storyRegion=currentId==='SUNSCAR'||currentId==='FROSTMARCH'||currentId==='ASHLANDS'?currentId:undefined;
  const [topTab,setTopTab]=useState<'region'|'dungeon'>('region');
  const [expandedProgress,setExpandedProgress]=useState(false);
  const [serverFrostmarchProgress,setServerFrostmarchProgress]=useState<RegionProgressV21|null>(null);
  useEffect(()=>{setExpandedProgress(false);},[currentId]);
  useEffect(()=>{
    let mounted=true;
    if(!frostmarch){setServerFrostmarchProgress(null);return ()=>{mounted=false;};}
    void Promise.all([loadFrostmarchProgressV21(),loadActiveFrostmarchContentVersionV21()])
      .then(([progress,version])=>{if(mounted)setServerFrostmarchProgress(version?.startsWith('frostmarch-v21.')?progress:null);})
      .catch(()=>{if(mounted)setServerFrostmarchProgress(null);});
    return ()=>{mounted=false;};
  },[frostmarch]);
  const frostmarchProgress=serverFrostmarchProgress??frostmarchProgressFromState(state);
  const extraContent=!!storyRegion||(sunscar&&!!onRegionalRewardsChanged)||frostmarch;

  // Dungeons own their scrolling/navigation. Keep their existing screen untouched.
  if(topTab==='dungeon'&&dungeonContent)return <View style={{flex:1,backgroundColor:C.bg}}>
    {!dungeonFlowActive?<View style={s.dungeonTabsWrap}><View accessibilityRole="tablist" style={s.topTabs}>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:false}} style={s.topTab} onPress={()=>setTopTab('region')}>
        <Text style={s.topTabText}>{t('Current Region')}</Text>
      </Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:true}} style={[s.topTab,s.topTabActive]} onPress={()=>setTopTab('dungeon')}>
        <Text style={[s.topTabText,s.topTabTextActive]}>{t('Dungeon')}</Text>
      </Pressable>
    </View></View>:null}
    <View style={{flex:1,minHeight:0}}>{dungeonContent}</View>
  </View>;

  return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.heading}>{t('World Regions')}</Text>
    <View accessibilityRole="tablist" style={s.topTabs}>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:topTab==='region'}}
        style={[s.topTab,topTab==='region'&&s.topTabActive]} onPress={()=>setTopTab('region')}>
        <Text style={[s.topTabText,topTab==='region'&&s.topTabTextActive]}>{t('Current Region')}</Text>
      </Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:topTab==='dungeon'}}
        style={[s.topTab,topTab==='dungeon'&&s.topTabActive]} onPress={()=>setTopTab('dungeon')}>
        <Text style={[s.topTabText,topTab==='dungeon'&&s.topTabTextActive]}>{t('Dungeon')}</Text>
      </Pressable>
    </View>

    {topTab==='dungeon'?<View style={s.dungeonCard}>
      <Text style={s.overline}>{t('DUNGEONS')}</Text>
      <Text style={s.cardTitle}>{t('Expedition staging')}</Text>
      <Text style={s.body}>{t('Build a party with Echoes and run online Q-Mode expeditions from the current region.')}</Text>
      <GameButton title={t('Open Dungeons')} disabled={!onCoop} onPress={()=>onCoop?.()}/>
      {!onCoop?<Text style={s.body}>{t('Dungeons are available when online play is configured.')}</Text>:null}
    </View>:<>
      <WorldChapterNavigator
        state={state} currentRegionId={currentId} goalRegionId={goalRegionId}
        onTravel={onTravel} onOpenCombat={onOpenCombat} onOpenSkills={onOpenSkills}
      />
      {extraContent?<View style={s.extraWrap}>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:expandedProgress}}
          onPress={()=>setExpandedProgress(open=>!open)} style={({pressed})=>[s.extraToggle,pressed&&s.pressed]}>
          <View style={s.flex}>
            <Text style={s.extraTitle}>{p('Regional story & progress')}</Text>
            <Text style={s.extraHint}>{p('Story, rewards and region achievements')}</Text>
          </View>
          <Text style={s.extraChevron}>{expandedProgress?'⌃':'⌄'}</Text>
        </Pressable>
        {expandedProgress?<View style={s.extraContent}>
          {storyRegion?<RegionalStoryLeadsPanel state={state} regionId={storyRegion} onOpenCombat={()=>onOpenCombat()}/>:null}
          {sunscar&&onRegionalRewardsChanged?<RegionalCombatPanel state={state} onRewardsChanged={onRegionalRewardsChanged}/>:null}
          {frostmarch?<RegionalJournalPanel name="Frostmarch" progress={frostmarchProgress}/>:null}
          {frostmarch&&onCoop?<View style={s.dungeonList}>
            <Text style={s.overline}>{p('Frostmarch co-op')}</Text>
            {frostmarchCardsV21(level).dungeons.map(dungeon=><View key={dungeon.id} style={s.dungeonRow}>
              <View style={s.flex}>
                <Text style={s.dungeonName}>{p(dungeon.name)}</Text>
                <Text style={s.extraHint}>{t('Level {level}',{level:dungeon.minLevel})}</Text>
              </View>
              <GameButton compact tone="secondary" disabled={dungeon.locked} title={dungeon.locked?t('Locked'):t('Dungeon')} onPress={()=>onCoop(dungeon.id)}/>
            </View>)}
          </View>:null}
        </View>:null}
      </View>:null}
    </>}
  </ScrollView>;
}

function makeStyles(C:ThemeColors){
  const equipmentColors=equipmentTheme(C);
  return StyleSheet.create({
    root:{padding:spacing.md,gap:10,paddingBottom:spacing.xl},
    heading:{...typography.hero,color:C.text},
    flex:{flex:1,minWidth:0},
    topTabs:{flexDirection:'row',borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel},
    topTab:{flex:1,minHeight:42,alignItems:'center',justifyContent:'center',paddingHorizontal:spacing.sm},
    topTabActive:{backgroundColor:C.accent},
    topTabText:{...typography.bodyStrong,color:C.muted,textAlign:'center'},
    topTabTextActive:{color:C.dark?C.bg:C.panel},
    dungeonTabsWrap:{paddingHorizontal:spacing.lg,paddingTop:spacing.sm,paddingBottom:spacing.xs},
    dungeonCard:{gap:spacing.sm,padding:spacing.lg,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:equipmentColors.panel},
    overline:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'800',letterSpacing:1},
    cardTitle:{...typography.title,color:C.text},
    body:{...typography.body,color:C.muted},
    extraWrap:{borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel},
    extraToggle:{flexDirection:'row',alignItems:'center',gap:8,padding:spacing.md,minHeight:50},
    extraTitle:{...typography.bodyStrong,color:C.text},
    extraHint:{fontSize:10,lineHeight:15,color:C.muted,marginTop:2},
    extraChevron:{fontSize:20,color:C.muted},
    extraContent:{gap:9,padding:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
    dungeonList:{gap:7},dungeonRow:{flexDirection:'row',alignItems:'center',gap:8,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
    dungeonName:{...typography.bodyStrong,color:C.text},
    pressed:{opacity:.7},
  });
}
