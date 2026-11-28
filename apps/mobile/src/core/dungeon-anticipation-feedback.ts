/** Presentation only. Never pass these values to the combat replay or game state. */
export type PreviewFeedback={label:string;kind:'damage'|'heal';outcome?:'CRIT'};
export type PreviewCombatant={pct:number;feedback?:PreviewFeedback};
type PreviewSlot={role:string;ready?:boolean;currentHp?:number;maximumHp?:number};
const finite=(n:number|undefined,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
const initialPct=(slot:PreviewSlot)=>Math.max(0,Math.min(1,finite(slot.currentHp,finite(slot.maximumHp,1))/Math.max(1,finite(slot.maximumHp,finite(slot.currentHp,1)))));
export function dungeonAnticipationFeedback(slots:readonly PreviewSlot[],enemyCount:number,boss:boolean,level:number,tick:number){
 const party:PreviewCombatant[]=slots.map(slot=>({pct:initialPct(slot)}));
 const enemies:PreviewCombatant[]=Array.from({length:Math.max(1,Math.min(4,enemyCount))},()=>({pct:1}));
 const target=slots.findIndex(slot=>slot.role==='tank'&&slot.ready!==false&&finite(slot.currentHp,1)>0);
 const partyTarget=target>=0?target:slots.findIndex(slot=>slot.ready!==false&&finite(slot.currentHp,1)>0);
 const scale=Math.max(1,finite(level,1));
 // Bound all work and visible HP changes even when the network is slow.
 const steps=Math.min(32,Math.max(0,Math.floor(tick)));
 for(let step=0;step<steps;step++){
  const actor=step%(slots.length+1),round=Math.floor(step/(slots.length+1)),last=step===tick-1;
  if(actor===slots.length){
   if(partyTarget<0)continue;
   const p=party[partyTarget],floor=Math.min(p.pct,.78),delta=Math.min(.055,Math.max(0,p.pct-floor));
   if(delta<=0)continue;
   p.pct-=delta;
   if(last)p.feedback={label:'−'+Math.max(1,Math.round(delta*finite(slots[partyTarget].maximumHp,scale*40))),kind:'damage'};
  }else if(slots[actor].ready!==false&&party[actor].pct>0){
   const p=party[partyTarget];
   if(slots[actor].role==='support'&&p&&p.pct<initialPct(slots[partyTarget])){
    const ceiling=initialPct(slots[partyTarget]);
    const delta=Math.min(.04,ceiling-p.pct);
    p.pct+=delta;
    if(last)p.feedback={label:'+'+Math.max(1,Math.round(delta*finite(slots[partyTarget].maximumHp,scale*40))),kind:'heal'};
   }else{
    const e=enemies[(round+actor)%enemies.length],critical=(round+actor)%5===2;
    const delta=Math.min((boss ? .018 : .035)*(critical?1.5:1),Math.max(0,e.pct-.72));
    if(delta<=0)continue;
    e.pct-=delta;
    if(last)e.feedback={label:'−'+Math.max(1,Math.round(delta*scale*(boss?220:95))),kind:'damage',outcome:critical?'CRIT':undefined};
   }
  }
 }
 return {party,enemies};
}
