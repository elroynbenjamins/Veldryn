import {profileAchievementPrestige,profileCollectionPrestige,profileMasteryPrestige,profileRecordPrestige} from '../src/core/profile-prestige';
import {createCharacter,newGame} from '../src/core/game';
import {masteryPointsForRank} from '../src/core/profession-mastery-v40';
import {professionMasteryHallSummary,professionMasteryMasteredRecords} from '../src/core/profession-mastery-presentation';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)fail(message)}

equal(profileAchievementPrestige('combatant_novice').tone,'standard','novice achievement uses standard presentation');
equal(profileAchievementPrestige('combatant_master').tone,'elite','master achievement uses elite presentation');
equal(profileAchievementPrestige('combatant_grandmaster').tone,'prestige','grandmaster achievement uses prestige presentation');
equal(profileAchievementPrestige('combatant_grandmaster').badge,'GRANDMASTER','achievement badge exposes authored tier');

const prestigeCompanion=profileCollectionPrestige({kind:'companion',id:'UNIT_012'});
equal(prestigeCompanion.tone,'prestige','prestige companion receives prestige presentation');
ok(prestigeCompanion.badge.includes('PRESTIGE'),'prestige companion badge names rarity');

const rareCompanion=profileCollectionPrestige({kind:'companion',id:'UNIT_004'});
equal(rareCompanion.tone,'rare','rare companion receives rare presentation');

const legendaryBackground=profileCollectionPrestige({kind:'background',id:'bg_grand_storehouse'});
equal(legendaryBackground.tone,'prestige','legendary event background receives prestige presentation');
ok(legendaryBackground.badge.includes('LEGENDARY'),'legendary background badge names rarity');

const epicBorder=profileCollectionPrestige({kind:'border',id:'frame_amber_vine'});
equal(epicBorder.tone,'elite','epic event border receives elite presentation');
ok(epicBorder.badge.includes('EPIC'),'epic border badge names rarity');

const standardItem=profileCollectionPrestige({kind:'item',id:'unknown_item'});
equal(standardItem.tone,'standard','unknown item safely falls back to standard presentation');

equal(profileRecordPrestige().tone,'record','personal records use record presentation');
equal(profileRecordPrestige().badge,'PERSONAL BEST','personal record badge is explicit');

equal(profileMasteryPrestige().tone,'prestige','R50 profession records use prestige presentation');
equal(profileMasteryPrestige().badge,'R50 MASTERED','R50 mastery showcase badge is explicit');

let mastery=createCharacter(newGame(1),'IRONWARDEN','Mastery Hall Tester');
mastery={...mastery,account:{...mastery.account,professionMasteryByAction:{
 GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(50),updatedAtMs:10},
 COPPER_VEIN:{actionId:'COPPER_VEIN',points:masteryPointsForRank(30),updatedAtMs:11},
}}};
const hall=professionMasteryHallSummary(mastery);
equal(hall.mastered,1,'Mastery Hall counts only R50 action records as mastered');
equal(hall.rank30,2,'Mastery Hall account summary includes all actions at R30+');
equal(professionMasteryMasteredRecords(mastery).map(row=>row.actionId).join(','),'GREENWOOD_TREE','Profile mastery records derive from the same account mastery state');

const hallScreen=fs.readFileSync('src/screens/MasteryHallScreen.tsx','utf8');
const hallPanel=fs.readFileSync('src/components/MasteryHallPanel.tsx','utf8');
const more=fs.readFileSync('src/screens/MoreScreen.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
const profileCustomize=fs.readFileSync('src/screens/ProfileCustomizeScreen.tsx','utf8');
ok(hallScreen.includes('ACCOUNT PRESTIGE')&&hallScreen.includes('MASTERY HALL LADDER')&&hallScreen.includes('MASTERED RECORDS'),'Dedicated Mastery Hall must combine account summary, achievement ladder and R50 records');
ok(hallScreen.includes('Masterwork Savant')||hallScreen.includes("masterwork_savant"),'Mastery Hall must surface its Grandmaster title reward');
ok(hallScreen.includes('PRESTIGE, NOT POWER')&&hallScreen.includes('do not add another damage, yield, speed or account-wide multiplier'),'Mastery Hall must explicitly remain recognition-only');
ok(hallScreen.includes('Choose Profile Mastery Showcase'),'Mastery Hall must hand off R50 records to Profile showcase selection');
ok(hallPanel.includes('Open Mastery Hall'),'Compact Profile Hall panel must link to the full account Hall');
ok(more.includes("'MasteryHall'")&&more.includes("title:'Mastery Hall'"),'Account navigation must expose the Mastery Hall directly');
ok(app.includes("tab==='MasteryHall'")&&app.includes("setProfileCustomizeSection('Identity')"),'App must route Mastery Hall to profession, achievements and identity showcase destinations');
ok(profileCustomize.includes("initialSection='Appearance'")&&profileCustomize.includes('setSection(initialSection)'),'Profile customization must support direct Identity & Showcases entry without changing its normal Appearance default');

console.log('PASS: profile showcase prestige presentation');
