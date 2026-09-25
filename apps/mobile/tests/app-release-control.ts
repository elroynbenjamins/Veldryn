import {assert} from './test-assert';
import {compareAppVersions} from '../src/core/app-release-control';

let checks=0;
function check(name:string,run:()=>void){run();checks++;console.log('PASS '+name)}

check('equal semantic versions compare equal',()=>assert.equal(compareAppVersions('1.4.2','1.4.2'),0));
check('newer patch wins',()=>assert.equal(compareAppVersions('1.4.3','1.4.2'),1));
check('older minor loses',()=>assert.equal(compareAppVersions('1.3.9','1.4.0'),-1));
check('missing patch is treated as zero',()=>assert.equal(compareAppVersions('2.1','2.1.0'),0));
check('v prefix is ignored',()=>assert.equal(compareAppVersions('v3.0.0','2.9.9'),1));
console.log(`PASS ${checks} app release-control scenarios`);
