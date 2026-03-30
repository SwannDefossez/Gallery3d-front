import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const PLATFORM_WIDTH = 12;
const PLATFORM_LENGTH = 50;
const PLATFORM_CENTER_Z = 15;
const PLATFORM_DEPTH = 4.5;
const VOID_DEPTH = 260;
const RIM_THICKNESS = 0.45;
const BRANCH_LENGTH = 11;
const BRANCH_WIDTH = 3;
const BRANCH_FLOOR_Y = 0.001;
const END_PAD_LENGTH = 4.5;
const END_PAD_WIDTH = 6;
const BRANCH_Z_OFFSETS = [-18, -6, 6, 18];
const EXTENSION_BODY_DEPTH = 2.2;
const END_PAD_BODY_DEPTH = 0.7;
const REFLECTOR_PROPS = {
  color: "#ffffff",
  roughness: 0.78,
  metalness: 0.03,
  resolution: 256,
  blur: [64, 16] as [number, number],
  mirror: 0.1,
  mixBlur: 0.2,
  mixStrength: 0.55,
  depthScale: 0.08,
  minDepthThreshold: 0.85,
  maxDepthThreshold: 1,
  reflectorOffset: 0.01,
};

function createVerticalGradientPlane(
  width: number,
  height: number,
  topHex: string,
  bottomHex: string,
) {
  const geometry = new THREE.PlaneGeometry(width, height, 1, 64);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const topColor = new THREE.Color(topHex);
  const bottomColor = new THREE.Color(bottomHex);
  const mixed = new THREE.Color();

  for (let index = 0; index < positions.count; index += 1) {
    const y = positions.getY(index);
    const progress = THREE.MathUtils.clamp((y + height / 2) / height, 0, 1);
    const easedProgress = Math.pow(progress, 1.6);

    mixed.copy(bottomColor).lerp(topColor, easedProgress);
    colors[index * 3] = mixed.r;
    colors[index * 3 + 1] = mixed.g;
    colors[index * 3 + 2] = mixed.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function cloneTextureWithRepeat(
  texture: THREE.Texture,
  repeatU: number,
  repeatV: number,
  colorSpace?: THREE.ColorSpace,
) {
  const clone = texture.clone();
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.repeat.set(repeatU, repeatV);

  if (colorSpace) {
    clone.colorSpace = colorSpace;
  }

  clone.needsUpdate = true;
  return clone;
}

type TextureSet = {
  map: THREE.Texture;
  roughnessMap: THREE.Texture;
  normalMap: THREE.Texture;
};

type ReflectiveSurfaceProps = {
  size: [number, number];
  position: [number, number, number];
  maps: TextureSet;
};

type SolidBlockProps = {
  size: [number, number, number];
  position: [number, number, number];
  color?: string;
  roughness?: number;
  metalness?: number;
};

type GradientWallProps = {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
};

type AbyssCloudPlaneProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
  speed: number;
  density: number;
  opacity: number;
  colorA: string;
  colorB: string;
};

function ReflectiveSurface({ size, position, maps }: ReflectiveSurfaceProps) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <MeshReflectorMaterial {...maps} {...REFLECTOR_PROPS} />
    </mesh>
  );
}

