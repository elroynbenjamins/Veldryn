import {assert} from './test-assert';
import {parseStoredJsonObject} from '../src/core/stored-json';

assert.deepEqual(parseStoredJsonObject('{"offerId":"a","requestId":"b"}'),{offerId:'a',requestId:'b'});
for(const raw of [null,undefined,'','{"truncated":','not json','[1,2]','null','42','"text"'])
 assert.equal(parseStoredJsonObject(raw),null,'Corrupt or non-object stored value must read as empty: '+String(raw));
console.log('PASS: stored pending-command JSON tolerates corrupt device storage');
