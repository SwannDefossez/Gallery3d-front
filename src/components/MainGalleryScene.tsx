import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Player } from './Player';
import { useGalleryStore } from '../store';
import { MAIN_GALLERY_ARTWORKS } from '../data/mainGalleryArtworks';

const MAIN_GALLERY_MODEL_URL = '/assets/maps/main-gallery.glb';
const GALLERY_SKY_URL = '/assets/skies/qwantani_afternoon_puresky.jpg';
const GALLERY_FLOOR_DIFFUSE_URL = '/assets/textures/gallery-floor/black_painted_planks_diff_4k.jpg';
const GALLERY_FLOOR_NORMAL_URL = '/assets/textures/gallery-floor/black_painted_planks_nor_gl_4k.jpg';
const GALLERY_FLOOR_ROUGHNESS_URL = '/assets/textures/gallery-floor/black_painted_planks_rough_4k.jpg';

const MAIN_GALLERY_WALKABLE = [
  { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },
];

const MAIN_GALLERY_SPAWN: [number, number, number] = [2.7, 1.6, -0.24];
const MAIN_GALLERY_LOOK_AT: [number, number, number] = [0, 1.6, 0];
const MAIN_GALLERY_SPAWN_ROTATION: [number, number, number] = [
  THREE.MathUtils.degToRad(-123.2),
  THREE.MathUtils.degToRad(89.1),
  THREE.MathUtils.degToRad(123.2),
];

function getMeshMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function normalizeSceneName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function shouldIgnoreForCollision(mesh: THREE.Mesh) {
  const materials = getMeshMaterials(mesh);
  const materialNames = materials.map((material) => material?.name?.toLowerCase() ?? '');
  const objectName = mesh.name.toLowerCase();
  const joinedNames = `${objectName} ${materialNames.join(' ')}`;

  const hasLightKeyword = ['light', 'ray', 'beam', 'glow', 'flare', 'volum', 'god'].some((keyword) =>
    joinedNames.includes(keyword),
  );

  return materials.some((material) => {
    if (!material) {
      return false;
    }

    const transparent = material.transparent || material.opacity < 0.98;
    const transmissive =
      'transmission' in material && typeof material.transmission === 'number' && material.transmission > 0.01;
    const alphaCutout = material.alphaTest > 0;
    const additive = material.blending === THREE.AdditiveBlending;
    const emissiveBoost =
      'emissiveIntensity' in material &&
      typeof material.emissiveIntensity === 'number' &&
      material.emissiveIntensity > 0.5;

    return transparent || transmissive || alphaCutout || additive || (hasLightKeyword && emissiveBoost);
  });
}

function shouldOverrideGalleryFloor(object: THREE.Object3D) {
  const chain: string[] = [];

  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    chain.push(normalizeSceneName(current.name));
  }

  const floorIndex = chain.indexOf('floor');

  if (floorIndex === -1) {
    return false;
  }

  return chain.slice(0, floorIndex).includes('0');
}

