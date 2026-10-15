import {MERCHANT_GUILD_FESTIVAL} from '../src/ui/live-event-visuals-future';

const ok=(value:unknown,message:string)=>{if(!value)throw new Error(message)};
ok(MERCHANT_GUILD_FESTIVAL.badgeIcon,'Merchant event badge artwork missing');
ok(MERCHANT_GUILD_FESTIVAL.commonCurrencyIcon&&MERCHANT_GUILD_FESTIVAL.prestigeCurrencyIcon,'Merchant event currency artwork missing');
ok(MERCHANT_GUILD_FESTIVAL.candyIcon,'Merchant event candy artwork missing');
ok(Object.keys(MERCHANT_GUILD_FESTIVAL.discoveryArt).length===4,'Merchant event discovery artwork must cover all four discoveries');
ok(MERCHANT_GUILD_FESTIVAL.rewardArt.EVT_PET_018&&MERCHANT_GUILD_FESTIVAL.rewardArt.EVT_PET_019&&MERCHANT_GUILD_FESTIVAL.rewardArt.EVT_UNIT_010,'Merchant event reward artwork missing');
ok(MERCHANT_GUILD_FESTIVAL.enemyArt?.local&&MERCHANT_GUILD_FESTIVAL.enemyArt?.trade&&MERCHANT_GUILD_FESTIVAL.enemyArt?.guild,'Merchant event enemy artwork missing');
console.log('PASS: Merchant & Guild Festival has a complete future visual bundle');
