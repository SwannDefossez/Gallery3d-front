import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { MainGalleryScene } from './MainGalleryScene';
import { UIOverlay } from './UIOverlay';

export function GalleryExperience() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans">
      <UIOverlay />
      <Canvas
        id="scene-canvas"
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 2, 0], fov: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <MainGalleryScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
