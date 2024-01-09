// FIXME: How to use instancing?
import { Image, OrbitControls, useTexture } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import data from "./data.json";
import { genRadialLayout } from "./layouts";
import { ImageInstances } from "./ImageInstances";
import { ImageParticles } from "./ImageParticles";
import { pipeline } from "@xenova/transformers";
import { useControls } from "leva";

const layout = genRadialLayout({ length: data.length });

export const Experience = () => {
  // const [texture, setTexture] = useState()

  // const texture = useTexture(data[90]);

  // Load all textures
  // const textures = useTexture(data);

  const { Image: image } = useControls({
    Image: { image: "img_4.jpg" },
  });

  return (
    <>
      <OrbitControls />

      <ambientLight />
      <directionalLight />

      {/* <ImageInstances textures={textures} size={13} side={THREE.DoubleSide} /> */}
      <ImageParticles
        image={image}
        // texture={texture}
        samplingRatio={1}
        pointSize={5}
        resolution={1}
        crop={0}
      />

      {/* {layout.map((l, i) => {
        return (
          <Card
            key={data[i]}
            position={l.position}
            rotation={l.rotation}
            url={data[i]}
          />
        );
      })} */}
    </>
  );
};

const Card = ({ url, ...props }) => {
  const ref = useRef();

  return (
    <group {...props}>
      <Image
        ref={ref}
        url={url}
        scale={[1.618, 1, 1]}
        side={THREE.DoubleSide}
      />
    </group>
  );
};
