import { create } from 'zustand';

export type MapId = 'gallery' | 'richards';

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

export interface RichardsSurfaceTuning {
  scale: [number, number, number];
  offsetLocal: [number, number, number];
  rotationOffsetDeg: [number, number, number];
}

export interface RichardsWorldTuning {
  scaleMultiplier: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface RichardsFloorTuning {
  repeat: [number, number];
  offset: [number, number];
  rotationDeg: number;
  normalScale: number;
}

const RICHARDS_TUNING_STORAGE_KEY = 'richards-inferno-tuning-v2';

export const DEFAULT_RICHARDS_SURFACE_TUNING: RichardsSurfaceTuning = {
  scale: [1, 1, 1],
  offsetLocal: [0, 0, 0],
  rotationOffsetDeg: [0, 0, 0],
};

export const DEFAULT_RICHARDS_WORLD_TUNING: RichardsWorldTuning = {
  scaleMultiplier: 3.75,
  position: [-12.5, 8.75, -24],
  rotation: [0, 4.6, 0],
};

export const DEFAULT_RICHARDS_INFERNO_ENABLED = false;

export const DEFAULT_RICHARDS_FLOOR_TUNING: RichardsFloorTuning = {
  repeat: [0.25, 0.25],
  offset: [0, 0],
  rotationDeg: 0,
  normalScale: 1.25,
};

function cloneRichardsSurfaceTuning(
  tuning: RichardsSurfaceTuning = DEFAULT_RICHARDS_SURFACE_TUNING,
): RichardsSurfaceTuning {
  return {
    scale: [...tuning.scale] as [number, number, number],
    offsetLocal: [...tuning.offsetLocal] as [number, number, number],
    rotationOffsetDeg: [...tuning.rotationOffsetDeg] as [number, number, number],
  };
}

function cloneRichardsWorldTuning(tuning: RichardsWorldTuning = DEFAULT_RICHARDS_WORLD_TUNING): RichardsWorldTuning {
  return {
    scaleMultiplier: tuning.scaleMultiplier,
    position: [...tuning.position] as [number, number, number],
    rotation: [...tuning.rotation] as [number, number, number],
  };
}

function cloneRichardsFloorTuning(tuning: RichardsFloorTuning = DEFAULT_RICHARDS_FLOOR_TUNING): RichardsFloorTuning {
  return {
    repeat: [...tuning.repeat] as [number, number],
    offset: [...tuning.offset] as [number, number],
    rotationDeg: tuning.rotationDeg,
    normalScale: tuning.normalScale,
  };
}

function saveRichardsTuning(
  surface: RichardsSurfaceTuning,
  world: RichardsWorldTuning,
  floor: RichardsFloorTuning,
  infernoEnabled: boolean,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    RICHARDS_TUNING_STORAGE_KEY,
    JSON.stringify({
      surface: cloneRichardsSurfaceTuning(surface),
      world: cloneRichardsWorldTuning(world),
      floor: cloneRichardsFloorTuning(floor),
      infernoEnabled,
    }),
  );
}

