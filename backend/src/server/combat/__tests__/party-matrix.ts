import { simulateCombat } from '../engine';
import { launchPlayer, rootboundHeartBoss, bellWardenBoss } from '../content/launch-combat';
const teams=[
 ['Ironwarden','Wayfinder','Ravager','Dawnkeeper'],
 ['Ironwarden','Hexweaver','Knife Dancer','Stonecaller'],
 ['Ironwarden','Wayfinder','Ravager','Knife Dancer'],
 ['Wayfinder','Ravager','Hexweaver','Knife Dancer'],
 ['Ironwarden','Wayfinder','Dawnkeeper','Stonecaller'],
];
for(const boss of [rootboundHeartBoss(),bellWardenBoss()]){
 for(const t of teams){let wins=0,total=30,dur=0,downs=0; for(let i=0;i<total;i++){const r=simulateCombat({seed:`${boss.id}:${t.join('-')}:${i}`,players:t.map(c=>launchPlayer(c,25)),enemies:[boss],maxDurationMs:180000}); wins+=+r.victory; dur+=r.durationMs; downs+=r.players.filter(p=>p.downed).length;}
 console.log(`${boss.name}\t${t.join('/')}\t${wins}/${total}\tavg=${Math.round(dur/total/100)/10}s\tdowns=${downs}`);}
}
