"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoopEventExpeditionPreview = validateCoopEventExpeditionPreview;
function validateCoopEventExpeditionPreview(value) {
    if (!value.id.trim() || !value.eventName.trim() || !value.name.trim() || !value.description.trim() || !value.finalBoss.trim())
        throw new Error('invalid_event_expedition_preview');
    if (value.status !== 'preview' && value.status !== 'available')
        throw new Error('invalid_event_expedition_status');
    if (value.routeHighlights.length < 3 || new Set(value.routeHighlights.map(item => item.trim().toLocaleLowerCase())).size !== value.routeHighlights.length || value.routeHighlights.some(item => !item.trim()))
        throw new Error('invalid_event_route_highlights');
}
