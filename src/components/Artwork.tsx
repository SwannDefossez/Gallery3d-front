import { Clone, ContactShadows, Environment, Float, MeshPortalMaterial, Text, useGLTF, useTexture } from '@react-three/drei';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArtworkData, useGalleryStore } from '../store';

interface ArtworkProps {
  data: ArtworkData;
}

const MODEL_LOAD_DISTANCE = 5.5;
const FALLBACK_PREVIEW_URL = 'https://placehold.co/900x600/111827/e5e7eb?text=Apercu';

type ModelSceneProps = {
  modelUrl: string;
  isEnvironment: boolean;
  environmentScaleMode?: 'fit' | 'real';
  environmentScaleMultiplier?: number;
  environmentOffset?: [number, number, number];
  modelRotation?: [number, number, number];
  onReady?: () => void;
};

type ImageWithEvents = EventTarget & {
  complete?: boolean;
  addEventListener?: (type: string, callback: () => void) => void;
  removeEventListener?: (type: string, callback: () => void) => void;
};

type PreviewTransitionPlaneProps = {
  texture: THREE.Texture;
  width: number;
  height: number;
  progressRef: { current: number };
};

function PortalRoom({ showPedestal }: { showPedestal: boolean }) {
  return (
    <group>
      <mesh position={[0, -3, -10]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#050505" roughness={1} metalness={0} envMapIntensity={0} />
      </mesh>

      <mesh position={[0, 7, -10]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 2, -20]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshPhysicalMaterial color="#000000" metalness={1} roughness={0} clearcoat={1} />
      </mesh>

      <mesh position={[-15, 2, -10]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshPhysicalMaterial color="#000000" metalness={1} roughness={0} clearcoat={1} />
      </mesh>

      <mesh position={[15, 2, -10]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshPhysicalMaterial color="#000000" metalness={1} roughness={0} clearcoat={1} />
      </mesh>

      {showPedestal && (
        <>
          <mesh position={[0, -2, -4]} receiveShadow castShadow>
            <cylinderGeometry args={[0.8, 1, 2, 32]} />
            <meshPhysicalMaterial color="#050505" metalness={0.9} roughness={0.1} clearcoat={1} />
          </mesh>

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
  onReady,
}: ModelSceneProps) {
  const { scene } = useGLTF(modelUrl);
  const hasNotifiedReady = useRef(false);
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
        const fitX = 42 / safeSize.x;
        const fitY = 16 / safeSize.y;
        const fitZ = 42 / safeSize.z;
        scale = Math.min(fitX, fitY, fitZ);
      }
    } else {
      const maxDimension = Math.max(safeSize.x, safeSize.y, safeSize.z);
      scale = 2.2 / maxDimension;
    }

    return {
      center,
      scale: scale * (environmentScaleMultiplier ?? 1),
    };
  }, [scene, isEnvironment, environmentScaleMode, environmentScaleMultiplier]);

  useEffect(() => {
    if (!hasNotifiedReady.current) {
      hasNotifiedReady.current = true;
      onReady?.();
    }
  }, [onReady]);

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

  const centeredClone = (
    <group rotation={modelRotation ?? [0, 0, 0]}>
      <group scale={normalized.scale}>
        <group position={[-normalized.center.x, -normalized.center.y, -normalized.center.z]}>
          <Clone object={scene} />
        </group>
      </group>
    </group>
  );

  return (
    <group>
      <ambientLight intensity={isEnvironment ? 0.24 : 0.1} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={isEnvironment ? 0.35 : 0.2} castShadow={!isEnvironment} />
      <Environment preset="city" resolution={64} frames={1} />

      {!isEnvironment && <PortalRoom showPedestal />}

      {isEnvironment ? (
        <group
          position={[
            environmentOffset?.[0] ?? 0,
            environmentOffset?.[1] ?? 0,
            -10 + (environmentOffset?.[2] ?? 0),
          ]}
        >
          {centeredClone}
        </group>
      ) : (
        <>
          <Float speed={2} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.2, 0.2]}>
            <group position={[0, 1, -4]}>{centeredClone}</group>
          </Float>

          <ContactShadows position={[0, -0.99, -4]} opacity={0.35} scale={3} blur={1.25} far={2} frames={1} />
        </>
      )}
    </group>
  );
}

