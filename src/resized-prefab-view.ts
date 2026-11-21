import * as T from "three";
import { CourseView } from "./course-view";
import { ComicView } from "./comic-view";
import { DungeonView } from "./dungeon-view";
import { FairgroundView } from "./fairground-view";
import { PropView } from "./prop-view";
import { LooseBlocksView } from "./loose-blocks-view";
import { BurningCoalsView } from "./burning-coals-view";
import { FragileIceView } from "./fragile-ice-view";
import type { Simulation } from "./simulation";
import type { ResizedPrefab } from "./resized-prefabs";

export class ResizedPrefabView extends T.Group {
  private models = new Map<ResizedPrefab, { root: T.Group; course: CourseView; comic: ComicView; dungeon: DungeonView; fairground: FairgroundView; props: PropView; blocks: LooseBlocksView; coals: BurningCoalsView; ice: FragileIceView }>();
  update(source: Simulation, camera: T.Camera) {
    for (const [prefab, model] of this.models) if (!source.resizedPrefabs.includes(prefab)) {
      model.root.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose(); } });
      model.root.removeFromParent(); this.models.delete(prefab);
    }
    for (const prefab of source.resizedPrefabs) {
      let model = this.models.get(prefab);
      if (!model) {
        model = { root: new T.Group(), course: new CourseView(), comic: new ComicView(), dungeon: new DungeonView(), fairground: new FairgroundView(), props: new PropView(), blocks: new LooseBlocksView(), coals: new BurningCoalsView(), ice: new FragileIceView() };
        model.root.position.copy(prefab.space.origin).multiplyScalar(1 - prefab.space.factor);
        model.root.scale.setScalar(prefab.space.factor);
        model.root.add(model.course, model.comic, model.dungeon, model.fairground, model.props, model.blocks, model.coals, model.ice);
        this.add(model.root); this.models.set(prefab, model);
      }
      const s = prefab.sim;
      model.course.update(s, camera); model.comic.update(s); model.dungeon.update(s); model.fairground.update(s);
      model.props.update(s.props, s.time); model.blocks.update(s.looseBlocks); model.coals.update(s.burningCoals, s.time); model.ice.update(s.fragileIce, s.time);
    }
  }
}
