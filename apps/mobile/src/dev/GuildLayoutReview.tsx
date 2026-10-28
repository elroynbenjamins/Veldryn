/** Isolated presentation fixtures: no account reads, mutations or saved data. */
import {useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GameThemeProvider} from '../theme/ThemeContext';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {resolveTheme} from '../theme/theme';
import {GuildMemberIdentityCard} from '../components/GuildMemberIdentity';
import {GuildDiscoveryWelcome} from '../components/GuildDiscoveryFlow';
import {GuildHomeActions} from '../components/GuildHomeActions';
import {GuildActivityMeter} from '../components/GuildActivitySummaryPanel';
import {GuildNavigation} from '../components/GuildNavigation';
import {GuildChatView} from '../components/GuildChat';
import {ChatViewport} from '../components/ChatViewport';
import {GameButton} from '../components/GameButton';
import {GameTopBar} from '../components/GameTopBar';
import {PrimaryNavigation} from '../components/PrimaryNavigation';
import {createCharacter,newGame} from '../core/game';
import type {OnlineGuild,GuildChatMessage} from '../online/social';
import type {OnlineGuildActivityState} from '../online/guild-muster';

const noop=()=>{};
const guild:OnlineGuild={id:'preview',name:'Stormwatch',tag:'STW',tag_color_id:'tag_silver',level:8,member_cap:20,minimum_level:10,join_policy:'apply',banner_id:'swordwing_blue',profile_frame_id:'classic',background_id:'guild_plaza',name_color_id:'name_ivory',nameplate_id:'classic',motto:'Together through the storm.'};
const activity:OnlineGuildActivityState={guildId:'preview',activityPercent:72,activityTargetUnits:1000,activityTodayUnits:300,activeMemberCount:12,decayMode:'protected',partialDecayPercent:5,inactiveDecayPercent:10,gatheringSpeedBps:500,productionSpeedBps:500,skillXpBps:500,masteryXpBps:0,rareMaterialRelativeBps:0};
const messages:GuildChatMessage[]=['Welcome back!','Working on the project.','Ready for the guild boss.'].map((body,i)=>({id:'preview-'+i,account_id:'',sender_name:['Elowen','Brann','Mira'][i],body,guild_role:i===0?'leader':i===1?'officer':'member',created_at:new Date(Date.now()-(3-i)*60000).toISOString()}));

export default function GuildLayoutReview(){
 const query=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),theme=query.get('theme')==='ivory'?'ivory':'obsidian',C=resolveTheme(theme);
 const [screen,setScreen]=useState(query.get('screen')??'Home'),[body,setBody]=useState(''),[feed,setFeed]=useState(messages),[state]=useState(()=>createCharacter(newGame(Date.now()),'IRONWARDEN','Guild Review'));
 const officer=query.get('role')==='officer';
 const [notice,setNotice]=useState('');
 return <SafeAreaProvider><GameThemeProvider themeId={theme}><GameLanguageProvider language="en"><View style={{flex:1,minHeight:0,backgroundColor:C.bg}}>
 {screen==='Chat'?<View style={{flex:1,minHeight:0,padding:8,justifyContent:'flex-end'}}><View style={{flex:1,maxHeight:query.has('typing')?'96%':'88%',minHeight:0,borderRadius:14,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,overflow:'hidden'}}><View style={{flex:1,minHeight:0,padding:10}}><ChatViewport><GuildChatView language="en" guild={{id:guild.id,name:guild.name,tag:guild.tag,tagColorId:guild.tag_color_id}} messages={feed} body={body} onBodyChange={setBody} onSend={()=>{if(body.trim()){setFeed(old=>[...old,{id:'sent-'+old.length,account_id:'',sender_name:'You',body,created_at:new Date().toISOString()}]);setBody('')}}} onSelectMessage={()=>{}}/></ChatViewport></View></View></View>:<>
 <GameTopBar state={state} nowMs={Date.now()} labelForDestination={id=>id} onNavigate={noop} onChangeDestinations={noop} onOpenActivity={noop} online={false}/>
 {screen!=='Guildless'?<GuildNavigation value={screen} onChange={setScreen}/>:null}
 <ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{padding:12,gap:12}}>
 {screen==='Guildless'?<GuildDiscoveryWelcome onFind={()=>setNotice('Find a Guild opened')} onCreate={()=>setNotice('Create a Guild opened')}/>:<>
 <GuildMemberIdentityCard guild={guild} role={officer?'officer':'member'} members={12} onRoster={()=>setNotice('Members opened')} onManage={officer?()=>setNotice('Management opened'):undefined}/>
 <GuildHomeActions activity={<GuildActivityMeter state={activity} compact/>} board={<Text style={{color:C.text,borderLeftWidth:2,borderColor:C.good,padding:12}}>Rally together this week.</Text>} onMuster={()=>setNotice('Automatic muster opened')} onQuests={()=>setNotice('Quests opened')} onShop={()=>setNotice('Token shop opened')} onPve={()=>setNotice('Raid opened')} onRoster={noop} onHall={()=>setNotice('Hall opened')} onChat={()=>setScreen('Chat')} onManage={noop}/>
 </>}{notice?<Text accessibilityRole="alert" style={{color:C.good}}>{notice}</Text>:null}
 </ScrollView><PrimaryNavigation destinations={['Character','Skills','World','Inventory','More']} active="More" labelFor={id=>id} onNavigate={noop}/>
 </>}
 </View></GameLanguageProvider></GameThemeProvider></SafeAreaProvider>;
}
