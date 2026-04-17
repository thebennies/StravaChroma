/**
 * Union-Find (Disjoint Set Union) data structure
 * with path compression and union by rank
 */

export function makeUnionFind(n) {
  const parent = new Int32Array(n);
  const rank = new Uint8Array(n);
  parent.fill(-1); // -1 = not in any set

  function init(x) { parent[x] = x; rank[x] = 0; }

  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a, b) {
    a = find(a); b = find(b);
    if (a === b) return;
    if (rank[a] < rank[b]) { const t = a; a = b; b = t; }
    parent[b] = a;
    if (rank[a] === rank[b]) rank[a]++;
  }

  return { init, find, union };
}
