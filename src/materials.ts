import * as T from "three";
const loader = new T.TextureLoader();
const cache = new Map<string, T.Texture>();
const failures = new Set<string>();
function texture(id: string, role: string, repeat: number) {
  const key = `${id}/${role}/${repeat}`;
  const url = `/textures/${id}_${role}.jpg`;
  let t = cache.get(key);
  if (!t) {
    t = loader.load(url, undefined, undefined, () => {
      failures.add(url);
    });
    t.userData.url = url;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    if (role === "diffuse") t.colorSpace = T.SRGBColorSpace;
    cache.set(key, t);
  }
  return t;
}
/** URLs whose texture loads failed (DEV/test probe). */
export function textureLoadErrors(): string[] {
  return [...failures];
}
/** Texture ids currently in the cache (DEV/test probe). */
export function loadedTextureIds(): string[] {
  return [...new Set([...cache.keys()].map((k) => k.split("/")[0]))];
}
export function pbr(
  id: string,
  repeat = 1,
  params: T.MeshStandardMaterialParameters = {},
) {
  return new T.MeshStandardMaterial({
    map: texture(id, "diffuse", repeat),
    normalMap: texture(id, "normal", repeat),
    roughnessMap: texture(id, "roughness", repeat),
    normalScale: new T.Vector2(0.6, 0.6),
    ...params,
  });
}
export function flameMaterial() {
  return new T.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      strength: { value: 1 },
      noiseMap: { value: texture("rock_06", "roughness", 1) },
    },
    vertexShader:
      "varying vec2 uv0; void main(){ uv0=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `varying vec2 uv0; uniform float time; uniform float strength; uniform sampler2D noiseMap;
