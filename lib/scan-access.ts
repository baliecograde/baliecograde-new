export interface ScanOwnerRecord {
  user_id: string | null;
}

export interface ExistingScanState extends ScanOwnerRecord {
  analysis_status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export type ExistingScanDecision = 'foreign' | 'pending' | 'stale_pending' | 'completed' | 'failed';

export function hasValidatedScanIdentity(identity: { userId: string } | null): identity is { userId: string } {
  return Boolean(identity && identity.userId);
}

export function scanBelongsToUser(scan: ScanOwnerRecord, userId: string): boolean {
  return scan.user_id !== null && scan.user_id === userId;
}

export function mayIssueScanImageUrl(scan: ScanOwnerRecord, userId: string, isAdmin: boolean): boolean {
  return isAdmin || scanBelongsToUser(scan, userId);
}

export function isStalePendingScan(
  scan: { analysis_status: string; created_at: string },
  nowMs: number,
  staleAfterMs: number,
): boolean {
  const createdAt = Date.parse(scan.created_at);
  return scan.analysis_status === 'pending' && Number.isFinite(createdAt) && nowMs - createdAt >= staleAfterMs;
}

export function decideExistingScan(
  scan: ExistingScanState,
  userId: string,
  nowMs: number,
  staleAfterMs: number,
): ExistingScanDecision {
  if (!scanBelongsToUser(scan, userId)) return 'foreign';
  if (scan.analysis_status === 'completed') return 'completed';
  if (scan.analysis_status === 'failed') return 'failed';
  return isStalePendingScan(scan, nowMs, staleAfterMs) ? 'stale_pending' : 'pending';
}
