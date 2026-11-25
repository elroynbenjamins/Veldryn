import {createCharacter,newGame,effectiveStats} from '../src/core/game';
import {EVENT_PROFILE_ICON_ARTWORK_IDS,profileIconCollection,selectProfileIcon,normalizeProfileIcon,canUseProfileIcon,newlyUnlockedProfileIcons,accountProfileIconId} from '../src/core/profile-icons';
import {executeGameCommand} from '../src/core/game-commands';
import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {purchaseEventOffer} from '../src/core/live-events';
import {FROSTFALL_EVENT} from '../src/content/annual-events-v2';
import {collectionOwnershipSnapshotFromGameState} from '../src/core/collection-sets-v45';
import {normalizeSave} from '../src/core/save-normalization';
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function rejects(fn:()=>unknown){let rejected=false;try{fn()}catch{rejected=true}check(rejected,'unowned icon must be rejected');}
const state=createCharacter(newGame(1000),'IRONWARDEN','Aster');
check(state.character!.profileIconId==='class:IRONWARDEN','default class icon');
check(newlyUnlockedProfileIcons(newGame(1000),state).length===0,'first character does not announce its free class portrait');
const otherClassCharacter=createCharacter(newGame(1000),'WAYFINDER','New Wayfinder');
check(otherClassCharacter.character!.profileIconId==='class:WAYFINDER','another class starts with its own portrait');
check(newlyUnlockedProfileIcons(newGame(1000),otherClassCharacter).length===0,'another class starter icon is not announced');
check(newlyUnlockedProfileIcons(state,otherClassCharacter).length===0,'changing active class does not announce a free class portrait');
check(profileIconCollection(state).length===14,'catalog includes class, starters, boss, guild and two released Veilbreak event icons');
check(profileIconCollection(state).filter(row=>row.unlocked).length===10,'current class emblem and nine starter portraits available');
check(!profileIconCollection(state).some(row=>row.group==='Cosmetics'),'unreleased cosmetic-set portraits stay out of the normal collection');
const cosmeticPortraitOwned={...state,account:{...state.account,unlockedProfileIconIds:['cosmetic:gloamward:portrait-seer']}};
check(profileIconCollection(cosmeticPortraitOwned).some(row=>row.id==='cosmetic:gloamward:portrait-seer'),'owned unreleased portrait may be represented for migration/ops visibility');
check(canUseProfileIcon(cosmeticPortraitOwned,'cosmetic:gloamward:portrait-seer'),'owned cosmetic-set portrait is selectable after approved atlas artwork is installed');
check(canUseProfileIcon(state,'starter:hooded-ranger'),'starter portrait available');
check(!canUseProfileIcon(state,'guild:stormwatch-crest'),'guild icon is locked until purchased');
check(canUseProfileIcon({...state,account:{...state.account,unlockedProfileIconIds:['guild:stormwatch-crest']}},'guild:stormwatch-crest'),'purchased guild icon becomes usable');
rejects(()=>selectProfileIcon(state,'companion:UNIT_008'));
rejects(()=>selectProfileIcon(state,'creature:MOSS_RAT'));
const recruited={...state,account:{...state.account,unlockedCombatCompanionIds:['UNIT_008']}};
check(!canUseProfileIcon(recruited,'companion:UNIT_008'),'companion portraits stay unavailable while temporarily removed');
check(newlyUnlockedProfileIcons(state,recruited).length===0,'companion unlock does not announce a removed portrait');
check(!collectionOwnershipSnapshotFromGameState(state).ownedKeys['profile_icon:companion:UNIT_008'],'locked icons excluded from ownership');
for(const points of [9,10])check(canUseProfileIcon({...state,character:{...state.character!,monsterMasteryPoints:{MOSS_RAT:points}}},'creature:MOSS_RAT')===false,'ordinary monster mastery no longer unlocks profile portraits');
check(canUseProfileIcon({...state,defeatedBossIds:['FALLEN_KNIGHT']},'creature:FALLEN_KNIGHT'),'boss defeat unlocks portrait');
check(!canUseProfileIcon({...state,account:{...state.account,unlockedCosmeticPetIds:['EVT_PET_011']}},'event:pumpkin-piglet'),'festival pet portrait stays unavailable while removed');
check(!canUseProfileIcon({...state,account:{...state.account,unlockedCombatCompanionIds:['EVT_UNIT_006']}},'event:harvest-guardian'),'festival companion portrait stays unavailable while removed');
check(normalizeProfileIcon({...recruited,character:{...recruited.character!,profileIconId:'companion:UNIT_008'}}).character!.profileIconId==='class:IRONWARDEN','removed companion portrait falls back to class icon');
const before=JSON.stringify(effectiveStats(state));
rejects(()=>selectProfileIcon(state,'class:DAWNKEEPER'));
const selected=selectProfileIcon(state,'starter:hooded-ranger');
check(selected.character!.profileIconId==='starter:hooded-ranger','selected icon persists');
check(JSON.stringify(effectiveStats(selected))===before,'icon selection cannot change combat stats');
rejects(()=>selectProfileIcon(state,'equipment-set:T1_001'));
rejects(()=>executeGameCommand(state,{type:'profile',args:{profileIconId:'unearned-event-icon'}},1000));
rejects(()=>executeGameCommand(state,{type:'skin',args:{id:'starting'}},1000));
const eventIcon=LIVE_EVENT_CATALOG.flatMap(e=>e.milestones('IRONWARDEN')).find(row=>row.reward.kind==='profile_icon')!.reward;
rejects(()=>selectProfileIcon(state,eventIcon.id));
const earned={...state,account:{...state.account,unlockedProfileIconIds:[eventIcon.id]}};
check(newlyUnlockedProfileIcons(state,earned).some(row=>row.id===eventIcon.id),'newly earned event icon still announces');
check(newlyUnlockedProfileIcons(state,{...state,defeatedBossIds:['FALLEN_KNIGHT']}).some(row=>row.id==='creature:FALLEN_KNIGHT'),'newly earned boss icon still announces');
const eventSelected=executeGameCommand(earned,{type:'profile_icon',args:{id:eventIcon.id}},1000).state;
check(eventSelected.character!.profileIconId===eventIcon.id,'earned event icon selectable');
check(normalizeSave(eventSelected).character!.profileIconId===eventIcon.id,'event icon survives save normalization');
const otherClassIcon=LIVE_EVENT_CATALOG.flatMap(e=>e.milestones('DAWNKEEPER')).find(row=>row.reward.kind==='profile_icon')!.reward;
check(selectProfileIcon({...state,account:{...state.account,unlockedProfileIconIds:[otherClassIcon.id]}},otherClassIcon.id).character!.profileIconId===otherClassIcon.id,'account icons can be used by another class');
check(profileIconCollection(earned).find(row=>row.id===eventIcon.id)!.artworkReady,'event art ready');
for(const id of ['event:veilbreak-2026-lantern-warden','event:veilbreak-2026-pumpkin-moon']){
 check(EVENT_PROFILE_ICON_ARTWORK_IDS.has(id),'Veilbreak event profile icon is registered as having dedicated artwork');
 check(profileIconCollection({...state,account:{...state.account,unlockedProfileIconIds:[id]}}).find(row=>row.id===id)?.artworkReady,'Veilbreak event profile icon reports its artwork as ready');
}
check(EVENT_PROFILE_ICON_ARTWORK_IDS.has('event:frostfall-2026-snowbell'),'Frostfall icon must have runtime artwork before launch');
check(!profileIconCollection(state).some(row=>row.id.startsWith('event:frostfall-2026-')),'Unearned Frostfall portraits stay hidden without the authoritative runtime');
check(JSON.stringify(effectiveStats(eventSelected))===before,'event icon grants no bonus');
check(collectionOwnershipSnapshotFromGameState(earned).ownedKeys['profile_icon:'+eventIcon.id],'event icon tracked in collections');
check(normalizeProfileIcon({...state,character:{...state.character!,profileIconId:'unknown'}}).character!.profileIconId==='class:IRONWARDEN','invalid icon falls back to class');
// Frostfall seasonal portraits use ordinary authoritative event-shop ownership.
const frostNow=Date.UTC(2026,11,10),frostEnd=Date.UTC(2026,11,27),frostGrace=Date.UTC(2026,11,29);
const frostIds=['event:frostfall-2026-snowbell','event:frostfall-2026-maiden','event:frostfall-2026-adventurer'];
const frostOffers=FROSTFALL_EVENT.shop.filter(row=>row.reward.kind==='profile_icon');
check(frostOffers.length===3&&frostOffers.every(row=>row.cost===1400&&row.currency==='common'&&row.limit===1&&row.reward.rarity==='epic'),'Three equally priced Frostfall portraits');
let winter={...state,account:{...state.account,liveEvent:{eventId:FROSTFALL_EVENT.id,enabled:true,startsAtMs:Date.UTC(2026,11,3),endsAtMs:frostEnd,graceEndsAtMs:frostGrace},eventCurrencyBalanceById:{[FROSTFALL_EVENT.id]:4200}}};
for(const id of frostIds){check(EVENT_PROFILE_ICON_ARTWORK_IDS.has(id),'Dedicated Frostfall art registered: '+id);rejects(()=>selectProfileIcon(winter,id));
 check(!profileIconCollection(winter,Date.UTC(2026,11,3)-1).some(row=>row.id===id),'Frostfall portrait stays hidden before start');
 check(profileIconCollection(winter,frostNow).some(row=>row.id===id&&row.artworkReady&&!row.unlocked),'Frostfall portrait becomes visible but locked during the live event');
 check(!profileIconCollection(winter,frostGrace).some(row=>row.id===id),'Unearned portrait hides after claim grace');}
