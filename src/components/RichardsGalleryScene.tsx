import { Clone, Environment, MeshPortalMaterial, useGLTF, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Player } from './Player';
import { type ArtworkData, type RichardsSurfaceTuning, useGalleryStore } from '../store';

const ROOT_GALLERY_MODEL_URL = new URL('../../richards_art_gallery_-_audio_tour.glb', import.meta.url).href;
const INFERNO_MODEL_URL = '/assets/models/inferno-world-free.glb';
const INFERNO_PREVIEW_URL = '/assets/previews/inferno-world-preview.png';
const RICHARDS_SKY_URL = '/assets/skies/qwantani_afternoon_puresky.jpg';
const RICHARDS_FLOOR_DIFFUSE_URL = '/assets/textures/richards_floor/black_painted_planks_diff_4k.jpg';
const RICHARDS_FLOOR_NORMAL_URL = '/assets/textures/richards_floor/black_painted_planks_nor_gl_4k.jpg';
const RICHARDS_FLOOR_ROUGHNESS_URL = '/assets/textures/richards_floor/black_painted_planks_rough_4k.jpg';
const HIDDEN_OBJECT_NAMES = new Set([
  'jake and london eye london eye manual bake 0',
  'round table',
  'water fountain',
  'object004',
  'object 4',
  'object 72',
  'object004 holly manual bake 0',
  'holly plant and book',
  'holy plant and book',
  'holly manual bake',
  '4',
]);
const HIDDEN_MATERIAL_NAMES = new Set(['london eye manual bake', 'holly manual bake']);
const HIDDEN_OBJECT_NAME_PARTS = ['holly manual bake', 'object004', 'water fountain', 'round table'];
const INFERNO_ANCHOR_NAME = 'jake_and_london_eye_london_eye_manual_bake_0';

const RICHARDS_WALKABLE = [
  { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },
];

const RICHARDS_SPAWN: [number, number, number] = [2.7, 1.6, -0.24];
const RICHARDS_LOOK_AT: [number, number, number] = [0, 1.6, 0];
const RICHARDS_SPAWN_ROTATION: [number, number, number] = [
  THREE.MathUtils.degToRad(-123.2),
  THREE.MathUtils.degToRad(89.1),
  THREE.MathUtils.degToRad(123.2),
];

const RICHARDS_INFERNO_ARTWORK: ArtworkData = {
  id: 'richards-inferno',
  title: 'Inferno World',
  artist: 'Modele importe',
  description:
    'Environnement fantastique en ruines, presente ici comme une oeuvre immersive. Ouvrez la fiche pour la presentation, puis activez ou desactivez la version 3D directement dans la galerie.',
  price: 0,
  imageUrl: INFERNO_PREVIEW_URL,
  modelUrl: INFERNO_MODEL_URL,
  isEnvironment: true,
  environmentScaleMultiplier: 3.75,
  environmentOffset: [-12.5, 8.75, -24],
  modelRotation: [0, 4.6, 0],
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  width: 3,
  height: 2,
};

