export interface Argument {
  id: string;
  label: string;
  tau: number;       // base intrinsic strength
  attackers?: string[];
  supporters?: string[];
}

export function computeDfQuad(args: Argument[]) {
  // Copy intrinsic strengths
  const sigma: Record<string, number> = {};
  args.forEach(a => (sigma[a.id] = a.tau));

  const maxIter = 10;
  const eps = 1e-4;

  for (let it = 0; it < maxIter; it++) {
    let delta = 0;
    for (const a of args) {
      const v0 = a.tau;
      const attackers = a.attackers?.map(id => sigma[id]) || [];
      const supporters = a.supporters?.map(id => sigma[id]) || [];

      const F = (vals: number[]) =>
        vals.length === 0
          ? 0
          : 1 - vals.reduce((prod, v) => prod * Math.abs(1 - v), 1);

      const va = F(attackers);
      const vs = F(supporters);

      const C = (v0: number, va: number, vs: number) => {
        if (va === vs) return v0;
        if (va > vs) return v0 - v0 * Math.abs(vs - va);
        return v0 + (1 - v0) * Math.abs(vs - va);
      };

      const newVal = C(v0, va, vs);
      delta = Math.max(delta, Math.abs(newVal - sigma[a.id]));
      sigma[a.id] = newVal;
    }
    if (delta < eps) break;
  }
  return sigma;
}
