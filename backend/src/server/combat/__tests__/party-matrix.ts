import {launchPlayer} from '../content/launch-combat';
import {runPveBalanceBatch} from '../pve-balance-batch';

const teams=[
 ['Ironwarden','Wayfinder','Ravager','Dawnkeeper'],
 ['Ironwarden','Hexweaver','Knife Dancer','Stonecaller'],
 ['Ironwarden','Wayfinder','Ravager','Knife Dancer'],
 ['Wayfinder','Ravager','Hexweaver','Knife Dancer'],
 ['Ironwarden','Wayfinder','Dawnkeeper','Stonecaller'],
];
for(const encounterId of ['ROOTBOUND_BOSS','LANTERN_BOSS']){
 for(const classes of teams){
  const report=runPveBalanceBatch({encounterId,players:classes.map(classId=>launchPlayer(classId,25)),iterations:30,seedPrefix:`LEGACY_MATRIX:${encounterId}:${classes.join('-')}`,maxDurationMs:180000});
  console.log(`${encounterId}\t${classes.join('/')}\twins=${report.resultCounts.victory}/${report.iterations}\tp50=${Math.round(report.durationMs.p50/100)/10}s\tp90=${Math.round(report.durationMs.p90/100)/10}s\tdownAvg=${report.partyDowns.mean}`);
 }
}
