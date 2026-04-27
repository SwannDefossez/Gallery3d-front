import type { ArtistRequestStatus, ArtworkStatus, OrderStatus, UserRole } from '../../shared/gallery';

export function formatUserRole(role: UserRole) {
  switch (role) {
    case 'USER':
      return 'Client';
    case 'ARTIST':
      return 'Artiste';
    case 'MODERATOR':
      return 'Moderateur';
  }
}

export function formatArtworkStatus(status: ArtworkStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Brouillon';
    case 'PENDING':
      return 'En attente';
    case 'PUBLISHED':
      return 'Publiee';
    case 'HIDDEN':
      return 'Masquee';
  }
}

export function formatArtistRequestStatus(status: ArtistRequestStatus) {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'APPROVED':
      return 'Approuvee';
    case 'REJECTED':
      return 'Refusee';
  }
}

export function formatOrderStatus(status: OrderStatus) {
  switch (status) {
    case 'CHECKOUT_PENDING':
      return 'Paiement en attente';
    case 'PAID':
      return 'Payee';
    case 'CANCELLED':
      return 'Annulee';
    case 'EXPIRED':
      return 'Expiree';
    case 'FAILED':
      return 'Echouee';
  }
}
