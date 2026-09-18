import { calculateIdleClaim } from '../activities/idle';
import { isQuiet } from '../notifications/quiet-hours';
import { composition } from '../social/party';
import { grantItems } from '../items/inventory';
import { ANDROID_PACKAGE, DEFAULT_SETTINGS } from '../settings/defaults';

function ok(v:unknown,msg:string){if(!v)throw new Error(msg)}

const idle=calculateIdleClaim({activityId:'mine',startedAtMs:0,lastClaimAtMs:0,ratePerHour:100,xpPerHour:200,maxOfflineHours:8},10*3600*1000);
ok(idle.elapsedSec===8*3600,'offline cap');
ok(isQuiet('23:00','22:00','08:00')&&!isQuiet('12:00','22:00','08:00'),'quiet');
ok(composition([{characterId:'1',role:'tank',power:1,online:true},{characterId:'2',role:'damage',power:1,online:true},{characterId:'3',role:'damage',power:1,online:true},{characterId:'4',role:'support',power:1,online:true}]).standard,'party');
const inv=grantItems([], [{itemId:'ore',quantity:120}], {ore:{id:'ore',stackable:true,maxStack:99,tradable:true}}, 10);
ok(inv.length===2&&inv[1].quantity===21,'inventory');
ok(ANDROID_PACKAGE==='com.elroybenjamins.veldryn','package');
ok(DEFAULT_SETTINGS.chat.autoOpen===false,'chat default');
console.log(JSON.stringify({ok:true,idle,inventory:inv,package:ANDROID_PACKAGE}));
