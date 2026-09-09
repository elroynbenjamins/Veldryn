import {createCharacter,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {environmentEffectForActivity,environmentForActivity,environmentForZone,seasonAt} from '../src/core/world-weather';
import {GATHERING} from '../src/content/skills';
import {migrateSave} from '../src/core/save-migrations';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const spring=Date.parse('2026-04-08T12:00:00Z'),winter=Date.parse('2026-12-08T12:00:00Z');
ok(seasonAt(spring)==='spring'&&seasonAt(winter)==='winter','Calendar seasons must rotate predictably');
const first=environmentForZone('SILVERBROOK',spring),again=environmentForZone('SILVERBROOK',spring);
ok(JSON.stringify(first)===JSON.stringify(again),'Regional daily weather must be deterministic');
ok(environmentForZone('SILVERBROOK',spring).changesAtMs===Date.parse('2026-04-09T00:00:00Z'),'Weather must roll at the next UTC day');
let state=startGathering(createCharacter(newGame(spring),'WAYFINDER','Weather Tester'),'SILVERBROOK_SHOAL',spring);
const captured=environmentForActivity(state.activity!),effect=environmentEffectForActivity(state.activity!).effect,gathering=GATHERING.find(entry=>entry.id==='SILVERBROOK_SHOAL')!;
ok(captured.seasonId==='spring'&&captured.zoneId==='SILVERBROOK','Starting an activity must snapshot its environment');
const elapsed=3600,reward=previewActivityReward(state,spring+elapsed*1000),actions=Math.floor(elapsed/(gathering.seconds*effect.actionTimeMultiplier));
ok(reward.kills===actions,'Weather-adjusted action timer must drive rewards');
ok(reward.xp===Math.floor(actions*gathering.xp*effect.xpMultiplier),'Season XP effect must be deterministic');
const stillCaptured=environmentForActivity(state.activity!);
ok(JSON.stringify(stillCaptured)===JSON.stringify(captured),'Active activity weather must remain captured until the activity changes');
const malformed=JSON.parse(JSON.stringify(state));malformed.activity.environment={seasonId:'bad',weatherId:'bad',zoneId:4,capturedAtMs:'never'};
ok(migrateSave(malformed).activity?.environment===undefined,'Malformed environment snapshots must safely fall back');
console.log(`PASS: ${captured.seasonName}, ${captured.weatherName}, ${actions} actions/hour`);
