import * as T from "three";
const loader = new T.TextureLoader();
const cache = new Map<string, T.Texture>();
function texture(id: string, role: string, repeat: number) {
  const key = `${id}/${role}/${repeat}`;
  let t = cache.get(key);
  if (!t) {
    t = loader.load(`/textures/${id}_${role}.jpg`);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    if (role === "diffuse") t.colorSpace = T.SRGBColorSpace;
    cache.set(key, t);
  }
  return t;
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
      noiseMap: { value: texture("rock_06", "roughness", 1) },
    },
    vertexShader:
      "varying vec2 uv0; void main(){ uv0=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `varying vec2 uv0; uniform float time; uniform sampler2D noiseMap;
void main(){ vec2 uv=uv0; float noise=texture2D(noiseMap,vec2(uv.x*.7,uv.y*.6-time*.4)).r;
float width=(1.0-uv.y)*.52; float x=abs(uv.x-.5+sin(uv.y*9.0-time*7.0)*.06+(noise-.5)*.17);
float shape=1.0-smoothstep(width*.25,width+.01,x); float alpha=shape*(1.0-smoothstep(.6,1.0,uv.y))*smoothstep(0.0,.08,uv.y);
vec3 color=mix(vec3(1.0,.12,.015),vec3(1.0,.85,.25),clamp((1.0-uv.y)*1.1-x*2.0,0.0,1.0)); gl_FragColor=vec4(color,alpha*.85); }`,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
  });
}

/** User-authored tiled lava, drifting diagonally with localized heat refraction. */
export function lavaMaterial() {
  const map = loader.load("/textures/custom-lava.jfif");
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
    shader.fragmentShader = "uniform float lavaTime;\n" + shader.fragmentShader;
    const uv = `vec2 flowUv = vMapUv;
      float heat = pow(0.5 + 0.5 * sin(flowUv.x * 4.1 + sin(flowUv.y * 3.7)), 4.0);
      flowUv += heat * 0.018 * vec2(sin(flowUv.y * 22.0 + lavaTime * 1.4), cos(flowUv.x * 19.0 - lavaTime * 1.1));`;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_fragment>",
        uv +
          "\n" +
          T.ShaderChunk.map_fragment.replace(
            "texture2D( map, vMapUv )",
            "texture2D( map, flowUv )",
          ),
      )
      .replace(
        "#include <emissivemap_fragment>",
        T.ShaderChunk.emissivemap_fragment.replace(
          "texture2D( emissiveMap, vEmissiveMapUv )",
          "texture2D( emissiveMap, flowUv )",
        ),
      );
  };
  return material;
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
