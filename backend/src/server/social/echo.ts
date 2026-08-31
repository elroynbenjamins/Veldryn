export interface EchoSnapshot{profileId:string;characterId:string;contentVersion:string;profileVersion:number;level:number;role:string;loadoutHash:string;publishedAtMs:number;preferences:Record<string,string|number|boolean>}
export function freezeEcho(s:EchoSnapshot):Readonly<EchoSnapshot>{return Object.freeze({...s,preferences:Object.freeze({...s.preferences})});}
export function echoEligible(s:EchoSnapshot,currentContentVersion:string){return s.contentVersion===currentContentVersion&&s.profileVersion>0&&!!s.loadoutHash;}
