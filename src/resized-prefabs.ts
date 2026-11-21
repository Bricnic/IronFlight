import { ComicPhysics } from "./comic-physics";
import { DungeonPhysics } from "./dungeon-physics";
import { Fairground } from "./fairground";
import { GuidedPipe } from "./guided-pipe";
import { LooseBlocks } from "./loose-blocks";
import { BurningCoals } from "./burning-coals";
import { FragileIce } from "./fragile-ice";
import { GhostSwarm } from "./ghosts";
import { AxeArray } from "./axes";
import { SlideSystems } from "./slide";
import { Destructibles } from "./destructibles";
import { courseSolids, courseProps } from "./course";
import { prefabY, toTrack, type CustomPrefab } from "./custom-level";
import { PrefabSpace } from "./prefab-space";
import type { Simulation } from "./simulation";
import { DT } from "./clock";
import { getVehicle } from "./vehicles";
import type { Input } from "./simulation";
import { Vector3 } from "three";

/** Existing gameplay systems run in prefab units, sharing the real physics world. */
export class ResizedPrefab {
  guided = false;
  readonly space: PrefabSpace;
  readonly sim: Simulation;
  constructor(source: Simulation, readonly prefab: CustomPrefab, readonly prefabs: CustomPrefab[] = [prefab]) {
    this.space = new PrefabSpace(prefab);
    const definitions = prefabs.map(p => {
      const position = this.space.toLocal({ x: p.x, y: prefabY(p), z: p.z });
      return { ...p, x: position.x, y: position.y, z: position.z, resizeScale: undefined };
    });
    const level = { ...source.courseTrack!.custom!, solids: [], prefabs: definitions, collectibles: [], demolish: [], rings: [] };
    const track = toTrack(level); track.checkpoints = [];
    const components: Partial<Simulation> = {};
    const s = this.sim = this.space.simulation(source, track, components);
    for (const solid of courseSolids(track)) s.addCustomSolid(solid);
    components.props = new Destructibles(s.world, false, courseProps(track));
    components.comic = new ComicPhysics(s);
    components.dungeon = new DungeonPhysics(s);
    components.looseBlocks = new LooseBlocks(s);
    components.burningCoals = new BurningCoals(s);
    components.fragileIce = new FragileIce(s);
    components.guidedPipe = new GuidedPipe(s);
    components.fairground = new Fairground(s);
    components.ghosts = new GhostSwarm(s);
    components.axes = new AxeArray(s);
    components.slide = new SlideSystems(s);
  }
  controls(input: Input) {
    const guided = this.guided = this.sim.guidedPipe.beforeStep();
    const dungeon = this.sim.dungeon;
    if (guided || dungeon.gauntlet.holding || dungeon.mailboxHolding || dungeon.speedTubeHolding || dungeon.balloonHolding) return {};
    return this.sim.fairground.controls(input);
  }
  before() {
    const s = this.sim;
    s.axes.update(); s.fairground.before(); s.props.captureVelocities();
    s.looseBlocks.captureVelocities(); s.comic.before(); s.ghosts.update(); s.dungeon.gauntlet.before(); s.dungeon.before();
  }
  after(before: Vector3) {
    const s = this.sim, velocity = this.space.vector(before, 1 / this.space.factor);
    s.comic.after(); const dungeonHit = s.dungeon.after(); s.looseBlocks.after(); s.burningCoals.after(); s.fragileIce.after();
    const fairgroundHit = s.fairground.after(velocity); s.ghosts.attack(); const axeHit = s.axes.resolve(velocity); s.slide.bounce();
    const drive = getVehicle(s.vehicleId);
    const exposure = s.props.update(s.body, s.parts, s.wheelPositions(), velocity, s.time, drive.wheelRadius / this.space.factor, drive.suspensionRest / this.space.factor);
    if (exposure > 0) for (const part of s.partDefs) s.fireDamage(part.id, part.hp * 0.01 * DT * exposure);
    return dungeonHit || fairgroundHit || axeHit;
  }
}
