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
