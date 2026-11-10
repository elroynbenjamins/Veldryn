import {previewPartyEventFinaleReadiness,partyEventVoteClosesAt,PARTY_EVENT_FINALE_READINESS_V3_RELEASED} from '../weekly-party-finale-readiness-v3';
import {weeklyPartyBudget,buildWeeklyPartySupplyOrders,type VerifiedSupplyItem} from '../weekly-party-events-v2';
function ok(v:unknown,msg:string):asserts v{if(!v)throw Error('party-readiness-v3: '+msg);}
const start=Date.parse('2026-11-09T00:00:00Z'),end=start+7*86400000;
const catalog:VerifiedSupplyItem[]=[
 {itemId:'GREENWOOD_LOG',category:'wood',tier:'common',secondsPerUnit:20,unlocked:true},
 {itemId:'COPPER_ORE',category:'ore',tier:'common',secondsPerUnit:20,unlocked:true},
 {itemId:'DEWLEAF',category:'herb',tier:'common',secondsPerUnit:30,unlocked:true},
];
const budget=weeklyPartyBudget(2,'standard');
const full=buildWeeklyPartySupplyOrders('broken_caravan',budget,catalog,9).map(o=>({...o,donatedQuantity:o.quantity}));
const base={stage:3 as const,totalEventPoints:budget.progressTarget,budget,orders:full,
 voteResolved:true,finaleCleared:false,completed:false};
const ready=previewPartyEventFinaleReadiness({stage:base,eventEndsAtMs:end,nowMs:end-1,bossResultCommitted:false});
ok(ready.state==='ready_for_finale'&&ready.fullPreparation&&!ready.bossSettled,'preclose is readiness, NOT victory');
ok(ready.eligibleForRewardGrant===false,'never grant rewards from a preview');
const frozen=previewPartyEventFinaleReadiness({stage:base,eventEndsAtMs:end,nowMs:end,bossResultCommitted:false});
ok(frozen.state==='frozen_full'&&!frozen.bossSettled,'close only freezes preparation');
const settled=previewPartyEventFinaleReadiness({stage:base,eventEndsAtMs:end,nowMs:end+3600000,bossResultCommitted:true});
ok(settled.state==='boss_settled_full'&&settled.bossSettled,'actual committed result is separate from win');
const partial=previewPartyEventFinaleReadiness({stage:{...base,orders:base.orders.map(o=>({...o,donatedQuantity:o.stage===3?0:o.quantity}))},
 eventEndsAtMs:end,nowMs:end,bossResultCommitted:false});
ok(partial.state==='frozen_partial'&&!partial.fullPreparation,'missing supply cannot be full preparation');
ok(previewPartyEventFinaleReadiness({stage:{...base,stage:1},eventEndsAtMs:end,nowMs:end+3600000,
 bossResultCommitted:true}).state==='boss_settled_partial','non-final stage cannot yield full outcome');
ok(partyEventVoteClosesAt(end-1000,end)===end,'vote auto-resolves at weekly close');
ok(partyEventVoteClosesAt(start,start+86400000)===start+21600000,'normal votes remain six hours');
let denied=false;try{previewPartyEventFinaleReadiness({stage:base,eventEndsAtMs:end,nowMs:end-1,bossResultCommitted:true});}
catch(e){denied=String(e).includes('premature');}
ok(denied,'never claim early Day 8 boss result');
ok(PARTY_EVENT_FINALE_READINESS_V3_RELEASED===false,'preview must remain dormant');
console.log('PASS Party Events v3 readiness: full, partial, preclose, committed-boss and vote-deadline isolation');
