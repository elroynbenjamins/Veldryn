import {requireOptionalNativeModule} from 'expo';
import {Platform} from 'react-native';

declare const process:{env:Record<string,string|undefined>};

export type PlayGamesStatus={
  authenticated:boolean;
  playerId?:string;
  displayName?:string;
};

type NativePlayGames={
  getStatus:()=>Promise<PlayGamesStatus>;
  signIn:()=>Promise<PlayGamesStatus>;
};

const projectId=(process.env.EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID??'').trim();

export const playGamesConfigured=Platform.OS==='android'&&Boolean(projectId);

/** Headless status for the Account UI. A missing native module or configuration
 * is NOT the same as a signed-out Play Games player. */
export type PlayGamesConnection=
 |{status:'connected';playerId?:string;displayName?:string}
 |{status:'disconnected'}
 |{status:'unavailable';reason:'platform'|'configuration'|'native';message:string}
 |{status:'error';message:string};

export async function inspectPlayGamesConnection():Promise<PlayGamesConnection>{
 if(Platform.OS!=='android')return {status:'unavailable',reason:'platform',message:'Google Play Games is available on Android only.'};
 if(!projectId)return {status:'unavailable',reason:'configuration',message:'Google Play Games is not configured in this build. Update VELDRYN to a correctly configured Android build.'};
 const native=requireOptionalNativeModule<NativePlayGames>('VeldrynPlayGames');
 if(!native)return {status:'unavailable',reason:'native',message:'This VELDRYN build does not include Google Play Games. Install an updated Android build.'};
 try{
  // isAuthenticated reads the existing player; do not open the Google account picker.
  const result=await native.getStatus();
  return result.authenticated?{status:'connected',playerId:result.playerId,displayName:result.displayName}:{status:'disconnected'};
 }catch(error){
  return {status:'error',message:error instanceof Error?error.message:'Could not check Google Play Games. Please retry.'};
 }
}

function nativePlayGames():NativePlayGames{
  if(Platform.OS!=='android')throw new Error('Google Play Games is currently available on Android only.');
  if(!projectId)throw new Error('Google Play Games is not configured in this build.');
  const native=requireOptionalNativeModule<NativePlayGames>('VeldrynPlayGames');
  if(!native)throw new Error('Google Play Games requires an Android development or Google Play build.');
  return native;
}

export async function getPlayGamesStatus():Promise<PlayGamesStatus>{
  if(!playGamesConfigured)return {authenticated:false};
  return nativePlayGames().getStatus();
}

export async function signInPlayGames():Promise<PlayGamesStatus>{
  return nativePlayGames().signIn();
}
