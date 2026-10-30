import {useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ScrollView,Text,View} from 'react-native';
import {GuildPveEncounterCard} from '../components/OnlineGuildPve';
import {GameButton} from '../components/GameButton';
import {GUILD_PVE_BANK_REWARDS,type GuildPveEncounter} from '../core/guild-pve-encounters';
import {createCharacter,newGame} from '../core/game';
import {unlockCombatCompanion,equipCombatCompanion} from '../core/combat-companions';
import {GameThemeProvider} from '../theme/ThemeContext';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {resolveTheme,type UiThemeId} from '../theme/theme';
/** Isolated visual fixture: no auth provider, saved data, or reward RPC calls. */
export default function GuildPveReview(){
 return <SafeAreaProvider><GuildPveReviewContent/></SafeAreaProvider>;
}
function GuildPveReviewContent(){
 const query=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search);
 const theme:UiThemeId=query.get('theme')==='ivory'?'ivory':'obsidian',C=resolveTheme(theme),now=Date.now();
 const [state]=useState(()=>equipCombatCompanion(unlockCombatCompanion(createCharacter(newGame(now),'IRONWARDEN','Aldric','male'),'UNIT_001',now),'UNIT_001'));
 const base:GuildPveEncounter={rosterSize:12,personalCap:30000,dailyCap:6000,dailyUsed:0,attemptCap:3,attemptsUsed:1,lastAttemptDamage:6420,lastAttemptCharacterDamage:5570,lastAttemptCompanionDamage:850,lastAttemptCompanionId:'UNIT_001',eligible:true,id:'weekly',kind:'weekly',name:'Rootbound Colossus',startsAt:new Date(now-86400000).toISOString(),endsAt:new Date(now+3*86400000).toISOString(),claimEndsAt:new Date(now+10*86400000).toISOString(),maxHp:180000,damage:108000,personalDamage:18000,allowanceUsed:18000,contributors:9,claimed:[25]};
 const [kind,setKind]=useState<'weekly'|'event'>('weekly'),[claims,setClaims]=useState<Record<string,number[]>>({weekly:[25]}),[attempts,setAttempts]=useState<Record<string,number>>({}),[pending,setPending]=useState<Record<string,string>>({});
 const [bank,setBank]=useState({gold:2500,xp:100,materials:75});
 const [mode,setMode]=useState('ready'),id=kind;
 const row:GuildPveEncounter={...base,id,kind,name:kind==='event'?'The Veilbreak':base.name,eventId:kind==='event'?'EVT_ANNUAL_010_2026':undefined,claimed:claims[id]??[],attemptsUsed:mode==='exhausted'?3:attempts[id]??1,guildLevel:mode==='locked'?1:4,requiredGuildLevel:3,eligible:mode!=='roster',pendingAttempts:pending[id]?1:0,nextAttemptResolvesAt:pending[id],...(mode==='expired'?{claimEndsAt:new Date(now-1000).toISOString(),endsAt:new Date(now-86400000).toISOString()}:{}),...(mode==='defeated'?{damage:base.maxHp}:{}),...(mode==='upcoming'?{startsAt:new Date(now+86400000).toISOString()}:{}),...(mode==='new'?{lastAttemptDamage:undefined,lastAttemptCharacterDamage:undefined,lastAttemptCompanionDamage:undefined,lastAttemptCompanionId:undefined}:{} )};
 return <GameThemeProvider themeId={theme}><GameLanguageProvider language={query.get('language')==='de'?'de':'en'}><ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:16,gap:12,maxWidth:500,width:'100%',alignSelf:'center'}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><Text style={{color:C.muted,fontSize:11}}>ISOLATED UI PREVIEW · SAMPLE PROGRESS</Text><Text style={{color:C.text,fontSize:28,fontWeight:'800'}}>The Raid Gate</Text><Text style={{color:C.muted,fontSize:13}}>Three-minute fights. One shared guild victory.</Text><Text style={{color:C.accent,fontSize:12,fontWeight:'800'}}>Guild Bank earned in this preview · {bank.gold.toLocaleString()} Gold · {bank.materials} materials · {bank.xp} Guild XP</Text><View style={{flexDirection:'row',gap:8}}>{(['weekly','event'] as const).map(item=><View key={item} style={{flex:1}}><GameButton compact tone="secondary" selected={kind===item} title={item==='weekly'?'Weekly boss':'Event boss'} onPress={()=>setKind(item)}/></View>)}</View><GuildPveEncounterCard key={kind} state={state} row={row} onClaim={percent=>{if((claims[id]??[]).includes(percent))return;const reward=GUILD_PVE_BANK_REWARDS[kind][percent as 25|50|100];setBank(old=>({gold:old.gold+reward.gold,xp:old.xp+reward.xp,materials:old.materials+Object.values(reward.materials).reduce((sum,n)=>sum+n,0)}));setClaims(old=>({...old,[id]:[...(old[id]??[]),percent]}))}} onAttempt={()=>{setAttempts(old=>({...old,[id]:(old[id]??1)+1}));setPending(old=>({...old,[id]:new Date(Date.now()+180000).toISOString()}))}}/><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{['ready','new','locked','exhausted','roster','upcoming','defeated','expired'].map(item=><GameButton key={item} compact tone="secondary" selected={mode===item} title={item} onPress={()=>{setMode(item);setPending({})}}/>)}</View></ScrollView></GameLanguageProvider></GameThemeProvider>;
}
