import {Linking,Platform} from 'react-native';
import appConfig from '../app.json';

const reviewQuery=`id=${appConfig.expo.android.package}&showAllReviews=true`;
export const APP_REVIEW_URL=`https://play.google.com/store/apps/details?${reviewQuery}`;

/** Explicit review buttons open the store; in-app review prompts are quota-limited. */
export async function openAppReview():Promise<void>{
 if(Platform.OS==='android'){
  try{await Linking.openURL(`market://details?${reviewQuery}`);return;}catch{/* Browser fallback when Google Play cannot handle the link. */}
 }
 await Linking.openURL(APP_REVIEW_URL);
}
