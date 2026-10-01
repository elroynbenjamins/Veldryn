import {CLASSES} from '../src/content/classes';
import {GATHERING} from '../src/content/skills';
import {claimActivity,createCharacter,newGame,previewActivityReward,startCombat,startGathering,OFFLINE_CAP_SECONDS} from '../src/core/game';
import {normalizeSave} from '../src/core/save-normalization';
import type {GameState} from '../src/core/types';
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message)}
const start=Date.UTC(2026,9,12,12);let claims=0,reloads=0;
const delays=[1,150,1000,17000,60000,13*60000,3*3600000,12*3600000];
const stacks=(rows:GameState['inventory']['stacks'])=>Object.entries(rows.reduce<Record<string,number>>((sum,row)=>({...sum,[row.itemId]:(sum[row.itemId]??0)+row.quantity}),{})).sort(([a],[b])=>a.localeCompare(b));
const balances=(s:GameState)=>JSON.stringify({gold:s.character?.gold,xp:s.character?.xp,items:stacks(s.inventory.stacks),overflow:stacks(s.overflow.stacks),currency:Object.entries(s.account.eventCurrencyBalanceById??{}).sort(([a],[b])=>a.localeCompare(b))});
for(const cls of CLASSES)for(const lane of ['combat','gathering'] as const){
 let now=start,state=createCharacter(newGame(now),cls.id,'Bot '+cls.id.replaceAll('_',' '));
 state={...state,account:{...state.account,liveEvent:{eventId:'EVT_ANNUAL_009_2026',enabled:true,startsAtMs:start,endsAtMs:start+2*86400000}}};
 if(lane==='combat')state=startCombat(state,'MOSS_RAT',now);
 else{const target=GATHERING.find(x=>x.zoneId===state.currentRegionId&&x.unlockLevel===1);check(target,'Starter gathering fixture exists');state=startGathering(state,target.id,now);}
 for(let step=0;step<24;step++){
  now+=delays[step%delays.length];
  const preview=previewActivityReward(state,now),again=previewActivityReward(state,now);
  check(JSON.stringify(preview)===JSON.stringify(again),cls.id+' preview determinism');
  check(preview.elapsedSeconds<=OFFLINE_CAP_SECONDS,cls.id+' offline cap');
  const claimed=claimActivity(state,now);state=claimed.state;claims++;
  check(Number.isFinite(state.character!.gold)&&state.character!.gold>=0,cls.id+' valid wallet');
  check(state.inventory.stacks.every(row=>Number.isInteger(row.quantity)&&row.quantity>=0),cls.id+' valid inventory');
  const before=balances(state);
  const retry=claimActivity(state,now);check(balances(retry.state)===before,cls.id+' duplicate same-time claim must not change balances');
  state=normalizeSave(JSON.parse(JSON.stringify(state)));reloads++;
  check(balances(state)===before,cls.id+' '+lane+' step '+step+' save reload must preserve balances: '+before+' -> '+balances(state));
  const afterReload=claimActivity(state,now);check(balances(afterReload.state)===before,cls.id+' reload must not make old rewards claimable again');state=afterReload.state;
 }
}
console.log(JSON.stringify({status:'PASS',players:CLASSES.length*2,claims,reloads,checks:'combat/gathering, partial ticks, long absences, event boundary, deterministic previews, duplicate claim and save reload conservation'}));
