import { create } from 'zustand';

export interface ArtworkData {
  id: string;
  title: string;
  artist: string;
  description?: string;
  price: number;
  imageUrl: string;
  modelUrl: string;
  isEnvironment?: boolean;
  environmentScaleMode?: 'fit' | 'real';
  environmentScaleMultiplier?: number;
  environmentOffset?: [number, number, number];
  modelRotation?: [number, number, number];
  modelLoadDistance?: number;
  modelUnloadDistance?: number;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}

export interface EditorCameraState {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
}

export interface PortalSurfaceTuning {
  scale: [number, number, number];
  offsetLocal: [number, number, number];
  rotationOffsetDeg: [number, number, number];
}

export interface PortalWorldTuning {
  scaleMultiplier: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface GalleryFloorTuning {
  repeat: [number, number];
  offset: [number, number];
  rotationDeg: number;
  normalScale: number;
}

const GALLERY_TUNING_STORAGE_KEY = 'main-gallery-editor-tuning-v1';

export const DEFAULT_PORTAL_SURFACE_TUNING: PortalSurfaceTuning = {
  scale: [1, 1, 1],
  offsetLocal: [0, 0, 0],
  rotationOffsetDeg: [0, 0, 0],
};

export const DEFAULT_PORTAL_WORLD_TUNING: PortalWorldTuning = {
  scaleMultiplier: 3.75,
  position: [-12.5, 8.75, -24],
  rotation: [0, 4.6, 0],
};

export const DEFAULT_INFERNO_PORTAL_ENABLED = false;

export const DEFAULT_GALLERY_FLOOR_TUNING: GalleryFloorTuning = {
  repeat: [0.25, 0.25],
  offset: [0, 0],
  rotationDeg: 0,
  normalScale: 1.25,
};

function clonePortalSurfaceTuning(
  tuning: PortalSurfaceTuning = DEFAULT_PORTAL_SURFACE_TUNING,
): PortalSurfaceTuning {
  return {
    scale: [...tuning.scale] as [number, number, number],
    offsetLocal: [...tuning.offsetLocal] as [number, number, number],
    rotationOffsetDeg: [...tuning.rotationOffsetDeg] as [number, number, number],
  };
}

function clonePortalWorldTuning(tuning: PortalWorldTuning = DEFAULT_PORTAL_WORLD_TUNING): PortalWorldTuning {
  return {
    scaleMultiplier: tuning.scaleMultiplier,
    position: [...tuning.position] as [number, number, number],
    rotation: [...tuning.rotation] as [number, number, number],
  };
}

function cloneGalleryFloorTuning(tuning: GalleryFloorTuning = DEFAULT_GALLERY_FLOOR_TUNING): GalleryFloorTuning {
  return {
    repeat: [...tuning.repeat] as [number, number],
    offset: [...tuning.offset] as [number, number],
    rotationDeg: tuning.rotationDeg,
    normalScale: tuning.normalScale,
  };
}

function saveGalleryTuning(
  surface: PortalSurfaceTuning,
  world: PortalWorldTuning,
  floor: GalleryFloorTuning,
  infernoEnabled: boolean,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    GALLERY_TUNING_STORAGE_KEY,
    JSON.stringify({
      surface: clonePortalSurfaceTuning(surface),
      world: clonePortalWorldTuning(world),
      floor: cloneGalleryFloorTuning(floor),
      infernoEnabled,
    }),
  );
}

