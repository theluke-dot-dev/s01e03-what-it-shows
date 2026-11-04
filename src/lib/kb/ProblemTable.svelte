<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { groupByProblem, type Problem } from '#lib/kb/problems';
  import { tenantOf } from '#lib/kb/locales';

  // `tickets`: where each problem is filed, problem → ticket URL. `states`: what became of it.
  let {
    ticket,
    tickets = {},
    states = {},
  }: { ticket: number; tickets?: Partial<Record<Problem, string>>; states?: Partial<Record<Problem, string>> } = $props();

  const rows = reports as Report[];
  const exported = rows.filter((r) => r.mergedInto === ticket).length;
  const unique = uniqueById(rows).filter((r) => r.mergedInto === ticket).length;
  const groups = groupByProblem(rows, ticket, tenantOf, notes.oneDayMove);
  const alsoOneDay = (g: { problem: Problem; reports: Report[] }) =>
    g.problem === 'one-day' ? 0 : g.reports.filter((r) => notes.oneDayMove.includes(r.id)).length;
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const ticketNo = (url: string) => `#${url.split('/').pop()}`;
</script>

<p class="sum">
  <strong>{unique}</strong> reports in #{ticket} ({exported} rows in the export, {exported - unique} exported twice) ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>channels</th><th>tagged as</th><th>tenants</th><th>seen</th><th>ticket</th><th>state</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td><strong>{g.reports.length}</strong></td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td>{g.tenants}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if tickets[g.problem]}<a href={tickets[g.problem]}>{ticketNo(tickets[g.problem] ?? '')}</a>{:else}<span class="none">none</span>{/if}
        </td>
        <td class="small">{states[g.problem] ?? ''}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#each groups as g (g.problem)}
  {@const n = alsoOneDay(g)}
  {#if n}
    <p class="small">{n} of the <code>{g.problem}</code> reports are the one-day reports: the desk files them under
      <code>{g.problem}</code> by tenant and counts them there, so they count under both.</p>
  {/if}
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
</style>
