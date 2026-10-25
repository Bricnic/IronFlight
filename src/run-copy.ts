import type { Track } from "./tracks";
import type { TrackRun } from "./track-run";
type RunSnapshot = ReturnType<TrackRun["snapshot"]>;
export function modeLabel(track: Track) {
  if (track.mode === "arena") return `${track.limit}s COLLECTION`;
  if (track.mode === "demolition") return "DEMOLITION";
  if (track.controls === "strafe") return "SLIDE RUN";
  return track.legacy ? "STUNT RACE" : "CHECKPOINT RACE";
}
export function objectiveCopy(track: Track) {
  if (track.mode === "arena")
    return "Collect every token before time runs out.";
  if (track.mode === "demolition")
    return "Smash every gravestone. Keep moving — ghosts drain parked trucks.";
  if (track.controls === "strafe")
    return "Ride the running water. A and D strafe on the slide; steer normally on solid ground.";
  if (track.legacy)
    return "Clear the jump, complete the loop, then cross the exit.";
  return "Follow every checkpoint. Cross the final gate.";
}
export function progressCopy(track: Track, run: RunSnapshot) {
  if (track.mode === "arena")
    return `${run.collected.length} / ${run.collectibleCount} collected · ${Math.ceil(run.remaining ?? 0)}s remaining`;
  if (track.mode === "demolition")
    return `${run.destroyed.length} / ${run.demolishCount} smashed`;
  if (track.ring)
    return `Checkpoint ${run.checkpoint} / ${run.checkpointCount} · ${run.ringDone ? "ring threaded" : run.bounced ? "thread the golden ring" : "bounce, then ring"}`;
  return `Checkpoint ${run.checkpoint} / ${run.checkpointCount}`;
}
export function progressFraction(track: Track, run: RunSnapshot) {
  if (track.mode === "arena")
    return run.collectibleCount
      ? run.collected.length / run.collectibleCount
      : 0;
  if (track.mode === "demolition")
    return run.demolishCount ? run.destroyed.length / run.demolishCount : 0;
  return run.checkpointCount ? run.checkpoint / run.checkpointCount : 0;
}
export function timeoutCopy(track: Track) {
  if (track.mode === "arena")
    return "Time ran out. Try a tighter collection route.";
  if (track.mode === "demolition")
    return "Time ran out. Chain your smashing route and keep clear of ghosts.";
  return "Time ran out. Try a tighter racing line.";
}
