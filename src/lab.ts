import { PARTS, type PartId } from "./damage";
import type { Simulation } from "./simulation";
export class DestructionLab {
  selected: PartId = "hood";
  constructor(private simulation: Simulation) {}
  select(id: string) {
    if (!PARTS.some((p) => p.id === id)) throw new RangeError("Unknown part");
    this.selected = id as PartId;
  }
  use(tool: "dent" | "destroy" | "sever") {
    this.simulation.damage(
      tool === "sever" ? "chassis-rear" : this.selected,
      tool === "dent" ? 25 : 10000,
    );
  }
  reset() {
    this.simulation.reset("lab");
  }
}
