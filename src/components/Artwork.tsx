import { Text, MeshPortalMaterial, useGLTF, Float, Clone, Environment, ContactShadows, useTexture } from '@react-three/drei';
import { useGalleryStore, ArtworkData } from '../store';
import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ArtworkProps {
  data: ArtworkData;
}

const MODEL_LOAD_DISTANCE = 11;
const MODEL_UNLOAD_DISTANCE = 15;

function PortalRoom({ showPedestal }: { showPedestal: boolean }) {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -3, -10]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#050505" roughness={1} metalness={0} envMapIntensity={0} />
      </mesh>
      
      {/* Ceiling */}
      <mesh position={[0, 7, -10]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} metalness={0} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 2, -20]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshPhysicalMaterial color="#000000" metalness={1} roughness={0} clearcoat={1} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-15, 2, -10]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshPhysicalMaterial color="#000000" metalness={1} roughness={0} clearcoat={1} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[15, 2, -10]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshPhysicalMaterial color="#000000" metalness={1} roughness={0} clearcoat={1} />
      </mesh>

      {showPedestal && (
        <>
          {/* Pedestal */}
          <mesh position={[0, -2, -4]} receiveShadow castShadow>
            <cylinderGeometry args={[0.8, 1, 2, 32]} />
            <meshPhysicalMaterial color="#050505" metalness={0.9} roughness={0.1} clearcoat={1} />
          </mesh>
          
          {/* Pedestal Glow/Accent */}
          <mesh position={[0, -0.99, -4]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.6, 0.8, 32]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>
        </>
      )}
    </group>
  );
}

function ModelScene({
  modelUrl,
  isEnvironment,
  environmentScaleMode,
  environmentScaleMultiplier,
  environmentOffset,
  modelRotation,
}: {
  modelUrl: string;
  isEnvironment: boolean;
  environmentScaleMode?: 'fit' | 'real';
  environmentScaleMultiplier?: number;
  environmentOffset?: [number, number, number];
  modelRotation?: [number, number, number];
}) {
  const { scene } = useGLTF(modelUrl);
  const modelRef = useRef<THREE.Group>(null);
  const normalized = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const safeSize = new THREE.Vector3(
      Math.max(size.x, 0.001),
      Math.max(size.y, 0.001),
      Math.max(size.z, 0.001),
    );

    let scale = 1;
    if (isEnvironment) {
      if (environmentScaleMode === 'real') {
        scale = 1;
      } else {
        // Fill a large portal volume so the viewer feels inside the environment.
        const fitX = 42 / safeSize.x;
        const fitY = 16 / safeSize.y;
        const fitZ = 42 / safeSize.z;
        scale = Math.min(fitX, fitY, fitZ);
      }
    } else {
      const maxDim = Math.max(safeSize.x, safeSize.y, safeSize.z);
      scale = 2.2 / maxDim;
    }

    const multiplier = environmentScaleMultiplier ?? 1;
    return { center, scale: scale * multiplier };
  }, [scene, isEnvironment, environmentScaleMode, environmentScaleMultiplier]);

  useEffect(() => {
    scene.traverse((child) => {
      if ('castShadow' in child) {
        child.castShadow = !isEnvironment;
      }
      if ('receiveShadow' in child) {
        child.receiveShadow = !isEnvironment;
      }
      if ('frustumCulled' in child) {
        child.frustumCulled = true;
      }
    });
  }, [scene, isEnvironment]);
  
  return (
    <group>
      <ambientLight intensity={isEnvironment ? 0.24 : 0.1} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={isEnvironment ? 0.35 : 0.2} castShadow={!isEnvironment} />
      <Environment preset="city" resolution={64} frames={1} />
      
      {/* Physical room only for object-style artworks */}
      {!isEnvironment && <PortalRoom showPedestal />}
      
      {isEnvironment ? (
        <group
          ref={modelRef}
          position={[
            environmentOffset?.[0] ?? 0,
            environmentOffset?.[1] ?? 0,
            -10 + (environmentOffset?.[2] ?? 0),
          ]}
        >
          <group rotation={modelRotation ?? [0, 0, 0]}>
            <group scale={normalized.scale}>
              <group position={[-normalized.center.x, -normalized.center.y, -normalized.center.z]}>
                <Clone object={scene} />
              </group>
            </group>
          </group>
        </group>
      ) : (
        <>
          <Float speed={2} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.2, 0.2]}>
            <group ref={modelRef} position={[0, 1.0, -4]}>
              <group rotation={modelRotation ?? [0, 0, 0]}>
                <group scale={normalized.scale}>
                  <group position={[-normalized.center.x, -normalized.center.y, -normalized.center.z]}>
                    <Clone object={scene} />
                  </group>
                </group>
              </group>
            </group>
          </Float>

          <ContactShadows position={[0, -0.99, -4]} opacity={0.35} scale={3} blur={1.25} far={2} frames={1} />
        </>
      )}
    </group>
  );
}

