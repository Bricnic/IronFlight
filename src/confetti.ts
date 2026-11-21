/** Completed runs freeze gameplay, while their celebration keeps animating. */
export function confettiDelta(simulationDelta: number, frameDelta: number | undefined, completed: boolean) {
  return Math.max(0, Math.min(0.05, completed ? frameDelta ?? simulationDelta : simulationDelta));
}
