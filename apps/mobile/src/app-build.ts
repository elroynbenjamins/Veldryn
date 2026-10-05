import * as Application from 'expo-application';
import appConfig from '../app.json';

declare const process:{env:Record<string,string|undefined>};

export type AppBuildInfo=Readonly<{
  version:string;
  buildNumber:string|null;
  releaseChannel:string;
}>;

// Expo Go reports the host app's version. Only use native values for a Veldryn
// binary; web and Expo Go use the same app config that produces native builds.
const nativeApplicationIds=[appConfig.expo.android.package,appConfig.expo.ios.bundleIdentifier];
const isVeldrynNative=Application.applicationId!==null&&nativeApplicationIds.includes(Application.applicationId);

export const APP_BUILD_INFO:AppBuildInfo=Object.freeze({
  version:(isVeldrynNative&&Application.nativeApplicationVersion?.trim())||appConfig.expo.version,
  buildNumber:(isVeldrynNative&&Application.nativeBuildVersion?.trim())||null,
  releaseChannel:process.env.EXPO_PUBLIC_RELEASE_CHANNEL?.trim()||'production',
});
