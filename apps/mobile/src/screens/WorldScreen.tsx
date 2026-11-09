import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionText} from '../i18n/progression';
import type {GameState} from '../core/types';
import {currentRegionId} from '../core/combat-region';
import {WorldChapterNavigator} from '../components/WorldChapterNavigator';
import {RegionalCombatPanel} from '../components/RegionalCombatPanel';
import {RegionalJournalPanel} from '../components/RegionalJournalPanel';
import {RegionalStoryLeadsPanel} from '../components/RegionalStoryLeadsPanel';
import {frostmarchProgressFromState,type RegionProgressV21} from '../core/region-content-v21';
import {loadActiveFrostmarchContentVersionV21,loadFrostmarchProgressV21} from '../online/regional-content-v21';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

type Props={
  state:GameState;
  onTravel:(regionId:string)=>void;
  onOpenCombat:(zoneId?:string)=>void;
  onOpenSkills:(areaId?:string)=>void;
  onRegionalRewardsChanged?:()=>Promise<void>|void;
  goalRegionId?:string;
};

export function WorldScreen({state,onTravel,onOpenCombat,onOpenSkills,onRegionalRewardsChanged,goalRegionId}:Props){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const p=(text:string)=>progressionText(language,text);
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const currentId=currentRegionId(state);
  const sunscar=currentId==='SUNSCAR',frostmarch=currentId==='FROSTMARCH';
  const storyRegion=currentId==='SUNSCAR'||currentId==='FROSTMARCH'||currentId==='ASHLANDS'?currentId:undefined;
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

  // World is only for regions, combat, gathering, and exploration.
  return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.heading}>{p('World')}</Text>
    <WorldChapterNavigator
        state={state} currentRegionId={currentId} goalRegionId={goalRegionId}
        onTravel={onTravel} onOpenCombat={onOpenCombat} onOpenSkills={onOpenSkills}
      >
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

        </View>:null}
      </View>:null}
    </WorldChapterNavigator>
  </ScrollView>;
}

function makeStyles(C:ThemeColors){
  return StyleSheet.create({
    root:{padding:spacing.md,gap:10,paddingBottom:spacing.xl},
    heading:{...typography.hero,color:C.text},
    flex:{flex:1,minWidth:0},
    extraWrap:{borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel},
    extraToggle:{flexDirection:'row',alignItems:'center',gap:8,padding:spacing.md,minHeight:50},
    extraTitle:{...typography.bodyStrong,color:C.text},
    extraHint:{fontSize:10,lineHeight:15,color:C.muted,marginTop:2},
    extraChevron:{fontSize:20,color:C.muted},
    extraContent:{gap:9,padding:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
    pressed:{opacity:.7},
  });
}
