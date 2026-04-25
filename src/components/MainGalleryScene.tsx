import { Clone, Environment, MeshPortalMaterial, useGLTF, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Player } from './Player';
import { type ArtworkData, type PortalSurfaceTuning, useGalleryStore } from '../store';
import {
  MAIN_GALLERY_SAVED_TABLE_PLACEMENTS,
  MAIN_GALLERY_TABLEAU_9_MODEL_ANCHOR,
  MAIN_GALLERY_TEMP_TABLEAU_ANCHORS,
} from '../data/mainGalleryReplacementArtworks';

const MAIN_GALLERY_MODEL_URL = '/assets/maps/main-gallery.glb';
const INFERNO_MODEL_URL = '/assets/models/inferno-world-free.glb';
const INFERNO_PREVIEW_URL = '/assets/previews/inferno-world-preview.png';
const HORNET_MODEL_URL = '/assets/models/hornet/hornet.glb';
const HORNET_PREVIEW_URL = '/assets/previews/hornet-preview.png';
const GALLERY_SKY_URL = '/assets/skies/qwantani_afternoon_puresky.jpg';
const GALLERY_FLOOR_DIFFUSE_URL = '/assets/textures/gallery-floor/black_painted_planks_diff_4k.jpg';
const GALLERY_FLOOR_NORMAL_URL = '/assets/textures/gallery-floor/black_painted_planks_nor_gl_4k.jpg';
const GALLERY_FLOOR_ROUGHNESS_URL = '/assets/textures/gallery-floor/black_painted_planks_rough_4k.jpg';
const HIDDEN_OBJECT_NAMES = new Set([
  'jake and london eye london eye manual bake 0',
  'round table',
  'water fountain',
  'object 56',
  'jakeframe',
  'jakeframe jake manua bake 0',
  'eddie and horse',
  'object 69',
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
const FLOATING_TABLEAU_MARKER_LABELS = new Set([12]);

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

const INFERNO_PORTAL_ARTWORK: ArtworkData = {
  id: 'inferno-portal',
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

const TABLEAU_9_PORTAL_ARTWORK: ArtworkData = {
  id: 'tableau-9-model',
  title: 'Hornet',
  artist: 'Modele importe',
  description:
    'Modele 3D place sur le tableau 9. Il suit le meme principe qu Inferno, avec un apercu statique et une activation directe de la scene 3D dans la galerie.',
  price: 0,
  imageUrl: HORNET_PREVIEW_URL,
  modelUrl: HORNET_MODEL_URL,
  environmentScaleMultiplier: 1,
  environmentOffset: [0, 0, 0],
  modelRotation: [0, 3.2, 0],
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

type TemporaryArtworkSurface = {
  label: number;
  surface: ReplacementSurface;
};

function getMeshMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function normalizeSceneName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function shouldHideSceneObject(object: THREE.Object3D) {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    const normalizedName = normalizeSceneName(current.name);

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
    const materialName = normalizeSceneName(material?.name ?? '');
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

function buildReplacementSurface(targetObject: THREE.Object3D, surfaceTuning: PortalSurfaceTuning) {
  if (!(targetObject instanceof THREE.Mesh)) {
    return null;
  }

  const geometry = targetObject.geometry.clone();
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
  const portalWorldTuning = useGalleryStore((state) => state.portalWorldTuning);

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
    const scale = Math.min(fitX, fitY, fitZ) * portalWorldTuning.scaleMultiplier;

    return { center, scale };
  }, [portalWorldTuning.scaleMultiplier, scene]);

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
      <group position={portalWorldTuning.position} rotation={portalWorldTuning.rotation}>
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

function GalleryInfernoPortal({ surface }: { surface: ReplacementSurface }) {
  const infernoPortalEnabled = useGalleryStore((state) => state.infernoPortalEnabled);
  const setInfernoPortalEnabled = useGalleryStore((state) => state.setInfernoPortalEnabled);
  const isLocked = useGalleryStore((state) => state.isLocked);
  const hoveredArtwork = useGalleryStore((state) => state.hoveredArtwork);
  const setHoveredArtwork = useGalleryStore((state) => state.setHoveredArtwork);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);
  const setSelectedArtwork = useGalleryStore((state) => state.setSelectedArtwork);
  const setGalleryHoverHint = useGalleryStore((state) => state.setGalleryHoverHint);
  const previewTexture = useTexture(INFERNO_PREVIEW_URL);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    previewTexture.colorSpace = THREE.SRGBColorSpace;
  }, [previewTexture]);

  useEffect(
    () => () => {
      setGalleryHoverHint('');
      if (useGalleryStore.getState().hoveredArtwork?.id === INFERNO_PORTAL_ARTWORK.id) {
        setHoveredArtwork(null);
      }
    },
    [setHoveredArtwork, setGalleryHoverHint],
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
      setInfernoPortalEnabled(!useGalleryStore.getState().infernoPortalEnabled);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, isLocked, selectedArtwork, setInfernoPortalEnabled]);

  return (
    <group position={surface.position} rotation={surface.rotation} scale={surface.scale}>
      {/* The replacement mesh can inherit a mirrored X scale from the source artwork. */}
      <mesh
        geometry={surface.geometry}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
          setHoveredArtwork(INFERNO_PORTAL_ARTWORK);
          setGalleryHoverHint(
            infernoPortalEnabled
              ? 'Cliquez pour ouvrir la fiche. Appuyez sur E pour revenir a l image.'
              : 'Cliquez pour ouvrir la fiche. Appuyez sur E pour activer la 3D.',
          );
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setIsHovered(false);
          if (hoveredArtwork?.id === INFERNO_PORTAL_ARTWORK.id) {
            setHoveredArtwork(null);
          }
          setGalleryHoverHint('');
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (!useGalleryStore.getState().isLocked) {
            return;
          }

          setSelectedArtwork(INFERNO_PORTAL_ARTWORK);
        }}
      >
        {infernoPortalEnabled ? (
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

function Tableau9PortalContent() {
  const { scene } = useGLTF(HORNET_MODEL_URL);
  const tableau9WorldTuning = useGalleryStore((state) => state.tableau9WorldTuning);
  const isEditorMode = useGalleryStore((state) => state.isEditorMode);
  const clonedScene = useMemo(() => skeletonClone(scene), [scene]);

  const normalized = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const safeSize = new THREE.Vector3(
      Math.max(size.x, 0.001),
      Math.max(size.y, 0.001),
      Math.max(size.z, 0.001),
    );
    const fitX = 7 / safeSize.x;
    const fitY = 5.6 / safeSize.y;
    const fitZ = 7 / safeSize.z;
    const fitScale = Math.min(fitX, fitY, fitZ);
    const scale = fitScale * tableau9WorldTuning.scaleMultiplier;

    return {
      center,
      baseSize: safeSize,
      fitScale,
      scale,
      scaledSize: safeSize.clone().multiplyScalar(scale),
    };
  }, [scene, tableau9WorldTuning.scaleMultiplier]);

  const hornetVisualScale = normalized.scale * 1.12;

  const room = useMemo(() => {
    const width = Math.max(normalized.baseSize.x * 2.4 + 2.0, 5.0);
    const height = Math.max(normalized.baseSize.y * 2.3 + 2.0, 6.0);
    const depth = Math.max(normalized.baseSize.z * 2.8 + 2.2, 5.8);
    const wallThickness = 0.22;
    const floorThickness = 0.26;
    const ceilingThickness = 0.2;

    return {
      width,
      height,
      depth,
      wallThickness,
      floorThickness,
      ceilingThickness,
      floorY: -height * 0.5 + floorThickness * 0.5,
      ceilingY: height * 0.5 - ceilingThickness * 0.5,
      backWallZ: -depth * 0.5 + wallThickness * 0.5,
      sideWallX: width * 0.5 - wallThickness * 0.5,
      shadowY: -height * 0.5 + 0.04,
      pedestalY: -height * 0.5 + 0.38,
    };
  }, [normalized.baseSize.x, normalized.baseSize.y, normalized.baseSize.z]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ('castShadow' in child) {
        child.castShadow = false;
      }

      if ('receiveShadow' in child) {
        child.receiveShadow = false;
      }
    });
  }, [clonedScene]);

  return (
    <>
      <color attach="background" args={['#ddd6cd']} />
      <ambientLight intensity={0.42} color="#ffffff" />
      <directionalLight position={[4, 7, 5]} intensity={0.8} color="#fff3de" />
      <spotLight
        position={[0, normalized.scaledSize.y * 0.95, normalized.scaledSize.z * 0.35]}
        angle={0.58}
        penumbra={0.9}
        intensity={2.4}
        color="#fff4df"
      />
      <pointLight position={[-1.3, 2.6, 2.2]} intensity={0.75} color="#c7d2fe" />
      <Environment preset="city" resolution={64} frames={1} />
      <group>
        <group>
          <mesh position={[0, room.floorY, 0]}>
            <boxGeometry args={[room.width, room.floorThickness, room.depth]} />
            <meshStandardMaterial color="#5a5350" roughness={0.96} side={THREE.BackSide} />
          </mesh>

          <mesh position={[0, 0, room.backWallZ]}>
            <boxGeometry args={[room.width, room.height, room.wallThickness]} />
            <meshStandardMaterial color="#c9c0b6" roughness={0.93} side={THREE.BackSide} />
          </mesh>

          <mesh position={[-room.sideWallX, 0, -0.04]}>
            <boxGeometry args={[room.wallThickness, room.height, room.depth]} />
            <meshStandardMaterial color="#bcb3aa" roughness={0.95} side={THREE.BackSide} />
          </mesh>

          <mesh position={[room.sideWallX, 0, -0.04]}>
            <boxGeometry args={[room.wallThickness, room.height, room.depth]} />
            <meshStandardMaterial color="#bcb3aa" roughness={0.95} side={THREE.BackSide} />
          </mesh>

          <mesh position={[0, room.ceilingY, 0]}>
            <boxGeometry args={[room.width, room.ceilingThickness, room.depth]} />
            <meshStandardMaterial color="#d8d0c6" roughness={0.94} side={THREE.BackSide} />
          </mesh>

          <mesh position={[0, room.pedestalY, 0]}>
            <cylinderGeometry args={[0.78, 0.94, 0.46, 40]} />
            <meshStandardMaterial color="#8a7b70" roughness={0.9} />
          </mesh>

          <mesh position={[0, room.shadowY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[Math.max(room.width * 0.9, 2.8), Math.max(room.depth * 0.9, 2.8)]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.14} />
          </mesh>
        </group>

        <group position={tableau9WorldTuning.position} rotation={tableau9WorldTuning.rotation} scale={hornetVisualScale}>
          <group position={[-normalized.center.x, -normalized.center.y, -normalized.center.z]}>
            {isEditorMode ? <axesHelper args={[1.25]} /> : null}
            <primitive object={clonedScene} />
          </group>
        </group>
      </group>
    </>
  );
}

