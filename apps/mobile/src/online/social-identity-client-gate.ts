/** Mobile-only Social Name gate. Do not change the shared Edge/gameplay release
 * flags for a client-specific rollout. Expo inlines these values at build time.
 *
 * Production builds require three explicit matching values. The Social Name
 * backend is installed for 1.0.11, and only the explicitly enabled production
 * EAS profile may activate the UI. Preview/dev cannot activate it.
 */
// Keep direct Expo environment access while supporting isolated core/onboarding TypeScript builds.
declare const process: {readonly env: Readonly<Record<string,string|undefined>>};
const STAGING_SOCIAL_IDENTITY_PREVIEW=(
 process.env.EXPO_PUBLIC_RELEASE_CHANNEL==='staging'&&
 process.env.EXPO_PUBLIC_SUPABASE_URL==='https://iqfmmpvwanvvmxcftfxw.supabase.co'&&
 process.env.EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW==='true'
);
const PRODUCTION_SOCIAL_NAME_LAUNCH=(
 process.env.EXPO_PUBLIC_RELEASE_CHANNEL==='production'&&
 process.env.EXPO_PUBLIC_SUPABASE_URL==='https://nyjwigipamnvpdvpauuv.supabase.co'&&
 process.env.EXPO_PUBLIC_SOCIAL_NAMES_PRODUCTION_ENABLED==='true'
);
export const ACCOUNT_SOCIAL_IDENTITY_RELEASED=
 STAGING_SOCIAL_IDENTITY_PREVIEW||PRODUCTION_SOCIAL_NAME_LAUNCH;
