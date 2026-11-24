import {ScoutingApplicationService} from './scouting-application';
export class ScoutingHttpApplication{
 constructor(private readonly service:ScoutingApplicationService,private readonly now=()=>Date.now()){}
 get(accountId:string,characterId:string){return this.service.snapshot(accountId,characterId)}
 dispatch(accountId:string,characterId:string,body:unknown){return this.service.dispatch(accountId,characterId,body,this.now())}
 claim(accountId:string,characterId:string,body:unknown){return this.service.claim(accountId,characterId,body,this.now())}
}
