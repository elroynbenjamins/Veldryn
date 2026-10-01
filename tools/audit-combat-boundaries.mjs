import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url),load=p=>require(path.join(root,'.combat-balance-build/apps/mobile/src',p+'.js'));
const game=load('core/game'),{REGIONAL_COMBAT_FIXTURES,regionalCombatFixture}=load('core/regional-combat-fixtures'),{CLASSES}=load('content/classes');
const {COMBAT_COMPANIONS}=load('content/combat-companions'),{unlockCombatCompanion,equipCombatCompanion}=load('core/combat-companions');
const {liveEventDef,eventCandies}=load('content/live-events');
const now=Date.UTC(2026,9,1,12),H=3600000,foodCases=[];
function fixture(region,cls){const s=regionalCombatFixture(region,'prepared',cls.id);s.character.currentHp=game.effectiveStats(s).hp;s.activity={kind:'combat',targetId:region.monsterId,combatTacticId:'balanced',startedAtMs:now,lastClaimAtMs:now};return s;}
for(const region of REGIONAL_COMBAT_FIXTURES)for(const cls of CLASSES)for(const role of ['none',...['tank','damage','support'].filter(r=>r!==cls.role.toLowerCase())])for(const supply of ['none','target']){
 let s=fixture(region,cls),def=COMBAT_COMPANIONS.find(c=>c.role===role);
 if(def){s=unlockCombatCompanion(s,def.id,now);s=equipCombatCompanion(s,def.id);}
 const quantity=supply==='none'?0:Math.ceil(game.REGIONAL_FOOD_SUSTAIN_TARGETS[region.regionName].foodPerHourMax*8);
 s.inventory.stacks=quantity?[{itemId:region.foodId,quantity}]:[];
 const r=game.previewActivityReward(s,now+8*H);
 foodCases.push({region:region.regionName,classId:cls.id,role,supply,quantity,kills:r.kills,food:r.foodConsumed,endHp:r.endHp,stopped:r.stoppedReason??null,activeHours:(r.qualifyingActivitySeconds??0)/3600});
}
const region=REGIONAL_COMBAT_FIXTURES.at(-1),base=fixture(region,CLASSES[0]);base.inventory.stacks=[{itemId:region.foodId,quantity:10000}];
const id='EVT_ANNUAL_009_2026',candy=eventCandies(liveEventDef(id)).find(c=>c.kind==='combat');
function eventState(seconds){const s=structuredClone(base);s.account.liveEvent={eventId:id,enabled:true,startsAtMs:now-H,endsAtMs:now+24*H};s.character.activeEventCandies={combat:{eventId:id,itemId:candy.id,remainingSeconds:seconds,lastUpdatedAtMs:now}};return s;}
const metrics=(s,h)=>{const r=game.previewActivityReward(s,now+h*H);return {kills:r.kills,food:r.foodConsumed,endHp:r.endHp}};
const eventExpiry=[1,3,8].map(hours=>({hours,noCandy:metrics(base,hours),twoHourCandy:metrics(eventState(7200),hours),maxCandy:metrics(eventState(candy.maxSeconds),hours)}));
// One remaining potion charge should not benefit every encounter in a long batch.
const one=structuredClone(base);one.character.preparation={itemId:'OATH_WARD_TONIC',remainingEncounters:1};
const baseline=metrics(base,8),oneUse=metrics(one,8),exhausted=structuredClone(one);exhausted.character.preparation.remainingEncounters=0;
const potionExpiry={baseline,oneUse,exhausted:metrics(exhausted,8)};
const result={generatedAt:new Date().toISOString(),foodCases:foodCases.length,bySupply:['none','target'].map(supply=>({supply,cases:foodCases.filter(c=>c.supply===supply).length,stops:foodCases.filter(c=>c.supply===supply&&c.stopped).length})),byRegion:REGIONAL_COMBAT_FIXTURES.map(r=>({region:r.regionName,targetSupplyStops:foodCases.filter(c=>c.region===r.regionName&&c.supply==='target'&&c.stopped).length,targetSupplyCases:foodCases.filter(c=>c.region===r.regionName&&c.supply==='target').length})),eventExpiry,potionExpiry,cases:foodCases};
const out=path.join(root,'artifacts/combat-companion-audit');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'boundaries.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,cases:undefined},null,2));
