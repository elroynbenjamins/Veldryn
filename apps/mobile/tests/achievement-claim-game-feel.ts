export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const screen=read('src/screens/AchievementsScreen.tsx');
const app=read('App.tsx');
const types=read('src/core/achievement-types.ts');

ok(types.includes('idempotentReplay:boolean'),'achievement claim result must retain idempotent replay status');
ok(types.includes('titleName?:string'),'achievement reward projection must expose earned profile titles');

ok(screen.includes('✦ ACHIEVEMENT CLAIMED'),'successful claims need a clear achievement reward moment');
ok(screen.includes("moment.idempotentReplay?'ACHIEVEMENT SYNCED'"),'idempotent claim retries must not fake a second reward celebration');
ok(screen.includes('Reward secured · score {moment.scoreBefore} → {moment.scoreAfter}.'),'claim feedback must show the committed score change');
ok(screen.includes('NEW PROFILE TITLE')&&screen.includes('Customize profile'),'title rewards must explain the unlock and provide a useful next action');
ok(screen.includes('moment.payout.gold'),'claim feedback must show the authoritative Gold payout');
ok(screen.includes('result.snapshot.score'),'claim feedback must use the committed server snapshot score');
ok(screen.includes('result.idempotentReplay'),'claim feedback must consume the authoritative replay flag');
ok(screen.includes('Animated.sequence')&&screen.includes('reduceMotion'),'achievement celebration motion must respect Reduce Motion');
ok(screen.includes('Achievement showcase updated.'),'showcase saves need lightweight committed feedback');

ok(app.includes("<AchievementsScreen reduceMotion={state.settings.reduceMotion}"),'Achievements screen must receive the player motion preference');
ok(app.includes("onProfile={()=>setTab('ProfileCustomize')}"),'title reward action must route to profile customization');

console.log('PASS achievement claims provide committed reward, score, title and idempotency feedback');
