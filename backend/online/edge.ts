import {gameplayHandler,GameplayError} from './gameplay';
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anonKey=Deno.env.get('SUPABASE_ANON_KEY')!;
if(!url||!serviceKey||!anonKey)throw new Error('server_configuration_missing');
Deno.serve(gameplayHandler({
 authenticate:async token=>{const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:`Bearer ${token}`}});if(!response.ok)return null;const user=await response.json();return typeof user.id==='string'?user.id:null;},
 rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},body:JSON.stringify(args)});const body=await response.json();if(!response.ok){if(body.code==='P0001')throw new GameplayError(body.message);if(body.code==='23505')throw new GameplayError('This character name is already used on your account.');throw new Error('database_unavailable');}return body as T;},
 randomId:()=>crypto.randomUUID(),randomRoll:()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,
}));
