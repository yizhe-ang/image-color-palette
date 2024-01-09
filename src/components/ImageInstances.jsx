// Adapted from: https://github.com/pmndrs/drei/blob/master/src/core/Image.tsx
// https://codesandbox.io/p/sandbox/hi-key-bubbles-i6t0j?file=%2Fsrc%2FApp.js%3A59%2C1
import {
  Instance,
  Instances,
  shaderMaterial,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import * as React from "react";
import { extend, useThree, useFrame } from "@react-three/fiber";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { getSphereTexture, getVelocityTexture } from "./layouts";

const simFragmentPosition = /* glsl */ `
  void main() {
    vec2 vUv = gl_FragCoord.xy / resolution.xy;

    vec3 position = texture2D(uCurrentPosition, vUv).xyz;
    vec3 velocity = texture2D(uCurrentVelocity, vUv).xyz;

    position += velocity;

    gl_FragColor = vec4(position, 1.0);
  }
`;

const simFragmentVelocity = /* glsl */ `
  uniform sampler2D uOriginalPosition;
  uniform vec3 uMouse;

  //
  // Description : Array and textureless GLSL 2D/3D/4D simplex
  //               noise functions.
  //      Author : Ian McEwan, Ashima Arts.
  //  Maintainer : ijm
  //     Lastmod : 20110822 (ijm)
  //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
  //               Distributed under the MIT License. See LICENSE file.
  //               https://github.com/ashima/webgl-noise
  //

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
      return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r)
  {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v)
    {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
    }


  vec3 snoiseVec3( vec3 x ){

    float s  = snoise(vec3( x ));
    float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
    float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
    vec3 c = vec3( s , s1 , s2 );
    return c;

  }

  vec3 curlNoise( vec3 p ){

    const float e = .1;
    vec3 dx = vec3( e   , 0.0 , 0.0 );
    vec3 dy = vec3( 0.0 , e   , 0.0 );
    vec3 dz = vec3( 0.0 , 0.0 , e   );

    vec3 p_x0 = snoiseVec3( p - dx );
    vec3 p_x1 = snoiseVec3( p + dx );
    vec3 p_y0 = snoiseVec3( p - dy );
    vec3 p_y1 = snoiseVec3( p + dy );
    vec3 p_z0 = snoiseVec3( p - dz );
    vec3 p_z1 = snoiseVec3( p + dz );

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    const float divisor = 1.0 / ( 2.0 * e );
    return normalize( vec3( x , y , z ) * divisor );

  }

  void main() {
    vec2 vUv = gl_FragCoord.xy / resolution.xy;

    vec3 position = texture2D(uCurrentPosition, vUv).xyz;
    vec3 original = texture2D(uOriginalPosition, vUv).xyz;
    vec3 velocity = texture2D(uCurrentVelocity, vUv).xyz;

    // Friction
    velocity *= 0.9;

    // Random trajectory
    velocity += curlNoise(position) * 0.0001;

    // Mouse repel force
    float mouseDistance = distance(position, uMouse);
    float maxDistance = 0.6;
    if (mouseDistance < maxDistance) {
      vec3 direction = normalize(position - uMouse);
      velocity += direction * (1.0 - mouseDistance / maxDistance) * 0.01;
    }

    gl_FragColor = vec4(velocity, 1.0);
  }
`;

const ImageMaterialImpl = /* @__PURE__ */ shaderMaterial(
  {
    color: /* @__PURE__ */ new THREE.Color("white"),
    scale: /* @__PURE__ */ new THREE.Vector2(1, 1),
    // imageBounds: /* @__PURE__ */ new THREE.Vector2(1, 1),
    map: null,
    zoom: 1,
    grayscale: 0,
    opacity: 1,
    uPosition: null,
    uVelocity: null,
  },
  /* glsl */ `
  uniform float uTime;
  uniform sampler2D uPosition;
  uniform sampler2D uVelocity;

  attribute vec2 imageBounds;
  attribute vec2 ref;

  varying vec2 vUv;
  varying vec2 vImageBounds;

  vec3 rotate3D(vec3 v, vec3 vel) {
    vec3 newpos = v;
    vec3 up = vec3(0, 1, 0);
    vec3 axis = normalize(cross(up, vel));
    float angle = acos(dot(up, normalize(vel)));
    newpos = newpos * cos(angle) + cross(axis, newpos) * sin(angle) + axis * dot(axis, newpos) * (1. - cos(angle));
    return newpos;
  }

  vec3 displace(vec3 point, vec3 vel) {
    vec3 pos = texture2D(uPosition,ref).rgb;
    vec3 copypoint = rotate3D(point, vel);
    vec3 instancePosition = (instanceMatrix * vec4(copypoint, 1.)).xyz;
    return instancePosition + pos;
  }

  void main() {
    vec3 vel = texture2D(uVelocity, ref).rgb;
    vec3 p = displace(position, vel);

    // gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.);

    // Update normals
    // normal = rotate3D(normal, vel);

    vUv = uv;
    vImageBounds = imageBounds;
  }
`,
  /* glsl */ `
  // mostly from https://gist.github.com/statico/df64c5d167362ecf7b34fca0b1459a44
  varying vec2 vUv;
  varying vec2 vImageBounds;

  uniform vec2 scale;
  uniform vec3 color;
  uniform sampler2D map;
  uniform float zoom;
  uniform float grayscale;
  uniform float opacity;

  const vec3 luma = vec3(.299, 0.587, 0.114);

  vec4 toGrayscale(vec4 color, float intensity) {
    return vec4(mix(color.rgb, vec3(dot(color.rgb, luma)), intensity), color.a);
  }

  vec2 aspect(vec2 size) {
    return size / min(size.x, size.y);
  }

  void main() {
    vec2 imageBounds = vImageBounds;

    vec2 s = aspect(scale);
    vec2 i = aspect(imageBounds);
    float rs = s.x / s.y;
    float ri = i.x / i.y;
    vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
    vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;
    vec2 uv = vUv * s / new + offset;
    vec2 zUv = (uv - vec2(0.5, 0.5)) / zoom + vec2(0.5, 0.5);
    gl_FragColor = toGrayscale(texture2D(map, zUv) * vec4(color, opacity), grayscale);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
);

export const ImageInstances = /* @__PURE__ */ React.forwardRef(
  (
    {
      children,
      color,
      segments = 1,
      scale = 1,
      zoom = 1,
      grayscale = 0,
      opacity = 1,
      textures,
      toneMapped,
      transparent,
      side,
      size,

      ...props
    },
    fref
  ) => {
    extend({ ImageMaterial: ImageMaterialImpl });
    const ref = React.useRef(null);
    const planeBounds = Array.isArray(scale)
      ? [scale[0], scale[1]]
      : [scale, scale];
    React.useImperativeHandle(fref, () => ref.current, []);
    React.useLayoutEffect(() => {
      // Support arbitrary plane geometries (for instance with rounded corners)
      // @ts-ignore
      if (ref.current.geometry.parameters) {
        // @ts-ignore
        ref.current.material.scale.set(
          // @ts-ignore
          planeBounds[0] * ref.current.geometry.parameters.width,
          // @ts-ignore
          planeBounds[1] * ref.current.geometry.parameters.height
        );
      }
    }, []);

    // SETUP GPGPU
    const gl = useThree((state) => state.gl);

    const gpuCompute = new GPUComputationRenderer(size, size, gl);

    const positionVariable = gpuCompute.addVariable(
      "uCurrentPosition",
      simFragmentPosition,
      getSphereTexture(size)
    );
    const velocityVariable = gpuCompute.addVariable(
      "uCurrentVelocity",
      simFragmentVelocity,
      getVelocityTexture(size)
    );

    gpuCompute.setVariableDependencies(positionVariable, [
      positionVariable,
      velocityVariable,
    ]);

    gpuCompute.setVariableDependencies(velocityVariable, [
      positionVariable,
      velocityVariable,
    ]);

    const positionUniforms = positionVariable.material.uniforms;
    const velocityUniforms = velocityVariable.material.uniforms;

    gpuCompute.init();

    // const uniforms = React.useMemo(
    //   () => ({
    //     uPosition: {
    //       value: null,
    //     },
    //     uVelocity: {
    //       value: null,
    //     },
    //   }),
    //   []
    // );

    React.useEffect(() => {
      const refArray = new Float32Array(size * size * 2);
      const imageBoundsArray = new Float32Array(size * size * 2);

      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const k = i * size + j;
          refArray[k * 2 + 0] = i / (size - 1);
          refArray[k * 2 + 1] = j / (size - 1);

          if (k < textures.length) {
            imageBoundsArray[k * 2 + 0] = textures[k].image.width;
            imageBoundsArray[k * 2 + 1] = textures[k].image.height;
          }
        }
      }

      ref.current.geometry.setAttribute(
        "ref",
        new THREE.InstancedBufferAttribute(refArray, 2)
      );
      ref.current.geometry.setAttribute(
        "imageBounds",
        new THREE.InstancedBufferAttribute(imageBoundsArray, 2)
      );
    }, []);

    useFrame(() => {
      gpuCompute.compute();
      ref.current.material.uniforms.uPosition.value =
        gpuCompute.getCurrentRenderTarget(positionVariable).texture;
      ref.current.material.uniforms.uVelocity.value =
        gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
    });

    return (
      <Instances ref={ref} limit={size * size} castShadow receiveShadow>
        <planeGeometry args={[1, 1, segments, segments]} />
        <imageMaterial
          color={color}
          map={textures[0]}
          zoom={zoom}
          grayscale={grayscale}
          opacity={opacity}
          scale={planeBounds}
          toneMapped={toneMapped}
          transparent={transparent}
          side={side}
        />
        {[...Array(size * size)].map((_, i) => (
          <ImageInstance
            key={i}
            scale={scale}
            // map={i < textures.length ? textures[i] : null}
            props={props}
          />
        ))}
      </Instances>
    );
  }
);

const ImageInstance = ({ scale, props }) => {
  // FIXME: Make each instance have custom texture
  return (
    <Instance
      scale={Array.isArray(scale) ? [...scale, 1] : scale}
      // map={map}
      {...props}
    >
      {/* {children} */}
    </Instance>
  );
};
