import React,{useMemo,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import type {PartyContractView,PersistentPartySummary} from '../core/party-social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {partyProgressNumber,usePartyProgressUiText} from '../i18n/party-progress-ui';
import {useGameTheme} from '../theme/ThemeContext';

/** Small, server-authoritative member breakdown, kept collapsed under the
 * weekly ladder to avoid growing the Contracts page with repeated cards.
 */
export function PartyContractContributions({contract,party,accountId}:{contract:PartyContractView;party:PersistentPartySummary;accountId:string}){
 const C=useGameTheme(),pt=usePartyProgressUiText(),language=useGameLanguage();
 const [expanded,setExpanded]=useState(false);
 const hasSnapshot=Array.isArray(contract.memberContributions);
 const rows=useMemo(()=>party.members.map(member=>({
  id:member.accountId,
  name:member.characterName,
  points:hasSnapshot?Math.max(0,contract.memberContributions!.find(row=>row.accountId===member.accountId)?.points??0):undefined,
 })).sort((a,b)=>(b.points??0)-(a.points??0)||a.name.localeCompare(b.name)),[party.members,contract.memberContributions,hasSnapshot]);
 const fmt=(points:number)=>partyProgressNumber(language,points);
 return <View style={{gap:8}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={pt('Member contributions')} onPress={()=>setExpanded(value=>!value)}
   style={{minHeight:46,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel,paddingHorizontal:12,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:8}}>
   <View style={{flex:1,gap:2}}>
    <Text style={{fontSize:13,fontWeight:'800',color:C.text}}>{pt('Member contributions')}</Text>
    <Text style={{fontSize:11,color:C.muted}}>{pt('{count} current members',{count:party.members.length})}</Text>
   </View>
   <Text style={{fontSize:18,fontWeight:'800',color:C.info}}>{expanded?'−':'+'}</Text>
  </Pressable>
  {expanded?<View style={{paddingHorizontal:8,paddingVertical:6,gap:10}}>
   {!hasSnapshot?<Text style={{fontSize:12,color:C.muted}}>{pt('Contribution details are updating. Try again after syncing.')}</Text>:rows.map(row=>{
    const points=row.points??0,pct=contract.totalPoints>0?Math.min(100,points/contract.totalPoints*100):0;
    return <View key={row.id} style={{gap:5}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
      <Text numberOfLines={1} style={{flex:1,fontSize:12,fontWeight:row.id===accountId?'800':'600',color:row.id===accountId?C.accent:C.text}}>{row.name}{row.id===accountId?' · '+pt('You'):''}</Text>
      <Text style={{fontSize:12,fontWeight:'800',color:points>0?C.text:C.muted,fontVariant:['tabular-nums']}}>{fmt(points)} {pt('points')}</Text>
     </View>
     <View accessibilityRole="progressbar" accessibilityLabel={row.name+' · '+fmt(points)+' '+pt('points')} accessibilityValue={{min:0,max:100,now:Math.round(pct)}}
      style={{height:5,backgroundColor:C.line,borderRadius:5,overflow:'hidden'}}>
      <View style={{width:`${pct}%`,height:'100%',borderRadius:5,backgroundColor:row.id===accountId?C.accent:C.info}}/>
     </View>
    </View>;
   })}
   {hasSnapshot?<Text style={{fontSize:11,lineHeight:16,color:C.muted}}>{pt('Current members only. Earlier contributions may still count toward the party total.')}</Text>:null}
  </View>:null}
 </View>;
}
