import type { AuthUser } from '../../shared/gallery';

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthUser | null;
    }
  }
}

export {};