function GalleryTableau9Portal({ surface }: { surface: ReplacementSurface }) {
  const tableau9PortalEnabled = useGalleryStore((state) => state.tableau9PortalEnabled);
  const setTableau9PortalEnabled = useGalleryStore((state) => state.setTableau9PortalEnabled);
  const isLocked = useGalleryStore((state) => state.isLocked);
  const hoveredArtwork = useGalleryStore((state) => state.hoveredArtwork);
  const setHoveredArtwork = useGalleryStore((state) => state.setHoveredArtwork);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);
  const setSelectedArtwork = useGalleryStore((state) => state.setSelectedArtwork);
  const setGalleryHoverHint = useGalleryStore((state) => state.setGalleryHoverHint);
  const previewTexture = useTexture(HORNET_PREVIEW_URL);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    previewTexture.colorSpace = THREE.SRGBColorSpace;
  }, [previewTexture]);

  useEffect(
    () => () => {
      setGalleryHoverHint('');
      if (useGalleryStore.getState().hoveredArtwork?.id === TABLEAU_9_PORTAL_ARTWORK.id) {
        setHoveredArtwork(null);
      }
    },
    [setHoveredArtwork, setGalleryHoverHint],
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
      setTableau9PortalEnabled(!useGalleryStore.getState().tableau9PortalEnabled);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, isLocked, selectedArtwork, setTableau9PortalEnabled]);

  return (
    <group position={surface.position} rotation={surface.rotation} scale={surface.scale}>
      <mesh
        geometry={surface.geometry}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
          setHoveredArtwork(TABLEAU_9_PORTAL_ARTWORK);
          setGalleryHoverHint(
            tableau9PortalEnabled
              ? 'Cliquez pour ouvrir la fiche. Appuyez sur E pour revenir a l image.'
              : 'Cliquez pour ouvrir la fiche. Appuyez sur E pour activer la 3D.',
          );
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setIsHovered(false);
          if (hoveredArtwork?.id === TABLEAU_9_PORTAL_ARTWORK.id) {
            setHoveredArtwork(null);
          }
          setGalleryHoverHint('');
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (!useGalleryStore.getState().isLocked) {
            return;
          }

          setSelectedArtwork(TABLEAU_9_PORTAL_ARTWORK);
        }}
      >
        {tableau9PortalEnabled ? (
          <MeshPortalMaterial blur={0} resolution={128} worldUnits={false}>
            <Tableau9PortalContent />
          </MeshPortalMaterial>
        ) : (
          <InfernoPreviewMaterial texture={previewTexture} flipX={surface.scale[0] < 0} />
        )}
      </mesh>
    </group>
  );
}