function loadRichardsTuning() {
  if (typeof window === 'undefined') {
    return {
      surface: cloneRichardsSurfaceTuning(),
      world: cloneRichardsWorldTuning(),
      infernoEnabled: DEFAULT_RICHARDS_INFERNO_ENABLED,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(RICHARDS_TUNING_STORAGE_KEY);

    if (!rawValue) {
      return {
        surface: cloneRichardsSurfaceTuning(),
        world: cloneRichardsWorldTuning(),
        floor: cloneRichardsFloorTuning(),
        infernoEnabled: DEFAULT_RICHARDS_INFERNO_ENABLED,
      };
    }

    const parsed = JSON.parse(rawValue) as {
      surface?: Partial<RichardsSurfaceTuning>;
      world?: Partial<RichardsWorldTuning>;
      floor?: Partial<RichardsFloorTuning>;
      infernoEnabled?: boolean;
    };

    return {
      surface: {
        scale: [...(parsed.surface?.scale ?? DEFAULT_RICHARDS_SURFACE_TUNING.scale)] as [number, number, number],
        offsetLocal: [...(parsed.surface?.offsetLocal ?? DEFAULT_RICHARDS_SURFACE_TUNING.offsetLocal)] as [
          number,
          number,
          number,
        ],
        rotationOffsetDeg: [
          ...(parsed.surface?.rotationOffsetDeg ?? DEFAULT_RICHARDS_SURFACE_TUNING.rotationOffsetDeg),
        ] as [number, number, number],
      },
      world: {
        scaleMultiplier: parsed.world?.scaleMultiplier ?? DEFAULT_RICHARDS_WORLD_TUNING.scaleMultiplier,
        position: [...(parsed.world?.position ?? DEFAULT_RICHARDS_WORLD_TUNING.position)] as [number, number, number],
        rotation: [...(parsed.world?.rotation ?? DEFAULT_RICHARDS_WORLD_TUNING.rotation)] as [number, number, number],
      },
      floor: {
        repeat: [...(parsed.floor?.repeat ?? DEFAULT_RICHARDS_FLOOR_TUNING.repeat)] as [number, number],
        offset: [...(parsed.floor?.offset ?? DEFAULT_RICHARDS_FLOOR_TUNING.offset)] as [number, number],
        rotationDeg: parsed.floor?.rotationDeg ?? DEFAULT_RICHARDS_FLOOR_TUNING.rotationDeg,
        normalScale: parsed.floor?.normalScale ?? DEFAULT_RICHARDS_FLOOR_TUNING.normalScale,
      },
      infernoEnabled: parsed.infernoEnabled ?? DEFAULT_RICHARDS_INFERNO_ENABLED,
    };
  } catch {
    return {
      surface: cloneRichardsSurfaceTuning(),
      world: cloneRichardsWorldTuning(),
      floor: cloneRichardsFloorTuning(),
      infernoEnabled: DEFAULT_RICHARDS_INFERNO_ENABLED,
    };
  }
}

const initialRichardsTuning = loadRichardsTuning();

interface GalleryState {
  selectedMap: MapId | null;
  setSelectedMap: (map: MapId | null) => void;
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
  richardsDebugText: string;
  setRichardsDebugText: (text: string) => void;
  richardsHoverHint: string;
  setRichardsHoverHint: (text: string) => void;
  richardsSurfaceTuning: RichardsSurfaceTuning;
  setRichardsSurfaceTuning: (tuning: RichardsSurfaceTuning | ((prev: RichardsSurfaceTuning) => RichardsSurfaceTuning)) => void;
  richardsWorldTuning: RichardsWorldTuning;
  setRichardsWorldTuning: (tuning: RichardsWorldTuning | ((prev: RichardsWorldTuning) => RichardsWorldTuning)) => void;
  richardsFloorTuning: RichardsFloorTuning;
  setRichardsFloorTuning: (tuning: RichardsFloorTuning | ((prev: RichardsFloorTuning) => RichardsFloorTuning)) => void;
  richardsInfernoEnabled: boolean;
  setRichardsInfernoEnabled: (enabled: boolean) => void;
  resetRichardsTuning: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  selectedMap: null,
  setSelectedMap: (map) => set({ selectedMap: map }),
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
  richardsDebugText: '',
  setRichardsDebugText: (text) => set({ richardsDebugText: text }),
  richardsHoverHint: '',
  setRichardsHoverHint: (text) => set({ richardsHoverHint: text }),
  richardsSurfaceTuning: initialRichardsTuning.surface,
  setRichardsSurfaceTuning: (tuning) =>
    set((state) => {
      const nextTuning =
        typeof tuning === 'function' ? tuning(cloneRichardsSurfaceTuning(state.richardsSurfaceTuning)) : tuning;
      saveRichardsTuning(nextTuning, state.richardsWorldTuning, state.richardsFloorTuning, state.richardsInfernoEnabled);
      return { richardsSurfaceTuning: cloneRichardsSurfaceTuning(nextTuning) };
    }),
  richardsWorldTuning: initialRichardsTuning.world,
  setRichardsWorldTuning: (tuning) =>
    set((state) => {
      const nextTuning =
        typeof tuning === 'function' ? tuning(cloneRichardsWorldTuning(state.richardsWorldTuning)) : tuning;
      saveRichardsTuning(state.richardsSurfaceTuning, nextTuning, state.richardsFloorTuning, state.richardsInfernoEnabled);
      return { richardsWorldTuning: cloneRichardsWorldTuning(nextTuning) };
    }),
  richardsFloorTuning: initialRichardsTuning.floor,
  setRichardsFloorTuning: (tuning) =>
    set((state) => {
      const nextTuning =
        typeof tuning === 'function' ? tuning(cloneRichardsFloorTuning(state.richardsFloorTuning)) : tuning;
      saveRichardsTuning(state.richardsSurfaceTuning, state.richardsWorldTuning, nextTuning, state.richardsInfernoEnabled);
      return { richardsFloorTuning: cloneRichardsFloorTuning(nextTuning) };
    }),
  richardsInfernoEnabled: initialRichardsTuning.infernoEnabled,
  setRichardsInfernoEnabled: (enabled) =>
    set((state) => {
      saveRichardsTuning(state.richardsSurfaceTuning, state.richardsWorldTuning, state.richardsFloorTuning, enabled);
      return { richardsInfernoEnabled: enabled };
    }),
  resetRichardsTuning: () =>
    set(() => {
      const surface = cloneRichardsSurfaceTuning();
      const world = cloneRichardsWorldTuning();
      const floor = cloneRichardsFloorTuning();
      saveRichardsTuning(surface, world, floor, DEFAULT_RICHARDS_INFERNO_ENABLED);
      return {
        richardsSurfaceTuning: surface,
        richardsWorldTuning: world,
        richardsFloorTuning: floor,
        richardsInfernoEnabled: DEFAULT_RICHARDS_INFERNO_ENABLED,
      };
    }),
}));
