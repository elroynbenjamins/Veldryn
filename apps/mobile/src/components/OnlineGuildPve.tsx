import {useEffect,useMemo,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {onlineConfigured} from '../online/supabase';
import {guildContribute,guildWeeklyState,type GuildWeeklyState} from '../online/social';
import {formatGameNumber} from '../core/number-format';

export function OnlineGuildPve({numberMode='abbreviated',authoritative=false}:{numberMode?:'abbreviated'|'exact';authoritative?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [state,setState]=useState<GuildWeeklyState|null>(null),[busy,setBusy]=useState(false);
 const load=async()=>{if(!onlineConfigured)return;setBusy(true);try{setState(await guildWeeklyState())}catch(error){Alert.alert('Guild PvE',error instanceof Error?error.message:'Unable to load weekly Guild state.')}finally{setBusy(false)}};
 useEffect(()=>{void load()},[]);
 if(!onlineConfigured)return null;
 if(!state)return <Panel><Text style={s.title}>Weekly Guild PvE</Text><Text style={s.sub}>{busy?'Loading Guild PvE…':'Join a Guild to participate in weekly projects and the Guild boss.'}</Text>{!busy?<GameButton compact title="Refresh" tone="secondary" onPress={()=>void load()}/>:null}</Panel>;
 const doContribution=async(kind:'project'|'boss',amount:number)=>{setBusy(true);try{await guildContribute(kind,amount);await load()}catch(error){Alert.alert('Guild PvE',error instanceof Error?error.message:'Unable to record contribution.')}finally{setBusy(false)}};
 const projectPct=Math.min(100,state.project_goal>0?state.project_progress/state.project_goal*100:0),bossPct=Math.max(0,state.boss_max_hp>0?state.boss_hp/state.boss_max_hp*100:0);
 return <View style={s.root}>
  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>WEEKLY PROJECT</Text><Text style={s.title}>Guild Project</Text><Text style={s.sub}>{formatGameNumber(state.project_progress,numberMode)} / {formatGameNumber(state.project_goal,numberMode)} progress</Text></View><View style={s.percentPill}><Text style={s.percent}>{Math.round(projectPct)}%</Text></View></View>
   <View style={s.track}><View style={[s.fill,{width:(projectPct+'%') as any}]}/></View>
   {authoritative?<Text style={s.note}>Verified gathering and crafting advance the shared project automatically.</Text>:<GameButton compact title="Contribute 100 points" disabled={busy} onPress={()=>void doContribution('project',100)}/>}
  </Panel>
  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>GUILD BOSS</Text><Text style={s.title}>Weekly Boss</Text><Text style={s.sub}>{formatGameNumber(state.boss_hp,numberMode)} / {formatGameNumber(state.boss_max_hp,numberMode)} HP remaining</Text></View><View style={[s.percentPill,s.bossPill]}><Text style={[s.percent,s.bossPercent]}>{Math.round(bossPct)}%</Text></View></View>
   <View style={s.track}><View style={[s.boss,{width:(bossPct+'%') as any}]}/></View>
   {authoritative?<Text style={s.note}>Verified combat contributes within your weekly allowance.</Text>:<GameButton compact title="Deal 1,000 boss damage" disabled={busy||state.boss_hp===0} onPress={()=>void doContribution('boss',1000)}/>}
  </Panel>
  <GameButton compact title={busy?'Refreshing…':'Refresh weekly PvE'} tone="secondary" disabled={busy} onPress={()=>void load()}/>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},sub:{fontSize:10,lineHeight:14,color:C.muted,marginTop:1},note:{fontSize:9,lineHeight:13,color:C.muted,marginTop:6},
 percentPill:{minWidth:48,alignItems:'center',justifyContent:'center',paddingHorizontal:7,paddingVertical:5,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
 percent:{fontSize:10,color:C.info,fontWeight:'900'},bossPill:{borderColor:C.bad,backgroundColor:C.badSurface},bossPercent:{color:C.bad},
 track:{height:8,backgroundColor:C.panel2,borderRadius:4,overflow:'hidden',marginTop:8},fill:{height:'100%',backgroundColor:C.accent},boss:{height:'100%',backgroundColor:C.bad},
});}
