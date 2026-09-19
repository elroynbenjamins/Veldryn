import { strict as assert } from 'node:assert';
import { bossAttemptsRemaining, crisisStatusLabel, formatCompact, fraction } from '../src/core/shared-world-v19';
assert.equal(fraction(50,100),0.5); assert.equal(fraction(200,100),1); assert.equal(formatCompact(1500),'1.5K');
assert.equal(bossAttemptsRemaining({instanceId:'1',name:'x',regionId:'r',state:'active',endsAt:'x',maxHp:1,remainingHp:1,phaseName:'p',attemptsToday:3,dailyAttemptCap:4,yourRaidImpact:0,yourAppliedDamage:0}),1);
assert.equal(crisisStatusLabel({instanceId:'1',name:'x',regionId:'r',state:'secured',endsAt:'x',targetPoints:1,creditedPoints:1,currentStageName:'p',yourPoints:1}),'Region Secured');
console.log('v19 mobile helpers passed');