function createPlanarFloorUvGeometry(source: THREE.BufferGeometry) {
  const geometry = source.clone();
  const position = geometry.getAttribute('position');

  if (!position) {
    return geometry;
  }

  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    min.min(new THREE.Vector3(x, y, z));
    max.max(new THREE.Vector3(x, y, z));
  }

  const size = new THREE.Vector3().subVectors(max, min);
  const axisSizes = [
    { axis: 'x' as const, size: size.x },
    { axis: 'y' as const, size: size.y },
    { axis: 'z' as const, size: size.z },
  ].sort((left, right) => left.size - right.size);
  const projectionAxes = axisSizes.slice(1).map((entry) => entry.axis);
  const uv = new Float32Array(position.count * 2);
  const tilesPerUnit = 1 / 340;

  for (let index = 0; index < position.count; index += 1) {
    const values = {
      x: position.getX(index),
      y: position.getY(index),
      z: position.getZ(index),
    };

    uv[index * 2] = (values[projectionAxes[0]] - min[projectionAxes[0]]) * tilesPerUnit;
    uv[index * 2 + 1] = (values[projectionAxes[1]] - min[projectionAxes[1]]) * tilesPerUnit;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function CameraDebugReporter() {
  const { camera } = useThree();
  const isEditorMode = useGalleryStore((state) => state.isEditorMode);
  const setEditorCamera = useGalleryStore((state) => state.setEditorCamera);
  const lastReportTime = useRef(0);

  useFrame((state) => {
    if (!isEditorMode || state.clock.elapsedTime - lastReportTime.current < 0.1) {
      return;
    }

    lastReportTime.current = state.clock.elapsedTime;
    setEditorCamera({
      x: Number(camera.position.x.toFixed(2)),
      y: Number(camera.position.y.toFixed(2)),
      z: Number(camera.position.z.toFixed(2)),
      pitch: Number(THREE.MathUtils.radToDeg(camera.rotation.x).toFixed(1)),
      yaw: Number(THREE.MathUtils.radToDeg(camera.rotation.y).toFixed(1)),
      roll: Number(THREE.MathUtils.radToDeg(camera.rotation.z).toFixed(1)),
    });
  });

  return null;
}

function ArtworkDebugLabel({
  index,
  position,
  hitboxSize,
  offset = [0, 0, 0],
}: {
  index: number;
  position: [number, number, number];
  hitboxSize: [number, number, number];
  offset?: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    if (!context) {
      return new THREE.CanvasTexture(canvas);
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(15, 23, 42, 0.94)';
    context.beginPath();
    context.arc(128, 128, 102, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = 16;
    context.strokeStyle = '#fb7185';
    context.stroke();

    context.fillStyle = '#fff7ed';
    context.font = '700 112px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${index}`, 128, 136);

    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    return nextTexture;
  }, [index]);

  useEffect(() => () => texture.dispose(), [texture]);

  const markerPosition = useMemo<[number, number, number]>(() => {
    const verticalOffset = Math.max(hitboxSize[1], hitboxSize[2], 0.4) * 0.55;
    return [position[0] + offset[0], position[1] + verticalOffset + offset[1], position[2] + offset[2]];
  }, [hitboxSize, offset, position]);

  return (
    <sprite position={markerPosition} scale={[0.45, 0.45, 0.45]}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} transparent />
    </sprite>
  );
}

function GalleryArtworkHotspots() {
  const { camera } = useThree();
  const artworks = useGalleryStore((state) => state.artworks);
  const isEditorMode = useGalleryStore((state) => state.isEditorMode);
  const isLocked = useGalleryStore((state) => state.isLocked);
  const isCartOpen = useGalleryStore((state) => state.isCartOpen);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);
  const setSelectedArtwork = useGalleryStore((state) => state.setSelectedArtwork);
  const setHoveredArtworkId = useGalleryStore((state) => state.setHoveredArtworkId);
  const selectedEditorArtworkId = useGalleryStore((state) => state.selectedEditorArtworkId);
  const setSelectedEditorArtworkId = useGalleryStore((state) => state.setSelectedEditorArtworkId);
  const raycasterRef = useRef(new THREE.Raycaster());
  const hotspotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const hoveredArtworkIdRef = useRef<string | null>(null);
  const galleryArtworks = artworks.length > 0 ? artworks : MAIN_GALLERY_ARTWORKS;

  useFrame(() => {
    if (!isLocked || isCartOpen || isEditorMode || selectedArtwork) {
      if (hoveredArtworkIdRef.current !== null) {
        hoveredArtworkIdRef.current = null;
        setHoveredArtworkId(null);
      }
      return;
    }

    const hotspotMeshes = hotspotRefs.current.filter((mesh): mesh is THREE.Mesh => mesh !== null);

    if (hotspotMeshes.length === 0) {
      if (hoveredArtworkIdRef.current !== null) {
        hoveredArtworkIdRef.current = null;
        setHoveredArtworkId(null);
      }
      return;
    }

    raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycasterRef.current.intersectObjects(hotspotMeshes, false);
    const nextHoveredArtworkId = (hits[0]?.object.userData.artworkId as string | undefined) ?? null;

    if (hoveredArtworkIdRef.current !== nextHoveredArtworkId) {
      hoveredArtworkIdRef.current = nextHoveredArtworkId;
      setHoveredArtworkId(nextHoveredArtworkId);
    }
  });

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (event.button !== 0 || !isLocked || isCartOpen || selectedArtwork) {
        return;
      }

      const hotspotMeshes = hotspotRefs.current.filter((mesh): mesh is THREE.Mesh => mesh !== null);

      if (hotspotMeshes.length === 0) {
        return;
      }

      raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = raycasterRef.current.intersectObjects(hotspotMeshes, false);
      const artworkId = hits[0]?.object.userData.artworkId as string | undefined;

      if (!artworkId) {
        return;
      }

      const artwork = galleryArtworks.find((entry) => entry.id === artworkId);

      if (isEditorMode) {
        if (artwork) {
          setSelectedEditorArtworkId(artwork.id);
        }
        return;
      }

      if (artwork) {
        setSelectedArtwork(artwork);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [camera, galleryArtworks, isCartOpen, isEditorMode, isLocked, selectedArtwork, setSelectedArtwork, setSelectedEditorArtworkId]);

  useEffect(
    () => () => {
      setHoveredArtworkId(null);
    },
    [setHoveredArtworkId],
  );

  return (
    <group>
      {galleryArtworks.map((artwork, index) => (
        <group key={artwork.id}>
          {(() => {
            return (
              <>
                <mesh
                  ref={(mesh) => {
                    hotspotRefs.current[index] = mesh;
                  }}
                  position={artwork.position}
                  rotation={artwork.rotation}
                  userData={{ artworkId: artwork.id }}
                >
                  <boxGeometry args={artwork.hitboxSize} />
                  <meshBasicMaterial
                    color={selectedEditorArtworkId === artwork.id ? '#facc15' : '#fb7185'}
                    transparent
                    opacity={isEditorMode ? 0.3 : 0}
                    wireframe={isEditorMode}
                    depthWrite={false}
                  />
                </mesh>
                {isEditorMode && (
                  <ArtworkDebugLabel
                    index={artwork.debugNumber}
                    position={artwork.position}
                    hitboxSize={artwork.hitboxSize}
                    offset={artwork.debugLabelOffset}
                  />
                )}
              </>
            );
          })()}
        </group>
      ))}
    </group>
  );
}

