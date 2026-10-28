import {selectTrainingRoster,type TrainingRosterCompanion} from '../src/core/companion-training-roster';
const equal=(actual:unknown,expected:unknown,label:string)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`)};
const all:TrainingRosterCompanion[]=[
 {id:'D',role:'damage',rarity:'standard'},
 {id:'T',role:'tank',rarity:'rare'},
 {id:'S',role:'support',rarity:'elite'},
 {id:'P',role:'damage',rarity:'prestige'},
 {id:'HIDDEN',role:'tank',rarity:'prestige'},
];
const owned=new Set(['S','T','HIDDEN']);
const discovered=new Set(['D','T','S','P']);
const ids=(scope:'Owned'|'Discover',role:'All'|'damage'|'tank'|'support'='All',rarity:'All'|'standard'|'rare'|'elite'|'prestige'='All',equipped?:string,favorite?:string)=>
 selectTrainingRoster(all,owned,discovered,scope,role,rarity,equipped,favorite).map(row=>row.id);
equal(ids('Owned'),['T','S','HIDDEN'],'owned includes even Codex-hidden acquisitions');
equal(ids('Owned','All','All','S','T'),['S','T','HIDDEN'],'equipped before favorite');
equal(ids('Owned','All','All','T','S'),['T','S','HIDDEN'],'equip wins even if favorite');
equal(ids('Owned','support'),['S'],'role filter includes only support');
equal(ids('Owned','tank','prestige'),['HIDDEN'],'rarity and role filters combine');
equal(ids('Owned','damage'),[],'empty filter result');
equal(ids('Discover'),['D','P'],'locked known entries only and stable catalog order');
equal(ids('Discover','damage','prestige'),['P'],'discovered role and rarity');
equal(ids('Discover','tank'),[],'hidden unavailable and owned entries excluded');
equal(ids('Owned'),['T','S','HIDDEN'],'read-only selector does not mutate source');
equal(all.map(row=>row.id),['D','T','S','P','HIDDEN'],'source catalog order unchanged');
equal([...owned],['S','T','HIDDEN'],'ownership input unchanged');
console.log('PASS: companion Training roster owned/discover priority, filters and privacy');