function SavedRoomPortalContent() {
  return (
    <>
      <color attach="background" args={['#7d746b']} />
      <ambientLight intensity={0.28} color="#ffffff" />
      <spotLight
        position={[0, 1.55, 1.15]}
        angle={0.52}
        penumbra={0.9}
        intensity={2.4}
        color="#fff4de"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-1.4, 0.8, 1.1]} intensity={0.25} color="#b8cae8" />

      <group position={[0, -0.04, -1.25]}>
        <mesh position={[0, -1.02, -0.58]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.1, 3.5]} />
          <meshStandardMaterial color="#655d56" roughness={0.97} />
        </mesh>

        <mesh position={[0, 1.02, -0.58]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.1, 3.5]} />
          <meshStandardMaterial color="#c9c1b8" roughness={0.98} />
        </mesh>

        <mesh
          position={[-1.42, -0.02, -0.58]}
          rotation={[0, Math.PI / 2 - THREE.MathUtils.degToRad(12), 0]}
          castShadow
          receiveShadow
        >
          <planeGeometry args={[3.2, 2.08]} />
          <meshStandardMaterial color="#9d948a" roughness={0.98} />
        </mesh>

        <mesh
          position={[1.42, -0.02, -0.58]}
          rotation={[0, -Math.PI / 2 + THREE.MathUtils.degToRad(12), 0]}
          castShadow
          receiveShadow
        >
          <planeGeometry args={[3.2, 2.08]} />
          <meshStandardMaterial color="#9d948a" roughness={0.98} />
        </mesh>

        <mesh position={[0, -0.02, -2.08]} castShadow receiveShadow>
          <planeGeometry args={[2.62, 2.1]} />
          <meshStandardMaterial color="#8a7f74" roughness={0.98} />
        </mesh>

        <mesh position={[0, 0.96, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[2.36, 0.18, 0.42]} />
          <meshStandardMaterial color="#b3aaa1" roughness={0.96} />
        </mesh>

        <mesh position={[0, -1.02, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 0.16, 0.42]} />
          <meshStandardMaterial color="#8f857c" roughness={0.94} />
        </mesh>

        <mesh position={[0, -1.01, -0.96]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.7, 1.5]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.18} />
        </mesh>
      </group>
    </>
  );
}