type ReplacementSurface = {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

function getMeshMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function normalizeRichardsName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function shouldHideRichardsObject(object: THREE.Object3D) {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    const normalizedName = normalizeRichardsName(current.name);

    if (
      HIDDEN_OBJECT_NAMES.has(normalizedName) ||
      HIDDEN_OBJECT_NAME_PARTS.some((part) => normalizedName.includes(part))
    ) {
      return true;
    }
  }

  if (!(object instanceof THREE.Mesh)) {
    return false;
  }

  return getMeshMaterials(object).some((material) => {
    const materialName = normalizeRichardsName(material?.name ?? '');
    return HIDDEN_MATERIAL_NAMES.has(materialName);
  });
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

function shouldOverrideRichardsFloor(object: THREE.Object3D) {
  const chain: string[] = [];

  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    chain.push(normalizeRichardsName(current.name));
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

function SkyDome() {
  const skyTexture = useTexture(RICHARDS_SKY_URL);

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

function buildReplacementSurface(targetObject: THREE.Object3D, surfaceTuning: RichardsSurfaceTuning) {
  if (!(targetObject instanceof THREE.Mesh)) {
    return null;
  }

  const geometry = targetObject.geometry.clone();
  geometry.computeBoundingBox();
  const localBounds = geometry.boundingBox ?? new THREE.Box3(new THREE.Vector3(-0.5, -0.5, 0), new THREE.Vector3(0.5, 0.5, 0));
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  targetObject.matrixWorld.decompose(position, quaternion, scale);

  const localOffset = new THREE.Vector3(...surfaceTuning.offsetLocal).applyQuaternion(quaternion);
  position.add(localOffset);

  const rotationOffset = new THREE.Euler(
    THREE.MathUtils.degToRad(surfaceTuning.rotationOffsetDeg[0]),
    THREE.MathUtils.degToRad(surfaceTuning.rotationOffsetDeg[1]),
    THREE.MathUtils.degToRad(surfaceTuning.rotationOffsetDeg[2]),
    'XYZ',
  );
  quaternion.multiply(new THREE.Quaternion().setFromEuler(rotationOffset));

  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  const tunedScale = scale.multiply(new THREE.Vector3(...surfaceTuning.scale));

  return {
    geometry,
    position: position.toArray() as [number, number, number],
    rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
    scale: tunedScale.toArray() as [number, number, number],
  };
}

function InfernoPortalContent() {
  const { scene } = useGLTF(INFERNO_MODEL_URL);
  const richardsWorldTuning = useGalleryStore((state) => state.richardsWorldTuning);

  const normalized = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const safeSize = new THREE.Vector3(
      Math.max(size.x, 0.001),
      Math.max(size.y, 0.001),
      Math.max(size.z, 0.001),
    );
    const fitX = 42 / safeSize.x;
    const fitY = 16 / safeSize.y;
    const fitZ = 42 / safeSize.z;
    const scale = Math.min(fitX, fitY, fitZ) * richardsWorldTuning.scaleMultiplier;

    return { center, scale };
  }, [richardsWorldTuning.scaleMultiplier, scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if ('castShadow' in child) {
        child.castShadow = false;
      }

      if ('receiveShadow' in child) {
        child.receiveShadow = false;
      }
    });
  }, [scene]);

  return (
    <>
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.24} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={0.35} />
      <Environment preset="city" resolution={64} frames={1} />
      <group position={richardsWorldTuning.position} rotation={richardsWorldTuning.rotation}>
        <group scale={normalized.scale}>
          <group position={[-normalized.center.x, -normalized.center.y, -normalized.center.z]}>
            <Clone object={scene} />
          </group>
        </group>
      </group>
    </>
  );
}

function InfernoPreviewMaterial({
  texture,
  flipX,
}: {
  texture: THREE.Texture;
  flipX: boolean;
}) {
  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uFlipX: { value: flipX ? 1 : 0 },
      uHorizontalStretch: { value: 1.3 },
      uContrast: { value: 1.16 },
      uSaturation: { value: 1.18 },
      uTint: { value: new THREE.Color('#fff1da') },
      uTintStrength: { value: 0.08 },
    }),
    [texture, flipX],
  );

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={`
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        uniform sampler2D uMap;
        uniform float uFlipX;
        uniform float uHorizontalStretch;
        uniform float uContrast;
        uniform float uSaturation;
        uniform vec3 uTint;
        uniform float uTintStrength;

        varying vec2 vUv;

        void main() {
          vec2 sampleUv = vUv;
          sampleUv.x = ((sampleUv.x - 0.5) / uHorizontalStretch) + 0.5;
          sampleUv.x = clamp(sampleUv.x, 0.001, 0.999);

          if (uFlipX > 0.5) {
            sampleUv.x = 1.0 - sampleUv.x;
          }

          vec4 texel = texture2D(uMap, sampleUv);
          vec3 color = texel.rgb;
          color = (color - 0.5) * uContrast + 0.5;

          float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
          color = mix(vec3(luma), color, uSaturation);
          color = mix(color, color * uTint, uTintStrength);

          gl_FragColor = vec4(color, texel.a);
        }
      `}
      toneMapped={false}
      transparent={texture.format === THREE.RGBAFormat}
    />
  );
}

