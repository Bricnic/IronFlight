import type { CustomTrackId, Track, TrackId } from "./tracks";
import type { Tuning } from "./tuning";
import type { Simulation, Stage, Input } from "./simulation";
import type { GameView } from "./view";
import type { CustomLevel } from "./custom-level";
export type CameraSample = ReturnType<GameView["inspectCamera"]> & {
  state: ReturnType<Simulation["snapshot"]>;
};
export interface GameHarness {
  select(stage: Stage): void;
  startTrack(
    id: TrackId | CustomTrackId,
    lane?: "easy" | "medium" | "hard",
    vehicle?: string,
  ): void;
  track(id: string): Track;
  editor(): {
    name: string;
    solids: number;
    prefabs: number;
    checkpoints: number;
    targets: number;
    selection: string | null;
    dirty: boolean;
    levels: string[];
  };
  placement(): {
    editing: boolean;
    palette: string;
    texture: string;
    selected: string | null;
    selectedKind: "solid" | "prefab" | "checkpoint" | null;
    checkpoints: { id: string; x: number; y: number; z: number }[];
    checkpointLabels: string[];
    runCheckpoint: number | null;
  };
  project(point: { x: number; y: number; z: number }): { x: number; y: number };
  customLevels: {
    list(): Promise<string[]>;
    save(level: CustomLevel): Promise<CustomLevel>;
    load(name: string): Promise<CustomLevel>;
    remove(name: string): Promise<void>;
  };
  pause(value: boolean): void;
  advanceFrames(frames: number, rate: number, input?: Input): void;
  driveFrames(
    frames: number,
    rate: number,
    driver: (state: ReturnType<Simulation["snapshot"]>) => Input,
    draw?: boolean,
  ): void;
  setTuning(values: Partial<Tuning>): void;
  snapshot(): ReturnType<Simulation["snapshot"]>;
  place(position: { x: number; y: number; z: number }, yaw: number): void;
  lavaOverview(): void;
  hazardOverview(id: string): void;
  setVelocity(velocity: { x: number; y: number; z: number }): void;
  basinProbe(angle: number): number[][];
  dropPartInLava(id: string): void;
  environmentProbe(): { x: number; y: number };
  burnoutOverview(focus?: "all" | "start" | "end"): void;
  vehiclePreview(): void;
  camera(): ReturnType<GameView["inspectCamera"]>;
  signs(): ReturnType<GameView["inspectSigns"]>;
  traceFrames(frames: number, rate: number, input: Input): CameraSample[];
  startCameraTrace(): void;
  stopCameraTrace(): CameraSample[];
  visualPart(id: string): {
    detached: boolean;
    visible: boolean;
    vertices: number;
    lavaScorch: number;
  };
  stats(): {
    vehicleId: string;
    lights: { a: number; b: number };
    comicHazards: {
      id: string;
      kind: string;
      triangles: number;
      animated: boolean;
      ramp?: { position: number[]; angle: number };
    }[];
    officialCourse: {
      key: string;
      axes: number;
      ghosts: number;
      trampolines: number;
      rings: number;
      gates: number;
      pickups: number;
      solids: number;
      jets: {
        id: string;
        intensity: number;
        visible: boolean;
        scale: number;
      }[];
    };
    shadow: { visible: boolean; opacity: number; y: number };
    lavaOffsets: number[][];
    lavaParts: {
      id: string;
      fire: boolean;
      smoke: boolean;
      strength: number;
    }[];
    fire: {
      palette: { primary?: string; secondary?: string };
      scorch: number;
      smokeVisible: boolean;
      smokeParticles: number;
      smokeStrength: number;
      paintColor?: number[];
    };
    dragonStatues: number;
    flame: { head: number; tail: number; opacity: number };
    loopSegments: number;
    jetsVisible: number;
    triangles: number;
    treadBlocks: number;
    meshes: number;
    courseVisible: boolean;
    drawCalls: number;
    renderTriangles: number;
    geometries: number;
    textures: number;
    video: {
      tier: string;
      pixelRatio: number;
      shadows: boolean;
      far: number;
      fogScale: number;
    };
  };
}
declare global {
  interface Window {
    __game?: GameHarness;
  }
}
