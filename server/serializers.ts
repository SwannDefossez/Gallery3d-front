import type {
  ArtistProfile,
  Artwork,
  Cart,
  CartItem,
  Order,
  OrderItem,
  User,
} from '@prisma/client';
import type {
  AuthUser,
  CartView,
  GalleryArtwork,
  OrderView,
  PublicArtistProfile,
} from '../shared/gallery';

type ArtworkWithArtist = Artwork & {
  artistProfile: ArtistProfile | null;
};

type CartWithItems = Cart & {
  items: (CartItem & {
    artwork: ArtworkWithArtist;
  })[];
};

type OrderWithItems = Order & {
  items: (OrderItem & {
    artwork: ArtworkWithArtist;
    artistProfile: ArtistProfile | null;
  })[];
};

export function serializeArtistProfile(profile: ArtistProfile | null): PublicArtistProfile | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    displayName: profile.displayName,
    bio: profile.bio,
    portfolioUrl: profile.portfolioUrl,
    avatarUrl: profile.avatarPath,
  };
}

export function serializeArtwork(artwork: ArtworkWithArtist): GalleryArtwork {
  return {
    id: artwork.id,
    legacyId: artwork.legacyId,
    slug: artwork.slug,
    galleryKey: artwork.galleryKey,
    debugNumber: artwork.debugNumber,
    title: artwork.title,
    artist: artwork.artistNameSnapshot,
    description: artwork.description ?? undefined,
    price: artwork.priceCents / 100,
    stockTotal: artwork.stockTotal,
    stockReserved: artwork.stockReserved,
    stockSold: artwork.stockSold,
    status: artwork.status,
    imageUrl: artwork.imagePath,
    sceneTextureUrl: artwork.sceneTexturePath ?? undefined,
    modelUrl: artwork.modelUrl ?? undefined,
    sourceNodeName: artwork.sourceNodeName ?? undefined,
    sceneTextureScale:
      artwork.sceneTextureScaleX !== null && artwork.sceneTextureScaleY !== null
        ? [artwork.sceneTextureScaleX, artwork.sceneTextureScaleY]
        : undefined,
    previewAspectRatio: artwork.previewAspectRatio ?? undefined,
    previewSourceRatio: artwork.previewSourceRatio ?? undefined,
    previewObjectPosition: artwork.previewObjectPosition ?? undefined,
    previewZoom: artwork.previewZoom ?? undefined,
    previewFlipY: artwork.previewFlipY,
    position: [artwork.positionX, artwork.positionY, artwork.positionZ],
    rotation: [artwork.rotationX, artwork.rotationY, artwork.rotationZ],
    width: artwork.width,
    height: artwork.height,
    hitboxSize: [artwork.hitboxX, artwork.hitboxY, artwork.hitboxZ],
    debugLabelOffset:
      artwork.debugLabelOffsetX !== null &&
      artwork.debugLabelOffsetY !== null &&
      artwork.debugLabelOffsetZ !== null
        ? [artwork.debugLabelOffsetX, artwork.debugLabelOffsetY, artwork.debugLabelOffsetZ]
        : undefined,
    artistProfileId: artwork.artistProfileId,
    artistProfile: serializeArtistProfile(artwork.artistProfile),
  };
}

export function serializeAuthUser(user: User & { artistProfile: ArtistProfile | null }): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    artistProfileId: user.artistProfile?.id ?? null,
    artistProfile: serializeArtistProfile(user.artistProfile),
  };
}

export function serializeCart(cart: CartWithItems): CartView {
  const items = cart.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    artwork: serializeArtwork(item.artwork),
  }));

  return {
    id: cart.id,
    items,
    totalCents: items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0),
  };
}

export function serializeOrder(order: OrderWithItems): OrderView {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      artworkId: item.artworkId,
      title: item.titleSnapshot,
      imageUrl: item.imagePathSnapshot,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      artistName: item.artistProfile?.displayName ?? item.artwork.artistNameSnapshot ?? null,
    })),
  };
}