function SolidBlock({
  size,
  position,
  color = "#050505",
  roughness = 0.95,
  metalness = 0.02,
}: SolidBlockProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function GradientWall({
  geometry,
  position,
  rotation = [0, 0, 0],
}: GradientWallProps) {
  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <meshBasicMaterial
        vertexColors
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function AbyssCloudPlane({
  position,
  rotation = [-Math.PI / 2, 0, 0],
  size,
  speed,
  density,
  opacity,
  colorA,
  colorB,
}: AbyssCloudPlaneProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDensity: { value: density },
      uOpacity: { value: opacity },
      uSpeed: { value: speed },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    }),
    [colorA, colorB, density, opacity, speed],
  );

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.NormalBlending}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;

          uniform float uTime;
          uniform float uDensity;
          uniform float uOpacity;
          uniform float uSpeed;
          uniform vec3 uColorA;
          uniform vec3 uColorB;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(
              mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
              u.y
            );
          }

          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;

            for (int i = 0; i < 6; i++) {
              value += amplitude * noise(p);
              p *= 2.02;
              amplitude *= 0.5;
            }

            return value;
          }

          void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            vec2 drift = vec2(uTime * uSpeed, uTime * uSpeed * 0.35);
            vec2 warpUv = uv * vec2(2.8, 1.9);

            float shape = fbm(warpUv + drift);
            float detail = fbm(warpUv * 1.8 - drift * 1.35);
            float cloud = smoothstep(uDensity - 0.12, uDensity + 0.18, shape * 0.75 + detail * 0.45);

            float edgeFadeX = smoothstep(0.0, 0.18, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x));
            float edgeFadeY = smoothstep(0.02, 0.22, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y));
            float edgeFade = edgeFadeX * edgeFadeY;
            float centerFade = 1.0 - smoothstep(0.2, 1.18, length(vec2(uv.x * 0.82, uv.y * 1.1)));
            float depthFade = smoothstep(-1.0, 0.3, uv.y);
            float alpha = cloud * centerFade * edgeFade * depthFade * uOpacity;

            vec3 color = mix(uColorA, uColorB, clamp(shape * 0.9 + detail * 0.35, 0.0, 1.0));

            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

