export function computeFounderEdgeScore(entry) {
    return [
        entry.network_presence,
        entry.track_record,
        entry.credibility_recognizable,
        entry.speed_advantage,
        entry.warm_door_opener,
    ].filter((value) => value === true).length;
}
export function upsertFounderEdgeAudit(audits, entry) {
    const next = audits.filter((item) => item.channel.toLowerCase() !== entry.channel.toLowerCase());
    next.push(entry);
    return next;
}
export function founderEdgeAuditFor(audits, channel) {
    const normalized = channel.toLowerCase();
    return audits.find((item) => item.channel.toLowerCase() === normalized) ?? null;
}
