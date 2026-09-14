export interface AdminAnnouncement { id:string; title:string; body:string; severity:'info'|'success'|'warning'|'critical'; audience_json:{kind:'all'|'account'|'guild'|'event_participants';accountId?:string;guildId?:string;eventInstanceId?:string}; starts_at:string; ends_at:string|null; in_game_enabled:boolean; push_enabled:boolean; status:string; }
export interface AnnouncementStore { due(now:string,limit:number):Promise<AdminAnnouncement[]>; markActive(id:string):Promise<void>; markEnded(id:string):Promise<void>; }
export interface AnnouncementDelivery { publishInGame(a:AdminAnnouncement,idem:string):Promise<void>; publishPush(a:AdminAnnouncement,idem:string):Promise<void>; }
export async function runAnnouncementWorker(store:AnnouncementStore,delivery:AnnouncementDelivery,now=new Date(),limit=20){
  const due=await store.due(now.toISOString(),limit); let activated=0,ended=0;
  for(const a of due){
    if(a.ends_at && Date.parse(a.ends_at)<=now.getTime()){ await store.markEnded(a.id); ended++; continue; }
    if(a.in_game_enabled) await delivery.publishInGame(a,`announcement:${a.id}:ingame`);
    if(a.push_enabled) await delivery.publishPush(a,`announcement:${a.id}:push`);
    await store.markActive(a.id); activated++;
  }
  return {activated,ended};
}
