import type {
  ArtistDashboardArtwork,
  ArtistRequestView,
  AuthUser,
  CartView,
  GalleryArtwork,
  OrderView,
  PublicArtistProfile,
} from '../../shared/gallery';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function readJson(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new ApiError(payload?.error ?? 'Unexpected API error.', response.status);
  }

  return payload as T;
}

export const api = {
  getSession: () => apiRequest<{ user: AuthUser | null }>('/api/auth/me'),
  login: (input: { email: string; password: string }) =>
    apiRequest<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  register: (input: { name: string; email: string; password: string }) =>
    apiRequest<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () =>
    apiRequest<{ ok: true }>('/api/auth/logout', {
      method: 'POST',
    }),
  getMainGallery: () => apiRequest<{ artworks: GalleryArtwork[] }>('/api/gallery/main'),
  getArtwork: (id: string) => apiRequest<{ artwork: GalleryArtwork }>(`/api/artworks/${id}`),
  getCart: () => apiRequest<{ cart: CartView }>('/api/cart'),
  getOrders: () => apiRequest<{ orders: OrderView[] }>('/api/orders'),
  getOrderById: (orderId: string) =>
    apiRequest<{ order: OrderView }>(`/api/orders/${orderId}`),
  addCartItem: (artworkId: string, quantity = 1) =>
    apiRequest<{ cart: CartView }>('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ artworkId, quantity }),
    }),
  updateCartItem: (id: string, quantity: number) =>
    apiRequest<{ cart: CartView }>(`/api/cart/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (id: string) =>
    apiRequest<{ cart: CartView }>(`/api/cart/items/${id}`, {
      method: 'DELETE',
    }),
  createCheckoutSession: () =>
    apiRequest<{ checkoutUrl: string; orderId: string }>('/api/checkout/session', {
      method: 'POST',
    }),
  cancelOrder: (orderId: string) =>
    apiRequest<{ ok: true }>(`/api/checkout/orders/${orderId}/cancel`, {
      method: 'POST',
    }),
  submitArtistRequest: (motivation: string) =>
    apiRequest<{ artistRequest: { id: string; status: string } }>('/api/artist-requests', {
      method: 'POST',
      body: JSON.stringify({ motivation }),
    }),
  getArtistProfile: () => apiRequest<{ artistProfile: PublicArtistProfile | null }>('/api/artist/profile'),
  updateArtistProfile: (input: { displayName: string; bio: string; portfolioUrl: string }) =>
    apiRequest<{ artistProfile: PublicArtistProfile | null }>('/api/artist/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  getArtistArtworks: () => apiRequest<{ artworks: ArtistDashboardArtwork[] }>('/api/artist/artworks'),
  createArtistArtwork: (formData: FormData) =>
    apiRequest<{ artwork: GalleryArtwork }>('/api/artist/artworks', {
      method: 'POST',
      body: formData,
    }),
  updateArtistArtwork: (id: string, formData: FormData) =>
    apiRequest<{ artwork: GalleryArtwork }>(`/api/artist/artworks/${id}`, {
      method: 'PUT',
      body: formData,
    }),
  deleteArtistArtwork: (id: string) =>
    apiRequest<{ ok: true }>(`/api/artist/artworks/${id}`, {
      method: 'DELETE',
    }),
  submitArtistArtwork: (id: string) =>
    apiRequest<{ artwork: GalleryArtwork }>(`/api/artist/artworks/${id}/submit`, {
      method: 'POST',
    }),
  getModerationRequests: () => apiRequest<{ requests: ArtistRequestView[] }>('/api/moderation/artist-requests'),
  approveArtistRequest: (id: string) =>
    apiRequest<{ ok: true }>(`/api/moderation/artist-requests/${id}/approve`, {
      method: 'POST',
    }),
  rejectArtistRequest: (id: string) =>
    apiRequest<{ ok: true }>(`/api/moderation/artist-requests/${id}/reject`, {
      method: 'POST',
    }),
  getModerationArtworks: () => apiRequest<{ artworks: GalleryArtwork[] }>('/api/moderation/artworks'),
  publishArtwork: (id: string) =>
    apiRequest<{ artwork: GalleryArtwork }>(`/api/moderation/artworks/${id}/publish`, {
      method: 'POST',
    }),
  hideArtwork: (id: string) =>
    apiRequest<{ artwork: GalleryArtwork }>(`/api/moderation/artworks/${id}/hide`, {
      method: 'POST',
    }),
};