function RichardsInfernoReplacement({ surface }: { surface: ReplacementSurface }) {
  const infernoEnabled = useGalleryStore((state) => state.richardsInfernoEnabled);
  const setInfernoEnabled = useGalleryStore((state) => state.setRichardsInfernoEnabled);
  const isLocked = useGalleryStore((state) => state.isLocked);
  const hoveredArtwork = useGalleryStore((state) => state.hoveredArtwork);
  const setHoveredArtwork = useGalleryStore((state) => state.setHoveredArtwork);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);
  const setSelectedArtwork = useGalleryStore((state) => state.setSelectedArtwork);
  const setRichardsHoverHint = useGalleryStore((state) => state.setRichardsHoverHint);
  const previewTexture = useTexture(INFERNO_PREVIEW_URL);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    previewTexture.colorSpace = THREE.SRGBColorSpace;
  }, [previewTexture]);

  useEffect(
    () => () => {
      setRichardsHoverHint('');
      if (useGalleryStore.getState().hoveredArtwork?.id === RICHARDS_INFERNO_ARTWORK.id) {
        setHoveredArtwork(null);
      }
    },
    [setHoveredArtwork, setRichardsHoverHint],
  );

  useEffect(() => {
    if (!isHovered || !isLocked || selectedArtwork) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE') {
        return;
      }

      event.preventDefault();
      setInfernoEnabled(!useGalleryStore.getState().richardsInfernoEnabled);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, isLocked, selectedArtwork, setInfernoEnabled]);

  return (
    <group position={surface.position} rotation={surface.rotation} scale={surface.scale}>
      {/* The replacement mesh can inherit a mirrored X scale from the source artwork. */}
      <mesh
        geometry={surface.geometry}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
          setHoveredArtwork(RICHARDS_INFERNO_ARTWORK);
          setRichardsHoverHint(
            infernoEnabled
              ? 'Cliquez pour ouvrir la fiche. Appuyez sur E pour revenir a l image.'
              : 'Cliquez pour ouvrir la fiche. Appuyez sur E pour activer la 3D.',
          );
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setIsHovered(false);
          if (hoveredArtwork?.id === RICHARDS_INFERNO_ARTWORK.id) {
            setHoveredArtwork(null);
          }
          setRichardsHoverHint('');
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (!useGalleryStore.getState().isLocked) {
            return;
          }

          setSelectedArtwork(RICHARDS_INFERNO_ARTWORK);
        }}
      >
        {infernoEnabled ? (
          <MeshPortalMaterial blur={0} resolution={128} worldUnits>
            <InfernoPortalContent />
          </MeshPortalMaterial>
        ) : (
          <InfernoPreviewMaterial texture={previewTexture} flipX={surface.scale[0] < 0} />
        )}
      </mesh>
    </group>
  );
}

function findObjectByRuntimeName(root: THREE.Object3D, expectedName: string) {
  const matches: THREE.Object3D[] = [];

  root.traverse((object) => {
    if (object.name.toLowerCase() === expectedName) {
      matches.push(object);
    }
  });

  return matches.find((object) => object instanceof THREE.Mesh) ?? matches[0] ?? null;
}

function findRichardsDebugNames(root: THREE.Object3D) {
  const matches: string[] = [];

  root.traverse((object) => {
    const objectName = object.name.toLowerCase();

    if (!objectName.includes('jake') && !objectName.includes('london')) {
      return;
    }

    const typeLabel = object instanceof THREE.Mesh ? 'mesh' : object.type.toLowerCase();
    matches.push(`${typeLabel}: ${object.name || '(unnamed)'}`);
  });

  return matches;
}

function RichardsGalleryModel({
  modelRef,
  onReady,
  floorMaterial,
}: {
  modelRef: RefObject<THREE.Group | null>;
  onReady: () => void;
  floorMaterial: THREE.MeshStandardMaterial;
}) {
  const { scene } = useGLTF(ROOT_GALLERY_MODEL_URL);

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
      if (child instanceof THREE.Mesh && shouldOverrideRichardsFloor(child)) {
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
    </group>
  );
}

useGLTF.preload(ROOT_GALLERY_MODEL_URL);
useGLTF.preload(INFERNO_MODEL_URL);

