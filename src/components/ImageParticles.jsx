import {
  Edges,
  Outlines,
  shaderMaterial,
  useScroll,
  useTexture,
} from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import { resolveLygia } from "resolve-lygia";
import * as THREE from "three";
import colors from "tailwindcss/colors";
import { PaletteExtractor, vec3Utils } from "./paletteExtractor.js";
import { gsap } from "gsap";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import ColorThief from "colorthief";

extend({ MeshLineGeometry, MeshLineMaterial });

const PALETTE_COUNT = 5;

const canvas = document.createElement("canvas");
const canvasContext = canvas.getContext("2d");
const paletteExtractor = new PaletteExtractor();

function extractPalette(texture, count, crop = 0.0) {
  canvas.width = texture.image.width - crop * 2;
  canvas.height = texture.image.height - crop * 2;

  // canvasContext.drawImage(texture.image, 0, 0);
  canvasContext.drawImage(
    texture.image,
    crop,
    crop,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const imageData = canvasContext.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  texture.image = imageData;

  // FIXME: Try other palette extractors
  // const image = document.createElement('img');
  // image.src = canvas.toDataURL("image/png");

  // const colorThief = new ColorThief();
  // const palette = colorThief.getPalette(image, 5);

  // console.log(palette);

  // const output = palette.map(
  //   (c) => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255)
  // );

  // return output;

  const hexPalette = paletteExtractor.processImageData(imageData.data, count);

  return hexPalette.map((c) => new THREE.Color(c));
}

function cubeEdges(size) {
  const h = size * 0.5;

  const vertices = new Float32Array([
    -h,
    -h,
    -h,
    -h,
    h,
    -h,
    h,
    h,
    -h,
    h,
    -h,
    -h,
    -h,
    -h,
    -h,
    -h,
    -h,
    h,
    -h,
    h,
    h,
    h,
    h,
    h,
    h,
    -h,
    h,
    -h,
    -h,
    h,
    // -h,
    // -h,
    // -h,
    // -h,
    // -h,
    // h,
    // -h,
    // h,
    // h,
    // h,
    // h,
    // -h,
    // h,
    // h,
    // h,
    // h,
    // -h,
    // -h,
    // h,
    // -h,
    // h,
  ]);

  return vertices;
}

const ImageParticlesMaterial = shaderMaterial(
  {
    uTexture: null,
    uPointSize: 2.0,
    uToRgb: 0.0,
    uToCluster: 0.0,
    uToPaletteColor: 0.0,
    uToImage: 0.0,
    uPalette: null,
    uCrop: 0.0,
  },
  resolveLygia(/* glsl */ `
  uniform float uPointSize;
  uniform sampler2D uTexture;
  uniform float uToRgb;
  uniform float uToCluster;
  uniform float uToImage;
  uniform vec3 uPalette[${PALETTE_COUNT}];
  uniform float uCrop;

  varying vec2 vUv;
  varying vec3 vPaletteColor;

  #include "lygia/color/space/rgb2lab.glsl"

  float inverseLerp(float v, float minValue, float maxValue) {
    return (v - minValue) / (maxValue - minValue);
  }

  float remap(float v, float inMin, float inMax, float outMin, float outMax) {
    float t = inverseLerp(v, inMin, inMax);
    return mix(outMin, outMax, t);
  }

  void main() {
    vec3 transformed = position;

    vUv = uv;
    // Perform cropping
    vUv.x = remap(uv.x, 0.0, 1.0, uCrop, 1.0 - uCrop);
    vUv.y = remap(uv.y, 0.0, 1.0, uCrop, 1.0 - uCrop);

    vec3 rgb = texture2D(uTexture, vUv).rgb;
    vec3 lab = rgb2lab(rgb);
    // TODO: Should we use LAB color space instead?

    // Find closest cluster
    vec3 closestCluster = uPalette[0];
    float minDist = distance(rgb, closestCluster);

    int i;
    for (i = 1; i < ${PALETTE_COUNT}; i++) {
      vec3 cluster = uPalette[i];
      float dist = distance(rgb, cluster);

      if (dist < minDist) {
        closestCluster = cluster;
        minDist = dist;
      }
    }

    vPaletteColor = closestCluster;

    // Normalize and re-center
    rgb -= 0.5;
    closestCluster -= 0.5;

    lab.x /= 100.;
    lab.yz /= 128.;
    // lab *= 10.;
    // lab.x -= 0.5;

    transformed = mix(transformed, rgb, uToRgb);
    // transformed = mix(transformed, lab, uToRgb);

    transformed = mix(transformed, closestCluster, uToCluster);

    transformed = mix(transformed, position, uToImage);

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);

    // sizeAttenuation
    gl_PointSize = uPointSize * (1.0 / - mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
  `),
  resolveLygia(/* glsl */ `
  uniform sampler2D uTexture;
  uniform float uToPaletteColor;

  varying vec2 vUv;
  varying vec3 vPaletteColor;

  float circle(vec2 uv, float border) {
      float radius = 0.5;
      float dist = radius - distance(uv, vec2(0.5));
      return smoothstep(0.0, border, dist);
    }

  void main() {
    // Make circle points
    if (length(gl_PointCoord - 0.5) > 0.5) discard;

    vec3 color = texture2D(uTexture, vUv).rgb;

    color = mix(color, vPaletteColor, uToPaletteColor);

    gl_FragColor = vec4(color, 1.0);
    // gl_FragColor.a *= circle(gl_PointCoord, 0.2);

    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }
  `)
);

extend({ ImageParticlesMaterial });

export const ImageParticles = ({
  image,
  pointSize = 2,
  resolution = 1,
  samplingRatio = 3,
  crop = 0,
}) => {
  const camera = useThree((state) => state.camera);

  const texture = useTexture(image);

  const width = texture.image.width * resolution;
  const height = texture.image.height * resolution;
  const size = Math.min(width, height);

  const points = useRef();
  const cube = useRef();
  const clusters = useRef();

  const tl = useRef();
  const animateProps = useRef({
    clustersScale: 0,
    cubeOpacity: 0,
  });

  const scrollData = useScroll();

  // FIXME: Create alternate controls
  // TODO: Let user copy color palette

  const {
    "To RGB": toRgb,
    "To Clusters": toCluster,
    "To Image": toImage,
  } = useControls("Transitions", {
    "To RGB": {
      value: 0,
      min: 0,
      max: 1,
      onChange: (val) => {
        tl.current?.seek(0 + val, false);
      },
    },
    "To Clusters": {
      value: 0,
      min: 0,
      max: 1,
      onChange: (val) => {
        tl.current?.seek(1 + val, false);
      },
    },
    "To Image": {
      value: 0,
      min: 0,
      max: 1,
      onChange: (val) => {
        tl.current?.seek(2 + val, false);
      },
    },
    "To Image Colors": {
      value: 0,
      min: 0,
      max: 1,
      onChange: (val) => {
        tl.current?.seek(3 + val, false);
      },
    },
  });

  const [paletteControls, setPalette] = useControls("Color Palette", () => ({
    "#1": {
      value: "#ffffff",
      // disabled: true,
    },
    "#2": {
      value: "#ffffff",
      // disabled: true,
    },
    "#3": {
      value: "#ffffff",
      // disabled: true,
    },
    "#4": {
      value: "#ffffff",
      // disabled: true,
    },
    "#5": {
      value: "#ffffff",
      // disabled: true,
    },
  }));

  const palette = useMemo(() => {
    const palette = extractPalette(texture, PALETTE_COUNT, crop);

    return palette;
  }, [texture]);

  useEffect(() => {
    setPalette({
      "#1": `#${palette[0].getHexString()}`,
      "#2": `#${palette[1].getHexString()}`,
      "#3": `#${palette[2].getHexString()}`,
      "#4": `#${palette[3].getHexString()}`,
      "#5": `#${palette[4].getHexString()}`,
    });
  }, [palette]);

  useEffect(() => {
    // Run animations
    tl.current = gsap
      .timeline({ paused: true, defaults: { duration: 1, ease: "linear" } })
      // To RGB
      .to(points.current.material.uniforms.uToRgb, {
        value: 1,
      })
      .to(
        animateProps.current,
        {
          cubeOpacity: 1,
          onUpdate: function () {
            cube.current.children.forEach((c) => {
              console.log(c);
              c.material.opacity = animateProps.current.cubeOpacity;
            });
          },
        },
        "<"
      )
      // To Cluster
      .to(points.current.material.uniforms.uToCluster, {
        value: 1,
      })
      .to(
        points.current.material.uniforms.uToPaletteColor,
        {
          value: 1,
        },
        "<"
      )
      .to(
        animateProps.current,
        {
          clustersScale: 1,
          onUpdate: function () {
            clusters.current.children.forEach((c) => {
              c.scale.setScalar(animateProps.current.clustersScale);
            });
          },
        },
        "<"
      )
      // To Image
      .to(points.current.material.uniforms.uToImage, {
        value: 1,
      })
      .to(
        animateProps.current,
        {
          cubeOpacity: 0,
          onUpdate: function () {
            cube.current.children.forEach((c) => {
              c.material.opacity = animateProps.current.cubeOpacity;
            });
          },
        },
        "<"
      )
      .to(
        animateProps.current,
        {
          clustersScale: 0,
          onUpdate: function () {
            clusters.current.children.forEach((c) => {
              c.scale.setScalar(animateProps.current.clustersScale);
            });
          },
        },
        "<"
      )
      // To Image Colors
      .to(points.current.material.uniforms.uToPaletteColor, {
        value: 0,
      });

    console.log(tl.current);
  }, []);

  useFrame(() => {
    // UPDATE SCROLL ANIMATIONS
    // if (tl.current) {
    //   tl.current.progress(scrollData.offset);
    // }
  });

  return (
    <>
      {/* TODO: Use lines to render a better cube */}
      {/* Rgb cube */}
      {/* <lineSegments ref={cube}>
        <edgesGeometry args={[new THREE.BoxGeometry()]} />
        <lineBasicMaterial
          color={colors.zinc["200"]}
          opacity={0}
          transparent={true}
        />
      </lineSegments> */}
      {/* <Edges ref={cube} geometry={new THREE.BoxGeometry()}>
        <meshBasicMaterial
          color={colors.zinc["200"]}
          opacity={0}
          transparent={true}
        />
      </Edges> */}
      <group ref={cube}>
        <mesh>
          <meshLineGeometry points={cubeEdges(1)} />
          <meshLineMaterial
            lineWidth={0.01}
            opacity={0}
            transparent
            color={colors.zinc["500"]}
            depthTest={false}
          />
        </mesh>
        <mesh rotation-y={Math.PI / 2}>
          <meshLineGeometry points={cubeEdges(1)} />
          <meshLineMaterial
            lineWidth={0.01}
            opacity={0}
            transparent
            color={colors.zinc["500"]}
            depthTest={false}
          />
        </mesh>
      </group>

      {/* Clusters */}
      {/* FIXME: Size according to size of cluster */}
      {/* TODO: Make them glow / outline */}
      <group ref={clusters} position={[-0.5, -0.5, -0.5]}>
        {palette.map((c) => {
          return (
            <mesh key={c.getHexString()} position={[c.r, c.g, c.b]} scale={0}>
              <icosahedronGeometry args={[0.05, 1]} />
              <meshStandardMaterial color={c} flatShading />
              <Outlines thickness={0.003} color={colors.zinc["200"]} />
            </mesh>
          );
        })}
      </group>
      {/* Image particles */}
      {/* FIXME: How to represent frequency / histogram? */}
      <points ref={points}>
        <planeGeometry
          args={[
            width / size,
            height / size,
            Math.floor(width / samplingRatio),
            Math.floor(height / samplingRatio),
          ]}
        />
        <imageParticlesMaterial
          uTexture={texture}
          uPointSize={pointSize}
          uToRgb={toRgb}
          uToCluster={toCluster}
          // uToPaletteColor={toPaletteColor}
          uToImage={toImage}
          uPalette={palette}
          // depthWrite={false}
          // depthTest={false}
          transparent
        />
      </points>
    </>
  );
};
