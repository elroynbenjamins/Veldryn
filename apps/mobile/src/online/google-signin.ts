import {Platform} from 'react-native';
import * as Crypto from 'expo-crypto';

declare const process:{env:Record<string,string|undefined>};

const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()??'';
export const googleSignInConfigured=Platform.OS==='android'&&/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(webClientId);
// Release-controlled native Google account access. A fresh signed Android build
// with Expo Crypto is required when this flag is enabled in the EAS build profile.
export const googleAccountLinkingEnabled=googleSignInConfigured&&process.env.EXPO_PUBLIC_GOOGLE_ACCOUNT_LINKING_ENABLED==='true';

export interface NativeGoogleIdentity {
 idToken:string;
 /** Raw per-attempt nonce passed to Supabase; never log or persist it. */
 nonce:string;
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

 // The native Credential Manager library hashes its own untracked nonce when
 // none is supplied. Supabase cannot validate such a token without the raw
 // nonce, so generate a fresh CSPRNG nonce for every Google attempt.
 const nonceBytes=await Crypto.getRandomBytesAsync(32);
 if(nonceBytes.length!==32)throw new Error('Secure Google sign-in nonce could not be generated.');
 const nonce=Array.from(nonceBytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 // Google expects SHA-256 (lowercase hex); Supabase expects the unhashed value.
 const hashedNonce=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,nonce);
 const google=await import('react-native-nitro-google-signin');
 google.GoogleOneTapSignIn.configure({
  webClientId,
  nonce:hashedNonce,
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
  nonce,
  email:response.data.user.email,
  displayName:response.data.user.name,
 };
}
