"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// Standalone visual review only. Do not overwrite the existing app entry point in production.
var DemoApp_1 = require("./src/native/DemoApp");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(DemoApp_1).default; } });
// For local account-scoped persistence, pass settingsStore={asyncStorageSettings} to DemoApp.
