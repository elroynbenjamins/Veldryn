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
