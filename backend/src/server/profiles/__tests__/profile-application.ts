import {strict as assert} from 'node:assert';
import {parseProfileUpdateRequest} from '../profile-api-contracts';
import {ProfileApplicationService} from '../profile-application';
import type {ProfileRepository} from '../profile-persistence';
import type {ProfileSelfProjection,ProfileUpdateResult} from '../profile-types';
const sample:ProfileSelfProjection={displayName:'Aster',visibility:'public',revision:1,character:{name:'Aster',classId:'warden',level:12,bodyPresentation:'female'},title:{id:'title.base',name:'Adventurer'},backgroundId:'asterfall-night',characterCount:1,ownedTitleIds:['title.base']};
class Memory implements ProfileRepository{async self(){return sample}async publicProfile(){return sample}async update(_id:string,_input:unknown,nowMs:number){return{profile:sample,idempotentReplay:nowMs===1} as ProfileUpdateResult}}
const expectThrow=(fn:()=>unknown)=>{let threw=false;try{fn()}catch{threw=true}assert.equal(threw,true)};
const service=new ProfileApplicationService(new Memory());const parsed=parseProfileUpdateRequest({requestId:'request-1',displayName:'Aster',activeCharacterId:'LOCAL_CHAR_1',titleId:'title.base',backgroundId:'asterfall-night',visibility:'private'});assert.equal(parsed.visibility,'private');expectThrow(()=>parseProfileUpdateRequest({requestId:'short',displayName:'Aster',activeCharacterId:'x',titleId:'t',backgroundId:'b',visibility:'public'}));expectThrow(()=>service.self(''));expectThrow(()=>service.update('a',parsed,Number.NaN));void service.update(' account-a ',parsed,1).then(result=>{assert.equal(result.idempotentReplay,true);console.log('profile application PASS')});
