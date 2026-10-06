import {requireOptionalNativeModule} from 'expo';
import {Platform} from 'react-native';

declare const process:{env:Record<string,string|undefined>};

type GoogleCredential={idToken:string;nonce:string};
export type PlayGamesStatus={authenticated:boolean;playerId?:string;displayName?:string};
type NativeGoogleServices={
  signInWithGoogle:(serverClientId:string)=>Promise<GoogleCredential>;
  getPlayGamesStatus:()=>Promise<PlayGamesStatus>;
  signInPlayGames:()=>Promise<PlayGamesStatus>;
};

const googleWebClientId=(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID??'').trim();
const playGamesProjectId=(process.env.EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID??'').trim();
const nativeGoogleServices=Platform.OS==='android'
  ?requireOptionalNativeModule<NativeGoogleServices>('VeldrynGoogleServices')
  :null;

export const googleAccountSignInConfigured=Boolean(nativeGoogleServices&&googleWebClientId);
export const playGamesConfigured=Boolean(nativeGoogleServices&&playGamesProjectId);

export async function requestGoogleCredential():Promise<GoogleCredential>{
  if(Platform.OS!=='android')throw new Error('Google sign-in is currently available on Android.');
  if(!nativeGoogleServices)throw new Error('Google sign-in requires an Android development or Google Play build.');
  if(!googleWebClientId)throw new Error('Google sign-in is not configured in this build.');
  const credential=await nativeGoogleServices.signInWithGoogle(googleWebClientId);
  if(!credential?.idToken||!credential.nonce)throw new Error('Google did not return a usable sign-in credential.');
  return credential;
}

export async function getPlayGamesStatus():Promise<PlayGamesStatus>{
  if(!nativeGoogleServices||!playGamesProjectId)return {authenticated:false};
  return nativeGoogleServices.getPlayGamesStatus();
}

export async function signInPlayGames():Promise<PlayGamesStatus>{
  if(Platform.OS!=='android')throw new Error('Google Play Games is currently available on Android.');
  if(!nativeGoogleServices)throw new Error('Google Play Games requires an Android development or Google Play build.');
  if(!playGamesProjectId)throw new Error('Google Play Games is not configured in this build.');
  return nativeGoogleServices.signInPlayGames();
}
