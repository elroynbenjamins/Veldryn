import {parseProfileUpdateRequest} from './profile-api-contracts';
import {ProfileApplicationService} from './profile-application';
export class ProfileHttpApplication{constructor(private readonly profiles:ProfileApplicationService){}self(accountId:string){return this.profiles.self(accountId)}view(accountId:string,targetAccountId:string){return this.profiles.view(accountId,targetAccountId)}update(accountId:string,body:unknown,nowMs:number){return this.profiles.update(accountId,parseProfileUpdateRequest(body),nowMs)}}
