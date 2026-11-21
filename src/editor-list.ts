/** Kind counts include members of user groups, not just their list headers. */
export function partitionListKinds<T extends { kindKey?: string; count: number }>(rows: T[]) {
  const kinds = new Map<string, T[]>();
  for (const row of rows) if (row.kindKey) {
    const bucket = kinds.get(row.kindKey) ?? []; bucket.push(row); kinds.set(row.kindKey, bucket);
  }
  const result: { kindKey?: string; count: number; rows: T[] }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const bucket = row.kindKey ? kinds.get(row.kindKey)! : [row];
    const count = bucket.reduce((n, row) => n + row.count, 0);
    if (row.kindKey && count > 2) {
      if (!seen.has(row.kindKey)) result.push({ kindKey: row.kindKey, count, rows: bucket });
      seen.add(row.kindKey);
    } else result.push({ count: row.count, rows: [row] });
  }
  return result;
}
