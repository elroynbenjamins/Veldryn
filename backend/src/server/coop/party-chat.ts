import { sendChatMessage, type ChatRepository, type SendChatResult } from '../chat/send-message';
export interface PartyChatMembership {partyId:string;mode:'live'|'qmode';channelEpoch:number;activeAccountIds:string[];}
export class PartyChatAuthorizer{
 constructor(private membership:PartyChatMembership){}
 channelId():string{return `${this.membership.partyId}:${this.membership.channelEpoch}`;}
 canAccess(accountId:string,channelId:string):boolean{return this.membership.mode==='live'&&this.membership.activeAccountIds.includes(accountId)&&channelId===this.channelId();}
 remove(accountId:string):void{this.membership={...this.membership,channelEpoch:this.membership.channelEpoch+1,activeAccountIds:this.membership.activeAccountIds.filter(id=>id!==accountId)};}
 async send(repository:ChatRepository,accountId:string,text:string):Promise<SendChatResult>{if(!this.canAccess(accountId,this.channelId()))return{ok:false,code:'forbidden'};return sendChatMessage(repository,{accountId,channelType:'party',channelId:this.channelId(),text});}
}
