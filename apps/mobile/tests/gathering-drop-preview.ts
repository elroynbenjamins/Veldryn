import {GATHERING} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {gatheringDropPercent,gatheringDropPreview} from '../src/core/gathering-drop-preview';
import type {GameState} from '../src/core/types';

function check(condition:boolean,message:string){if(!condition)throw new Error(message);}
function getNode(id:string){const node=[...GATHERING,...HERB_NODES].find(row=>row.id===id);if(!node)throw new Error('Missing node: '+id);return node;}
const state={
 account:{unlockedCosmeticPetIds:[]},
 character:{ownedPetIds:[]},
 quests:[],
} as unknown as GameState;
const preview=(id:string,source=state,nowMs=0)=>gatheringDropPreview(getNode(id),source,nowMs);

check(gatheringDropPercent(.0012)==='0.12%','Gathering pet base chance format');
check(gatheringDropPercent(.01)==='1%','Botanical base chance format');
check(gatheringDropPercent(.0175)==='1.75%','Regional botanical base chance format');
const copper=preview('COPPER_VEIN');
check(copper[0].kind==='yield'&&copper[0].min===1&&copper[0].max===2,'Copper shows actual primary resource quantity');
check(copper.some(row=>row.kind==='pet'&&row.name==='Pebblemole'&&row.chance===.0012&&row.locked),'Copper pet uses canonical drop rule and unlock');
check(preview('GREENWOOD_TREE').some(row=>row.kind==='pet'&&row.name==='Twiglet'&&row.chance===.0012),'Greenwood shows Twiglet instead of invented pet');
check(preview('IRONWOOD_TREE').every(row=>row.kind!=='pet'),'A node without a pet rule must not advertise a pet');
check(preview('SILVERBROOK_SHOAL').some(row=>row.kind==='pet'&&row.name==='Silverfin'),'Fishing uses exact source-to-pet mapping');
check(preview('DEWLEAF_PATCH').some(row=>row.kind==='essence'&&row.chance===.01),'Herbalism preview includes actual zone essence rate');
check(preview('DEWLEAF_PATCH').every(row=>row.kind!=='pet'),'Herb with no pet source must not invent one');
check(preview('FROSTBELL_FLOWER').some(row=>row.kind==='essence'&&row.chance===.0175),'Frostmarch zone essence chance');
check(preview('FROSTBELL_FLOWER').some(row=>row.kind==='pet'&&row.name==='Rimecap'),'Herbalism pet mapping');
const owned={...state,account:{...state.account,unlockedCosmeticPetIds:['PET_001']},quests:[{questId:'QST_003',status:'claimed' as const}]} as GameState;
check(preview('COPPER_VEIN',owned).some(row=>row.kind==='pet'&&row.owned&&!row.locked),'Owned pets are marked and unlocked without changing probabilities');
const eventState={...state,account:{...state.account,liveEvent:{eventId:'EVT_ANNUAL_010_2026',enabled:true,startsAtMs:1000,endsAtMs:5000}}} as GameState;
check(preview('GREENWOOD_TREE',eventState,2000).some(row=>row.kind==='event_currency'&&row.name==='Veil Shards'),'Active event shows event currency');
check(preview('GREENWOOD_TREE',eventState,6000).every(row=>row.kind!=='event_currency'),'Ended events do not advertise new drops');
check(preview('GREENWOOD_TREE',eventState,500).every(row=>row.kind!=='event_currency'),'Upcoming events do not advertise current drops');
console.log('PASS: gathering drop preview reflects real yield, pets, Herbalism essence and live-event state');
