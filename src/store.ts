import { create } from 'zustand';
import type { AuthUser, CartView, GalleryArtwork } from '../shared/gallery';

export type ArtworkData = GalleryArtwork;

export interface EditorCameraState {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
}

export interface GalleryFloorTuning {
  repeat: [number, number];
  offset: [number, number];
  rotationDeg: number;
  normalScale: number;
}

export interface ArtworkOverlayTuning {
  offset: [number, number, number];
  rotationDeg: number;
}

const GALLERY_TUNING_STORAGE_KEY = 'main-gallery-editor-tuning-v4';

export const DEFAULT_GALLERY_FLOOR_TUNING: GalleryFloorTuning = {
  repeat: [0.25, 0.25],
  offset: [0, 0],
  rotationDeg: 0,
  normalScale: 1.25,
};

function cloneGalleryFloorTuning(tuning: GalleryFloorTuning = DEFAULT_GALLERY_FLOOR_TUNING): GalleryFloorTuning {
  return {
    repeat: [...tuning.repeat] as [number, number],
    offset: [...tuning.offset] as [number, number],
    rotationDeg: tuning.rotationDeg,
    normalScale: tuning.normalScale,
  };
}

function cloneArtworkOverlayTuning(
  tuning: ArtworkOverlayTuning = {
    offset: [0, 0, 0],
    rotationDeg: 0,
  },
): ArtworkOverlayTuning {
  return {
    offset: [...tuning.offset] as [number, number, number],
    rotationDeg: tuning.rotationDeg,
  };
}

function cloneArtworkOverlayTunings(tunings: Record<string, ArtworkOverlayTuning> = {}) {
  return Object.fromEntries(
    Object.entries(tunings).map(([id, tuning]) => [id, cloneArtworkOverlayTuning(tuning)]),
  ) as Record<string, ArtworkOverlayTuning>;
}

function saveGalleryTuning(floor: GalleryFloorTuning, artworks: Record<string, ArtworkOverlayTuning>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    GALLERY_TUNING_STORAGE_KEY,
    JSON.stringify({
      floor: cloneGalleryFloorTuning(floor),
      artworks: cloneArtworkOverlayTunings(artworks),
    }),
  );
}

function loadGalleryTuning() {
  if (typeof window === 'undefined') {
    return {
      floor: cloneGalleryFloorTuning(),
      artworks: {},
    };
  }

  try {
    const rawValue = window.localStorage.getItem(GALLERY_TUNING_STORAGE_KEY);

    if (!rawValue) {
      return {
        floor: cloneGalleryFloorTuning(),
      };
    }

    const parsed = JSON.parse(rawValue) as {
      floor?: Partial<GalleryFloorTuning>;
      artworks?: Record<string, Partial<ArtworkOverlayTuning>>;
    };

    return {
      floor: {
        repeat: [...(parsed.floor?.repeat ?? DEFAULT_GALLERY_FLOOR_TUNING.repeat)] as [number, number],
        offset: [...(parsed.floor?.offset ?? DEFAULT_GALLERY_FLOOR_TUNING.offset)] as [number, number],
        rotationDeg: parsed.floor?.rotationDeg ?? DEFAULT_GALLERY_FLOOR_TUNING.rotationDeg,
        normalScale: parsed.floor?.normalScale ?? DEFAULT_GALLERY_FLOOR_TUNING.normalScale,
      },
      artworks: Object.fromEntries(
        Object.entries(parsed.artworks ?? {}).map(([id, tuning]) => [
          id,
          {
            offset: [...(tuning.offset ?? [0, 0, 0])] as [number, number, number],
            rotationDeg: tuning.rotationDeg ?? 0,
          },
        ]),
      ) as Record<string, ArtworkOverlayTuning>,
    };
  } catch {
    return {
      floor: cloneGalleryFloorTuning(),
      artworks: {},
    };
  }
}

const initialGalleryTuning = loadGalleryTuning();