void main(){ vec2 uv=uv0; float noise=texture2D(noiseMap,vec2(uv.x*.7,uv.y*.6-time*.4)).r;
float width=(1.0-uv.y)*.52; float x=abs(uv.x-.5+sin(uv.y*9.0-time*7.0)*.06+(noise-.5)*.17);
float shape=1.0-smoothstep(width*.25,width+.01,x); float alpha=shape*(1.0-smoothstep(.6,1.0,uv.y))*smoothstep(0.0,.08,uv.y);
vec3 color=mix(vec3(1.0,.12,.015),vec3(1.0,.85,.25),clamp((1.0-uv.y)*1.1-x*2.0,0.0,1.0)); gl_FragColor=vec4(color,alpha*.85*strength); }`,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
  });
}

/** User-authored tiled lava, drifting diagonally with localized heat refraction. */
export function lavaMaterial() {
  const map = loader.load("/textures/custom-lava.jfif", undefined, undefined, () => {
    failures.add("/textures/custom-lava.jfif");
  });
  const detail = loader.load("/textures/custom-lava-detail.png", undefined, undefined, () => {
    failures.add("/textures/custom-lava-detail.png");
  });
  detail.wrapS = detail.wrapT = T.RepeatWrapping;
  detail.colorSpace = T.SRGBColorSpace;
  detail.anisotropy = 8;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  const time = { value: 0 };
  const material = new T.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
    roughness: 0.65,
  });
  material.userData.tile = 9;
  material.userData.time = time;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.lavaTime = time;
    shader.uniforms.lavaDetail = { value: detail };
    shader.fragmentShader =
      "uniform float lavaTime;\nuniform sampler2D lavaDetail;\n" + shader.fragmentShader;
    const uv = `vec2 flowUv = vMapUv;
      float heat = pow(0.5 + 0.5 * sin(flowUv.x * 4.1 + sin(flowUv.y * 3.7)), 4.0);
      flowUv += heat * 0.018 * vec2(sin(flowUv.y * 22.0 + lavaTime * 1.4), cos(flowUv.x * 19.0 - lavaTime * 1.1));
      vec4 lavaDetailTex = texture2D(lavaDetail, flowUv * 7.0);
      float lavaDetailMix = (1.0 - smoothstep(25.0, 110.0, length(vViewPosition))) * 0.65;`;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_fragment>",
        uv +
          "\n" +
          T.ShaderChunk.map_fragment.replace(
            "texture2D( map, vMapUv )",
            "texture2D( map, flowUv )",
          ) +
          "\n diffuseColor.rgb = mix(diffuseColor.rgb, lavaDetailTex.rgb * (0.55 + diffuseColor.rgb), lavaDetailMix);",
      )
      .replace(
        "#include <emissivemap_fragment>",
        T.ShaderChunk.emissivemap_fragment.replace(
          "texture2D( emissiveMap, vEmissiveMapUv )",
          "texture2D( emissiveMap, flowUv )",
        ) +
        "\n totalEmissiveRadiance = mix(totalEmissiveRadiance, lavaDetailTex.rgb * 1.15, lavaDetailMix);",
      );
  };
  return material;
}

function patternSurface(
  material: T.MeshStandardMaterial,
  pattern: string,
  uniforms: Record<string, { value: unknown }> = {},
) {
  material.customProgramCacheKey = () => pattern;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const declarations = Object.keys(uniforms)
      .map((name) => `uniform float ${name};\n`)
      .join("");
    const varying = `varying vec2 vSurfaceUv;\n${declarations}`;
    shader.vertexShader = varying + shader.vertexShader.replace(
      "#include <uv_vertex>", "#include <uv_vertex>\n vSurfaceUv = uv;",
    );
    shader.fragmentShader = varying + shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\n" + pattern,
    );
  };
  return material;
}

/** Opaque green liquid, oozing diagonally with run time like the lava flow. */
export function slimeMaterial(color: number) {
  const time = { value: 0 };
  const material = patternSurface(
    new T.MeshStandardMaterial({ color, emissive: 0x285b03, emissiveIntensity: 0.75, roughness: 0.28 }),
    `vec2 p = (vSurfaceUv + slimeTime * vec2(0.012, 0.0085)) * vec2(11.0, 7.0);
      float eddy = sin(p.x * 1.8 + cos(p.y * 2.7)) * cos(p.y * 2.1 + sin(p.x));
      float streak = sin(p.x * 2.7 + p.y * 3.1 + eddy * 1.9);
      diffuseColor.rgb *= 0.72 + eddy * 0.18 + smoothstep(0.5, 1.0, streak) * 0.36;`,
    { slimeTime: time },
  );
  material.userData.time = time;
  return material;
}

/** Molded edges, diagonal bracing and corner magnets on colored toy tiles. */
export function magneticTileMaterial(color: number) {
  return patternSurface(
    new T.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.17 }),
    `vec2 inset = min(vSurfaceUv, 1.0 - vSurfaceUv);
      float edge = min(inset.x, inset.y);
      float rim = smoothstep(0.025, 0.045, edge) * (1.0 - smoothstep(0.065, 0.075, edge));
      float diagonal = min(abs(vSurfaceUv.x - vSurfaceUv.y), abs(vSurfaceUv.x + vSurfaceUv.y - 1.0));
      float brace = (1.0 - smoothstep(0.006, 0.02, diagonal)) * smoothstep(0.07, 0.09, edge);
      float magnet = 1.0 - smoothstep(0.023, 0.032, distance(inset, vec2(0.075)));
      diffuseColor.rgb = diffuseColor.rgb * (0.84 + 0.22 * rim + 0.21 * brace)
        + vec3(0.18, 0.15, 0.11) * magnet;`,
  );
}

/** Traveling flame packet with independently advancing leading and trailing edges. */
export function dragonFlameMaterial() {
  return new T.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      head: { value: 0 },
      tail: { value: 0 },
      opacity: { value: 0 },
      noiseMap: { value: texture("rock_06", "roughness", 1) },
    },
    vertexShader:
      "varying vec2 uv0; void main(){ uv0=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `varying vec2 uv0; uniform float time; uniform float head; uniform float tail; uniform float opacity; uniform sampler2D noiseMap;
      void main(){float along=uv0.y;
        float packet=smoothstep(tail,tail+0.025,along)*(1.0-smoothstep(max(tail,head-0.035),head,along));
        float noise=texture2D(noiseMap,vec2(uv0.x*0.8,along*0.9-time*1.8)).r;
        float width=mix(0.48,0.19,along);
        float x=abs(uv0.x-0.5+sin(along*18.0-time*23.0)*0.045+(noise-0.5)*0.16);
        float shape=1.0-smoothstep(width*0.28,width,x);
        float alpha=shape*packet*opacity;
        vec3 color=mix(vec3(1.0,0.12,0.012),vec3(1.0,0.82,0.24),clamp(1.0-x*3.0+noise*0.15,0.0,1.0));
        gl_FragColor=vec4(color,alpha*0.28); }`,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
  });
}
