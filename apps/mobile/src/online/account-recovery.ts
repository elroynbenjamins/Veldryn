import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCOUNT_RECOVERY_STORAGE_KEY='veldryn.account-recovery.v1';
interface RecoveryStorage {
 getItem:(key:string)=>Promise<string|null>;
 setItem:(key:string,value:string)=>Promise<unknown>;
 removeItem:(key:string)=>Promise<unknown>;
}

/** A navigation hint only. Passwords, email addresses and session tokens never enter this record. */
export function createAccountRecoveryStorage(storage:RecoveryStorage){
 let pending:Promise<unknown>=Promise.resolve();
 const enqueue=<T,>(action:()=>Promise<T>)=>{
  const request=pending.then(action);
  // Serialize reads and writes, including a clear after a slow recovery write.
  // One failed device-storage operation must not poison subsequent attempts.
  pending=request.catch(()=>{});return request;
 };
 return {
  read:()=>enqueue(async()=>{
   const value=await storage.getItem(ACCOUNT_RECOVERY_STORAGE_KEY);
   if(!value)return null;
   try{
    const record:unknown=JSON.parse(value);
    if(!record||typeof record!=='object'||!('accountId' in record))return null;
    return typeof record.accountId==='string'&&record.accountId.length>0&&record.accountId.length<=128?record.accountId:null;
   }catch{return null;}
  }),
  write:(accountId:string|null)=>enqueue(()=>accountId?storage.setItem(ACCOUNT_RECOVERY_STORAGE_KEY,JSON.stringify({accountId})):storage.removeItem(ACCOUNT_RECOVERY_STORAGE_KEY)),
 };
}

export const accountRecoveryStorage=createAccountRecoveryStorage(AsyncStorage);
