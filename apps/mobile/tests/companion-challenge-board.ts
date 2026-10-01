import {challengeBoard} from '../src/core/companion-challenge-board';
const input=[{id:'done',claimed:true,ready:true},{id:'active',claimed:false,ready:false},{id:'monthly',claimed:false,ready:true},{id:'weekly',claimed:false,ready:true},{id:'special',claimed:false,ready:false}];
const result=challengeBoard(input);
if(result.cards.map(card=>card.id).join(',')!=='monthly,weekly,active,special,done')throw Error('Challenge ordering');
if(result.claimableCount!==2)throw Error('Only unclaimed rewards belong in badge');
if(input[0].id!=='done')throw Error('Must not mutate source');
if(challengeBoard([]).claimableCount!==0)throw Error('Empty badge');
console.log('companion challenge board tests passed');
