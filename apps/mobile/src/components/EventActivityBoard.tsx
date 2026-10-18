import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {EventActivitySource} from '../content/live-events';
import {eventContractBoard} from '../core/live-events';
import {useGameTheme} from '../theme/ThemeContext';
import {ActivityArtwork} from './ActivityArtwork';
import {GameButton} from './GameButton';
import {QuestBoard} from './QuestBoard';
import {QuestPosting} from './QuestPosting';
import {StatBar} from './StatBar';
import {StatusPill} from './StatusPill';

export function EventActivityBoard({state,now,currencyName,prestigeName,busy,pendingId,onClaim,onOpen,onBoss}:{state:GameState;now:number;currencyName:string;prestigeName:string;busy:boolean;pendingId:string|null;onClaim:(id:string)=>Promise<void>;onOpen?:(source:Exclude<EventActivitySource,'boss'>)=>void;onBoss?:()=>void}){
 const C=useGameTheme(),contracts=eventContractBoard(state,now),claimed=contracts.filter(row=>row.claimed).length;
 const rows=[...contracts].sort((a,b)=>Number(a.claimed)-Number(b.claimed)||Number(b.progress>=b.objective.required)-Number(a.progress>=a.objective.required));
 return <QuestBoard>
  <View style={s.summary}><Text style={[s.eyebrow,{color:C.info}]}>WEEKLY ACTIVITIES</Text><Text style={[s.copy,{color:C.muted}]}>{claimed} / {contracts.length} claimed · Progress tracks automatically</Text></View>
  {!rows.length?<Text style={[s.copy,{color:C.muted}]}>No weekly activities are posted for this event.</Text>:null}
  {rows.map(contract=>{
   const objective=contract.objective,ready=contract.progress>=objective.required,open=objective.source==='boss'?onBoss:onOpen?()=>onOpen(objective.source as Exclude<EventActivitySource,'boss'>):undefined;
   return <QuestPosting key={contract.id}>
    <View style={s.head}><View style={s.flex}><Text style={[s.eyebrow,{color:C.info}]}>{objective.source.toUpperCase()}</Text><Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{objective.name}</Text></View><ActivityArtwork id={objective.source==='combat'||objective.source==='boss'?'combat':objective.source==='gathering'?'herbalism':'smithing'} size={44}/></View>
    <Text style={[s.copy,{color:C.muted}]}>{objective.description}</Text>
    <StatBar rounded label="Activity progress" current={Math.min(contract.progress,objective.required)} max={objective.required} reduceMotion={state.settings.reduceMotion}/>
    <Text style={[s.copy,{color:C.text}]}>{objective.rewardCurrency.toLocaleString()} {currencyName}{objective.rewardPrestige>0?` · ${objective.rewardPrestige} ${prestigeName}`:''}</Text>
    {contract.claimed?<StatusPill label="CLAIMED" tone="good"/>:ready?<GameButton title={pendingId===objective.id?'Claiming…':'Claim reward'} disabled={busy} onPress={()=>{void onClaim(objective.id)}}/>:open?<GameButton title={objective.source==='combat'?'Go hunting':objective.source==='gathering'?'Open gathering':objective.source==='crafting'?'Open crafting':'Open event boss'} tone="secondary" onPress={open}/>:<Text style={[s.copy,{color:C.muted}]}>{Math.max(0,objective.required-contract.progress).toLocaleString()} remaining</Text>}
   </QuestPosting>;
  })}
 </QuestBoard>;
}
const s=StyleSheet.create({summary:{gap:5,paddingHorizontal:3,paddingBottom:3},head:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0,gap:4},eyebrow:{fontSize:11,lineHeight:16,fontWeight:'700',letterSpacing:.7},title:{fontSize:18,lineHeight:24,fontWeight:'700'},copy:{fontSize:13,lineHeight:19}});
