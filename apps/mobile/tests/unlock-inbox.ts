import type {GameState} from '../src/core/types';
import {markUnlockInboxSeen,mergeUnlockInbox,newUnlockInboxEntries,newlyUnlockedOtherCosmetics,normalizeUnlockInbox,unreadUnlockCount,unlockInboxDisplayName,UNLOCK_INBOX_LIMIT} from '../src/core/unlock-inbox';

const equal=(actual:unknown,expected:unknown,message:string)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(message+': '+JSON.stringify(actual));};
const ok=(value:unknown,message:string)=>{if(!value)throw new Error(message)};
const initial=newUnlockInboxEntries([
 {key:'title:pathfinder',kind:'title',name:'Pathfinder'},
 {key:'profile-icon:stormwatch-crest',kind:'profile_icon',name:'Stormwatch Crest'},
 {key:'border:amber',kind:'border',name:'Amber Frame',detail:'Guild Level 10'},
],1000);
equal(initial.length,3,'new unlocks produce one record each');
equal(unreadUnlockCount(initial),3,'new unlocks are initially unread');
const read=markUnlockInboxSeen(initial);
equal(unreadUnlockCount(read),0,'opening the inbox clears unread markers without removing history');
const repeated=mergeUnlockInbox(read,newUnlockInboxEntries([{key:'title:pathfinder',kind:'title',name:'Pathfinder'}],2000));
equal(unreadUnlockCount(repeated),0,'an already seen cosmetic does not reannounce');
equal(repeated.find(entry=>entry.key==='title:pathfinder')?.unlockedAtMs,1000,'repeated cosmetic keeps original earned time');
const newest=mergeUnlockInbox(read,newUnlockInboxEntries([{key:'background:moon',kind:'background',name:'Moonrise'}],3000));
equal(newest[0].key,'background:moon','newest rewards appear first');
equal(unreadUnlockCount(newest),1,'new rewards stay unread while old history remains read');
const invalid=normalizeUnlockInbox([null,{},'bad',{key:'title:x',kind:'title',name:'X',unlockedAtMs:0,seen:false}]);
equal(invalid.length,0,'invalid persisted values are ignored');
const many=newUnlockInboxEntries(Array.from({length:140},(_,i)=>({key:'title:'+i,kind:'title' as const,name:'Title '+i})),Date.now());
equal(many.length,UNLOCK_INBOX_LIMIT,'account-local history is bounded');
ok(initial.every(entry=>entry.name.length>0),'unlock labels are preserved');
const previous={account:{unlockedCosmeticPetIds:['pet:owned'],unlockedEmoteIds:[],unlockedGuildCosmeticIds:[]}} as unknown as GameState;
const earned={account:{unlockedCosmeticPetIds:['pet:owned','pet:new'],unlockedEmoteIds:['emote:waving'],unlockedGuildCosmeticIds:['frame:storm']}} as unknown as GameState;
const extra=newlyUnlockedOtherCosmetics(previous,earned);
equal(extra.length,3,'pets, emotes and guild cosmetics join the same inbox');
ok(extra.some(entry=>entry.key==='pet:pet:new'),'new cosmetic pet is detected');
ok(!extra.some(entry=>entry.key==='pet:pet:owned'),'old pet is not re-announced');
ok(extra.some(entry=>entry.kind==='emote')&&extra.some(entry=>entry.kind==='guild_cosmetic'),'other permanent cosmetics are detected');
const corePets=newlyUnlockedOtherCosmetics(
 {account:{unlockedCosmeticPetIds:[]}} as unknown as GameState,
 {account:{unlockedCosmeticPetIds:['PET_022','PET_001','PET_009']}} as unknown as GameState,
);
equal(corePets.find(entry=>entry.key==='pet:PET_022')?.name,'Tiny Sphinx','new pet unlocks use canonical pet name');
equal(corePets.find(entry=>entry.key==='pet:PET_001')?.name,'Pebblemole','early-game pet unlocks use canonical pet name');
equal(corePets.find(entry=>entry.key==='pet:PET_009')?.name,'Tusklet','common drop pet unlocks use canonical pet name');
equal(unlockInboxDisplayName({kind:'pet',key:'pet:PET_022',name:'PET 022'}),'Tiny Sphinx','older saved pet inbox entries display canonical names');
equal(unlockInboxDisplayName({kind:'pet',key:'pet:custom-pet',name:'Event Pet'}),'Event Pet','unknown or event pets preserve their recorded name');
equal(unlockInboxDisplayName({kind:'title',key:'title:pathfinder',name:'Pathfinder'}),'Pathfinder','other unlock kinds are unchanged');
console.log('PASS account unlock inbox dedupe, persistence normalization, read state, canonical pet names and cap');