function GallerySavedRoomPortal({ surface }: { surface: ReplacementSurface }) {
  return (
    <group position={surface.position} rotation={surface.rotation} scale={surface.scale}>
      <mesh geometry={surface.geometry}>
        <MeshPortalMaterial blur={0} resolution={128} worldUnits={false}>
          <SavedRoomPortalContent />
        </MeshPortalMaterial>
      </mesh>
    </group>
  );
}

function TemporaryArtworkMarker({
  surface,
  label,
}: {
  surface: ReplacementSurface;
  label: number;
}) {
  const markerPosition = useMemo(() => {
    if (!surface.geometry.boundingBox) {
      surface.geometry.computeBoundingBox();
    }

    const boundingBox = surface.geometry.boundingBox;
    const center = boundingBox?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
    const scaledCenter = center.multiply(new THREE.Vector3(...surface.scale));
    const rotation = new THREE.Euler(...surface.rotation, 'XYZ');
    const worldCenter = scaledCenter.applyEuler(rotation).add(new THREE.Vector3(...surface.position));

    return worldCenter.toArray() as [number, number, number];
  }, [surface.geometry, surface.position, surface.rotation, surface.scale]);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    if (!context) {
      return new THREE.CanvasTexture(canvas);
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(15, 23, 42, 0.92)';
    context.beginPath();
    context.arc(128, 128, 102, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = 16;
    context.strokeStyle = '#f97316';
    context.stroke();

    context.fillStyle = '#fff7ed';
    context.font = '700 112px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`${label}`, 128, 136);

    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    return nextTexture;
  }, [label]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={markerPosition} scale={[0.4, 0.4, 0.4]}>
      <spriteMaterial map={texture} depthTest depthWrite={false} transparent />
    </sprite>
  );
}

