"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryGameRepository = void 0;
class MemoryGameRepository {
    constructor() {
        this.state = null;
    }
    async load() { return this.state ? JSON.parse(JSON.stringify(this.state)) : null; }
    async save(state) { this.state = JSON.parse(JSON.stringify(state)); }
    async reset() { this.state = null; }
}
exports.MemoryGameRepository = MemoryGameRepository;
