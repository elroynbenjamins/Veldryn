import {createCharacter,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {environmentEffect,environmentForActivity,environmentForZone,nextSeasonAt,seasonAt,SEASON_DEFINITIONS,seasonEffect,weatherChancesForSeason,WEATHER_DEFINITIONS,weatherEffect} from '../src/core/world-weather';
import {migrateSave} from '../src/core/save-migrations';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const spring=Date.parse('2026-04-08T12:00:00Z'),winter=Date.parse('2026-12-08T12:00:00Z');
ok(seasonAt(spring)==='spring'&&seasonAt(winter)==='winter','Calendar seasons must rotate predictably');
const first=environmentForZone('SILVERBROOK',spring),again=environmentForZone('SILVERBROOK',spring);
ok(JSON.stringify(first)===JSON.stringify(again),'Regional daily weather must be deterministic');
ok(environmentForZone('SUNSCAR',spring).zoneId==='SUNSCAR'&&environmentForZone('ASHLANDS',winter).zoneId==='ASHLANDS','Later regions must receive deterministic weather snapshots');
ok(environmentForZone('SILVERBROOK',spring).changesAtMs===Date.parse('2026-04-09T00:00:00Z'),'Weather must roll at the next UTC day');
ok(nextSeasonAt(spring)===Date.parse('2026-06-01T00:00:00Z')&&nextSeasonAt(winter)===Date.parse('2027-03-01T00:00:00Z'),'Season countdown boundaries must be exact');
ok(Object.keys(SEASON_DEFINITIONS).length===4&&Object.keys(WEATHER_DEFINITIONS).length===9,'Every season and weather type needs a player-facing definition');
for(const season of Object.values(SEASON_DEFINITIONS))ok(season.weather.length===5&&season.weather.every(id=>!!WEATHER_DEFINITIONS[id]),`${season.name} needs a valid weighted weather pool`);
for(const seasonId of Object.keys(SEASON_DEFINITIONS) as Array<keyof typeof SEASON_DEFINITIONS>){const total=weatherChancesForSeason(seasonId).reduce((sum,entry)=>sum+entry.chance,0);ok(Math.abs(total-1)<.000001,`${seasonId} weather chances must total 100%`)}
ok(seasonEffect('mining','spring').itemMultiplier===1.08,'Bloomtide gathering yield bonus missing');
ok(seasonEffect('combat','autumn').goldMultiplier===1.08,'Emberfall combat gold bonus missing');
ok(weatherEffect('fishing','rain').actionTimeMultiplier===.88&&weatherEffect('fishing','rain').itemMultiplier===1.1,'Rain fishing bonuses missing');
ok(weatherEffect('combat','mist').dropChanceMultiplier===1.12,'Mist loot bonus missing');
const stacked=environmentEffect('fishing',{seasonId:'spring',weatherId:'rain'});
ok(stacked.itemMultiplier===1.08*1.1&&stacked.actionTimeMultiplier===.88,'Season and weather effects must stack multiplicatively');
let state=createCharacter(newGame(spring),'WAYFINDER','Weather Tester');
state={...state,currentRegionId:'SILVERBROOK',character:{...state.character!,level:5}};
state=startGathering(state,'SILVERBROOK_SHOAL',spring);
const captured=environmentForActivity(state.activity!);
ok(captured.seasonId==='spring'&&captured.zoneId==='SILVERBROOK','Starting an activity must snapshot its environment');
const elapsed=3600,reward=previewActivityReward(state,spring+elapsed*1000);
ok(reward.kills>0&&reward.xp>0,'Captured weather must produce deterministic activity rewards');
const stillCaptured=environmentForActivity(state.activity!);
ok(JSON.stringify(stillCaptured)===JSON.stringify(captured),'Active activity weather must remain captured until the activity changes');
const malformed=JSON.parse(JSON.stringify(state));malformed.activity.environment={seasonId:'bad',weatherId:'bad',zoneId:4,capturedAtMs:'never'};
ok(migrateSave(malformed).activity?.environment===undefined,'Malformed environment snapshots must safely fall back');
console.log(`PASS: ${captured.seasonName}, ${captured.weatherName}, ${reward.kills} actions/hour`);
