import {activeCompanionMissions,claimCompanionAssignment,companionExpeditionPenCapacity,predictedCompanionMissionGrade,startCompanionAssignment,validateCompanionMissionTeam} from '../assignments';
import {COMPANION_EXPEDITION_BOND_RATE,companionMission} from '../content';
import type {CompanionAssignment,CompanionEconomyState,OwnedCompanionSnapshot} from '../domain';
const ok=(v:unknown,m:string)=>{if(!v)throw new Error(m)};const eq=(a:unknown,b:unknown,m:string)=>{if(a!==b)throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`)};const throws=(f:()=>unknown,m:string)=>{let did=false;try{f()}catch{did=true}if(!did)throw new Error(m)};
const p=(id:string,level=30):OwnedCompanionSnapshot=>({companionId:id,level,xp:0,ascensionTier:3,bondLevel:8,bondXp:0,bondTraitUnlocked:false});
const owned={UNIT_001:p('UNIT_001',20),UNIT_002:p('UNIT_002',20),UNIT_003:p('UNIT_003',20),UNIT_013:p('UNIT_013',25),UNIT_014:p('UNIT_014',30),UNIT_015:p('UNIT_015',30),UNIT_023:p('UNIT_023',30),UNIT_024:p('UNIT_024',35)};
const economy:CompanionEconomyState={gold:100000,companionEssence:0,bondstones:0,materials:{SUPPLIES:99}};
const now=Date.UTC(2026,7,27,12);\nok(activeCompanionMissions(now).definitions.some(row=>row.id==='MISSION_SUNSCAR_4H'),'Fixture week must expose Sunscar Caravan Guard');
// Use 4h Sunscar mission with a strong Tank + Support pair.
const ids=['UNIT_015','UNIT_014'];const valid=validateCompanionMissionTeam({missionId:'MISSION_SUNSCAR_4H',companionIds:ids,owned,assignments:[],equippedCompanionIds:new Set()});ok(valid.ok,'Valid mission team rejected');
const expectedA=predictedCompanionMissionGrade('MISSION_SUNSCAR_4H',ids,owned),expectedB=predictedCompanionMissionGrade('MISSION_SUNSCAR_4H',ids,owned);eq(expectedA,expectedB,'Grade calculation not deterministic');
let started=startCompanionAssignment({accountId:'A1',missionId:'MISSION_SUNSCAR_4H',companionIds:ids,owned,assignments:[],equippedCompanionIds:new Set(),expeditionPensLevel:2,economy,serverNowMs:now,requestId:'REQ_START_1'});ok(started.economy.gold<economy.gold,'Mission cost not deducted');eq(economy.gold,100000,'Start mutated caller economy');
// 22 busy companion cannot start another mission (capacity 2 leaves room so busy rule is what matters).
throws(()=>startCompanionAssignment({accountId:'A1',missionId:'MISSION_SCOUT_2H',companionIds:['UNIT_015'],owned,assignments:[started.assignment],equippedCompanionIds:new Set(),expeditionPensLevel:2,economy:started.economy,serverNowMs:now,requestId:'REQ_BUSY'}),'Busy companion started another assignment');
// Active Trial companions are also locked until that Trial run ends.
throws(()=>startCompanionAssignment({accountId:'A1',missionId:'MISSION_SCOUT_2H',companionIds:['UNIT_002'],owned,assignments:[],equippedCompanionIds:new Set(),lockedTrialCompanionIds:new Set(['UNIT_002']),expeditionPensLevel:2,economy,serverNowMs:now,requestId:'REQ_TRIAL_LOCK'}),'Active Trial companion was sent on a Sanctuary mission');
// 23 equipped companion cannot be assigned.
throws(()=>startCompanionAssignment({accountId:'A1',missionId:'MISSION_SUNSCAR_4H',companionIds:ids,owned,assignments:[],equippedCompanionIds:new Set(['UNIT_015']),expeditionPensLevel:2,economy,serverNowMs:now,requestId:'REQ_EQUIPPED'}),'Equipped companion was silently assigned');
// 24 before endsAt cannot claim.
throws(()=>claimCompanionAssignment({assignment:started.assignment,owned,serverNowMs:Date.parse(started.assignment.endsAt)-1,bondstonesClaimedThisWeek:0}),'Early assignment claim succeeded');
// 25 claim after completion, 27/28 deterministic grade/reward.
const claim1=claimCompanionAssignment({assignment:started.assignment,owned,serverNowMs:Date.parse(started.assignment.endsAt)+1,bondstonesClaimedThisWeek:0});eq(claim1.assignment.status,'claimed','Completed mission did not claim');eq(claim1.assignment.performanceGrade,expectedA,'Claim grade differs from prediction');const deterministic=claimCompanionAssignment({assignment:started.assignment,owned,serverNowMs:Date.parse(started.assignment.endsAt)+5000,bondstonesClaimedThisWeek:0});eq(JSON.stringify(claim1.reward),JSON.stringify(deterministic.reward),'Mission reward not deterministic');
// 26 claimed cannot claim twice.
throws(()=>claimCompanionAssignment({assignment:claim1.assignment,owned,serverNowMs:Date.parse(started.assignment.endsAt)+10000,bondstonesClaimedThisWeek:0}),'Assignment claimed twice');
// 29 Pen capacity respected.
eq(companionExpeditionPenCapacity(1),1,'Pen Lv1 capacity');eq(companionExpeditionPenCapacity(2),2,'Pen Lv2 capacity');eq(companionExpeditionPenCapacity(3),3,'Pen Lv3 capacity');const other:CompanionAssignment={...started.assignment,assignmentId:'OTHER',companionIds:['UNIT_023'],status:'active'};throws(()=>startCompanionAssignment({accountId:'A1',missionId:'MISSION_SCOUT_2H',companionIds:['UNIT_003'],owned,assignments:[other],equippedCompanionIds:new Set(),expeditionPensLevel:1,economy,serverNowMs:now,requestId:'REQ_CAP'}),'Pen capacity exceeded');
// 30 cost deducted exactly once by one start result; repeating the same pure call yields same result but production receipt protects application transaction.
const startedAgain=startCompanionAssignment({accountId:'A1',missionId:'MISSION_SUNSCAR_4H',companionIds:ids,owned,assignments:[],equippedCompanionIds:new Set(),expeditionPensLevel:2,economy,serverNowMs:now,requestId:'REQ_START_1'});eq(startedAgain.economy.gold,started.economy.gold,'Deterministic start cost mismatch');eq(startedAgain.assignment.assignmentId,started.assignment.assignmentId,'Deterministic assignment ID mismatch');
// 31 failed request deducts nothing.
const before=JSON.stringify(economy);throws(()=>startCompanionAssignment({accountId:'A1',missionId:'MISSION_SUNSCAR_4H',companionIds:['UNIT_015'],owned,assignments:[],equippedCompanionIds:new Set(),expeditionPensLevel:2,economy,serverNowMs:now,requestId:'REQ_FAIL'}),'Invalid team unexpectedly started');eq(JSON.stringify(economy),before,'Failed mission mutated economy');
// 32 expedition Bond is explicitly reduced to 25% of mission active-equivalent budget before grade multiplier.
const mission=companionMission('MISSION_SUNSCAR_4H')!,gradeMult=claim1.assignment.performanceGrade==='S'?1.5:claim1.assignment.performanceGrade==='A'?1.25:claim1.assignment.performanceGrade==='B'?1.1:1;eq(claim1.reward.bondXp,Math.max(1,Math.round(mission.baseRewards.bondXp*COMPANION_EXPEDITION_BOND_RATE*gradeMult)),'Expedition Bond rate mismatch');
console.log('companion-phase2-assignments: PASS');