function findObjectByRuntimeName(root: THREE.Object3D, expectedName: string) {
  const matches: THREE.Object3D[] = [];
  const normalizedExpectedName = normalizeSceneName(expectedName);

  root.traverse((object) => {
    if (normalizeSceneName(object.name) === normalizedExpectedName) {
      matches.push(object);
    }
  });

  return matches.find((object) => object instanceof THREE.Mesh) ?? matches[0] ?? null;
}

function getLargestDescendantMesh(root: THREE.Object3D) {
  let bestMesh: THREE.Mesh | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const geometry = object.geometry;
    if (!geometry) {
      return;
    }

    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }

    const boundingBox = geometry.boundingBox;
    if (!boundingBox) {
      return;
    }

    const size = boundingBox.getSize(new THREE.Vector3());
    const score = size.x * size.y * size.z;

    if (score > bestScore) {
      bestScore = score;
      bestMesh = object;
    }
  });

  return bestMesh;
}

function findSurfaceObjectByRuntimeName(root: THREE.Object3D, expectedName: string) {
  const anchor = findObjectByRuntimeName(root, expectedName);

  if (!anchor) {
    return null;
  }

  if (anchor instanceof THREE.Mesh) {
    return anchor;
  }

  return getLargestDescendantMesh(anchor);
}

function findSceneDebugNames(root: THREE.Object3D) {
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
    </group>
  );
}

useGLTF.preload(MAIN_GALLERY_MODEL_URL);
useGLTF.preload(INFERNO_MODEL_URL);
useGLTF.preload(HORNET_MODEL_URL);

