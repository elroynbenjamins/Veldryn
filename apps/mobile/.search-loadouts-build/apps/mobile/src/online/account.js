"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRedirect = void 0;
exports.currentSession = currentSession;
exports.sendMagicLink = sendMagicLink;
exports.completeMagicLink = completeMagicLink;
exports.signOut = signOut;
exports.signInAsGuest = signInAsGuest;
exports.signInWithPassword = signInWithPassword;
exports.createOnlineAccount = createOnlineAccount;
exports.requestPasswordRecovery = requestPasswordRecovery;
exports.updateAccountPassword = updateAccountPassword;
exports.resendAccountConfirmation = resendAccountConfirmation;
exports.upgradeGuestAccount = upgradeGuestAccount;
const Linking = __importStar(require("expo-linking"));
const supabase_1 = require("./supabase");
const auth_callback_1 = require("../core/auth-callback");
const accountRedirect = () => Linking.createURL('auth');
exports.accountRedirect = accountRedirect;
async function currentSession() {
    if (!supabase_1.supabase)
        return null;
    const { data, error } = await supabase_1.supabase.auth.getSession();
    if (error)
        throw error;
    return data.session;
}
async function sendMagicLink(email) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean))
        throw new Error('Enter a valid email address.');
    const { error } = await supabase_1.supabase.auth.signInWithOtp({ email: clean, options: {
            shouldCreateUser: true,
            emailRedirectTo: Linking.createURL('auth'),
        } });
    if (error)
        throw error;
}
/** Completes the PKCE callback when the sign-in email opens Veldryn. */
async function completeMagicLink(url) {
    if (!supabase_1.supabase)
        return null;
    const code = (0, auth_callback_1.authCallbackCode)(url, (0, exports.accountRedirect)());
    if (!code)
        return currentSession();
    const { error } = await supabase_1.supabase.auth.exchangeCodeForSession(code);
    if (error)
        throw error;
    return currentSession();
}
async function signOut() {
    if (!supabase_1.supabase)
        return;
    const { error } = await supabase_1.supabase.auth.signOut();
    if (error)
        throw error;
}
async function signInAsGuest() {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const { data, error } = await supabase_1.supabase.auth.signInAnonymously();
    if (error)
        throw error;
    return data.user;
}
async function signInWithPassword(email, password) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const { error } = await supabase_1.supabase.auth.signInWithPassword({ email: (0, auth_callback_1.accountEmail)(email), password });
    if (error)
        throw error;
}
async function createOnlineAccount(email, password, displayName) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const name = displayName.trim();
    if (name.length < 3 || name.length > 20)
        throw new Error('Username must be 3–20 characters.');
    const { data, error } = await supabase_1.supabase.auth.signUp({ email: (0, auth_callback_1.accountEmail)(email), password: (0, auth_callback_1.accountPassword)(password), options: { emailRedirectTo: (0, exports.accountRedirect)(), data: { display_name: name } } });
    if (error)
        throw error;
    return { confirmed: Boolean(data.session) };
}
async function requestPasswordRecovery(email) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const { error } = await supabase_1.supabase.auth.resetPasswordForEmail((0, auth_callback_1.accountEmail)(email), { redirectTo: (0, exports.accountRedirect)() });
    if (error)
        throw error;
}
async function updateAccountPassword(password) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const { error } = await supabase_1.supabase.auth.updateUser({ password: (0, auth_callback_1.accountPassword)(password) });
    if (error)
        throw error;
}
async function resendAccountConfirmation(email) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const { error } = await supabase_1.supabase.auth.resend({ type: 'signup', email: (0, auth_callback_1.accountEmail)(email), options: { emailRedirectTo: (0, exports.accountRedirect)() } });
    if (error)
        throw error;
}
/** Links a guest identity to a recoverable official email/password account. */
async function upgradeGuestAccount(email, password, displayName) {
    if (!supabase_1.supabase)
        throw new Error('Online services are not configured in this build.');
    const cleanEmail = email.trim().toLowerCase(), cleanName = displayName.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail))
        throw new Error('Enter a valid email address.');
    if (password.length < 8)
        throw new Error('Choose a password with at least 8 characters.');
    if (cleanName.length < 3 || cleanName.length > 20)
        throw new Error('Username must be 3–20 characters.');
    const { data: { user }, error: userError } = await supabase_1.supabase.auth.getUser();
    if (userError)
        throw userError;
    if (!user)
        throw new Error('Sign in first.');
    const { error } = await supabase_1.supabase.auth.updateUser({ email: cleanEmail, password });
    if (error)
        throw error;
    const { error: profileError } = await supabase_1.supabase.from('player_profiles').upsert({ account_id: user.id, display_name: cleanName, updated_at: new Date().toISOString() });
    if (profileError)
        throw profileError;
}
