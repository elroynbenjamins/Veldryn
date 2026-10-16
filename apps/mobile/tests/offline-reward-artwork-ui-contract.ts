export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const timeline=read('src/components/ActivityQueueResults.tsx');
const popup=read('src/components/RewardPopup.tsx');

ok(timeline.includes("import {MonsterPortraitFrame} from './MonsterPortraitFrame'"),'Activity timeline must have access to monster portraits');
ok(timeline.includes("monster=combat?MONSTERS.find(entry=>entry.id===row.activity.targetId):undefined"),'Combat timeline rows must resolve their hunted monster');
ok(timeline.includes('<MonsterPortraitFrame monster={monster} size={40} framed={false}/>'),'Combat timeline rows must show the hunted enemy, not the generic combat skill icon');
ok(popup.includes('<ItemArtwork itemId={row.itemId} size={30}/>'),'Offline loot summary must show the shared item icon for every reward type');
ok(popup.includes('function EventDiscoveryArtwork'),'Reward popup must resolve event discovery art');
ok(popup.includes('.discoveryArt[discoveryId]'),'Event discovery rows must use their dedicated event artwork');
ok(popup.includes('<EventDiscoveryArtwork eventId={x.eventId} discoveryId={x.discoveryId}/>'),'Reward breakdown must display the discovered item icon');

console.log('PASS: offline reward presentation uses item, event discovery, and hunted-enemy artwork');
