import type { Row } from './types';

/** Retain old single-manager responses during a coordinated release. */
export function reportingManagerIds(user: Row): number[] {
  return Array.isArray(user.reports_to_ids)
    ? [...new Set<number>(user.reports_to_ids)]
    : user.reports_to_id ? [user.reports_to_id] : [];
}

export function reportingManagerAllowed(candidate: Row, userId: number | undefined, users: Row[]): boolean {
  if (!candidate.active || candidate.is_developer || candidate.id === userId) return false;
  const byId = new Map(users.map(user => [user.id, user]));
  const pending = [candidate.id], seen = new Set<number>();
  while (pending.length) {
    const id = pending.pop()!;
    if (id === userId) return false;
    if (seen.has(id)) continue;
    seen.add(id);
    const user = byId.get(id);
    if (user) pending.push(...reportingManagerIds(user));
  }
  return true;
}

export type ReportingBranch = { user: Row; children: ReportingBranch[]; reference: boolean };

/** Show every direct reporting edge, expanding each person's descendants once.
 * This bounds shared subtrees instead of multiplying every possible DAG path. */
export function reportingTree(users: Row[], search = ''): ReportingBranch[] {
  const staff = users.filter(user => !user.is_developer);
  const byId = new Map(staff.map(user => [user.id, user]));
  const included = new Set<number>();
  const pending = staff.filter(user => `${user.name} ${user.username} ${user.designation} ${user.department} ${user.territory}`.toLowerCase().includes(search.toLowerCase())).map(user => user.id);
  while (pending.length) {
    const id = pending.pop()!;
    if (included.has(id) || !byId.has(id)) continue;
    included.add(id);
    pending.push(...reportingManagerIds(byId.get(id)!));
  }
  const children = new Map<number, Row[]>();
  for (const user of staff) {
    if (!included.has(user.id)) continue;
    for (const manager of reportingManagerIds(user)) {
      if (!children.has(manager)) children.set(manager, []);
      children.get(manager)!.push(user);
    }
  }
  const expanded = new Set<number>();
  function branch(user: Row): ReportingBranch {
    if (expanded.has(user.id)) return { user, children: [], reference: true };
    expanded.add(user.id);
    return { user, children: (children.get(user.id) || []).map(branch), reference: false };
  }
  const roots = staff.filter(user => included.has(user.id) && !reportingManagerIds(user).some(id => byId.has(id))).map(branch);
  // Defensive rendering for legacy orphan/cyclic data: never hide an employee.
  for (const user of staff) if (included.has(user.id) && !expanded.has(user.id)) roots.push(branch(user));
  return roots;
}
