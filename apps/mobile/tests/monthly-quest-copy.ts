import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';
import {monthlyQuestText} from '../src/i18n/monthly-quest-copy';
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
for(const language of SUPPORTED_LANGUAGES){
 const headline=monthlyQuestText(language,'MONTHLY QUEST MILESTONES');
 const xp=monthlyQuestText(language,'Skill XP');
 const warning=monthlyQuestText(language,'Near level 100: only {amount} of {total} XP will be applied. Choose another skill for the full reward.',{amount:500,total:1000});
 ok(headline.length>5&&xp.length>1&&warning.includes('500')&&warning.includes('1000'),'Monthly milestone translations must interpolate for '+language);
 ok(!warning.includes('{amount}')&&!warning.includes('{total}'),'Monthly milestone interpolation must replace every placeholder for '+language);
 if(language!=='en')ok(headline!=='MONTHLY QUEST MILESTONES','Monthly milestone heading must be localized for '+language);
}
console.log('PASS monthly quest milestone translations in all eight languages');