function loadGalleryTuning() {
  if (typeof window === 'undefined') {
    return {
      surface: clonePortalSurfaceTuning(),
      world: clonePortalWorldTuning(),
      floor: cloneGalleryFloorTuning(),
      infernoEnabled: DEFAULT_INFERNO_PORTAL_ENABLED,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(GALLERY_TUNING_STORAGE_KEY);

    if (!rawValue) {
      return {
        surface: clonePortalSurfaceTuning(),
        world: clonePortalWorldTuning(),
        floor: cloneGalleryFloorTuning(),
        infernoEnabled: DEFAULT_INFERNO_PORTAL_ENABLED,
      };
    }

    const parsed = JSON.parse(rawValue) as {
      surface?: Partial<PortalSurfaceTuning>;
      world?: Partial<PortalWorldTuning>;
      floor?: Partial<GalleryFloorTuning>;
      infernoEnabled?: boolean;
    };

    return {
      surface: {
        scale: [...(parsed.surface?.scale ?? DEFAULT_PORTAL_SURFACE_TUNING.scale)] as [number, number, number],
        offsetLocal: [...(parsed.surface?.offsetLocal ?? DEFAULT_PORTAL_SURFACE_TUNING.offsetLocal)] as [
          number,
          number,
          number,
        ],
        rotationOffsetDeg: [
          ...(parsed.surface?.rotationOffsetDeg ?? DEFAULT_PORTAL_SURFACE_TUNING.rotationOffsetDeg),
        ] as [number, number, number],
      },
      world: {
        scaleMultiplier: parsed.world?.scaleMultiplier ?? DEFAULT_PORTAL_WORLD_TUNING.scaleMultiplier,
        position: [...(parsed.world?.position ?? DEFAULT_PORTAL_WORLD_TUNING.position)] as [number, number, number],
        rotation: [...(parsed.world?.rotation ?? DEFAULT_PORTAL_WORLD_TUNING.rotation)] as [number, number, number],
      },
      floor: {
        repeat: [...(parsed.floor?.repeat ?? DEFAULT_GALLERY_FLOOR_TUNING.repeat)] as [number, number],
        offset: [...(parsed.floor?.offset ?? DEFAULT_GALLERY_FLOOR_TUNING.offset)] as [number, number],
        rotationDeg: parsed.floor?.rotationDeg ?? DEFAULT_GALLERY_FLOOR_TUNING.rotationDeg,
        normalScale: parsed.floor?.normalScale ?? DEFAULT_GALLERY_FLOOR_TUNING.normalScale,
      },
      infernoEnabled: parsed.infernoEnabled ?? DEFAULT_INFERNO_PORTAL_ENABLED,
    };
  } catch {
    return {
      surface: clonePortalSurfaceTuning(),
      world: clonePortalWorldTuning(),
      floor: cloneGalleryFloorTuning(),
      infernoEnabled: DEFAULT_INFERNO_PORTAL_ENABLED,
    };
  }
}

const initialGalleryTuning = loadGalleryTuning();

interface GalleryState {
  hasStarted: boolean;
  setHasStarted: (started: boolean) => void;
  isLocked: boolean;
  setLocked: (locked: boolean) => void;
  hoveredArtwork: ArtworkData | null;
  setHoveredArtwork: (artwork: ArtworkData | null) => void;
  selectedArtwork: ArtworkData | null;
  setSelectedArtwork: (artwork: ArtworkData | null) => void;
  cart: ArtworkData[];
  addToCart: (artwork: ArtworkData) => void;
  removeFromCart: (id: string) => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isEditorMode: boolean;
  setEditorMode: (enabled: boolean) => void;
  editorCamera: EditorCameraState;
  setEditorCamera: (camera: EditorCameraState) => void;
  galleryHoverHint: string;
  setGalleryHoverHint: (text: string) => void;
  portalSurfaceTuning: PortalSurfaceTuning;
  setPortalSurfaceTuning: (tuning: PortalSurfaceTuning | ((prev: PortalSurfaceTuning) => PortalSurfaceTuning)) => void;
  portalWorldTuning: PortalWorldTuning;
  setPortalWorldTuning: (tuning: PortalWorldTuning | ((prev: PortalWorldTuning) => PortalWorldTuning)) => void;
  galleryFloorTuning: GalleryFloorTuning;
  setGalleryFloorTuning: (tuning: GalleryFloorTuning | ((prev: GalleryFloorTuning) => GalleryFloorTuning)) => void;
  infernoPortalEnabled: boolean;
  setInfernoPortalEnabled: (enabled: boolean) => void;
  resetGalleryTuning: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  hasStarted: false,
  setHasStarted: (started) => set({ hasStarted: started }),
  isLocked: false,
  setLocked: (locked) => set({ isLocked: locked }),
  hoveredArtwork: null,
  setHoveredArtwork: (artwork) => set({ hoveredArtwork: artwork }),
  selectedArtwork: null,
  setSelectedArtwork: (artwork) => set({ selectedArtwork: artwork }),
  cart: [],
  addToCart: (artwork) =>
    set((state) => {
      if (state.cart.some((item) => item.id === artwork.id)) {
        return state;
      }

      return { cart: [...state.cart, artwork] };
    }),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),
  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
  isEditorMode: false,
  setEditorMode: (enabled) => set({ isEditorMode: enabled }),
  editorCamera: {
    x: 0,
    y: 0,
    z: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
  },
  setEditorCamera: (camera) => set({ editorCamera: camera }),
  galleryHoverHint: '',
  setGalleryHoverHint: (text) => set({ galleryHoverHint: text }),
  portalSurfaceTuning: initialGalleryTuning.surface,
  setPortalSurfaceTuning: (tuning) =>
    set((state) => {
      const nextTuning =
        typeof tuning === 'function' ? tuning(clonePortalSurfaceTuning(state.portalSurfaceTuning)) : tuning;
      saveGalleryTuning(nextTuning, state.portalWorldTuning, state.galleryFloorTuning, state.infernoPortalEnabled);
      return { portalSurfaceTuning: clonePortalSurfaceTuning(nextTuning) };
    }),
  portalWorldTuning: initialGalleryTuning.world,
  setPortalWorldTuning: (tuning) =>
    set((state) => {
      const nextTuning =
        typeof tuning === 'function' ? tuning(clonePortalWorldTuning(state.portalWorldTuning)) : tuning;
      saveGalleryTuning(state.portalSurfaceTuning, nextTuning, state.galleryFloorTuning, state.infernoPortalEnabled);
      return { portalWorldTuning: clonePortalWorldTuning(nextTuning) };
    }),
  galleryFloorTuning: initialGalleryTuning.floor,
  setGalleryFloorTuning: (tuning) =>
    set((state) => {
      const nextTuning =
        typeof tuning === 'function' ? tuning(cloneGalleryFloorTuning(state.galleryFloorTuning)) : tuning;
      saveGalleryTuning(state.portalSurfaceTuning, state.portalWorldTuning, nextTuning, state.infernoPortalEnabled);
      return { galleryFloorTuning: cloneGalleryFloorTuning(nextTuning) };
    }),
  infernoPortalEnabled: initialGalleryTuning.infernoEnabled,
  setInfernoPortalEnabled: (enabled) =>
    set((state) => {
      saveGalleryTuning(state.portalSurfaceTuning, state.portalWorldTuning, state.galleryFloorTuning, enabled);
      return { infernoPortalEnabled: enabled };
    }),
  resetGalleryTuning: () =>
    set(() => {
      const surface = clonePortalSurfaceTuning();
      const world = clonePortalWorldTuning();
      const floor = cloneGalleryFloorTuning();
      saveGalleryTuning(surface, world, floor, DEFAULT_INFERNO_PORTAL_ENABLED);
      return {
        portalSurfaceTuning: surface,
        portalWorldTuning: world,
        galleryFloorTuning: floor,
        infernoPortalEnabled: DEFAULT_INFERNO_PORTAL_ENABLED,
      };
    }),
}));
