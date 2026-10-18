import type { Simulation, Stage, Input } from "./simulation";
import type { GameView } from "./view";
export type CameraSample = ReturnType<GameView["inspectCamera"]> & {
  state: ReturnType<Simulation["snapshot"]>;
};
export interface GameHarness {
  select(stage: Stage): void;
  pause(value: boolean): void;
  advanceFrames(frames: number, rate: number, input?: Input): void;
  snapshot(): ReturnType<Simulation["snapshot"]>;
  place(position: { x: number; y: number; z: number }, yaw: number): void;
  camera(): ReturnType<GameView["inspectCamera"]>;
  signs(): ReturnType<GameView["inspectSigns"]>;
  traceFrames(frames: number, rate: number, input: Input): CameraSample[];
  startCameraTrace(): void;
  stopCameraTrace(): CameraSample[];
  visualPart(id: string): {
    detached: boolean;
    visible: boolean;
    vertices: number;
  };
  stats(): {
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