function SkyDome() {
  const skyTexture = useTexture(GALLERY_SKY_URL);

  useEffect(() => {
    skyTexture.colorSpace = THREE.SRGBColorSpace;
  }, [skyTexture]);

  return (
    <mesh rotation={[0, -Math.PI / 2, 0]}>
      <sphereGeometry args={[420, 64, 64]} />
      <meshBasicMaterial map={skyTexture} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

function MainGalleryModel({
  modelRef,
  onReady,
  floorMaterial,
}: {
  modelRef: RefObject<THREE.Group | null>;
  onReady: () => void;
  floorMaterial: THREE.MeshStandardMaterial;
}) {
  const { scene } = useGLTF(MAIN_GALLERY_MODEL_URL);

  const placement = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const min = bounds.min.clone();

    return {
      position: [-center.x, -min.y, -center.z] as [number, number, number],
    };
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && shouldOverrideGalleryFloor(child)) {
        child.geometry = createPlanarFloorUvGeometry(child.geometry);
        child.material = floorMaterial;
        child.castShadow = false;
        child.receiveShadow = true;
      }

      if ('castShadow' in child) {
        child.castShadow = false;
      }

      if ('receiveShadow' in child) {
        child.receiveShadow = true;
      }
    });
    onReady();
  }, [floorMaterial, scene, onReady]);

  return (
    <group ref={modelRef} position={placement.position}>
      <primitive object={scene} />
      <GalleryArtworkHotspots />
    </group>
  );
}

