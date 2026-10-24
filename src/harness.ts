import type { TrackId } from "./tracks";
import type { Tuning } from "./tuning";
import type { Simulation, Stage, Input } from "./simulation";
import type { GameView } from "./view";
export type CameraSample = ReturnType<GameView["inspectCamera"]> & {
  state: ReturnType<Simulation["snapshot"]>;
};
export interface GameHarness {
  select(stage: Stage): void;
  startTrack(id: TrackId, lane?: "easy" | "medium" | "hard"): void;
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
  };
}
declare global {
  interface Window {
    __game?: GameHarness;
  }
}
