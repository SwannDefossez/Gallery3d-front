import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from '@react-three/drei';
import { useGalleryStore } from '../store';

const SPEED = 5;
const EYE_LEVEL = 1.6;
const SOFT_ZONE = 1.15;
const GRAVITY = 18;
const JUMP_VELOCITY = 7.2;
const BRANCH_Z_CENTERS = [-3, 9, 21, 33];

type WalkRect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

// Main platform + exact walkable surfaces on each side extension (branch deck + end pad).
const WALKABLE_RECTS: WalkRect[] = [
  { minX: -5.8, maxX: 5.8, minZ: -9.8, maxZ: 39.8 },
  ...BRANCH_Z_CENTERS.flatMap((zCenter) => [
    // Left branch deck (narrow)
    { minX: -15.7, maxX: -4.8, minZ: zCenter - 1.45, maxZ: zCenter + 1.45 },
    // Left end pad (wider)
    { minX: -20.2, maxX: -15.6, minZ: zCenter - 2.95, maxZ: zCenter + 2.95 },
    // Right branch deck (narrow)
    { minX: 4.8, maxX: 15.7, minZ: zCenter - 1.45, maxZ: zCenter + 1.45 },
    // Right end pad (wider)
    { minX: 15.6, maxX: 20.2, minZ: zCenter - 2.95, maxZ: zCenter + 2.95 },
  ]),
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep01(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function applySoftBoundaryAxis(current: number, delta: number, min: number, max: number, softZone: number) {
  if (delta === 0) return clamp(current, min, max);

  let scale = 1;
  if (delta < 0) {
    // Moving toward min boundary: progressively slow down near the edge.
    const distanceToMin = current - min;
    if (distanceToMin <= 0) return min;
    if (distanceToMin < softZone) {
      scale = smoothstep01(distanceToMin / softZone);
    }
  } else {
    // Moving toward max boundary: progressively slow down near the edge.
    const distanceToMax = max - current;
    if (distanceToMax <= 0) return max;
    if (distanceToMax < softZone) {
      scale = smoothstep01(distanceToMax / softZone);
    }
  }

  return clamp(current + delta * scale, min, max);
}

function pointInRect(x: number, z: number, rect: WalkRect) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

function pointInAnyRect(x: number, z: number) {
  return WALKABLE_RECTS.some((rect) => pointInRect(x, z, rect));
}

function getRectsContainingPoint(x: number, z: number) {
  return WALKABLE_RECTS.filter((rect) => pointInRect(x, z, rect));
}

function resolveWalkablePosition(currentX: number, currentZ: number, deltaX: number, deltaZ: number) {
  const rawNextX = currentX + deltaX;
  const rawNextZ = currentZ + deltaZ;

  if (pointInAnyRect(rawNextX, rawNextZ)) {
    return { x: rawNextX, z: rawNextZ };
  }

  const originRects = getRectsContainingPoint(currentX, currentZ);
  const candidateRects = originRects.length > 0 ? originRects : WALKABLE_RECTS;

  let bestX = currentX;
  let bestZ = currentZ;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const rect of candidateRects) {
    const x = applySoftBoundaryAxis(currentX, deltaX, rect.minX, rect.maxX, SOFT_ZONE);
    const z = applySoftBoundaryAxis(currentZ, deltaZ, rect.minZ, rect.maxZ, SOFT_ZONE);
    const dx = rawNextX - x;
    const dz = rawNextZ - z;
    const distSq = dx * dx + dz * dz;

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestX = x;
      bestZ = z;
    }
  }

  return { x: bestX, z: bestZ };
}

export function Player() {
  const { camera } = useThree();
  const setLocked = useGalleryStore((state) => state.setLocked);
  const isCartOpen = useGalleryStore((state) => state.isCartOpen);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);

  const keys = useRef<{ [key: string]: boolean }>({});
  const direction = useRef(new THREE.Vector3());
  const moveWorld = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
      }

      if (!keys.current[e.code] && e.code === 'Space' && isGrounded.current && useGalleryStore.getState().isLocked) {
        verticalVelocity.current = JUMP_VELOCITY;
        isGrounded.current = false;
      }

      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const syncPointerLockState = () => {
      const lockedNow = document.pointerLockElement !== null;
      setLocked(lockedNow);

      if (!lockedNow) {
        // Prevent stale movement / jump inputs after unlocking.
        keys.current = {};
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        document.exitPointerLock?.();
        setLocked(false);
      }
    };

    document.addEventListener('pointerlockchange', syncPointerLockState);
    window.addEventListener('keydown', handleEscape);
    syncPointerLockState();

    return () => {
      document.removeEventListener('pointerlockchange', syncPointerLockState);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [setLocked]);

  useEffect(() => {
    if (isCartOpen || selectedArtwork) {
      document.exitPointerLock?.();
      setLocked(false);
      keys.current = {};
    }
  }, [isCartOpen, selectedArtwork, setLocked]);

  useFrame((state, delta) => {
    const isLockedNow = useGalleryStore.getState().isLocked;

    if (isLockedNow) {
      // Force raycaster to center of screen while locked
      state.raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);

      const moveZ =
        Number(keys.current['KeyS'] || keys.current['ArrowDown'] || false) -
        Number(keys.current['KeyZ'] || keys.current['KeyW'] || keys.current['ArrowUp'] || false);
      const moveX =
        Number(keys.current['KeyD'] || keys.current['ArrowRight'] || false) -
        Number(keys.current['KeyQ'] || keys.current['KeyA'] || keys.current['ArrowLeft'] || false);

      direction.current.set(moveX, 0, moveZ);
    
      if (direction.current.lengthSq() > 0) {
        direction.current.normalize();

        camera.getWorldDirection(forward.current);
        forward.current.y = 0;
        if (forward.current.lengthSq() < 0.0001) {
          forward.current.set(0, 0, -1);
        } else {
          forward.current.normalize();
        }

        right.current.crossVectors(forward.current, up.current).normalize();
        moveWorld.current
          .copy(right.current)
          .multiplyScalar(direction.current.x)
          .addScaledVector(forward.current, -direction.current.z);

        if (moveWorld.current.lengthSq() > 0) {
          moveWorld.current.normalize().multiplyScalar(SPEED * delta);
          const resolved = resolveWalkablePosition(
            camera.position.x,
            camera.position.z,
            moveWorld.current.x,
            moveWorld.current.z,
          );
          camera.position.x = resolved.x;
          camera.position.z = resolved.z;
        }
      }
    }

    verticalVelocity.current -= GRAVITY * delta;
    camera.position.y += verticalVelocity.current * delta;

    if (camera.position.y <= EYE_LEVEL) {
      camera.position.y = EYE_LEVEL;
      verticalVelocity.current = 0;
      isGrounded.current = true;
    }
  });

  return (
    <PointerLockControls
      onLock={() => setLocked(true)}
      onUnlock={() => setLocked(false)}
      makeDefault
      selector="#resume-overlay"
      enabled={!isCartOpen && !selectedArtwork}
    />
  );
}
