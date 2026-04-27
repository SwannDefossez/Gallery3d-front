import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { api } from './lib/api';
import { GalleryHomePage } from './pages/GalleryHomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { ArtistDashboardPage } from './pages/ArtistDashboardPage';
import { ModerationPage } from './pages/ModerationPage';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage';
import { CheckoutCancelPage } from './pages/CheckoutCancelPage';
import { MAIN_GALLERY_ARTWORKS } from './data/mainGalleryArtworks';
import { useGalleryStore } from './store';

function AppBootstrap() {
  const setArtworks = useGalleryStore((state) => state.setArtworks);
  const setArtworksLoading = useGalleryStore((state) => state.setArtworksLoading);
  const setSessionLoading = useGalleryStore((state) => state.setSessionLoading);
  const setAuthUser = useGalleryStore((state) => state.setAuthUser);
  const setCart = useGalleryStore((state) => state.setCart);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setArtworksLoading(true);
      setSessionLoading(true);

      try {
        const galleryPromise = api.getMainGallery().catch(() => ({ artworks: MAIN_GALLERY_ARTWORKS }));
        const sessionPromise = api.getSession().catch(() => ({ user: null }));
        const [galleryResponse, sessionResponse] = await Promise.all([galleryPromise, sessionPromise]);

        if (cancelled) {
          return;
        }

        setArtworks(galleryResponse.artworks);
        setAuthUser(sessionResponse.user);

        if (sessionResponse.user) {
          const cartResponse = await api.getCart().catch(() => ({ cart: null }));
          if (!cancelled) {
            setCart(cartResponse.cart);
          }
        } else {
          setCart(null);
        }
      } finally {
        if (!cancelled) {
          setArtworksLoading(false);
          setSessionLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setArtworks, setArtworksLoading, setSessionLoading, setAuthUser, setCart]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBootstrap />
      <Routes>
        <Route path="/" element={<GalleryHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute roles={['USER', 'ARTIST', 'MODERATOR']} />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['ARTIST']} />}>
          <Route path="/artist/dashboard" element={<ArtistDashboardPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['MODERATOR']} />}>
          <Route path="/moderation" element={<ModerationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
