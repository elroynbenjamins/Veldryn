import {useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {EventScreen} from '../screens/EventScreen';
import {GameButton} from '../components/GameButton';
import {GameThemeProvider} from '../theme/ThemeContext';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {isSupportedLanguage} from '../i18n/languages';
import {resolveTheme,type UiThemeId} from '../theme/theme';
import {createCharacter,newGame} from '../core/game';
import {executeGameCommand} from '../core/game-commands';
import {eventMilestones} from '../core/live-events';
import type {GameState} from '../core/types';

/** Explicit visual fixture. Requests and rewards are simulated in memory, never sent online. */
function fixture(mode:string){
 const now=Date.now(),id='EVT_ANNUAL_010_2026',created=createCharacter(newGame(now),'IRONWARDEN','Trail Review');
 let state:GameState={...created,quests:created.quests.map(quest=>({...quest,status:'claimed' as const})),account:{...created.account,liveEvent:{enabled:true,eventId:id,startsAtMs:now-86400000,endsAtMs:mode==='claiming'?now-3600000:now+3*86400000,graceEndsAtMs:now+10*86400000},eventProgressById:{[id]:mode==='zero'?0:mode==='complete'||mode==='claimed'?30000:1240}}};
 const rows=eventMilestones(state,now).filter(row=>!row.reward.kind.startsWith('guild_'));
 state={...state,account:{...state.account,eventRewardClaimIds:mode==='claimed'?rows.map(row=>`${id}:${row.reward.id}`):mode==='zero'?[]:[`${id}:${rows[0].reward.id}`]}};
 return state;
}
export default function EventRewardReview(){return <SafeAreaProvider><EventRewardReviewContent/></SafeAreaProvider>;}
function EventRewardReviewContent(){
 const query=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),theme:UiThemeId=query.get('theme')==='ivory'?'ivory':'obsidian',language=query.get('language'),C=resolveTheme(theme);
 const [state,setState]=useState(()=>fixture('active')),[calls,setCalls]=useState(0),[fail,setFail]=useState(query.get('fail')==='1'),current=useRef(state);
 const change=(next:GameState)=>{current.current=next;setState(next)};
 return <GameThemeProvider themeId={theme}><GameLanguageProvider language={isSupportedLanguage(language)?language:'en'}><View style={{flex:1,backgroundColor:C.bg}}>{!query.has('capture')?<View style={{padding:10,gap:6,maxWidth:520,width:'100%',alignSelf:'center'}}><Text style={{color:C.muted,fontSize:11}}>ISOLATED EVENT PREVIEW · MEMORY ONLY · requests {calls}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>{['active','zero','claiming','complete','claimed'].map(mode=><GameButton key={mode} compact tone="secondary" title={mode} onPress={()=>{change(fixture(mode));setCalls(0)}}/>)}<GameButton compact tone="secondary" title={fail?'Failures on':'Failures off'} onPress={()=>setFail(!fail)}/></View></View>:null}<View style={{flex:1,width:'100%',maxWidth:520,alignSelf:'center'}}><EventScreen state={state} onChange={change} onCommand={async command=>{setCalls(count=>count+1);await new Promise(resolve=>setTimeout(resolve,1000));if(fail)return false;change(executeGameCommand(current.current,command,Date.now()).state);return true}}/></View></View></GameLanguageProvider></GameThemeProvider>;
}
