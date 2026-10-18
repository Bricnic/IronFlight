import type { CameraSample } from "../src/harness";
export function lampMotion(samples: CameraSample[]) {
  let comparisons = 0,
    maxBackstep = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1],
      b = samples[i];
    if (b.state.signedSpeed < 0.5) continue;
    for (const p of a.landmarks) {
      const q = b.landmarks.find((q) => q.id === p.id)!;
      if ([p, q].some((v) => v.z < -1 || v.z > 1 || Math.abs(v.x) > 0.98))
        continue;
      comparisons++;
      maxBackstep = Math.max(maxBackstep, -(q.x - p.x) * Math.sign(p.x));
    }
  }
  return { comparisons, maxBackstep };
}
