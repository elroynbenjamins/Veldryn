import {useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {GuildPveEncounterCard} from '../components/OnlineGuildPve';
import type {GuildPveEncounter} from '../core/guild-pve-encounters';
import {GameThemeProvider} from '../theme/ThemeContext';
import {resolveTheme} from '../theme/theme';
/** Isolated visual fixture: no auth provider, saved data, or reward RPC calls. */
export default function GuildPveReview(){
 const C=resolveTheme('obsidian'),now=Date.now();
 const base:GuildPveEncounter={rosterSize:12,personalCap:30000,dailyCap:6000,dailyUsed:2000,eligible:true,id:'weekly',kind:'weekly',name:'Rootbound Colossus',startsAt:new Date(now-86400000).toISOString(),endsAt:new Date(now+3*86400000).toISOString(),claimEndsAt:new Date(now+10*86400000).toISOString(),maxHp:180000,damage:108000,personalDamage:18000,allowanceUsed:18000,contributors:9,claimed:[25]};
 const [claims,setClaims]=useState([25]);
 return <GameThemeProvider themeId="obsidian"><ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:16,gap:12,maxWidth:500,width:'100%',alignSelf:'center'}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><Text style={{color:C.muted,fontSize:11}}>ISOLATED UI PREVIEW · SAMPLE PROGRESS</Text><Text style={{color:C.text,fontSize:28,fontWeight:'900'}}>Guild PvE</Text><Text style={{color:C.muted,fontSize:14,marginBottom:4}}>Fight together through everyday combat.</Text><GuildPveEncounterCard row={{...base,claimed:claims}} onClaim={percent=>setClaims(old=>[...old,percent])} onCombat={()=>{}}/><GuildPveEncounterCard row={{...base,id:'event',kind:'event',name:'Harvestwake',damage:74000,personalDamage:12000,allowanceUsed:12000,claimed:[]}} onClaim={()=>{}} onCombat={()=>{}}/><View style={{height:24}}/></ScrollView></GameThemeProvider>;
}