export function RichardsGalleryScene() {
  const { gl } = useThree();
  const isEditorMode = useGalleryStore((state) => state.isEditorMode);
  const richardsSurfaceTuning = useGalleryStore((state) => state.richardsSurfaceTuning);
  const richardsWorldTuning = useGalleryStore((state) => state.richardsWorldTuning);
  const richardsFloorTuning = useGalleryStore((state) => state.richardsFloorTuning);
  const [floorDiffuse, floorNormal, floorRoughness] = useTexture([
    RICHARDS_FLOOR_DIFFUSE_URL,
    RICHARDS_FLOOR_NORMAL_URL,
    RICHARDS_FLOOR_ROUGHNESS_URL,
  ]);
  const [collisionReady, setCollisionReady] = useState(false);
  const [collisionMeshes, setCollisionMeshes] = useState<THREE.Object3D[]>([]);
  const [infernoSurface, setInfernoSurface] = useState<ReplacementSurface | null>(null);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const textures = [floorDiffuse, floorNormal, floorRoughness];

    textures.forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(richardsFloorTuning.repeat[0], richardsFloorTuning.repeat[1]);
      texture.offset.set(richardsFloorTuning.offset[0], richardsFloorTuning.offset[1]);
      texture.center.set(0.5, 0.5);
      texture.rotation = THREE.MathUtils.degToRad(richardsFloorTuning.rotationDeg);
      texture.anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8);
      texture.needsUpdate = true;
    });

    floorDiffuse.colorSpace = THREE.SRGBColorSpace;
  }, [floorDiffuse, floorNormal, floorRoughness, gl, richardsFloorTuning]);

  const floorMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      map: floorDiffuse,
      normalMap: floorNormal,
      roughnessMap: floorRoughness,
      color: '#ffffff',
      roughness: 0.82,
      metalness: 0.02,
      normalScale: new THREE.Vector2(richardsFloorTuning.normalScale, richardsFloorTuning.normalScale),
    });

    return material;
  }, [floorDiffuse, floorNormal, floorRoughness, richardsFloorTuning.normalScale]);

  useEffect(() => () => floorMaterial.dispose(), [floorMaterial]);

  useEffect(() => {
    if (!collisionReady || !modelRef.current) {
      return;
    }

    const hiddenObjects: string[] = [];

    modelRef.current.updateWorldMatrix(true, true);

    const targetObject = findObjectByRuntimeName(modelRef.current, INFERNO_ANCHOR_NAME);
    const debugNames = findRichardsDebugNames(modelRef.current);

    if (targetObject) {
      targetObject.updateWorldMatrix(true, false);
      const surface = buildReplacementSurface(targetObject, richardsSurfaceTuning);
      setInfernoSurface(surface);
      console.log('[Richards replacement] inferno surface:', surface);
    } else {
      setInfernoSurface(null);
      console.log(
        '[Richards replacement] inferno surface introuvable:',
        INFERNO_ANCHOR_NAME,
        'runtime:',
        debugNames,
      );
    }

    modelRef.current.traverse((object) => {
      if (!shouldHideRichardsObject(object)) {
        return;
      }

      object.visible = false;
      hiddenObjects.push(object.name || '(unnamed object)');
    });

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
    console.log('[Richards collisions] ignored meshes:', ignored);
    console.log('[Richards replacement] hidden objects:', hiddenObjects);
    console.log('[Richards replacement] runtime names:', debugNames);
  }, [collisionReady, richardsSurfaceTuning, richardsWorldTuning]);

  return (
    <>
      <color attach="background" args={['#d8e6f5']} />
      <fog attach="fog" args={['#d8e6f5', 120, 320]} />

      <ambientLight intensity={0.95} color="#ffffff" />
      <hemisphereLight intensity={0.65} color="#f7f3eb" groundColor="#30261f" />
      <directionalLight position={[12, 18, 8]} intensity={0.8} color="#fff4dd" />

      <SkyDome />

      <Player
        walkableRects={RICHARDS_WALKABLE}
        collisionRects={[]}
        spawnPosition={RICHARDS_SPAWN}
        spawnLookAt={RICHARDS_LOOK_AT}
        spawnRotation={RICHARDS_SPAWN_ROTATION}
        noClip={isEditorMode}
        fly={isEditorMode}
        moveSpeed={isEditorMode ? 12 : 5}
        collisionObjects={isEditorMode ? [] : collisionMeshes}
        persistKey="richards-player-camera"
      />

      <CameraDebugReporter />
      <RichardsGalleryModel
        modelRef={modelRef}
        floorMaterial={floorMaterial}
        onReady={() => setCollisionReady(true)}
      />
      {infernoSurface && <RichardsInfernoReplacement surface={infernoSurface} />}
    </>
  );
}
