import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { Model } from "./components/Model";
import { useEffect, useRef } from "react";
import colors from "tailwindcss/colors";
import { ScrollControls } from "@react-three/drei";
import { Leva } from "leva";

function App() {
  return (
    <>
      {/* <Model /> */}
      <div className="w-80 absolute right-3 top-3 z-10">
        <Leva fill />
      </div>
      <Canvas
        // flat
        shadows
        // camera={{ position: [0, 0, 1000], fov: 30, near: 0.1, far: 4000 }}
        camera={{ position: [0, 0, 2.5], fov: 30, near: 0.1, far: 4000 }}
      >
        <color attach="background" args={[colors.zinc["950"]]} />
        {/* <ScrollControls pages={10}> */}
        <Experience />
        {/* </ScrollControls> */}
      </Canvas>
    </>
  );
}

export default App;
