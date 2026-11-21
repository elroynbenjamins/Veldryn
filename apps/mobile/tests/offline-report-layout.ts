import {COMPACT_OFFLINE_REPORT_BELOW_DP,shouldUseCompactOfflineReport} from '../src/core/offline-report-layout';

function ok(value:boolean,message:string){if(!value)throw new Error(message);}

ok(COMPACT_OFFLINE_REPORT_BELOW_DP===384,'Only genuinely narrow viewports should receive compact offline report');
for(const width of [320,340,360,375,383]){
 ok(shouldUseCompactOfflineReport(true,width),`Narrow offline viewport ${width}dp must be compact`);
 ok(!shouldUseCompactOfflineReport(false,width),`Regular reward popup ${width}dp must retain existing layout`);
}
for(const width of [384,390,400,411,430,600,800]){
 ok(!shouldUseCompactOfflineReport(true,width),`S24+-sized or larger viewport ${width}dp must retain original layout`);
}
for(const width of [0,-1,NaN,Infinity,-Infinity]){
 ok(!shouldUseCompactOfflineReport(true,width),'Invalid width must not select compact report');
}
console.log('PASS: compact offline report breakpoints preserve S24+ layout and ordinary rewards');