interface GalleryState {
  hasStarted: boolean;
  setHasStarted: (started: boolean) => void;
  isLocked: boolean;
  setLocked: (locked: boolean) => void;
  artworks: ArtworkData[];
  setArtworks: (artworks: ArtworkData[]) => void;
  isArtworksLoading: boolean;
  setArtworksLoading: (loading: boolean) => void;
  isSessionLoading: boolean;
  setSessionLoading: (loading: boolean) => void;
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
  cart: CartView | null;
  setCart: (cart: CartView | null) => void;
  selectedArtwork: ArtworkData | null;
  setSelectedArtwork: (artwork: ArtworkData | null) => void;
  hoveredArtworkId: string | null;
  setHoveredArtworkId: (id: string | null) => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isEditorMode: boolean;
  setEditorMode: (enabled: boolean) => void;
  selectedEditorArtworkId: string | null;
  setSelectedEditorArtworkId: (id: string | null) => void;
  editorCamera: EditorCameraState;
  setEditorCamera: (camera: EditorCameraState) => void;
  galleryFloorTuning: GalleryFloorTuning;
  setGalleryFloorTuning: (tuning: GalleryFloorTuning | ((prev: GalleryFloorTuning) => GalleryFloorTuning)) => void;
  artworkOverlayTunings: Record<string, ArtworkOverlayTuning>;
  setArtworkOverlayTuning: (
    artworkId: string,
    tuning:
      | ArtworkOverlayTuning
      | ((prev: ArtworkOverlayTuning) => ArtworkOverlayTuning),
  ) => void;
  resetArtworkOverlayTuning: (artworkId: string) => void;
  resetGalleryTuning: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  hasStarted: false,
  setHasStarted: (started) => set({ hasStarted: started }),
  isLocked: false,
  setLocked: (locked) => set({ isLocked: locked }),
  artworks: [],
  setArtworks: (artworks) => set({ artworks }),
  isArtworksLoading: true,
  setArtworksLoading: (loading) => set({ isArtworksLoading: loading }),
  isSessionLoading: true,
  setSessionLoading: (loading) => set({ isSessionLoading: loading }),
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),
  cart: null,
  setCart: (cart) => set({ cart }),
  selectedArtwork: null,
  setSelectedArtwork: (artwork) => set({ selectedArtwork: artwork }),
  hoveredArtworkId: null,
  setHoveredArtworkId: (id) => set({ hoveredArtworkId: id }),
  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
  isEditorMode: false,
  setEditorMode: (enabled) =>
    set((state) => ({
      isEditorMode: enabled,
      selectedEditorArtworkId: enabled ? state.selectedEditorArtworkId : null,
    })),
  selectedEditorArtworkId: null,
  setSelectedEditorArtworkId: (id) => set({ selectedEditorArtworkId: id }),
  editorCamera: {
    x: 0,
    y: 0,
    z: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
  },
  setEditorCamera: (camera) => set({ editorCamera: camera }),
  galleryFloorTuning: initialGalleryTuning.floor,
  artworkOverlayTunings: initialGalleryTuning.artworks ?? {},
  setGalleryFloorTuning: (tuning) =>
    set((state) => {
      const nextTuning =
        typeof tuning === 'function' ? tuning(cloneGalleryFloorTuning(state.galleryFloorTuning)) : tuning;
      saveGalleryTuning(nextTuning, state.artworkOverlayTunings);
      return { galleryFloorTuning: cloneGalleryFloorTuning(nextTuning) };
    }),
  setArtworkOverlayTuning: (artworkId, tuning) =>
    set((state) => {
      const currentTuning = cloneArtworkOverlayTuning(state.artworkOverlayTunings[artworkId]);
      const nextTuning = typeof tuning === 'function' ? tuning(currentTuning) : tuning;
      const nextArtworks = {
        ...state.artworkOverlayTunings,
        [artworkId]: cloneArtworkOverlayTuning(nextTuning),
      };
      saveGalleryTuning(state.galleryFloorTuning, nextArtworks);
      return { artworkOverlayTunings: nextArtworks };
    }),
  resetArtworkOverlayTuning: (artworkId) =>
    set((state) => {
      const nextArtworks = { ...state.artworkOverlayTunings };
      delete nextArtworks[artworkId];
      saveGalleryTuning(state.galleryFloorTuning, nextArtworks);
      return { artworkOverlayTunings: nextArtworks };
    }),
  resetGalleryTuning: () =>
    set((state) => {
      const floor = cloneGalleryFloorTuning();
      saveGalleryTuning(floor, state.artworkOverlayTunings);
      return {
        galleryFloorTuning: floor,
      };
    }),
}));