function PreviewTransitionPlane({
  texture,
  width,
  height,
  progressRef,
}: PreviewTransitionPlaneProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uTime: { value: 0 },
      uProgress: { value: 0 },
    }),
    [texture],
  );

  useFrame((state) => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uProgress.value = progressRef.current;
  });

  return (
    <mesh position={[0, 0, 0.012]}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;

          uniform sampler2D uMap;
          uniform float uTime;
          uniform float uProgress;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(
              mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
              u.y
            );
          }

          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;

            for (int i = 0; i < 5; i++) {
              value += amplitude * noise(p);
              p *= 2.03;
              amplitude *= 0.5;
            }

            return value;
          }

          void main() {
            vec4 preview = texture2D(uMap, vUv);

            vec2 flowUv = vUv * 5.5;
            vec2 drift = vec2(uTime * 0.28, -uTime * 0.16);
            float baseNoise = fbm(flowUv + drift);
            float detailNoise = fbm(flowUv * 1.9 - drift * 1.4);
            float liquidNoise = baseNoise * 0.75 + detailNoise * 0.4;

            float sweep = vUv.y + (liquidNoise - 0.5) * 0.3 + sin((vUv.x + uTime * 0.22) * 7.0) * 0.035;
            float cutoff = 1.15 - uProgress * 1.42;
            float alpha = 1.0 - smoothstep(cutoff - 0.08, cutoff + 0.08, sweep);

            float sideFade = smoothstep(0.0, 0.04, vUv.x) * (1.0 - smoothstep(0.96, 1.0, vUv.x));
            float topBottomFade = smoothstep(0.0, 0.03, vUv.y) * (1.0 - smoothstep(0.97, 1.0, vUv.y));
            alpha *= sideFade * topBottomFade;

            gl_FragColor = vec4(preview.rgb, preview.a * alpha);
          }
        `}
      />
    </mesh>
  );
}

export function Artwork({ data }: ArtworkProps) {
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const [hasLoadedModel, setHasLoadedModel] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [showPreviewOverlay, setShowPreviewOverlay] = useState(true);
  const groupRef = useRef<THREE.Group>(null);
  const frameMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const hoverGlowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const previewTransitionProgress = useRef(0);
  const previewTransitionTarget = useRef(0);
  const hoverProgress = useRef(0);

  const isLocked = useGalleryStore((state) => state.isLocked);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);
  const setHoveredArtwork = useGalleryStore((state) => state.setHoveredArtwork);
  const setSelectedArtwork = useGalleryStore((state) => state.setSelectedArtwork);

  const previewMap = useTexture(data.imageUrl || FALLBACK_PREVIEW_URL);
  const previewDisplayMap = useMemo(() => previewMap.clone(), [previewMap]);
  const loadDistance = data.modelLoadDistance ?? MODEL_LOAD_DISTANCE;
  const transitionOutDistance = data.modelUnloadDistance ?? loadDistance;
  const loadDistanceSquared = loadDistance * loadDistance;
  const transitionOutDistanceSquared = transitionOutDistance * transitionOutDistance;
  const portalResolution = data.isEnvironment ? 128 : 192;
  const portalBlur = data.isEnvironment ? 0 : 0.12;
  const isPreviewTransitionVisible = !hasLoadedModel || showPreviewOverlay || !isModelReady;

  useEffect(() => {
    if (!isLocked && hovered) {
      setHovered(false);
      setHoveredArtwork(null);
    }
  }, [hovered, isLocked, setHoveredArtwork]);

  useEffect(() => {
    const texture = previewDisplayMap;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const applyCover = () => {
      const image = texture.image as { width?: number; height?: number } | undefined;
      const imageWidth = image?.width ?? 0;
      const imageHeight = image?.height ?? 0;

      if (!imageWidth || !imageHeight) {
        return;
      }

      const frameAspect = data.width / data.height;
      const imageAspect = imageWidth / imageHeight;

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

    const imageWithEvents = texture.image as ImageWithEvents | undefined;

    if (imageWithEvents?.complete === false && imageWithEvents.addEventListener) {
      imageWithEvents.addEventListener('load', applyCover);

      return () => {
        imageWithEvents.removeEventListener?.('load', applyCover);
      };
    }
  }, [previewDisplayMap, data.width, data.height]);

  useEffect(() => {
    if (!hasLoadedModel) {
      setIsModelReady(false);
      setShowPreviewOverlay(true);
      previewTransitionProgress.current = 0;
      previewTransitionTarget.current = 0;
    }
  }, [hasLoadedModel]);

  useEffect(() => {
    if (!hasLoadedModel) {
      useGLTF.clear(data.modelUrl);
    }
  }, [hasLoadedModel, data.modelUrl]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      const targetScale = hovered ? 1.05 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }

    hoverProgress.current = THREE.MathUtils.damp(hoverProgress.current, hovered ? 1 : 0, 5, delta);

    if (frameMaterialRef.current) {
      frameMaterialRef.current.color.setStyle('#222222').lerp(new THREE.Color('#151515'), hoverProgress.current);
      frameMaterialRef.current.emissive.setRGB(
        hoverProgress.current * 0.025,
        hoverProgress.current * 0.025,
        hoverProgress.current * 0.025,
      );
      frameMaterialRef.current.emissiveIntensity = hoverProgress.current * 0.35;
    }

    if (hoverGlowMaterialRef.current) {
      hoverGlowMaterialRef.current.opacity = hoverProgress.current * 0.08;
    }

    const deltaX = camera.position.x - data.position[0];
    const deltaY = camera.position.y - data.position[1];
    const deltaZ = camera.position.z - data.position[2];
    const distanceSquared = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
    const isCurrentSelection = selectedArtwork?.id === data.id;
    const shouldStartLoading = distanceSquared <= loadDistanceSquared || isCurrentSelection;
    const shouldKeepLoaded = distanceSquared <= transitionOutDistanceSquared || isCurrentSelection;
    const nextTransitionProgress = THREE.MathUtils.damp(
      previewTransitionProgress.current,
      previewTransitionTarget.current,
      2.2,
      delta,
    );

    previewTransitionProgress.current = nextTransitionProgress;

    if (!hasLoadedModel) {
      if (shouldStartLoading) {
        setHasLoadedModel(true);
        setShowPreviewOverlay(true);
      }

      return;
    }

    if (!isModelReady) {
      if (!shouldKeepLoaded) {
        setHasLoadedModel(false);
      }

      return;
    }

    if (shouldKeepLoaded) {
      if (previewTransitionTarget.current !== 1) {
        setShowPreviewOverlay(true);
        previewTransitionTarget.current = 1;
      }
    } else {
      if (previewTransitionTarget.current !== 0) {
        setShowPreviewOverlay(true);
        previewTransitionTarget.current = 0;
      }

      if (nextTransitionProgress <= 0.01) {
        setHasLoadedModel(false);
      }
    }

    if (previewTransitionTarget.current === 1 && nextTransitionProgress >= 0.995 && showPreviewOverlay) {
      setShowPreviewOverlay(false);
    }
  });

  const handleModelReady = () => {
    if (isModelReady) {
      return;
    }

    setIsModelReady(true);
    setShowPreviewOverlay(true);
    previewTransitionTarget.current = 1;
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    if (!useGalleryStore.getState().isLocked) {
      return;
    }

    setHovered(true);
    setHoveredArtwork(data);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(false);
    setHoveredArtwork(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    if (!useGalleryStore.getState().isLocked) {
      return;
    }

    setSelectedArtwork(data);
  };

  return (
    <group
      ref={groupRef}
      position={data.position}
      rotation={data.rotation}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh position={[0, 0, -0.065]}>
        <planeGeometry args={[data.width + 0.28, data.height + 0.28]} />
        <meshBasicMaterial
          ref={hoverGlowMaterialRef}
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[data.width + 0.2, data.height + 0.2, 0.1]} />
        <meshStandardMaterial ref={frameMaterialRef} color="#222222" roughness={0.88} metalness={0.02} />
      </mesh>

      {hovered && !isPreviewTransitionVisible && (
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[data.width + 0.06, data.height + 0.06]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} />
        </mesh>
      )}

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
                onReady={handleModelReady}
              />
            </Suspense>
          </MeshPortalMaterial>
        </mesh>
      ) : null}

      {isPreviewTransitionVisible && (
        <>
          <PreviewTransitionPlane
            texture={previewDisplayMap}
            width={data.width}
            height={data.height}
            progressRef={previewTransitionProgress}
          />
        </>
      )}

      <group position={[0, -data.height / 2 - 0.3, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[data.width, 0.4]} />
          <meshStandardMaterial color="#111111" />
        </mesh>

        <Text position={[0, 0.05, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle">
          {data.title}
        </Text>

        <Text position={[0, -0.15, 0]} fontSize={0.1} color="#aaaaaa" anchorX="center" anchorY="middle">
          {data.artist} - ${data.price}
        </Text>
      </group>
    </group>
  );
}
