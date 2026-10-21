import * as T from "three";
type Stroke = { wheel: number; points: T.Vector3[] };
/** Ribbons retain rubber for the run. Alpha feathers across the tread and over each stroke's first/last meter. */
export class SkidView extends T.Group {
  private source?: Stroke[];
  private ribbons: {
    mesh: T.Mesh<T.BufferGeometry, T.ShaderMaterial>;
    count: number;
  }[] = [];
  update(strokes: Stroke[]) {
    if (strokes !== this.source) {
      for (const r of this.ribbons) {
        if (!r) continue;
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
      }
      this.clear();
      this.ribbons = [];
      this.source = strokes;
    }
    strokes.forEach((stroke, i) => {
      const points = stroke.points;
      if (points.length < 2) return;
      let r = this.ribbons[i];
      if (!r) {
        const material = new T.ShaderMaterial({
          uniforms: { length: { value: 0 } },
          vertexShader: `attribute float distanceAlong; varying vec2 tread; void main(){ tread=vec2(uv.x,distanceAlong); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `uniform float length; varying vec2 tread; void main(){ float edge=1.0-smoothstep(0.23,0.5,abs(tread.x-0.5)); float ends=smoothstep(0.0,1.1,tread.y)*smoothstep(0.0,1.1,length-tread.y); float grain=0.88+0.12*sin(tread.x*97.0+sin(tread.y*29.0)); gl_FragColor=vec4(0.018,0.016,0.014,edge*ends*grain*0.68); }`,
          transparent: true,
          depthWrite: false,
          side: T.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        });
        const mesh = new T.Mesh(new T.BufferGeometry(), material);
        mesh.renderOrder = 2;
        this.add(mesh);
        r = this.ribbons[i] = { mesh, count: 0 };
      }
      if (r.count === points.length) return;
      const vertices: number[] = [],
        uv: number[] = [],
        distances: number[] = [],
        indices: number[] = [];
      let distance = 0;
      for (let j = 0; j < points.length; j++) {
        if (j) distance += points[j].distanceTo(points[j - 1]);
        const tangent = points[Math.min(j + 1, points.length - 1)]
          .clone()
          .sub(points[Math.max(0, j - 1)])
          .normalize();
        const normal = new T.Vector3(tangent.z, 0, -tangent.x).multiplyScalar(
          0.28,
        );
        for (const side of [-1, 1]) {
          vertices.push(
            ...points[j].clone().addScaledVector(normal, side).toArray(),
          );
          uv.push(side < 0 ? 0 : 1, 0);
          distances.push(distance);
        }
        if (j) {
          const a = (j - 1) * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(vertices, 3),
      );
      geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      geometry.setAttribute(
        "distanceAlong",
        new T.Float32BufferAttribute(distances, 1),
      );
      geometry.setIndex(indices);
      geometry.computeBoundingSphere();
      r.mesh.geometry.dispose();
      r.mesh.geometry = geometry;
      r.mesh.material.uniforms.length.value = distance;
      r.count = points.length;
    });
  }
}
