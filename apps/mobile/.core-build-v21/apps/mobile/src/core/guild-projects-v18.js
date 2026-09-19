"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectProgressPercent = projectProgressPercent;
exports.projectFocusLabel = projectFocusLabel;
exports.formatGuildRole = formatGuildRole;
function projectProgressPercent(project) {
    if (project.kind === 'development') {
        if (project.resourceGoals.length === 0)
            return 0;
        const fractions = project.resourceGoals.map(g => g.target <= 0 ? 1 : Math.min(1, g.current / g.target));
        return Math.round((fractions.reduce((a, b) => a + b, 0) / fractions.length) * 100);
    }
    if (project.targetPoints <= 0)
        return 0;
    return Math.max(0, Math.min(125, Math.round((project.completionPoints / project.targetPoints) * 100)));
}
function projectFocusLabel(focus) {
    return focus === 'combat' ? 'Combat' : focus === 'skilling' ? 'Skilling' : focus === 'mixed' ? 'Mixed' : 'Development';
}
function formatGuildRole(role) { return role.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '); }
