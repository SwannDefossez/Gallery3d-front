import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGalleryStore } from '../store';

const SPEED = 5;
const EYE_LEVEL = 1.6;
const SOFT_ZONE = 1.15;
const GRAVITY = 18;
const JUMP_VELOCITY = 7.2;
const BRANCH_Z_CENTERS = [-3, 9, 21, 33];
const SPAWN_POSITION: [number, number, number] = [0, EYE_LEVEL, 4];
const SPAWN_LOOK_AT: [number, number, number] = [0, EYE_LEVEL, 14];

type WalkRect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type CollisionRect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

function createBranchWalkRects(zCenter: number): WalkRect[] {
  return [
    { minX: -15.7, maxX: -4.8, minZ: zCenter - 1.45, maxZ: zCenter + 1.45 },
    { minX: -20.2, maxX: -15.6, minZ: zCenter - 2.95, maxZ: zCenter + 2.95 },
    { minX: 4.8, maxX: 15.7, minZ: zCenter - 1.45, maxZ: zCenter + 1.45 },
    { minX: 15.6, maxX: 20.2, minZ: zCenter - 2.95, maxZ: zCenter + 2.95 },
  ];
}

const WALKABLE_RECTS: WalkRect[] = [
  { minX: -5.8, maxX: 5.8, minZ: -9.8, maxZ: 39.8 },
  ...BRANCH_Z_CENTERS.flatMap(createBranchWalkRects),
];
const ARTWORK_COLLISION_RECTS: CollisionRect[] = BRANCH_Z_CENTERS.flatMap((zCenter) => [
  {
    minX: 19.45,
    maxX: 20.35,
    minZ: zCenter - 2.18,
    maxZ: zCenter + 2.18,
  },
  {
    minX: -20.35,
    maxX: -19.45,
    minZ: zCenter - 2.18,
    maxZ: zCenter + 2.18,
  },
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep01(value: number) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function applySoftBoundaryAxis(current: number, delta: number, min: number, max: number, softZone: number) {
  if (delta === 0) {
    return clamp(current, min, max);
  }

  let scale = 1;

  if (delta < 0) {
    const distanceToMin = current - min;
    if (distanceToMin <= 0) {
      return min;
    }

    if (distanceToMin < softZone) {
      scale = smoothstep01(distanceToMin / softZone);
    }
  } else {
    const distanceToMax = max - current;
    if (distanceToMax <= 0) {
      return max;
    }

    if (distanceToMax < softZone) {
      scale = smoothstep01(distanceToMax / softZone);
    }
  }

  return clamp(current + delta * scale, min, max);
}

function pointInRect(x: number, z: number, rect: WalkRect) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

function pointInCollisionRect(x: number, z: number, rect: CollisionRect) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

function pointInAnyRect(x: number, z: number) {
  return WALKABLE_RECTS.some((rect) => pointInRect(x, z, rect));
}

function getRectsContainingPoint(x: number, z: number) {
  return WALKABLE_RECTS.filter((rect) => pointInRect(x, z, rect));
}

function resolveCollisionRect(
  currentX: number,
  currentZ: number,
  nextX: number,
  nextZ: number,
  rect: CollisionRect,
) {
  if (!pointInCollisionRect(nextX, nextZ, rect)) {
    return null;
  }

  const distances = [
    { axis: 'x' as const, value: Math.abs(nextX - rect.minX), resolvedX: rect.minX, resolvedZ: nextZ },
    { axis: 'x' as const, value: Math.abs(rect.maxX - nextX), resolvedX: rect.maxX, resolvedZ: nextZ },
    { axis: 'z' as const, value: Math.abs(nextZ - rect.minZ), resolvedX: nextX, resolvedZ: rect.minZ },
    { axis: 'z' as const, value: Math.abs(rect.maxZ - nextZ), resolvedX: nextX, resolvedZ: rect.maxZ },
  ];
  const nearest = distances.reduce((best, current) => (current.value < best.value ? current : best));

  if (nearest.axis === 'x') {
    return { x: nearest.resolvedX, z: currentZ };
  }

  return { x: currentX, z: nearest.resolvedZ };
}

function resolveWalkablePosition(currentX: number, currentZ: number, deltaX: number, deltaZ: number) {
  const nextX = currentX + deltaX;
  const nextZ = currentZ + deltaZ;

  if (pointInAnyRect(nextX, nextZ)) {
    let resolvedX = nextX;
    let resolvedZ = nextZ;

    for (const rect of ARTWORK_COLLISION_RECTS) {
      const collisionResolved = resolveCollisionRect(currentX, currentZ, resolvedX, resolvedZ, rect);
      if (collisionResolved) {
        resolvedX = collisionResolved.x;
        resolvedZ = collisionResolved.z;
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }

  const originRects = getRectsContainingPoint(currentX, currentZ);
  const candidateRects = originRects.length > 0 ? originRects : WALKABLE_RECTS;

  let bestX = currentX;
  let bestZ = currentZ;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const rect of candidateRects) {
    const x = applySoftBoundaryAxis(currentX, deltaX, rect.minX, rect.maxX, SOFT_ZONE);
    const z = applySoftBoundaryAxis(currentZ, deltaZ, rect.minZ, rect.maxZ, SOFT_ZONE);
    const deltaToNextX = nextX - x;
    const deltaToNextZ = nextZ - z;
    const distanceSquared = deltaToNextX * deltaToNextX + deltaToNextZ * deltaToNextZ;

    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestX = x;
      bestZ = z;
    }
  }

  for (const rect of ARTWORK_COLLISION_RECTS) {
    const collisionResolved = resolveCollisionRect(currentX, currentZ, bestX, bestZ, rect);
    if (collisionResolved) {
      bestX = collisionResolved.x;
      bestZ = collisionResolved.z;
    }
  }

  return { x: bestX, z: bestZ };
}

export function Player() {
  const { camera } = useThree();
  const setLocked = useGalleryStore((state) => state.setLocked);
  const isCartOpen = useGalleryStore((state) => state.isCartOpen);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);
  const isUiBlocking = isCartOpen || Boolean(selectedArtwork);

  const keys = useRef<Record<string, boolean>>({});
  const direction = useRef(new THREE.Vector3());
  const moveWorld = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);
  const hasInitializedSpawn = useRef(false);

  const clearInputs = () => {
    keys.current = {};
  };

  useEffect(() => {
    if (hasInitializedSpawn.current) {
      return;
    }

    hasInitializedSpawn.current = true;
    camera.position.set(...SPAWN_POSITION);
    camera.lookAt(...SPAWN_LOOK_AT);
    setLocked(false);
    clearInputs();
  }, [camera, setLocked]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
      }

      const canJump =
        !keys.current[event.code] &&
        event.code === 'Space' &&
        isGrounded.current &&
        useGalleryStore.getState().isLocked;

      if (canJump) {
        verticalVelocity.current = JUMP_VELOCITY;
        isGrounded.current = false;
      }

      keys.current[event.code] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
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
      const isLockedNow = document.pointerLockElement !== null;
      setLocked(isLockedNow);

      if (!isLockedNow) {
        clearInputs();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        document.exitPointerLock?.();
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
    if (isUiBlocking) {
      document.exitPointerLock?.();
      clearInputs();
    }
  }, [isUiBlocking]);

  useFrame((state, delta) => {
    if (useGalleryStore.getState().isLocked) {
      state.raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);

      const moveZ =
        Number(keys.current.KeyS || keys.current.ArrowDown || false) -
        Number(keys.current.KeyZ || keys.current.KeyW || keys.current.ArrowUp || false);
      const moveX =
        Number(keys.current.KeyD || keys.current.ArrowRight || false) -
        Number(keys.current.KeyQ || keys.current.KeyA || keys.current.ArrowLeft || false);

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

          const resolvedPosition = resolveWalkablePosition(
            camera.position.x,
            camera.position.z,
            moveWorld.current.x,
            moveWorld.current.z,
          );

          camera.position.x = resolvedPosition.x;
          camera.position.z = resolvedPosition.z;
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
    !isUiBlocking ? (
      <PointerLockControls
        key="pointer-lock-controls"
        onLock={() => setLocked(true)}
        onUnlock={() => setLocked(false)}
        makeDefault
        selector="#resume-overlay"
      />
    ) : null
  );
}
