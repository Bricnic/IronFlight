import type { CustomTrackId, Track, TrackId } from "./tracks";
import type { Tuning } from "./tuning";
import type { Simulation, Stage, Input } from "./simulation";
import type { GameView, StarVisibility } from "./view";
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
    rings: number;
    selection: string | null;
    tool: string;
    selectedObject?: Record<string, unknown>;
    preview: boolean;
    dirty: boolean;
    levels: string[];
    cameraTarget: { x: number; y: number; z: number };
  };
  inspectDragons(): {
    id: string;
    x: number;
    z: number;
    rotationY: number;
  }[];
  inspectSolids(): {
    id: string;
    visible: boolean;
    transparent: boolean;
    opacity: number;
    map: string;
    normalMap: string;
    roughnessMap: string;
  }[];
  textureLoadErrors(): string[];
  loadedTextureIds(): string[];
  inspectPreview(): {
    camera: { position: number[]; target: number[]; distance: number; fov: number };
    prefabLights: { id: string; lumens: number; color: number; position: number[] }[];
    lighting: { game: boolean; night: boolean; rain: boolean; sun: number; hemi: number; env: number } | null;
    checkpoints: { index: number; meshes: number }[];
    spawn: { name?: string; meshes: number; visible: boolean };
    selectedPrefab?: string;
    prefabs: { id: string; meshes: number; vertices: number; min: number[]; max: number[] }[];
    preview: boolean;
    gridVisible: boolean;
    grid: { spacing: number; snap: boolean; show: boolean; x: boolean; y: boolean; z: boolean; axes: string[] };
    solids: {
      id: string;
      textured: boolean;
      opaque: boolean;
      depthTest: boolean;
      depthWrite: boolean;
    }[];
    prefabArrows: { id: string; dir: { x: number; z: number } }[];
    centerPick: unknown;
  };
  prefabBounds(id: string): { min: number[]; max: number[] } | null;
  editorProject(point: { x: number; y: number; z: number }): {
    x: number;
    y: number;
  };
  project(point: { x: number; y: number; z: number }): { x: number; y: number };
  customLevels: {
    list(): Promise<string[]>;
    save(level: CustomLevel, previousName?: string): Promise<CustomLevel>;
    load(name: string): Promise<CustomLevel>;
    remove(name: string): Promise<void>;
  };
  pause(value: boolean): void;
  resizedPrefabs(): { id: string; scale: number; colliders: number }[];
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
  lavaPitOverview(id: string, angle?: number): void;
  dinosaurOverview(id: string): void;
  dinosaurStrike(id: string): ReturnType<GameView["dinosaurStrike"]>;
  hazardOverview(id: string): void;
  setVelocity(velocity: { x: number; y: number; z: number }): void;
  basinProbe(angle: number): number[][];
  dropPartInLava(id: string): void;
  environmentProbe(): { x: number; y: number };
  burnoutOverview(focus?: "all" | "start" | "end"): void;
  vehiclePreview(azimuth?: number): void;
  overhead(x: number, z: number, height?: number): void;
  frameSpot(x: number, y: number, z: number, dist?: number, azimuth?: number, elevation?: number): void;
  camera(): ReturnType<GameView["inspectCamera"]>;
  /**
   * Spawn-visibility probe: loads the track, settles ~1s at spawn, then
   * reports the gold star hidden iff it is outside the spawn-camera
   * frustum OR occluded (raycast vs solid level geometry) OR farther
   * than 150u. See GameView.starVisibility for the exact rule.
   */
  starHiddenFromSpawn(trackId: string): StarVisibility;
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
    objectHelp: { total: number; visible: number };
    fairground: { triangles: number; carouselTriangles: number; carousels: number; bumpers: number; balloons: number; bananas: number };
    vehicleId: string;
    lights: { a: number; b: number };
    headlights: { on: boolean };
    spray: { active: boolean };
    candleLights: { active: number; total: number };
    prefabLights: { id: string; lumens: number; color: number; position: number[] }[];
    comicHazards: {
      id: string;
      kind: string;
      triangles: number;
      animated: boolean;
      ramp?: { position: number[]; angle: number };
    }[];
    background: {
      template: string;
      shapes: number;
      clouds: number;
      stars: number;
      night: boolean;
      rainStreaks: number;
      rain: boolean;
    };
    officialCourse: {
      key: string;
      axes: number;
      ghosts: number;
      trampolines: number;
      boostPads: number;
      gateGlow: number;
      wetGloss: number;
      lampGlow: number;
      rings: number;
      loopSegments: number;
      dragons: number;
      lamps: number;
      grandstands: number;
      gates: number;
      pickups: number;
      stars: number;
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
    weather: {
      night: boolean;
      rain: boolean;
    };
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
