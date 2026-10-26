import {socialListIdentityIds,withSocialListIdentities} from '../src/core/social-list-projection';
function ok(value:boolean,message:string){if(!value)throw new Error(message);}
const friends=[{account_id:'friend1',display_name:'Name1'},{account_id:'shared',display_name:'Name2'}];
const requests=[{account_id:'shared',direction:'incoming'},{account_id:'friend2',direction:'outgoing'}];
const blocked=[{account_id:'blocked1'}];
const ids=socialListIdentityIds(friends,requests);
ok(ids.join(',')==='friend1,shared,friend2','Friends and requests batch unique authorized IDs');
ok(!ids.includes(blocked[0].account_id),'Blocked identities must not enter public profile lookup');
const enriched=withSocialListIdentities(friends,new Map([['friend1',{profile_icon_id:'starter:armored-sentinel'}]]));
ok(enriched[0].profile_icon_id==='starter:armored-sentinel','Known identity enriches matching friend');
ok(enriched[1].profile_icon_id===undefined,'Unknown identities retain server supplied list rows');
ok(enriched[1].display_name==='Name2'&&friends[0].display_name==='Name1','Identity decoration never mutates server result');
console.log('PASS batched Friends identity projection and blocked-account exclusion');
