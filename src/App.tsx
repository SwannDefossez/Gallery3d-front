/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canvas } from "@react-three/fiber";
import { Gallery } from "./components/Gallery";
import { UIOverlay } from "./components/UIOverlay";
import { Suspense } from "react";

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans">
      <UIOverlay />
      <Canvas
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 1.6, 0], fov: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Gallery />
        </Suspense>
      </Canvas>
    </div>
  );
}
