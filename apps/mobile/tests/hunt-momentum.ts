import {HUNT_MOMENTUM_TIERS,huntMomentumBonus,huntMomentumStatus,huntMomentumTier} from '../src/core/hunt-goals';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(HUNT_MOMENTUM_TIERS.length===4,'Momentum should expose four compact tiers');
ok(huntMomentumTier(0).id==='tracking','New hunt should start at Tracking');
ok(huntMomentumTier(24).id==='tracking','Tracking should last through 24 completed kills');
ok(huntMomentumTier(25).id==='focused','Focused should unlock after 25 kills');
ok(huntMomentumTier(75).id==='dominant','Dominant should unlock after 75 kills');
ok(huntMomentumTier(150).id==='relentless','Relentless should unlock after 150 kills');

const focused=huntMomentumStatus(25);
ok(focused.bonusPct===2&&focused.killsToNext===50,'Focused should grant +2% and point to Dominant at 75');
const dominant=huntMomentumStatus(75);
ok(dominant.bonusPct===4&&dominant.killsToNext===75,'Dominant should grant +4% and point to Relentless at 150');
const maxed=huntMomentumStatus(150);
ok(maxed.bonusPct===6&&!maxed.next&&maxed.progressPct===1,'Relentless should be the +6% cap');

ok(huntMomentumBonus(100,0,25)===0,'The first 25 kills should not receive a Momentum bonus');
ok(huntMomentumBonus(100,0,26)===2,'The first kill after 25 completed kills should receive +2%');
ok(huntMomentumBonus(100,25,50)===100,'Kills 26-75 should receive the Focused +2% bonus');
ok(huntMomentumBonus(100,0,76)===104,'A 76-kill run should include 50 Focused kills and one Dominant kill');

const oneClaim=huntMomentumBonus(137,0,120);
const splitClaims=huntMomentumBonus(137,0,40)+huntMomentumBonus(137,40,80);
ok(oneClaim===splitClaims,'Momentum bonus must not depend on how often the player claims rewards');

console.log(JSON.stringify({status:'PASS',tiers:HUNT_MOMENTUM_TIERS.map(t=>({id:t.id,minKills:t.minKills,bonusPct:Math.round(t.bonus*100)})),oneClaim}));
