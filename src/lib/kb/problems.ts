// Which problem a report in a merged ticket is about. causes.ts says which code path a report went
// through; this file adds what the desk read in the body (desk-notes.json) as a problem of its own.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

// `one-day`: the date lands one day early or late, not day and month swapped. The desk listed these
// by reading the bodies (desk-notes.json `oneDayMove`). Counts follow the desk's view (CauseTable,
// readAs): such a report stays counted under the cause it is filed under, and counts under `one-day` too.
export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export function problemsOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem[] {
  const filed: Problem = causeOf(r, t) ?? 'unplaced';
  return oneDayMove.includes(r.id) ? [filed, 'one-day'] : [filed];
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

export function groupByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const byProblem = new Map<Problem, Report[]>();
  for (const r of merged) {
    for (const p of problemsOf(r, tenantOf(r), oneDayMove)) byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: tally(rs, (r) => r.channel),
        taggedAs: tally(rs, (r) => r.meta.intakeTag),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
