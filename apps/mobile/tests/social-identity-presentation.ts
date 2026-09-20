import {compactCharacterSummary,rankingPositionPresentation,socialGuildRolePresentation} from '../src/core/social-identity';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function ok(value:unknown,message:string){if(!value)fail(message)}

equal(socialGuildRolePresentation('leader').tone,'gold','guild leader uses gold identity tone');
equal(socialGuildRolePresentation('officer').tone,'info','guild officer uses info identity tone');
equal(socialGuildRolePresentation('member').tone,'muted','guild member uses muted identity tone');
equal(socialGuildRolePresentation('leader').label,'Guild Leader','guild leader label is explicit');

equal(rankingPositionPresentation(1).tone,'podium_gold','rank one gets gold podium treatment');
equal(rankingPositionPresentation(2).tone,'podium_silver','rank two gets silver podium treatment');
equal(rankingPositionPresentation(3).tone,'podium_bronze','rank three gets bronze podium treatment');
equal(rankingPositionPresentation(12).label,'#12','ordinary ranking keeps exact rank label');
equal(rankingPositionPresentation(0).label,'#1','invalid low rank safely clamps to one');

equal(compactCharacterSummary('Aela','KNIFE_DANCER',42),'Aela · Knife Dancer · Lv. 42','compact identity formats selected character cleanly');
equal(compactCharacterSummary('Brann',null,null),'Brann · Adventurer','missing class uses safe Adventurer label');
equal(compactCharacterSummary(null,'IRONWARDEN',10),'No synced character','missing character does not invent an identity');
ok(compactCharacterSummary('Mira','dawnkeeper',7).includes('Dawnkeeper'),'class display formatting is readable');

console.log('PASS: compact social identity presentation');
