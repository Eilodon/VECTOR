export function computeFounderEdgeScore(entry: {
  network_presence?: boolean | null;
  track_record?: boolean | null;
  credibility_recognizable?: boolean | null;
  speed_advantage?: boolean | null;
  warm_door_opener?: boolean | null;
}): number {
  return [
    entry.network_presence,
    entry.track_record,
    entry.credibility_recognizable,
    entry.speed_advantage,
    entry.warm_door_opener,
  ].filter((value) => value === true).length;
}

export function upsertFounderEdgeAudit<T extends { channel: string }>(audits: T[], entry: T): T[] {
  const next = audits.filter((item) => item.channel.toLowerCase() !== entry.channel.toLowerCase());
  next.push(entry);
  return next;
}

export function founderEdgeAuditFor<T extends { channel: string }>(audits: T[], channel: string): T | null {
  const normalized = channel.toLowerCase();
  return audits.find((item) => item.channel.toLowerCase() === normalized) ?? null;
}
