/** Collapse concurrent identical reads. No result is retained after completion;
 * access-controlled data is always re-authorized on the next navigation.
 */
export class RequestSingleflight<T>{
 private readonly pending=new Map<string,Promise<T>>();
 run(key:string,read:()=>Promise<T>):Promise<T>{
  const existing=this.pending.get(key);
  if(existing)return existing;
  const request=Promise.resolve().then(read);
  this.pending.set(key,request);
  void request.finally(()=>{
   if(this.pending.get(key)===request)this.pending.delete(key);
  }).catch(()=>{});
  return request;
 }
}
