export type UserRole = 'USER' | 'ARTIST' | 'MODERATOR';

export type ArtworkStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'HIDDEN';

export type ArtistRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type OrderStatus = 'CHECKOUT_PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

export interface GalleryArtworkPreviewSettings {
  previewAspectRatio?: number;
  previewSourceRatio?: number;
  previewObjectPosition?: string;
  previewZoom?: number;
  previewFlipY?: boolean;
}

export interface GalleryArtworkGeometry {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  hitboxSize: [number, number, number];
  debugLabelOffset?: [number, number, number];
}

export interface GalleryArtworkMedia {
  imageUrl: string;
  sceneTextureUrl?: string;
  modelUrl?: string;
  sourceNodeName?: string;
  sceneTextureScale?: [number, number];
}

export interface GalleryArtworkRecord
  extends GalleryArtworkPreviewSettings,
    GalleryArtworkGeometry,
    GalleryArtworkMedia {
  id: string;
  legacyId: string;
  slug: string;
  galleryKey: string;
  debugNumber: number;
  title: string;
  artist: string;
  description?: string;
  price: number;
  stockTotal: number;
  stockReserved: number;
  stockSold: number;
  status: ArtworkStatus;
  artistProfileId?: string | null;
}

export interface PublicArtistProfile {
  id: string;
  displayName: string;
  bio: string;
  portfolioUrl?: string | null;
  avatarUrl?: string | null;
}

export interface GalleryArtwork extends GalleryArtworkRecord {
  artistProfile?: PublicArtistProfile | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  artistProfileId?: string | null;
  artistProfile?: PublicArtistProfile | null;
}

export interface CartItemView {
  id: string;
  quantity: number;
  unitPriceCents: number;
  artwork: GalleryArtwork;
}

export interface CartView {
  id: string;
  items: CartItemView[];
  totalCents: number;
}

export interface ArtistDashboardArtwork extends GalleryArtwork {
  updatedAt: string;
  createdAt: string;
}

export interface ArtistRequestView {
  id: string;
  status: ArtistRequestStatus;
  motivation: string;
  createdAt: string;
  user: Pick<AuthUser, 'id' | 'name' | 'email' | 'role'>;
}

export interface OrderItemView {
  id: string;
  artworkId: string;
  title: string;
  imageUrl: string;
  quantity: number;
  unitPriceCents: number;
  artistName?: string | null;
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  paidAt?: string | null;
  stripeCheckoutSessionId?: string | null;
  items: OrderItemView[];
}

export interface StripeStatusView {
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  checkoutEnabled: boolean;
  webhookEndpoint: string;
  listenCommand: string;
}
