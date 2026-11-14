import {newGame,createCharacter,claimSeasonalContract} from '../src/core/game';
import {createAccountCharacter,switchAccountCharacter,deleteAccountCharacter} from '../src/core/account-actions';
import {projectCharacter} from '../src/core/account-roster';
import {normalizeSave} from '../src/core/save-normalization';
import {ensurePersonalSeasonalState} from '../src/core/personal-seasonal-state';
import {recordSeasonalActivity,seasonalQuestBoard,SEASONAL_ACTIVITY_TAGS,type SeasonalPeriod} from '../src/core/seasonal-quests';
import type {GameState} from '../src/core/types';

function check(condition:unknown,message:string){if(!condition)throw new Error(message);}
const now=Date.UTC(2026,10,14,12);
const periods:SeasonalPeriod[]=['daily','weekly','monthly'];
function earned(state:GameState):GameState{
 return SEASONAL_ACTIVITY_TAGS.reduce((next,tag)=>recordSeasonalActivity(next,tag,1000,now),state);
}
let first=createCharacter(newGame(0),'BASTION','First');
first={...first,account:{...first.account,unlockedCharacterSlots:2,guildMember:true}};
first=earned(first);
const firstId=first.character!.id;
const ids=periods.map(period=>{
 const quest=seasonalQuestBoard(first,period,new Date(now))[0];
 check(quest.progress>=quest.required,period+' objective must be claimable');
 first=claimSeasonalContract(first,period,quest.id,now);
 return quest.id;
});
check(first.character?.personalSeasonal?.claimIds.length===3,'First character must own its claimed receipts');
check(first.account.seasonalContractClaimIds?.length===3,'Legacy screen view must match current character');
let duplicate=false;
try{claimSeasonalContract(first,'daily',ids[0],now);}catch{duplicate=true;}
check(duplicate,'A character cannot claim an objective twice');
const created=createAccountCharacter(first,'WAYFINDER','Second','male',now);
const secondId=created.character!.id;
check(secondId!==firstId,'Creating a character must change identity');
check(created.account.guildMember===true,'Guild membership must remain account-wide');
check((created.character?.personalSeasonal?.claimIds??[]).length===0,'New character cannot inherit existing claims');
for(const period of periods){
 const quest=seasonalQuestBoard(created,period,new Date(now));
 check(quest.every(row=>row.progress===0),'New character must not inherit '+period+' progress');
}
let second=earned(created);
for(let i=0;i<periods.length;i++){
 const period=periods[i],quest=seasonalQuestBoard(second,period,new Date(now))[0];
 check(quest.id===ids[i],'Personal objectives retain the same cadence ID across characters');
 second=claimSeasonalContract(second,period,quest.id,now);
}
check(second.character?.personalSeasonal?.claimIds.length===3,'Second character must claim independently');
const firstReturn=switchAccountCharacter(second,firstId,now);
check(firstReturn.character?.personalSeasonal?.claimIds.length===3,'First character must keep all receipts after switching back');
check(firstReturn.account.seasonalContractClaimIds?.length===3,'Account projection must return to first character');
check(firstReturn.character?.personalSeasonal?.progress.daily?.counts.gathering===1000,'First character must keep personal progress');
const secondProjected=projectCharacter(firstReturn,secondId);
check(secondProjected.character?.personalSeasonal?.claimIds.length===3,'Read-only roster projection must show second character receipts');
check(firstReturn.character?.id===firstId,'Read-only projection must not change source state');
const restored=normalizeSave(JSON.parse(JSON.stringify(firstReturn)));
check(restored.character?.personalSeasonal?.claimIds.length===3,'Save normalization must retain first character receipts');
check(switchAccountCharacter(restored,secondId,now).character?.personalSeasonal?.claimIds.length===3,'Save normalization must retain stored character receipts');
const legacy=JSON.parse(JSON.stringify(firstReturn)) as GameState;
delete legacy.character!.personalSeasonal;
legacy.account.seasonalContractClaimIds=['DAILY_2026-11-14_0'];
const migrated=ensurePersonalSeasonalState(legacy);
check(migrated.character?.personalSeasonal?.claimIds.includes('DAILY_2026-11-14_0'),'Legacy account claims must be migrated to active character');
check(!switchAccountCharacter(migrated,secondId,now).account.seasonalContractClaimIds?.includes('DAILY_2026-11-14_0'),'Legacy claims must not overwrite another character');
const deleted=deleteAccountCharacter(firstReturn,secondId,'DELETE Second',now);
check(deleted.character?.id===firstId&&deleted.character?.personalSeasonal?.claimIds.length===3,'Deleting an alt cannot remove the active character quest receipts');
console.log('PASS: per-character daily/weekly/monthly progress, independent claims, roster switches, normalization, migration and deletion');
