import {companionTowerFloors} from '../src/core/companion-tower';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const first=companionTowerFloors(0,1,0);
ok(first.map(x=>x.floor).join(',')==='5,4,3,2,1','Tower must ascend visually from bottom to top');
ok(first.filter(x=>x.boss).length===1&&first[0].boss,'Each chamber ends in a boss');
ok(first.filter(x=>x.current).length===1&&first[4].current,'Highlight the actual next encounter');
ok(first.every(x=>!x.cleared),'Fresh tower has no cleared floors');
const second=companionTowerFloors(1,8,7);
ok(second.filter(x=>x.cleared).map(x=>x.floor).join(',')==='7,6','Monthly cleared floors use authoritative progress');
ok(companionTowerFloors(5,8,7).every(x=>!x.current&&!x.cleared),'Browsing future floors must not advance the player');
ok(companionTowerFloors(99,30,30)[0].floor===30,'Clamp at the summit');
ok(companionTowerFloors(-1,1,0)[4].floor===1,'Clamp at the entrance');
ok(companionTowerFloors(5,30,30).every(x=>x.cleared),'Completed tower retains clear states');
console.log('PASS: tower floor ordering, boss checkpoints, browsing and progress states');
