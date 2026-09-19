import {formatGuildTaggedName,guildTagColor,guildTagLabel,guildTagModerationReason,isGuildTagFormatValid,normalizeGuildTag,validateGuildTag} from '../src/core/guild-tags';
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function throws(fn:()=>unknown,needle:string){try{fn()}catch(error){ok(String(error).includes(needle),needle);return}throw new Error(`expected ${needle}`)}
ok(normalizeGuildTag(' arc ')==='ARC','normalization');
ok(isGuildTagFormatValid('abc'),'lowercase format');
ok(!isGuildTagFormatValid('AB1'),'ASCII letters only');
ok(validateGuildTag('val')==='VAL','valid tag');
throws(()=>validateGuildTag('AB'),'invalid_format');
throws(()=>validateGuildTag('ADM'),'reserved');
throws(()=>validateGuildTag('SEX'),'blocked');
ok(guildTagModerationReason('fox')===undefined,'available format');
ok(formatGuildTaggedName('Elroy','arc')==='[ARC] Elroy','display');
ok(guildTagLabel('arc')==='[ARC]','label');
ok(guildTagColor('tag_gold')==='#F1C96B','canonical tag color');
ok(guildTagColor('tag_mythic')==='#FFF09A','canonical mythic tag color');
console.log('guild tags v53 PASS');
