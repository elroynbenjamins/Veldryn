import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';
import {LANGUAGE_LOCALES} from '../src/i18n/translator';
import {
 createSynchronizationLabels,synchronizationUiRows,synchronizationStatRows,synchronizationLinkRows,
 synchronizationStatText,synchronizationLinkText,type SynchronizationStatKey,type SynchronizationLinkKey,
} from '../src/i18n/coop-synchronization';
function check(ok:boolean,message:string){if(!ok)throw Error(message);}
const tokens=(text:string)=>[...text.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort().join('|');
check(Object.keys(synchronizationLinkRows).length===18,'missing link names');
check(Object.keys(synchronizationStatRows).length===23,'missing stat names');
for(const table of [synchronizationUiRows,synchronizationStatRows,synchronizationLinkRows])
 for(const [key,row] of Object.entries(table)){
  check(row.length===SUPPORTED_LANGUAGES.length,'missing language: '+key);
  for(const value of row)check(!!value.trim()&&tokens(value)===tokens(row[0]),'bad localized row: '+key);
 }
for(const language of SUPPORTED_LANGUAGES){
 const labels=createSynchronizationLabels(language);
 check(!labels.active(3).includes('{count}')&&labels.active(3).includes('3'),'active count: '+language);
 check(!labels.moreBonuses(2).includes('{count}'),'more count: '+language);
 check(!labels.scaledStrength(80).includes('{scale}'),'scale interpolation: '+language);
 const percent=new Intl.NumberFormat(LANGUAGE_LOCALES[language],{style:'percent',maximumFractionDigits:2,signDisplay:'always'});
 const number=new Intl.NumberFormat(LANGUAGE_LOCALES[language],{maximumFractionDigits:2,signDisplay:'always'});
 check(labels.formatValue(240,'percent')===percent.format(.024),'localized percent: '+language);
 check(labels.formatValue(200,'percentage_points')===number.format(2)+' '+synchronizationUiRows.pp[SUPPORTED_LANGUAGES.indexOf(language)],'localized points: '+language);
 for(const key of Object.keys(synchronizationStatRows) as SynchronizationStatKey[])
  check(!!synchronizationStatText(language,key),'empty stat: '+key);
 for(const key of Object.keys(synchronizationLinkRows) as SynchronizationLinkKey[])
  check(!!synchronizationLinkText(language,key),'empty link: '+key);
}
console.log('PASS Synchronization localization, placeholders and percentage-point values in all eight languages');
