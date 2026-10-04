import {accountEmail,accountPassword} from './auth-callback';

/** A resumable UI hint only. Supabase's verified user fields remain the identity authority. */
export const GUEST_PASSWORD_PENDING='veldryn_guest_password_pending';
export interface AccountAuthUser {
 id:string;
 email?:string;
 new_email?:string;
 email_confirmed_at?:string;
 is_anonymous?:boolean;
 user_metadata?:Record<string,unknown>;
}
export type AccountLinkStep='guest'|'verify_email'|'set_password'|'linked';
export function verifiedAccountEmail(user:AccountAuthUser){return user.is_anonymous!==true&&Boolean(user.email&&user.email_confirmed_at);}
export function pendingAccountEmail(user:AccountAuthUser){return user.new_email||user.email||'';}
export function accountLinkStep(user:AccountAuthUser):AccountLinkStep{
 if(verifiedAccountEmail(user))return user.user_metadata?.[GUEST_PASSWORD_PENDING]===true?'set_password':'linked';
 if(pendingAccountEmail(user)||user.user_metadata?.[GUEST_PASSWORD_PENDING]===true)return 'verify_email';
 return user.is_anonymous?'guest':'linked';
}

export interface AccountUserUpdate {email?:string;password?:string;data?:Record<string,unknown>}
export interface GuestAccountAuth<User extends AccountAuthUser> {
 readUser:()=>Promise<User>;
 updateUser:(attributes:AccountUserUpdate,options?:{emailRedirectTo:string})=>Promise<User>;
}
function requireAccount(user:AccountAuthUser,accountId:string){
 if(!accountId||user.id!==accountId)throw new Error('Your signed-in account changed. Reopen Account and try again.');
}
/** Add the email to the current guest; never create or switch to another identity. */
export async function beginGuestAccountLink<User extends AccountAuthUser>(auth:GuestAccountAuth<User>,accountId:string,email:string,displayName:string,redirectTo:string){
 const cleanEmail=accountEmail(email),name=displayName.trim();
 if(name.length<3||name.length>20)throw new Error('Username must be 3–20 characters.');
 const user=await auth.readUser();requireAccount(user,accountId);
 if(!user.is_anonymous)throw new Error('This account is already linked. Check verification to refresh its status.');
 const updated=await auth.updateUser({email:cleanEmail,data:{display_name:name,[GUEST_PASSWORD_PENDING]:true}},{emailRedirectTo:redirectTo});
 requireAccount(updated,accountId);return updated;
}
/** Email verification must succeed on the server before a password is added. */
export async function finishGuestAccountLink<User extends AccountAuthUser>(auth:GuestAccountAuth<User>,accountId:string,password:string){
 const cleanPassword=accountPassword(password),user=await auth.readUser();requireAccount(user,accountId);
 if(!verifiedAccountEmail(user))throw new Error('Confirm your email before setting your account password.');
 let updated:User;
 try{updated=await auth.updateUser({password:cleanPassword,data:{[GUEST_PASSWORD_PENDING]:false}});}
 catch(error){
  // A retry after a successful password write can return same_password. The
  // server has checked it; finish only the UI marker, without changing users.
  if(!error||typeof error!=='object'||!('code' in error)||error.code!=='same_password')throw error;
  updated=await auth.updateUser({data:{[GUEST_PASSWORD_PENDING]:false}});
 }
 requireAccount(updated,accountId);return updated;
}

interface AccountAuthSession {access_token:string;user:AccountAuthUser}
export interface AccountSessionSource<Session extends AccountAuthSession>{
 readSession:()=>Promise<Session|null>;
 readUser:(accessToken:string)=>Promise<Session['user']>;
 refreshSession:()=>Promise<Session|null>;
}
function tokenIdentity(accessToken:string):{is_anonymous?:unknown;email?:unknown}|null{
 // Decoding is only a hint to renew a stale token. Never use these unverified
 // claims to authorize an action or to label an account as verified.
 try{
  const part=accessToken.split('.')[1];if(!part||part.length>32768||!/^[A-Za-z0-9_-]+={0,2}$/.test(part))return null;
  // React Native does not guarantee atob/TextDecoder globals. Decode UTF-8
  // without a browser dependency so native sessions receive the same check.
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let buffer=0,bits=0,encoded='';
  for(const char of part.replace(/=+$/,'')){
   buffer=(buffer<<6)|alphabet.indexOf(char);bits+=6;
   if(bits>=8){bits-=8;encoded+=`%${((buffer>>>bits)&255).toString(16).padStart(2,'0')}`;buffer&=(1<<bits)-1;}
  }
  return JSON.parse(decodeURIComponent(encoded));
 }catch{return null;}
}
export function accountTokenNeedsRefresh(session:AccountAuthSession,user:AccountAuthUser){
 const token=tokenIdentity(session.access_token);
 return session.user.is_anonymous!==user.is_anonymous||session.user.email!==user.email||session.user.email_confirmed_at!==user.email_confirmed_at
  ||(typeof token?.is_anonymous==='boolean'&&token.is_anonymous!==Boolean(user.is_anonymous))
  ||(typeof token?.email==='string'&&token.email!==(user.email??''));
}
/** Reconcile external email verification without trusting the cached session user. */
export async function reconcileAccountSession<Session extends AccountAuthSession>(source:AccountSessionSource<Session>):Promise<Session|null>{
 const before=await source.readSession();if(!before)return null;
 const beforeUser=JSON.stringify(before.user),user=await source.readUser(before.access_token);
 const current=await source.readSession();
 // A sign-out, account switch, refresh, or local user update wins over an older
 // in-flight network read. Never resurrect the guest or attach another user.
 if(!current||current.user.id!==before.user.id||current.access_token!==before.access_token||JSON.stringify(current.user)!==beforeUser)return current;
 requireAccount(user,before.user.id);
 if(accountTokenNeedsRefresh(current,user)){
  const refreshed=await source.refreshSession(),latest=await source.readSession();
  if(!latest||!refreshed||latest.user.id!==before.user.id||latest.access_token!==refreshed.access_token)return latest;
  return refreshed;
 }
 return JSON.stringify(user)===beforeUser?current:{...current,user};
}