let purchased:typeof state=winter;
for(const offer of frostOffers){purchased=purchaseEventOffer(purchased,offer.id,frostNow);check(canUseProfileIcon(purchased,offer.reward.id),'Purchased Frostfall icon unlocked');check(normalizeSave(selectProfileIcon(purchased,offer.reward.id)).character!.profileIconId===offer.reward.id,'Purchased Frostfall icon survives normalization');rejects(()=>purchaseEventOffer(purchased,offer.id,frostNow));}
check(purchased.account.eventCurrencyBalanceById?.[FROSTFALL_EVENT.id]===0,'Three Frostfall portraits cost 4,200 tokens total');
check(frostIds.every(id=>purchased.account.unlockedProfileIconIds?.includes(id)),'Account owns all three Frostfall portraits');
rejects(()=>purchaseEventOffer(winter,frostOffers[0].id,frostGrace));
check(canUseProfileIcon({...purchased,account:{...purchased.account,liveEvent:undefined}},frostIds[0]),'Frostfall portrait ownership persists beyond season');
check(purchaseEventOffer(winter,frostOffers[0].id,frostEnd).account.unlockedProfileIconIds?.includes(frostIds[0]),'Frostfall cosmetic purchase remains allowed in claim grace');

console.log('Profile icon selection, ownership, commands and zero-bonus checks passed');


