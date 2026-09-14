"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIdentityClass = resolveIdentityClass;
const classes_1 = require("../content/classes");
/** The server may send a canonical id or a display name. Unknown classes stay generic. */
function resolveIdentityClass(value) {
    if (!value)
        return undefined;
    const normalized = value.trim().toLowerCase().replace(/[_ -]+/g, '');
    return classes_1.CLASSES.find(item => item.id.toLowerCase().replace(/[_ -]+/g, '') === normalized || item.name.toLowerCase().replace(/[_ -]+/g, '') === normalized)?.id;
}