export function MainFloor() {
  const { map, roughnessMap, normalMap } = useTexture({
    map: "/assets/textures/marble_01/marble_01_diff_4k.jpg",
    roughnessMap: "/assets/textures/marble_01/marble_01_rough_4k.jpg",
    normalMap: "/assets/textures/marble_01/marble_01_nor_gl_4k.jpg",
  });
  const sideNorthSouth = useMemo(
    () =>
      createVerticalGradientPlane(
        PLATFORM_WIDTH + RIM_THICKNESS * 2,
        VOID_DEPTH,
        "#090909",
        "#010101",
      ),
    [],
  );
  const sideEastWest = useMemo(
    () =>
      createVerticalGradientPlane(
        PLATFORM_LENGTH + RIM_THICKNESS * 2,
        VOID_DEPTH,
        "#080808",
        "#010101",
      ),
    [],
  );
  const repeatX = 3;
  const repeatY = 11;
  [map, roughnessMap, normalMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.needsUpdate = true;
  });
  map.colorSpace = THREE.SRGBColorSpace;

  const branchRepeatU = repeatX * (BRANCH_LENGTH / PLATFORM_WIDTH);
  const branchRepeatV = repeatY * (BRANCH_WIDTH / PLATFORM_LENGTH);
  const endPadRepeatU = repeatX * (END_PAD_LENGTH / PLATFORM_WIDTH);
  const endPadRepeatV = repeatY * (END_PAD_WIDTH / PLATFORM_LENGTH);

  const branchMaps = useMemo(
    () => ({
      map: cloneTextureWithRepeat(
        map,
        branchRepeatU,
        branchRepeatV,
        THREE.SRGBColorSpace,
      ),
      roughnessMap: cloneTextureWithRepeat(
        roughnessMap,
        branchRepeatU,
        branchRepeatV,
      ),
      normalMap: cloneTextureWithRepeat(
        normalMap,
        branchRepeatU,
        branchRepeatV,
      ),
    }),
    [map, roughnessMap, normalMap, branchRepeatU, branchRepeatV],
  );
  const endPadMaps = useMemo(
    () => ({
      map: cloneTextureWithRepeat(
        map,
        endPadRepeatU,
        endPadRepeatV,
        THREE.SRGBColorSpace,
      ),
      roughnessMap: cloneTextureWithRepeat(
        roughnessMap,
        endPadRepeatU,
        endPadRepeatV,
      ),
      normalMap: cloneTextureWithRepeat(
        normalMap,
        endPadRepeatU,
        endPadRepeatV,
      ),
    }),
    [map, roughnessMap, normalMap, endPadRepeatU, endPadRepeatV],
  );

  const halfWidth = PLATFORM_WIDTH / 2;
  const halfLength = PLATFORM_LENGTH / 2;
  const solidCenterY = -PLATFORM_DEPTH / 2;
  const deepSideY = -(PLATFORM_DEPTH + VOID_DEPTH / 2);
  const extensionBodyCenterY = -EXTENSION_BODY_DEPTH / 2;
  const endPadBodyCenterY = -END_PAD_BODY_DEPTH / 2;
  const rightBranchCenterX = halfWidth + BRANCH_LENGTH / 2 - RIM_THICKNESS / 2;
  const leftBranchCenterX = -halfWidth - BRANCH_LENGTH / 2 + RIM_THICKNESS / 2;
  const rightBranchEndX = rightBranchCenterX + BRANCH_LENGTH / 2;
  const leftBranchEndX = leftBranchCenterX - BRANCH_LENGTH / 2;
  const rightPadCenterX = rightBranchEndX + END_PAD_LENGTH / 2;
  const leftPadCenterX = leftBranchEndX - END_PAD_LENGTH / 2;

  const platformBlocks: SolidBlockProps[] = [
    {
      position: [
        0,
        solidCenterY,
        PLATFORM_CENTER_Z - halfLength - RIM_THICKNESS / 2,
      ],
      size: [PLATFORM_WIDTH + RIM_THICKNESS * 2, PLATFORM_DEPTH, RIM_THICKNESS],
    },
    {
      position: [
        0,
        solidCenterY,
        PLATFORM_CENTER_Z + halfLength + RIM_THICKNESS / 2,
      ],
      size: [PLATFORM_WIDTH + RIM_THICKNESS * 2, PLATFORM_DEPTH, RIM_THICKNESS],
    },
    {
      position: [
        -halfWidth - RIM_THICKNESS / 2,
        solidCenterY,
        PLATFORM_CENTER_Z,
      ],
      size: [
        RIM_THICKNESS,
        PLATFORM_DEPTH,
        PLATFORM_LENGTH + RIM_THICKNESS * 2,
      ],
    },
    {
      position: [
        halfWidth + RIM_THICKNESS / 2,
        solidCenterY,
        PLATFORM_CENTER_Z,
      ],
      size: [
        RIM_THICKNESS,
        PLATFORM_DEPTH,
        PLATFORM_LENGTH + RIM_THICKNESS * 2,
      ],
    },
    {
      position: [0, -PLATFORM_DEPTH, PLATFORM_CENTER_Z],
      size: [PLATFORM_WIDTH, 0.35, PLATFORM_LENGTH],
      color: "#101010",
      roughness: 1,
      metalness: 0,
    },
  ];

  const sideWalls: GradientWallProps[] = [
    {
      geometry: sideNorthSouth,
      position: [0, deepSideY, PLATFORM_CENTER_Z - halfLength - RIM_THICKNESS],
    },
    {
      geometry: sideNorthSouth,
      position: [0, deepSideY, PLATFORM_CENTER_Z + halfLength + RIM_THICKNESS],
    },
    {
      geometry: sideEastWest,
      position: [-halfWidth - RIM_THICKNESS, deepSideY, PLATFORM_CENTER_Z],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      geometry: sideEastWest,
      position: [halfWidth + RIM_THICKNESS, deepSideY, PLATFORM_CENTER_Z],
      rotation: [0, Math.PI / 2, 0],
    },
  ];

  return (
    <group>
      <AbyssCloudPlane
        position={[0, -28, PLATFORM_CENTER_Z]}
        size={[260, 260]}
        speed={0.1}
        density={0.08}
        opacity={0.08}
        colorA="#7a7a7a"
        colorB="#ffffff"
      />
      <AbyssCloudPlane
        position={[0, -52, PLATFORM_CENTER_Z + 10]}
        rotation={[-Math.PI / 2.3, 0.06, 0]}
        size={[340, 300]}
        speed={0.1}
        density={0.08}
        opacity={0.08}
        colorA="#3a3a3a"
        colorB="#f2f2f2"
      />
      <AbyssCloudPlane
        position={[0, -52, PLATFORM_CENTER_Z - 10]}
        rotation={[-Math.PI / 2.3, 0.06, 0]}
        size={[340, 300]}
        speed={0.1}
        density={0.08}
        opacity={1}
        colorA="#371c69"
        colorB="#371c69"
      />

      <ReflectiveSurface
        size={[PLATFORM_WIDTH, PLATFORM_LENGTH]}
        position={[0, 0, PLATFORM_CENTER_Z]}
        maps={{ map, roughnessMap, normalMap }}
      />

      {platformBlocks.map((block, index) => (
        <SolidBlock key={index} {...block} />
      ))}

      {BRANCH_Z_OFFSETS.map((offset) => (
        <group key={`branches-${offset}`}>
          <ReflectiveSurface
            size={[BRANCH_LENGTH, BRANCH_WIDTH]}
            position={[
              rightBranchCenterX,
              BRANCH_FLOOR_Y,
              PLATFORM_CENTER_Z + offset,
            ]}
            maps={branchMaps}
          />
          <ReflectiveSurface
            size={[BRANCH_LENGTH, BRANCH_WIDTH]}
            position={[
              leftBranchCenterX,
              BRANCH_FLOOR_Y,
              PLATFORM_CENTER_Z + offset,
            ]}
            maps={branchMaps}
          />
          <ReflectiveSurface
            size={[END_PAD_LENGTH, END_PAD_WIDTH]}
            position={[
              rightPadCenterX,
              BRANCH_FLOOR_Y,
              PLATFORM_CENTER_Z + offset,
            ]}
            maps={endPadMaps}
          />
          <ReflectiveSurface
            size={[END_PAD_LENGTH, END_PAD_WIDTH]}
            position={[
              leftPadCenterX,
              BRANCH_FLOOR_Y,
              PLATFORM_CENTER_Z + offset,
            ]}
            maps={endPadMaps}
          />
          <SolidBlock
            position={[
              rightBranchCenterX,
              extensionBodyCenterY,
              PLATFORM_CENTER_Z + offset,
            ]}
            size={[BRANCH_LENGTH, EXTENSION_BODY_DEPTH, BRANCH_WIDTH]}
            color="#050505"
            roughness={0.92}
            metalness={0.03}
          />
          <SolidBlock
            position={[
              leftBranchCenterX,
              extensionBodyCenterY,
              PLATFORM_CENTER_Z + offset,
            ]}
            size={[BRANCH_LENGTH, EXTENSION_BODY_DEPTH, BRANCH_WIDTH]}
            color="#050505"
            roughness={0.92}
            metalness={0.03}
          />
          <SolidBlock
            position={[rightPadCenterX, endPadBodyCenterY, PLATFORM_CENTER_Z + offset]}
            size={[END_PAD_LENGTH, END_PAD_BODY_DEPTH, END_PAD_WIDTH]}
            color="#050505"
            roughness={0.92}
            metalness={0.03}
          />
          <SolidBlock
            position={[leftPadCenterX, endPadBodyCenterY, PLATFORM_CENTER_Z + offset]}
            size={[END_PAD_LENGTH, END_PAD_BODY_DEPTH, END_PAD_WIDTH]}
            color="#050505"
            roughness={0.92}
            metalness={0.03}
          />
        </group>
      ))}

      {sideWalls.map((wall, index) => (
        <GradientWall key={index} {...wall} />
      ))}
    </group>
  );
}
