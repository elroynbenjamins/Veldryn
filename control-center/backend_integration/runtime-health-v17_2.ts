export interface RuntimeHealthRepository {
  markStarted(component:string,at:string):Promise<void>;
  markSucceeded(component:string,at:string,result:unknown):Promise<void>;
  markFailed(component:string,at:string,error:string):Promise<void>;
}
export async function withRuntimeHeartbeat<T>(repo:RuntimeHealthRepository,component:string,work:()=>Promise<T>):Promise<T>{
  const started=new Date().toISOString(); await repo.markStarted(component,started);
  try{const result=await work(); await repo.markSucceeded(component,new Date().toISOString(),result); return result;}
  catch(error){await repo.markFailed(component,new Date().toISOString(),error instanceof Error?error.message:String(error)); throw error;}
}
