import assert from 'node:assert/strict';
import {API_NAMES,EQUIPMENT_API_NAMES_V33} from './contracts';

assert.deepEqual(API_NAMES.slice(-EQUIPMENT_API_NAMES_V33.length),EQUIPMENT_API_NAMES_V33);
assert.equal(new Set(API_NAMES).size,API_NAMES.length,'API registry contains no duplicate names');
console.log('canonical API registry includes v33 equipment actions');
