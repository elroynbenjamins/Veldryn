import {parseScoutingClaimBody,parseScoutingDispatchBody} from './scouting-api-contracts';
import type {ScoutingRepository} from './scouting-persistence';
const owner=(value:string,name:string)=>{const v=value?.trim();if(!v||v.length>128)throw Error(name);return v};
const time=(value:number)=>{if(!Number.isSafeInteger(value)||value<0)throw Error('INVALID_TIME');return value};
export class ScoutingApplicationService{
 constructor(private readonly repository:ScoutingRepository){}
 snapshot(accountId:string,characterId:string){return this.repository.snapshot(owner(accountId,'AUTH_REQUIRED'),owner(characterId,'CHARACTER_REQUIRED'))}
 dispatch(accountId:string,characterId:string,body:unknown,nowMs:number){const parsed=parseScoutingDispatchBody(body);return this.repository.dispatch({accountId:owner(accountId,'AUTH_REQUIRED'),characterId:owner(characterId,'CHARACTER_REQUIRED'),...parsed,nowMs:time(nowMs)})}
 claim(accountId:string,characterId:string,body:unknown,nowMs:number){const parsed=parseScoutingClaimBody(body);return this.repository.claim({accountId:owner(accountId,'AUTH_REQUIRED'),characterId:owner(characterId,'CHARACTER_REQUIRED'),...parsed,nowMs:time(nowMs)})}
 migrateAccount(accountId:string,nowMs:number){return this.repository.migrateAccount({accountId:owner(accountId,'AUTH_REQUIRED'),nowMs:time(nowMs)})}
}
