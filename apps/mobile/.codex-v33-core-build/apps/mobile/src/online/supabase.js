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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineConfigured = exports.supabase = void 0;
const SecureStore = __importStar(require("expo-secure-store"));
const supabase_js_1 = require("@supabase/supabase-js");
const react_native_1 = require("react-native");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const auth_callback_1 = require("../core/auth-callback");
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const secureStorage = {
    getItem: (storageKey) => SecureStore.getItemAsync(storageKey),
    setItem: (storageKey, value) => SecureStore.setItemAsync(storageKey, value),
    removeItem: (storageKey) => SecureStore.deleteItemAsync(storageKey),
};
/** Undefined until the public Expo environment variables have been supplied. */
exports.supabase = url && key ? (0, supabase_js_1.createClient)(url, key, {
    auth: { storage: react_native_1.Platform.OS === 'web' ? async_storage_1.default : (0, auth_callback_1.chunkedAuthStorage)(secureStorage), flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
}) : undefined;
exports.onlineConfigured = Boolean(exports.supabase);