// Account profile identity: first-created local hero wins regardless of active/roster order.
const first={...state.character!,id:'LOCAL_CHAR_1',profileIconId:'starter:hooded-ranger'};
const alt={...otherClassCharacter.character!,id:'LOCAL_CHAR_2',profileIconId:'starter:runic-scholar'};
const multi={...state,character:alt,otherCharacters:[{character:first,inventory:state.inventory,overflow:state.overflow,activity:null,skills:state.skills,quests:state.quests,currentRegionId:state.currentRegionId}],account:{...state.account}};
const migrated=normalizeProfileIcon(multi);
check(accountProfileIconId(migrated)==='starter:hooded-ranger','first-created character icon seeds account, not active alt');
check(migrated.character!.profileIconId==='starter:hooded-ranger'&&migrated.otherCharacters![0].character.profileIconId==='starter:hooded-ranger','all character projections use shared icon');
const changed=executeGameCommand(migrated,{type:'profile',args:{profileIconId:'starter:runic-scholar'}},1000).state;
check(changed.account.profileIconId==='starter:runic-scholar','validated profile command writes account icon');
check(changed.otherCharacters![0].character.profileIconId==='starter:runic-scholar','icon change mirrors other character');
const switched=executeGameCommand(changed,{type:'roster_switch',args:{id:'LOCAL_CHAR_1'}},1000).state;
check(switched.character!.profileIconId==='starter:runic-scholar','character switch preserves account icon');
check(normalizeSave(switched).account.profileIconId==='starter:runic-scholar','shared icon survives save normalization');
const titleOnly=executeGameCommand(switched,{type:'profile',args:{profileTitle:'Adventurer'}},1000).state;
check(titleOnly.account.profileIconId==='starter:runic-scholar','unrelated title write preserves icon');
rejects(()=>executeGameCommand(switched,{type:'profile',args:{profileIconId:'class:DAWNKEEPER'}},1000));
const unseededOnline={...multi,character:{...alt,id:'00000000-0000-0000-0000-000000000002'},otherCharacters:[{...multi.otherCharacters[0],character:{...first,id:'00000000-0000-0000-0000-000000000001'}}]};
check(normalizeProfileIcon(unseededOnline).account.profileIconId===undefined,'online legacy multi-roster cannot guess first-created UUID');

for(const id of ['ascendant-celestial-crown-icon','ascendant-draconic-ruby-icon']){
 check(!profileIconCollection(state).some(row=>row.id===id),'private icon invisible before grant');
 rejects(()=>selectProfileIcon(state,id));
 const granted={...state,account:{...state.account,unlockedProfileIconIds:[id]}};
 check(profileIconCollection(granted).find(row=>row.id===id)?.artworkReady,'granted icon has bundled artwork');
 const privateSelection=selectProfileIcon(granted,id);
 check(normalizeProfileIcon(privateSelection).character?.profileIconId===id,'granted icon survives icon normalization');
 check(normalizeProfileIcon({...privateSelection,account:{...privateSelection.account,unlockedProfileIconIds:[]}}).character?.profileIconId==='class:IRONWARDEN','revocation restores class portrait');
 check(JSON.stringify(effectiveStats(privateSelection))===before,'private icon grants no power');
}
console.log('Profile icon selection, ownership, commands and zero-bonus checks passed');