export function MainGalleryScene() {
  const { gl } = useThree();
  const isEditorMode = useGalleryStore((state) => state.isEditorMode);
  const portalSurfaceTuning = useGalleryStore((state) => state.portalSurfaceTuning);
  const portalWorldTuning = useGalleryStore((state) => state.portalWorldTuning);
  const galleryFloorTuning = useGalleryStore((state) => state.galleryFloorTuning);
  const [floorDiffuse, floorNormal, floorRoughness] = useTexture([
    GALLERY_FLOOR_DIFFUSE_URL,
    GALLERY_FLOOR_NORMAL_URL,
    GALLERY_FLOOR_ROUGHNESS_URL,
  ]);
  const [collisionReady, setCollisionReady] = useState(false);
  const [collisionMeshes, setCollisionMeshes] = useState<THREE.Object3D[]>([]);
  const [infernoSurface, setInfernoSurface] = useState<ReplacementSurface | null>(null);
  const [tableau9Surface, setTableau9Surface] = useState<ReplacementSurface | null>(null);
  const [savedRoomSurfaces, setSavedRoomSurfaces] = useState<ReplacementSurface[]>([]);
  const [temporaryArtworkSurfaces, setTemporaryArtworkSurfaces] = useState<TemporaryArtworkSurface[]>([]);
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

    const hiddenObjects: string[] = [];

    modelRef.current.updateWorldMatrix(true, true);

    const targetObject = findSurfaceObjectByRuntimeName(modelRef.current, INFERNO_ANCHOR_NAME);
    const debugNames = findSceneDebugNames(modelRef.current);

    if (targetObject) {
      targetObject.updateWorldMatrix(true, false);
      const surface = buildReplacementSurface(targetObject, portalSurfaceTuning);
      setInfernoSurface(surface);
      console.log('[Main gallery] inferno surface:', surface);
    } else {
      setInfernoSurface(null);
      console.log('[Main gallery] inferno surface introuvable:', INFERNO_ANCHOR_NAME, 'runtime:', debugNames);
    }

    const tableau9Object = findSurfaceObjectByRuntimeName(modelRef.current, MAIN_GALLERY_TABLEAU_9_MODEL_ANCHOR);

    if (tableau9Object) {
      tableau9Object.updateWorldMatrix(true, false);
      const surface = buildReplacementSurface(tableau9Object, {
        scale: [1, 1, 1],
        offsetLocal: [0, 0, 0],
        rotationOffsetDeg: [0, 0, 0],
      });
      setTableau9Surface(surface);
      console.log('[Main gallery] tableau 9 surface:', surface);
    } else {
      setTableau9Surface(null);
      console.log('[Main gallery] tableau 9 surface introuvable:', MAIN_GALLERY_TABLEAU_9_MODEL_ANCHOR);
    }

    const nextSavedRoomSurfaces = MAIN_GALLERY_SAVED_TABLE_PLACEMENTS.map(({ anchorName }) => {
      const anchorObject = findSurfaceObjectByRuntimeName(modelRef.current!, anchorName);

      if (!anchorObject) {
        console.log('[Main gallery] emplacement memorise introuvable:', anchorName, 'runtime:', debugNames);
        return null;
      }

      anchorObject.updateWorldMatrix(true, false);
      return buildReplacementSurface(anchorObject, {
        scale: [1, 1, 1],
        offsetLocal: [0, 0, 0],
        rotationOffsetDeg: [0, 0, 0],
      });
    }).filter((surface): surface is ReplacementSurface => surface !== null);

    setSavedRoomSurfaces(nextSavedRoomSurfaces);

    const blockedAnchorNames = new Set([
      INFERNO_ANCHOR_NAME,
      MAIN_GALLERY_TABLEAU_9_MODEL_ANCHOR,
      ...MAIN_GALLERY_SAVED_TABLE_PLACEMENTS.map(({ anchorName }) => anchorName),
    ]);

    const nextTemporaryArtworkSurfaces = MAIN_GALLERY_TEMP_TABLEAU_ANCHORS
      .filter(({ anchorName, label }) => !blockedAnchorNames.has(anchorName) && !FLOATING_TABLEAU_MARKER_LABELS.has(label))
      .map(({ anchorName, label }) => {
        const anchorObject = findSurfaceObjectByRuntimeName(modelRef.current!, anchorName);

        if (!anchorObject) {
          console.log('[Main gallery] tableau temporaire introuvable:', anchorName, 'runtime:', debugNames);
          return null;
        }

        anchorObject.updateWorldMatrix(true, false);
        const surface = buildReplacementSurface(anchorObject, {
          scale: [1, 1, 1],
          offsetLocal: [0, 0, 0],
          rotationOffsetDeg: [0, 0, 0],
        });

        return surface ? { label, surface } : null;
      })
      .filter((entry): entry is TemporaryArtworkSurface => entry !== null);

    setTemporaryArtworkSurfaces(nextTemporaryArtworkSurfaces);

    modelRef.current.traverse((object) => {
      if (!shouldHideSceneObject(object)) {
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
    console.log('[Main gallery] ignored collision meshes:', ignored);
    console.log('[Main gallery] hidden objects:', hiddenObjects);
    console.log('[Main gallery] runtime names:', debugNames);
  }, [collisionReady, portalSurfaceTuning, portalWorldTuning]);

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
      {infernoSurface && <GalleryInfernoPortal surface={infernoSurface} />}
      {tableau9Surface && <GalleryTableau9Portal surface={tableau9Surface} />}
      {savedRoomSurfaces.map((surface, index) => (
        <GallerySavedRoomPortal key={`saved-room-${index}`} surface={surface} />
      ))}
      {temporaryArtworkSurfaces.map(({ label, surface }) => (
        <TemporaryArtworkMarker key={`temporary-artwork-${label}`} surface={surface} label={label} />
      ))}
    </>
  );
}
