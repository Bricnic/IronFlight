import { getTrack, TRACK_IDS, type TrackId, type CustomTrackId } from "./tracks";
import { medalFor, type TrackRun } from "./track-run";
export type ScoreStorage = Pick<Storage, "getItem" | "setItem">;
const KEY = "iron-flight-best-times-v1";
function validKey(key: string) {
  const separator = key.lastIndexOf(":");
  const id = key.slice(0, separator), variant = key.slice(separator + 1);
  return (
    (TRACK_IDS.includes(id as TrackId) || /^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) &&
    (id === "triple-loop"
      ? ["easy", "medium", "hard"].includes(variant)
      : variant === "default")
  );
}
export class BestTimes {
  private records: Record<string, number> = {};
  constructor(private storage: ScoreStorage) {
    try {
      const saved = JSON.parse(storage.getItem(KEY) ?? "null");
      if (
        saved?.version === 1 &&
        saved.records &&
        typeof saved.records === "object"
      )
        for (const [key, value] of Object.entries(saved.records))
          if (
            validKey(key) &&
            typeof value === "number" &&
            Number.isFinite(value) &&
            value > 0
          )
            this.records[key] = value;
    } catch {
      /* Private browsing or corrupt records must not prevent playing. */
    }
  }
  best(id: TrackId | CustomTrackId, variant = id === "triple-loop" ? "easy" : "default") {
    const time = this.records[`${id}:${variant}`];
    return time === undefined
      ? null
      : { time, medal: medalFor(time, getTrack(id).medals) };
  }
  record(run: ReturnType<TrackRun["snapshot"]>) {
    const key = `${run.trackId}:${run.variant}`;
    if (
      run.status !== "completed" ||
      !validKey(key) ||
      !Number.isFinite(run.elapsed) ||
      run.elapsed <= 0
    )
      return false;
    if (this.records[key] !== undefined && this.records[key] <= run.elapsed)
      return false;
    this.records[key] = run.elapsed;
    try {
      this.storage.setItem(
        KEY,
        JSON.stringify({ version: 1, records: this.records }),
      );
    } catch {
      /* Keep the in-memory best when storage is unavailable. */
    }
    return true;
  }
}