export function Artwork({ data }: ArtworkProps) {
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const [hasLoadedModel, setHasLoadedModel] = useState(false);
  const setHoveredArtwork = useGalleryStore((state) => state.setHoveredArtwork);
  const setSelectedArtwork = useGalleryStore((state) => state.setSelectedArtwork);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);

  const isLocked = useGalleryStore((state) => state.isLocked);
  const previewUrl = data.imageUrl || 'https://placehold.co/900x600/111827/e5e7eb?text=Apercu';
  const previewMap = useTexture(previewUrl);
  const previewDisplayMap = useMemo(() => previewMap.clone(), [previewMap]);

  useEffect(() => {
    if (!isLocked && hovered) {
      setHovered(false);
      setHoveredArtwork(null);
    }
  }, [isLocked, hovered, setHoveredArtwork]);

  useEffect(() => {
    const texture = previewDisplayMap;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const applyCover = () => {
      const image = texture.image as { width?: number; height?: number } | undefined;
      const imgWidth = image?.width ?? 0;
      const imgHeight = image?.height ?? 0;
      if (!imgWidth || !imgHeight) return;

      const frameAspect = data.width / data.height;
      const imageAspect = imgWidth / imgHeight;

      let repeatX = 1;
      let repeatY = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (imageAspect > frameAspect) {
        repeatX = frameAspect / imageAspect;
        offsetX = (1 - repeatX) / 2;
      } else if (imageAspect < frameAspect) {
        repeatY = imageAspect / frameAspect;
        offsetY = (1 - repeatY) / 2;
      }

      texture.repeat.set(repeatX, repeatY);
      texture.offset.set(offsetX, offsetY);
      texture.needsUpdate = true;
    };

    applyCover();

    const imageWithEvents = texture.image as
      | (EventTarget & { complete?: boolean; addEventListener?: (type: string, cb: () => void) => void; removeEventListener?: (type: string, cb: () => void) => void })
      | undefined;

    if (imageWithEvents && imageWithEvents.complete === false && imageWithEvents.addEventListener) {
      imageWithEvents.addEventListener('load', applyCover);
      return () => {
        imageWithEvents.removeEventListener?.('load', applyCover);
      };
    }
  }, [previewDisplayMap, data.width, data.height]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (!useGalleryStore.getState().isLocked) return;
    setHovered(true);
    setHoveredArtwork(data);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    setHoveredArtwork(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!useGalleryStore.getState().isLocked) return;
    setSelectedArtwork(data);
  };

  const groupRef = useRef<THREE.Group>(null);
  const loadDistanceSq = MODEL_LOAD_DISTANCE * MODEL_LOAD_DISTANCE;
  const unloadDistanceSq = MODEL_UNLOAD_DISTANCE * MODEL_UNLOAD_DISTANCE;
  const portalResolution = data.isEnvironment ? 128 : 192;
  const portalBlur = data.isEnvironment ? 0 : 0.12;

  useEffect(() => {
    // Free GLTF cache when this artwork is unloaded to reduce memory usage.
    if (!hasLoadedModel) {
      useGLTF.clear(data.modelUrl);
    }
  }, [hasLoadedModel, data.modelUrl]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetScale = hovered ? 1.05 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }

    const dx = camera.position.x - data.position[0];
    const dy = camera.position.y - data.position[1];
    const dz = camera.position.z - data.position[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    const isCurrentSelection = selectedArtwork?.id === data.id;

    if (!hasLoadedModel) {
      if (distSq <= loadDistanceSq || isCurrentSelection) {
        setHasLoadedModel(true);
      }
    } else if (!isCurrentSelection && distSq >= unloadDistanceSq) {
      setHasLoadedModel(false);
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={data.position} 
      rotation={data.rotation}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Frame */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[data.width + 0.2, data.height + 0.2, 0.1]} />
        <meshStandardMaterial color={hovered ? '#ffffff' : '#222222'} roughness={0.8} />
      </mesh>
      
      {/* Static preview far away, 3D scene loads when the visitor is near */}
      {hasLoadedModel ? (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[data.width, data.height]} />
          <MeshPortalMaterial blur={portalBlur} resolution={portalResolution} worldUnits>
            <color attach="background" args={['#1a1a2e']} />
            <Suspense fallback={<Text color="white" fontSize={0.5}>Chargement du modele...</Text>}>
              <ModelScene
                modelUrl={data.modelUrl}
                isEnvironment={Boolean(data.isEnvironment)}
                environmentScaleMode={data.environmentScaleMode}
                environmentScaleMultiplier={data.environmentScaleMultiplier}
                environmentOffset={data.environmentOffset}
                modelRotation={data.modelRotation}
              />
            </Suspense>
          </MeshPortalMaterial>
        </mesh>
      ) : (
        <>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[data.width, data.height]} />
            <meshStandardMaterial map={previewDisplayMap} roughness={0.55} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <planeGeometry args={[data.width * 0.985, data.height * 0.985]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.04} />
          </mesh>
        </>
      )}

      {/* Label */}
      <group position={[0, -data.height / 2 - 0.3, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[data.width, 0.4]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <Text
          position={[0, 0.05, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {data.title}
        </Text>
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.1}
          color="#aaaaaa"
          anchorX="center"
          anchorY="middle"
        >
          {data.artist} - ${data.price}
        </Text>
      </group>
    </group>
  );
}
