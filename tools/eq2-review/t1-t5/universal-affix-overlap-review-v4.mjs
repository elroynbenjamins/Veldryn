import {readFileSync} from 'node:fs';
import {createAffixReview} from './universal-affix-cap-review-v3.mjs';
const contract=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-universal-affix-overlap-review-v4.json',import.meta.url),'utf8'));
export const {previewUniversalRoll,inspectReviewLoadout,capChannel}=createAffixReview(contract);
