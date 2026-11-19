"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoopDomainError = void 0;
class CoopDomainError extends Error {
    code;
    details;
    constructor(code, details = {}) {
        super(code);
        this.code = code;
        this.details = details;
        this.name = 'CoopDomainError';
    }
}
exports.CoopDomainError = CoopDomainError;
