export interface BatchPlan {
  add: number;
  finish: string[];
  builds: number;
}
export function planBatch(
  ideaIds: string[],
  completeIds: Set<string> | ReadonlySet<string>,
  count: number,
): BatchPlan;
export interface VehicleGenArgs {
  dryRun: boolean;
  config: string;
  count: number | null;
  only: string | null;
  push: boolean;
}
export function parseArgs(argv: string[]): VehicleGenArgs;
export function validIdea(idea: unknown): boolean;
