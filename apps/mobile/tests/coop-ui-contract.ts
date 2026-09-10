import {COOP_PRIMARY_TABS,COOP_UI_READY_ASSET_IDS,isCoopUiAssetId} from '../src/core/coop-ui-contract';

function equal(actual:unknown,expected:unknown,message:string){
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`);
}

equal(COOP_PRIMARY_TABS,['Home','Character','World','Inventory','More'],'primary tab contract changed');
equal(COOP_UI_READY_ASSET_IDS.length,28,'ready asset count changed');
equal(new Set(COOP_UI_READY_ASSET_IDS).size,28,'ready asset IDs must be unique');
equal(COOP_UI_READY_ASSET_IDS.filter(id=>id.startsWith('node_')).length,10,'node tile count changed');
equal(COOP_UI_READY_ASSET_IDS.filter(id=>id.startsWith('role_')).length,3,'role tile count changed');
equal(COOP_UI_READY_ASSET_IDS.filter(id=>id.startsWith('boon_')).length,3,'boon tile count changed');
equal(COOP_UI_READY_ASSET_IDS.filter(id=>id.startsWith('skill_')).length,4,'skill tile count changed');
equal(isCoopUiAssetId('rootbound_hero'),true,'known ready asset rejected');
equal(isCoopUiAssetId('tank_portrait'),false,'prototype portrait entered ready registry');
equal(isCoopUiAssetId('nav_world'),false,'prototype navigation tile entered ready registry');
console.log('co-op UI contract OK');
