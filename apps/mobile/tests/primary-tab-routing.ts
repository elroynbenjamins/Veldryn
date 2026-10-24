import {PRIMARY_NAV_DESTINATIONS,primaryNavForRoute} from '../src/core/primary-tab-routing';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
ok(PRIMARY_NAV_DESTINATIONS.join(',')==='Home,Character,Skills,World,Inventory,More','Persistent tabs retain Home at first position');
for(const tab of PRIMARY_NAV_DESTINATIONS)ok(primaryNavForRoute(tab)===tab,'Persistent '+tab+' highlights itself');
for(const detail of ['Guild','Friends','Settings','Collections','Profile','ProfileCustomize','Activity','Events','DailySupplies','AccountBonuses'])ok(primaryNavForRoute(detail)==='More',detail+' stays an Account-side detail');
for(const battle of ['Combat','Coop'])ok(primaryNavForRoute(battle)==='World',battle+' retains World parent');
const transition=['Home','Inventory','More','Guild','More','Home','World','Combat','World','Home'];
const visible=transition.map(primaryNavForRoute);
ok(visible.join(',')==='Home,Inventory,More,More,More,Home,World,World,World,Home','Home→Inventory→Guild→Home→Combat→Home transitions never highlight a false tab');
console.log('PASS bottom navigation Home selection, screen transitions, and detail-route parent highlighting');
