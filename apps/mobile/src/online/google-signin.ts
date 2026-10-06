import {Platform} from 'react-native';

declare const process:{env:Record<string,string|undefined>};

const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()??'';
export const googleSignInConfigured=Platform.OS==='android'&&/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(webClientId);

export interface NativeGoogleIdentity {
 idToken:string;
 email:string|null;
 displayName:string|null;
}

/**
 * Uses Android Credential Manager / Google Play services through the native
 * Nitro Google Sign-In module. This must run in a development/production build,
 * not Expo Go.
 */
export async function requestNativeGoogleIdentity():Promise<NativeGoogleIdentity>{
 if(Platform.OS!=='android')throw new Error('Google Play sign-in is currently available on Android only.');
 if(!googleSignInConfigured)throw new Error('Google sign-in is not configured in this build.');

 const google=await import('react-native-nitro-google-signin');
 google.GoogleOneTapSignIn.configure({
  webClientId,
  autoSelectOnSignIn:false,
 });
 await google.GoogleOneTapSignIn.checkPlayServices(true);

 let response=await google.GoogleOneTapSignIn.signIn();
 if(google.isNoSavedCredentialFoundResponse(response))response=await google.GoogleOneTapSignIn.createAccount();
 if(google.isNoSavedCredentialFoundResponse(response))response=await google.GoogleOneTapSignIn.presentExplicitSignIn();
 if(google.isCancelledResponse(response))throw new Error('Google sign-in was cancelled.');
 if(!google.isSuccessResponse(response)||!response.data.idToken)throw new Error('Google did not return a usable sign-in token.');

 return {
  idToken:response.data.idToken,
  email:response.data.user.email,
  displayName:response.data.user.name,
 };
}
