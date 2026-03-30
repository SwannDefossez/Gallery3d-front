import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { MainGalleryScene } from './components/MainGalleryScene';
import { UIOverlay } from './components/UIOverlay';

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans">
      <UIOverlay />
      <Canvas
        id="scene-canvas"
        shadows
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 1.6, 0], fov: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <MainGalleryScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
