import {markUnlockInboxSeen,mergeUnlockInbox,newUnlockInboxEntries,normalizeUnlockInbox,unreadUnlockCount,UNLOCK_INBOX_LIMIT} from '../src/core/unlock-inbox';

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
console.log('PASS account unlock inbox dedupe, persistence normalization, read state and cap');