useGLTF.preload(MAIN_GALLERY_MODEL_URL);

export function MainGalleryScene() {
  const { gl } = useThree();
  const isEditorMode = useGalleryStore((state) => state.isEditorMode);
  const galleryFloorTuning = useGalleryStore((state) => state.galleryFloorTuning);
  const [floorDiffuse, floorNormal, floorRoughness] = useTexture([
    GALLERY_FLOOR_DIFFUSE_URL,
    GALLERY_FLOOR_NORMAL_URL,
    GALLERY_FLOOR_ROUGHNESS_URL,
  ]);
  const [collisionReady, setCollisionReady] = useState(false);
  const [collisionMeshes, setCollisionMeshes] = useState<THREE.Object3D[]>([]);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const textures = [floorDiffuse, floorNormal, floorRoughness];

    textures.forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(galleryFloorTuning.repeat[0], galleryFloorTuning.repeat[1]);
      texture.offset.set(galleryFloorTuning.offset[0], galleryFloorTuning.offset[1]);
      texture.center.set(0.5, 0.5);
      texture.rotation = THREE.MathUtils.degToRad(galleryFloorTuning.rotationDeg);
      texture.anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8);
      texture.needsUpdate = true;
    });

    floorDiffuse.colorSpace = THREE.SRGBColorSpace;
  }, [floorDiffuse, floorNormal, floorRoughness, galleryFloorTuning, gl]);

  const floorMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      map: floorDiffuse,
      normalMap: floorNormal,
      roughnessMap: floorRoughness,
      color: '#ffffff',
      roughness: 0.82,
      metalness: 0.02,
      normalScale: new THREE.Vector2(galleryFloorTuning.normalScale, galleryFloorTuning.normalScale),
    });

    return material;
  }, [floorDiffuse, floorNormal, floorRoughness, galleryFloorTuning.normalScale]);

  useEffect(() => () => floorMaterial.dispose(), [floorMaterial]);

  useEffect(() => {
    if (!collisionReady || !modelRef.current) {
      return;
    }

    modelRef.current.updateWorldMatrix(true, true);

    const solids: THREE.Object3D[] = [];
    const ignored: string[] = [];

    modelRef.current.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (!object.visible) {
        return;
      }

      if (shouldIgnoreForCollision(object)) {
        ignored.push(object.name || '(unnamed mesh)');
        return;
      }

      solids.push(object);
    });

    setCollisionMeshes(solids);
    console.log('[Main gallery] ignored collision meshes:', ignored);
  }, [collisionReady]);

  return (
    <>
      <color attach="background" args={['#d8e6f5']} />
      <fog attach="fog" args={['#d8e6f5', 120, 320]} />

      <ambientLight intensity={0.95} color="#ffffff" />
      <hemisphereLight intensity={0.65} color="#f7f3eb" groundColor="#30261f" />
      <directionalLight position={[12, 18, 8]} intensity={0.8} color="#fff4dd" />

      <SkyDome />

      <Player
        walkableRects={MAIN_GALLERY_WALKABLE}
        collisionRects={[]}
        spawnPosition={MAIN_GALLERY_SPAWN}
        spawnLookAt={MAIN_GALLERY_LOOK_AT}
        spawnRotation={MAIN_GALLERY_SPAWN_ROTATION}
        noClip={isEditorMode}
        fly={isEditorMode}
        moveSpeed={isEditorMode ? 12 : 5}
        collisionObjects={isEditorMode ? [] : collisionMeshes}
        persistKey="main-gallery-player-camera"
      />

      <CameraDebugReporter />
      <MainGalleryModel
        modelRef={modelRef}
        floorMaterial={floorMaterial}
        onReady={() => setCollisionReady(true)}
      />
    </>
  );
}
