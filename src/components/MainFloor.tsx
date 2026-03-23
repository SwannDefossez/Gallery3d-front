import { MeshReflectorMaterial, useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

const PLATFORM_WIDTH = 12;
const PLATFORM_LENGTH = 50;
const PLATFORM_CENTER_Z = 15;
const PLATFORM_DEPTH = 4.5;
const VOID_DEPTH = 260;
const RIM_THICKNESS = 0.45;
const BRANCH_LENGTH = 11;
const BRANCH_THICKNESS = 2.2;
const BRANCH_WIDTH = 3;
const BRANCH_FLOOR_Y = 0.001;
const END_PAD_LENGTH = 4.5;
const END_PAD_WIDTH = 6;
const BRANCH_DROP_DEPTH = 170;
const BRANCH_Z_OFFSETS = [-18, -6, 6, 18];

function createVerticalGradientPlane(width: number, height: number, topHex: string, bottomHex: string) {
  const geometry = new THREE.PlaneGeometry(width, height, 1, 64);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const topColor = new THREE.Color(topHex);
  const bottomColor = new THREE.Color(bottomHex);
  const mixed = new THREE.Color();

  for (let i = 0; i < positions.count; i += 1) {
    const y = positions.getY(i);
    const t = THREE.MathUtils.clamp((y + height / 2) / height, 0, 1);
    const eased = Math.pow(t, 1.6);
    mixed.copy(bottomColor).lerp(topColor, eased);
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function cloneTextureWithRepeat(
  texture: THREE.Texture,
  repeatU: number,
  repeatV: number,
  colorSpace?: THREE.ColorSpace,
) {
  const cloned = texture.clone();
  cloned.wrapS = THREE.RepeatWrapping;
  cloned.wrapT = THREE.RepeatWrapping;
  cloned.repeat.set(repeatU, repeatV);
  if (colorSpace) {
    cloned.colorSpace = colorSpace;
  }
  cloned.needsUpdate = true;
  return cloned;
}

export function MainFloor() {
  const { map, roughnessMap, normalMap } = useTexture({
    map: '/assets/textures/marble_01/marble_01_diff_4k.jpg',
    roughnessMap: '/assets/textures/marble_01/marble_01_rough_4k.jpg',
    normalMap: '/assets/textures/marble_01/marble_01_nor_gl_4k.jpg',
  });
  const sideNorthSouth = useMemo(
    () => createVerticalGradientPlane(PLATFORM_WIDTH + RIM_THICKNESS * 2, VOID_DEPTH, '#1b1b1b', '#010101'),
    [],
  );
  const sideEastWest = useMemo(
    () => createVerticalGradientPlane(PLATFORM_LENGTH + RIM_THICKNESS * 2, VOID_DEPTH, '#171717', '#010101'),
    [],
  );
  const branchCurtain = useMemo(
    () => createVerticalGradientPlane(BRANCH_WIDTH, BRANCH_DROP_DEPTH, '#151515', '#010101'),
    [],
  );

  const repeatX = 3;
  const repeatY = 11;
  [map, roughnessMap, normalMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
  });
  map.colorSpace = THREE.SRGBColorSpace;

  const branchRepeatU = repeatX * (BRANCH_LENGTH / PLATFORM_WIDTH);
  const branchRepeatV = repeatY * (BRANCH_WIDTH / PLATFORM_LENGTH);
  const endPadRepeatU = repeatX * (END_PAD_LENGTH / PLATFORM_WIDTH);
  const endPadRepeatV = repeatY * (END_PAD_WIDTH / PLATFORM_LENGTH);

  const branchMaps = useMemo(
    () => ({
      map: cloneTextureWithRepeat(map, branchRepeatU, branchRepeatV, THREE.SRGBColorSpace),
      roughnessMap: cloneTextureWithRepeat(roughnessMap, branchRepeatU, branchRepeatV),
      normalMap: cloneTextureWithRepeat(normalMap, branchRepeatU, branchRepeatV),
    }),
    [map, roughnessMap, normalMap, branchRepeatU, branchRepeatV],
  );
  const endPadMaps = useMemo(
    () => ({
      map: cloneTextureWithRepeat(map, endPadRepeatU, endPadRepeatV, THREE.SRGBColorSpace),
      roughnessMap: cloneTextureWithRepeat(roughnessMap, endPadRepeatU, endPadRepeatV),
      normalMap: cloneTextureWithRepeat(normalMap, endPadRepeatU, endPadRepeatV),
    }),
    [map, roughnessMap, normalMap, endPadRepeatU, endPadRepeatV],
  );

  const halfWidth = PLATFORM_WIDTH / 2;
  const halfLength = PLATFORM_LENGTH / 2;
  const solidCenterY = -PLATFORM_DEPTH / 2;
  const deepSideY = -(PLATFORM_DEPTH + VOID_DEPTH / 2);
  const branchCenterY = -(PLATFORM_DEPTH * 0.58);
  const branchDropY = -(PLATFORM_DEPTH + BRANCH_DROP_DEPTH / 2);
  const rightBranchCenterX = halfWidth + BRANCH_LENGTH / 2 - RIM_THICKNESS / 2;
  const leftBranchCenterX = -halfWidth - BRANCH_LENGTH / 2 + RIM_THICKNESS / 2;
  const rightBranchEndX = rightBranchCenterX + BRANCH_LENGTH / 2;
  const leftBranchEndX = leftBranchCenterX - BRANCH_LENGTH / 2;
  const rightPadCenterX = rightBranchEndX + END_PAD_LENGTH / 2;
  const leftPadCenterX = leftBranchEndX - END_PAD_LENGTH / 2;

  return (
    <group>
      {/* Top walkable platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, PLATFORM_CENTER_Z]} receiveShadow>
        <planeGeometry args={[PLATFORM_WIDTH, PLATFORM_LENGTH]} />
        <MeshReflectorMaterial
          map={map}
          roughnessMap={roughnessMap}
          normalMap={normalMap}
          color="#ffffff"
          roughness={0.78}
          metalness={0.03}
          resolution={256}
          blur={[64, 16]}
          mirror={0.1}
          mixBlur={0.2}
          mixStrength={0.55}
          depthScale={0.08}
          minDepthThreshold={0.85}
          maxDepthThreshold={1}
          reflectorOffset={0.01}
        />
      </mesh>

      {/* Platform body thickness */}
      <mesh position={[0, solidCenterY, PLATFORM_CENTER_Z - halfLength - RIM_THICKNESS / 2]} receiveShadow>
        <boxGeometry args={[PLATFORM_WIDTH + RIM_THICKNESS * 2, PLATFORM_DEPTH, RIM_THICKNESS]} />
        <meshStandardMaterial color="#181818" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[0, solidCenterY, PLATFORM_CENTER_Z + halfLength + RIM_THICKNESS / 2]} receiveShadow>
        <boxGeometry args={[PLATFORM_WIDTH + RIM_THICKNESS * 2, PLATFORM_DEPTH, RIM_THICKNESS]} />
        <meshStandardMaterial color="#181818" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[-halfWidth - RIM_THICKNESS / 2, solidCenterY, PLATFORM_CENTER_Z]} receiveShadow>
        <boxGeometry args={[RIM_THICKNESS, PLATFORM_DEPTH, PLATFORM_LENGTH + RIM_THICKNESS * 2]} />
        <meshStandardMaterial color="#181818" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[halfWidth + RIM_THICKNESS / 2, solidCenterY, PLATFORM_CENTER_Z]} receiveShadow>
        <boxGeometry args={[RIM_THICKNESS, PLATFORM_DEPTH, PLATFORM_LENGTH + RIM_THICKNESS * 2]} />
        <meshStandardMaterial color="#181818" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[0, -PLATFORM_DEPTH, PLATFORM_CENTER_Z]} receiveShadow>
        <boxGeometry args={[PLATFORM_WIDTH, 0.35, PLATFORM_LENGTH]} />
        <meshStandardMaterial color="#101010" roughness={1} metalness={0} />
      </mesh>

      {/* Horizontal structural branches */}
      {BRANCH_Z_OFFSETS.map((offset) => (
        <group key={`branches-${offset}`}>
          {/* Walkable marble floor on each branch */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[rightBranchCenterX, BRANCH_FLOOR_Y, PLATFORM_CENTER_Z + offset]}
            receiveShadow
          >
            <planeGeometry args={[BRANCH_LENGTH, BRANCH_WIDTH]} />
            <MeshReflectorMaterial
              map={branchMaps.map}
              roughnessMap={branchMaps.roughnessMap}
              normalMap={branchMaps.normalMap}
              color="#ffffff"
              roughness={0.78}
              metalness={0.03}
              resolution={256}
              blur={[64, 16]}
              mirror={0.1}
              mixBlur={0.2}
              mixStrength={0.55}
              depthScale={0.08}
              minDepthThreshold={0.85}
              maxDepthThreshold={1}
              reflectorOffset={0.01}
            />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[leftBranchCenterX, BRANCH_FLOOR_Y, PLATFORM_CENTER_Z + offset]}
            receiveShadow
          >
            <planeGeometry args={[BRANCH_LENGTH, BRANCH_WIDTH]} />
            <MeshReflectorMaterial
              map={branchMaps.map}
              roughnessMap={branchMaps.roughnessMap}
              normalMap={branchMaps.normalMap}
              color="#ffffff"
              roughness={0.78}
              metalness={0.03}
              resolution={256}
              blur={[64, 16]}
              mirror={0.1}
              mixBlur={0.2}
              mixStrength={0.55}
              depthScale={0.08}
              minDepthThreshold={0.85}
              maxDepthThreshold={1}
              reflectorOffset={0.01}
            />
          </mesh>

          {/* End platforms for artwork placement */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[rightPadCenterX, BRANCH_FLOOR_Y, PLATFORM_CENTER_Z + offset]}
            receiveShadow
          >
            <planeGeometry args={[END_PAD_LENGTH, END_PAD_WIDTH]} />
            <MeshReflectorMaterial
              map={endPadMaps.map}
              roughnessMap={endPadMaps.roughnessMap}
              normalMap={endPadMaps.normalMap}
              color="#ffffff"
              roughness={0.78}
              metalness={0.03}
              resolution={256}
              blur={[64, 16]}
              mirror={0.1}
              mixBlur={0.2}
              mixStrength={0.55}
              depthScale={0.08}
              minDepthThreshold={0.85}
              maxDepthThreshold={1}
              reflectorOffset={0.01}
            />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[leftPadCenterX, BRANCH_FLOOR_Y, PLATFORM_CENTER_Z + offset]}
            receiveShadow
          >
            <planeGeometry args={[END_PAD_LENGTH, END_PAD_WIDTH]} />
            <MeshReflectorMaterial
              map={endPadMaps.map}
              roughnessMap={endPadMaps.roughnessMap}
              normalMap={endPadMaps.normalMap}
              color="#ffffff"
              roughness={0.78}
              metalness={0.03}
              resolution={256}
              blur={[64, 16]}
              mirror={0.1}
              mixBlur={0.2}
              mixStrength={0.55}
              depthScale={0.08}
              minDepthThreshold={0.85}
              maxDepthThreshold={1}
              reflectorOffset={0.01}
            />
          </mesh>

          <mesh
            position={[rightBranchCenterX, branchCenterY, PLATFORM_CENTER_Z + offset]}
            receiveShadow
          >
            <boxGeometry args={[BRANCH_LENGTH, BRANCH_THICKNESS, BRANCH_WIDTH]} />
            <meshStandardMaterial color="#171717" roughness={0.92} metalness={0.03} />
          </mesh>
          <mesh
            position={[leftBranchCenterX, branchCenterY, PLATFORM_CENTER_Z + offset]}
            receiveShadow
          >
            <boxGeometry args={[BRANCH_LENGTH, BRANCH_THICKNESS, BRANCH_WIDTH]} />
            <meshStandardMaterial color="#171717" roughness={0.92} metalness={0.03} />
          </mesh>

          <mesh
            geometry={branchCurtain}
            position={[halfWidth + BRANCH_LENGTH - RIM_THICKNESS / 2, branchDropY, PLATFORM_CENTER_Z + offset]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh
            geometry={branchCurtain}
            position={[-halfWidth - BRANCH_LENGTH + RIM_THICKNESS / 2, branchDropY, PLATFORM_CENTER_Z + offset]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Deep sides fading into the void */}
      <mesh
        geometry={sideNorthSouth}
        position={[0, deepSideY, PLATFORM_CENTER_Z - halfLength - RIM_THICKNESS]}
      >
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={sideNorthSouth}
        position={[0, deepSideY, PLATFORM_CENTER_Z + halfLength + RIM_THICKNESS]}
      >
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={sideEastWest}
        position={[-halfWidth - RIM_THICKNESS, deepSideY, PLATFORM_CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={sideEastWest}
        position={[halfWidth + RIM_THICKNESS, deepSideY, PLATFORM_CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
