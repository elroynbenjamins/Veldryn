import {prioritizeItemSources,prioritizeItemUses} from '../src/core/item-source-display';

function assert(value:unknown,message:string):asserts value{
 if(!value)throw new Error(message);
}
const sources=[
 {kind:'combat',title:'Locked Cave',availability:{status:'locked' as const,canNavigate:false}},
 {kind:'gathering',title:'Off-region Grove',availability:{status:'travel' as const,canNavigate:true}},
 {kind:'combat',title:'Local Wolf',availability:{status:'ready' as const,canNavigate:true}},
 {kind:'combat',title:'Local Boar',availability:{status:'ready' as const,canNavigate:true}},
 {kind:'starting',title:'Starting Equipment'},
 {kind:'dungeon',title:'Unknown Boss',availability:{status:'info' as const,canNavigate:false}},
];
const original=sources.map(row=>row.title).join(',');
const ordered=prioritizeItemSources(sources);
assert(ordered.length===sources.length,'Every source remains visible');
assert(sources.map(row=>row.title).join(',')===original,'Source prioritization cannot mutate shared data');
assert(ordered[0].title==='Local Wolf'||ordered[0].title==='Starting Equipment','Reachable and starter sources appear first');
assert(ordered.findIndex(row=>row.title==='Off-region Grove')<ordered.findIndex(row=>row.title==='Locked Cave'),'Travel options appear before locked ones');
assert(ordered.findIndex(row=>row.title==='Local Wolf')<ordered.findIndex(row=>row.title==='Local Boar'),'Equally reachable sources retain authored order');
const uses=[
 {name:'Locked Plate',level:2,availability:{status:'locked' as const}},
 {name:'Ready Potion',level:20,availability:{status:'ready' as const}},
 {name:'Starter Brew',level:1,availability:{status:'ready' as const}},
 {name:'Travel Craft',level:3,availability:{status:'travel' as const}},
 {name:'Second Locked',level:10,availability:{status:'locked' as const}},
];
const priority=prioritizeItemUses(uses);
assert(priority.map(row=>row.name).join(',')==='Starter Brew,Ready Potion,Travel Craft,Locked Plate,Second Locked',
 'Craft uses show available recipes first, then travel and locked recipes ordered by level');
assert(uses[0].name==='Locked Plate','Crafting recipe data remains unchanged');
console.log('PASS: Quick Inspect prioritizes reachable sources and useful recipes without removing locked content');
