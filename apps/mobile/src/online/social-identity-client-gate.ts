import {ACCOUNT_SOCIAL_IDENTITY_RELEASED as PRODUCTION_SOCIAL_IDENTITY_RELEASED} from '../core/release-flags';

/** Mobile-only Social Names gate. Gameplay Edge bundles must not import build-profile overrides.
 * The feature stays OFF in production; internal Android staging APKs can QA it
 * against the migrated staging backend without changing shared server bundles.
 * Expo statically inlines the EXPO_PUBLIC_ values during build. */
export const ACCOUNT_SOCIAL_IDENTITY_RELEASED=
 PRODUCTION_SOCIAL_IDENTITY_RELEASED||(
  process.env.EXPO_PUBLIC_RELEASE_CHANNEL==='staging'&&
  process.env.EXPO_PUBLIC_SUPABASE_URL==='https://iqfmmpvwanvvmxcftfxw.supabase.co'&&
  process.env.EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW==='true'
 );
