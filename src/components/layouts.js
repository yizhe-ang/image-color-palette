import { range } from "./utils.js";
import * as THREE from "three";

export function genRadialLayout({ length, radius = 5.25 }) {
  return range(length).map((i) => {
    const angle = (i / length) * Math.PI * 2;

    const position = [Math.sin(angle) * radius, 0, Math.cos(angle) * radius];
    const rotation = [0, Math.PI / 2 + angle, 0];

    return {
      position,
      rotation,
    };
  });
}

export function getSphereTexture(size) {
  let number = size * size;
  const data = new Float32Array(4 * number);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const index = i * size + j;

      // generate point on a sphere
      let theta = Math.random() * Math.PI * 2;
      let phi = Math.acos(Math.random() * 2 - 1); //
      // let phi = Math.random()*Math.PI; //
      let x = Math.sin(phi) * Math.cos(theta);
      let y = Math.sin(phi) * Math.sin(theta);
      let z = Math.cos(phi);

      data[4 * index] = x;
      data[4 * index + 1] = y;
      data[4 * index + 2] = z;
      data[4 * index + 3] = 0;
    }
  }

  let dataTexture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  dataTexture.needsUpdate = true;

  return dataTexture;
}

export function getVelocityTexture(size) {
  let number = size * size;
  const data = new Float32Array(4 * number);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const index = i * size + j;
      data[4 * index] = 0;
      data[4 * index + 1] = 0;
      data[4 * index + 2] = 0;
      data[4 * index + 3] = 0;
    }
  }

  let dataTexture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  dataTexture.needsUpdate = true;

  return dataTexture;
}

// Have a normal scrolling viewing
// See each image one by one through scrolling

// Layout based on semantics

// Layout based on color palette

// Particle system
// See Three.js Toys
// Allow users to make serrendipitous discoveries

// FIXME: How to implement instancing?
