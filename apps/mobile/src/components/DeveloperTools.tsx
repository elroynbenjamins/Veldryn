import {useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ITEMS} from '../content/items';
import {MONSTERS} from '../content/monsters';
import {noviceItemId,noviceSetFor} from '../content/novice-sets';
import {debugAddGold,debugAddItem,debugAddXp,debugAdvanceActivity,debugDefeatFallenKnight,debugSetLevel,debugUnlockMonster} from '../dev/debug-tools';
import {GameState} from '../core/types';
import {C} from '../theme/theme';
import {debugCombatBalanceProbe} from '../dev/debug-tools';
import {activeLiveEvent,applyEventDrops,eventLifecycle,setLocalEventEnabled} from '../core/live-events';
export function DeveloperTools({state,onChange,onOpenChatPilot,onOpenCoopUiGallery}:{state:GameState;onChange:(next:GameState)=>void;onOpenChatPilot?:()=>void;onOpenCoopUiGallery?:()=>void}){
 const [notice,setNotice]=useState('');
 const liveEvent=eventLifecycle(state);
 const simulate=(seconds:number)=>{try{const samples=debugCombatBalanceProbe(state,seconds);console.log('[combat-balance]',JSON.stringify(samples,null,2));setNotice(`Logged ${samples.length} combat simulation rows`);}catch(e){setNotice(e instanceof Error?e.message:'Action failed')}}
 const run=(label:string,fn:(s:GameState)=>GameState)=>{try{onChange(fn(state));setNotice(`${label} applied`)}catch(e){setNotice(e instanceof Error?e.message:'Action failed')}};
 const grantSet=()=>{if(!state.character)return;let next=state;for(const slot of noviceSetFor(state.character.classId).slots)next=debugAddItem(next,noviceItemId(state.character.classId,slot));onChange(next);setNotice('Complete novice set added');};
 return <Panel><Text style={s.title}>Developer / testing</Text><Text style={s.warn}>Offline prototype only. These shortcuts persist to the local save and are not available to normal players or future server sessions.</Text><View style={s.grid}>
  {__DEV__&&onOpenChatPilot?<GameButton title="Open Chat Pilot" onPress={onOpenChatPilot}/>:null}
  {__DEV__&&onOpenCoopUiGallery?<GameButton title="Open Co-op UI Lab" onPress={onOpenCoopUiGallery}/>:null}
  <GameButton title="Set character level 25" onPress={()=>run('Level 25',s=>debugSetLevel(s,25))}/><GameButton title="Set character level 100" onPress={()=>run('Level 100',s=>debugSetLevel(s,100))}/>
  <GameButton title="Log 1h combat balance" onPress={()=>simulate(60*60)}/><GameButton title="Log 4h combat balance" onPress={()=>simulate(4*60*60)}/>
  <GameButton title="Add 10,000 XP" onPress={()=>run('XP',s=>debugAddXp(s,10000))}/><GameButton title="Add 100,000 gold" onPress={()=>run('Gold',s=>debugAddGold(s,100000))}/>
  <GameButton title="Add 100 of every material" onPress={()=>{let next=state;for(const i of ITEMS.filter(i=>i.type==='material'))next=debugAddItem(next,i.id,100);onChange(next);setNotice('Materials added')}}/>
  <GameButton title="Add enhancement test kit" onPress={()=>{let next=debugAddGold(state,500000);for(const item of ITEMS.filter(item=>item.type==='gem'))next=debugAddItem(next,item.id,5);next=debugAddItem(next,'TEMPERING_DUST',999);next=debugAddItem(next,'TEMPERING_CORE',99);onChange(next);setNotice('Gems and tempering resources added')}}/>
  <GameButton title="Grant complete novice set" onPress={grantSet}/><GameButton title="Grant Aster-Iron gear" onPress={()=>{let next=state;for(const id of ['ASTER_IRON_BLADE','ASTER_IRON_HELM','ASTER_IRON_CHEST','ASTER_IRON_LEGS','ASTER_IRON_BOOTS','ASTER_IRON_GLOVES','IRONWOOD_GUARD']){try{next=debugAddItem(next,id)}catch{}}onChange(next);setNotice('Aster-Iron gear added')}}/>
  <GameButton title="Unlock all encounters" onPress={()=>{let next=state;for(const m of MONSTERS)next=debugUnlockMonster(next,m.id);onChange(next);setNotice('All encounters unlocked')}}/><GameButton title="Advance activity 24 hours" onPress={()=>run('Activity time',s=>debugAdvanceActivity(s,86400))}/>
  <GameButton title="Defeat Fallen Knight" onPress={()=>run('Boss defeat',debugDefeatFallenKnight)}/><GameButton title="Max quest rewards" onPress={()=>{onChange({...state,quests:state.quests.map(q=>({...q,status:'complete' as const,progress:Number.MAX_SAFE_INTEGER}))});setNotice('Quest board completed')}}/>
  <GameButton title={liveEvent?'Disable live event':'Enable Harvestwake'} onPress={()=>run(liveEvent?'Live event disabled':'Harvestwake enabled',s=>setLocalEventEnabled(s,!eventLifecycle(s)))}/>
  <GameButton title="Add 250 event marks" disabled={!activeLiveEvent(state)} onPress={()=>{const event=activeLiveEvent(state);if(event)run('250 event marks',s=>applyEventDrops(s,[{eventId:event.definition.id,currencyId:event.definition.currencyId,name:event.definition.currencyName,quantity:250}]))}}/>
  <GameButton title="Complete event contracts" disabled={!activeLiveEvent(state)} onPress={()=>{const event=activeLiveEvent(state);if(event)run('Event contracts completed',s=>({...s,account:{...s.account,eventActivityById:{...(s.account.eventActivityById??{}),[event.definition.id]:{combat:300,gathering:180,crafting:12,boss:1}}}}))}}/>
 </View>{notice?<Text style={s.notice}>{notice}</Text>:null}</Panel>;
}
const s=StyleSheet.create({title:{color:C.text,fontSize:18,fontWeight:'900'},warn:{color:C.muted,lineHeight:20,marginTop:6},grid:{gap:8,marginTop:12},notice:{color:C.good,marginTop:10,fontWeight:'700'}});
