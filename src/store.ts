import { create } from 'zustand';

export interface ArtworkData {
  id: string;
  title: string;
  artist: string;
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

interface GalleryState {
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
}

export const useGalleryStore = create<GalleryState>((set) => ({
  isLocked: false,
  setLocked: (locked) => set({ isLocked: locked }),
  hoveredArtwork: null,
  setHoveredArtwork: (artwork) => set({ hoveredArtwork: artwork }),
  selectedArtwork: null,
  setSelectedArtwork: (artwork) => set({ selectedArtwork: artwork }),
  cart: [],
  addToCart: (artwork) => set((state) => {
    if (state.cart.find(item => item.id === artwork.id)) return state;
    return { cart: [...state.cart, artwork] };
  }),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter(item => item.id !== id) })),
  isCartOpen: false,
  setCartOpen: (open) => set({ isCartOpen: open }),
}));
