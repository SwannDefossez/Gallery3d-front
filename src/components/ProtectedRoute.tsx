import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useGalleryStore } from '../store';

type ProtectedRouteProps = {
  roles?: Array<'USER' | 'ARTIST' | 'MODERATOR'>;
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const location = useLocation();
  const isSessionLoading = useGalleryStore((state) => state.isSessionLoading);
  const authUser = useGalleryStore((state) => state.authUser);

  if (isSessionLoading) {
    return null;
  }

  if (!authUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(authUser.role)) {
    return <Navigate to="/account" replace />;
  }

  return <Outlet />;
}
