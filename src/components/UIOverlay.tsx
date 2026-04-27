import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShoppingBag, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatCurrencyFromCents, formatCurrencyFromEuros } from '../lib/currency';
import { useGalleryStore } from '../store';
import { MAIN_GALLERY_ARTWORKS } from '../data/mainGalleryArtworks';

function previewStretchTransform({
  zoom = 1,
  sourceRatio = 1,
  flipY = false,
}: {
  zoom?: number;
  sourceRatio?: number;
  flipY?: boolean;
}) {
  const isLandscape = sourceRatio > 1.1;
  const isPortrait = sourceRatio < 0.9;
  const stretchX = isLandscape ? 0.84 : 1;
  const stretchY = isPortrait ? 0.82 : 1;
  const finalScaleY = stretchY * (flipY ? -1 : 1);
  return `scale(${zoom}) scale(${stretchX}, ${finalScaleY})`;
}

export function UIOverlay() {
  const navigate = useNavigate();
  const hasStarted = useGalleryStore((s) => s.hasStarted);
  const setHasStarted = useGalleryStore((s) => s.setHasStarted);
  const isLocked = useGalleryStore((s) => s.isLocked);
  const authUser = useGalleryStore((s) => s.authUser);
  const artworks = useGalleryStore((s) => s.artworks);
  const cart = useGalleryStore((s) => s.cart);
  const setCart = useGalleryStore((s) => s.setCart);
  const selectedArtwork = useGalleryStore((s) => s.selectedArtwork);
  const setSelectedArtwork = useGalleryStore((s) => s.setSelectedArtwork);
  const isCartOpen = useGalleryStore((s) => s.isCartOpen);
  const setCartOpen = useGalleryStore((s) => s.setCartOpen);
  const isEditorMode = useGalleryStore((s) => s.isEditorMode);
  const setEditorMode = useGalleryStore((s) => s.setEditorMode);
  const hoveredArtworkId = useGalleryStore((s) => s.hoveredArtworkId);
  const selectedEditorArtworkId = useGalleryStore((s) => s.selectedEditorArtworkId);
  const editorCamera = useGalleryStore((s) => s.editorCamera);
  const isArtworksLoading = useGalleryStore((s) => s.isArtworksLoading);
  const canUseEditorMode = authUser?.role === 'MODERATOR';
  const galleryArtworks = artworks.length > 0 ? artworks : MAIN_GALLERY_ARTWORKS;
  const selectedEditorArtwork =
    galleryArtworks.find((artwork) => artwork.id === selectedEditorArtworkId) ?? null;
  const hoveredArtwork = galleryArtworks.find((artwork) => artwork.id === hoveredArtworkId) ?? null;
  const hoveredArtworkPreview = hasStarted && isLocked && !isCartOpen && !isEditorMode ? hoveredArtwork : null;
  const cartItemsCount = useMemo(
    () => cart?.items.reduce((count, item) => count + item.quantity, 0) ?? 0,
    [cart],
  );
  const availableStock = selectedArtwork
    ? Math.max(selectedArtwork.stockTotal - selectedArtwork.stockReserved - selectedArtwork.stockSold, 0)
    : 0;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const showOverlay = !isLocked && !isCartOpen && !isEditorMode && !selectedArtwork;
  const isEnterOverlay = showOverlay && !hasStarted;
  const isResumeOverlay = showOverlay && hasStarted;

  const closeCart = () => setCartOpen(false);

  useEffect(() => {
    if (!canUseEditorMode && isEditorMode) {
      setEditorMode(false);
    }
  }, [canUseEditorMode, isEditorMode, setEditorMode]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (selectedArtwork) {
        event.preventDefault();
        setSelectedArtwork(null);
        return;
      }

      if (isCartOpen) {
        event.preventDefault();
        closeCart();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCartOpen, selectedArtwork, setSelectedArtwork]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6">
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div className="text-white">
          <h1 className="text-2xl font-bold tracking-tighter">Galerie3d</h1>
          <p className="text-sm text-gray-400">
            {isEditorMode
              ? 'Mode edition: ZQSD avancer, Espace monter, Shift descendre, Tab pour liberer la souris, cliquez pour regarder'
              : 'ZQSD pour se deplacer - Espace pour sauter - Cliquez pour regarder'}
          </p>
          {isArtworksLoading ? <p className="mt-2 text-xs text-amber-200/80">Synchronisation de la galerie...</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {hasStarted ? (
            <button
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              onClick={() => {
                setHasStarted(false);
                setEditorMode(false);
                setSelectedArtwork(null);
                setCartOpen(false);
              }}
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Accueil</span>
            </button>
          ) : null}

          {authUser ? (
            <Link
              to={authUser.role === 'MODERATOR' ? '/moderation' : authUser.role === 'ARTIST' ? '/artist/dashboard' : '/account'}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <UserRound size={16} />
              {authUser.role === 'MODERATOR' ? 'Moderateur' : authUser.role === 'ARTIST' ? 'Espace artiste' : 'Compte'}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="pointer-events-auto rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="pointer-events-auto rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-stone-950 transition-colors hover:bg-amber-300"
              >
                Inscription
              </Link>
            </>
          )}

          {authUser ? (
            <button
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-300"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={16} />
              Panier
              {cartItemsCount > 0 ? <span className="rounded-full bg-stone-950/10 px-2 py-0.5 text-xs">{cartItemsCount}</span> : null}
            </button>
          ) : null}

          {hasStarted && canUseEditorMode ? (
            <button
              className={`pointer-events-auto rounded-full px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors ${
                isEditorMode ? 'bg-amber-600/80 hover:bg-amber-500/80' : 'bg-white/10 hover:bg-white/20'
              }`}
              onClick={() => setEditorMode(!isEditorMode)}
            >
              {isEditorMode ? 'Quitter edition' : 'Mode edition'}
            </button>
          ) : null}
        </div>
      </div>

      {isEditorMode && canUseEditorMode ? (
        <div className="pointer-events-none absolute left-6 top-24 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Mode Edition</p>
          <p className="mt-2 text-sm">Position: X {editorCamera.x} | Y {editorCamera.y} | Z {editorCamera.z}</p>
          <p className="text-sm">Rotation: Pitch {editorCamera.pitch} | Yaw {editorCamera.yaw} | Roll {editorCamera.roll}</p>
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Tableau Selectionne</p>
            {selectedEditorArtwork ? (
              <>
                <p className="mt-2 text-sm font-semibold">Numero {selectedEditorArtwork.debugNumber}</p>
                <p className="mt-2 text-xs text-white/55">Clic sur un tableau pour le selectionner</p>
              </>
            ) : (
              <p className="mt-2 text-xs text-white/55">Clic sur un tableau pour le selectionner.</p>
            )}
          </div>
        </div>
      ) : null}

      {isLocked ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1 w-1 rounded-full bg-white/80" />
        </div>
      ) : null}

      <div
        id="resume-overlay"
        className={`absolute inset-0 z-0 flex cursor-pointer items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isEnterOverlay || isResumeOverlay ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => {
          setHasStarted(true);
        }}
      >
        {isEnterOverlay ? (
          <div className="flex max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/55 text-white shadow-2xl backdrop-blur-md">
            <div className="flex flex-col justify-center px-8 py-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-white/50">Galerie3d</p>
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Salle principale</h2>
              <p className="mb-5 text-sm leading-relaxed text-gray-300">
                Explore la salle principale, ouvre les fiches detaillees et prepare un achat sans perdre les images deja placees dans la galerie.
              </p>
              <div className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black">
                Cliquer pour commencer
              </div>
            </div>
          </div>
        ) : null}

        {isResumeOverlay ? (
          <div className="rounded-2xl bg-white/10 px-8 py-4 text-white backdrop-blur-md">
            <p className="text-xl font-bold tracking-widest">CLIQUEZ POUR REPRENDRE</p>
          </div>
        ) : null}
      </div>

      <div
        className={`absolute bottom-4 left-1/2 z-10 w-[min(92vw,32rem)] -translate-x-1/2 transition-all duration-200 ${
          hoveredArtworkPreview ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        {hoveredArtworkPreview ? (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/68 text-white shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-[6.75rem_1fr] gap-0 md:grid-cols-[7.5rem_1fr]">
              <div className="border-r border-white/10 bg-white/[0.03] p-3">
                <div className="relative h-24 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 md:h-28">
                  <img
                    src={hoveredArtworkPreview.imageUrl}
                    alt={hoveredArtworkPreview.title}
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{
                      objectPosition: hoveredArtworkPreview.previewObjectPosition ?? '50% 50%',
                      transform: previewStretchTransform({
                        zoom: hoveredArtworkPreview.previewZoom ?? 1,
                        sourceRatio: hoveredArtworkPreview.previewSourceRatio ?? 1,
                        flipY: hoveredArtworkPreview.previewFlipY ?? false,
                      }),
                    }}
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-center px-4 py-3 md:px-5">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.26em] text-white/45">Apercu oeuvre</p>
                <h3 className="mt-1 line-clamp-1 text-base font-semibold tracking-tight md:text-lg">
                  {hoveredArtworkPreview.title}
                </h3>
                <p className="mt-0.5 text-xs text-white/65 md:text-sm">{hoveredArtworkPreview.artist}</p>
                {hoveredArtworkPreview.description ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/80 md:text-sm">
                    {hoveredArtworkPreview.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selectedArtwork ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="grid max-h-[92vh] w-full max-w-5xl gap-0 overflow-hidden rounded-[2rem] border border-white/10 bg-stone-950 text-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative flex min-h-[22rem] items-center justify-center overflow-hidden border-b border-white/10 bg-black/40 p-6 lg:min-h-[40rem] lg:border-b-0 lg:border-r">
              <div className="flex h-full max-h-[78vh] w-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/8 bg-black/20">
                <img
                  src={selectedArtwork.imageUrl}
                  alt={selectedArtwork.title}
                  className="max-h-[72vh] w-auto max-w-full object-contain"
                  style={{
                    objectPosition: selectedArtwork.previewObjectPosition ?? '50% 50%',
                    transform: previewStretchTransform({
                      zoom: Math.min(selectedArtwork.previewZoom ?? 1, 1.08),
                      sourceRatio: selectedArtwork.previewSourceRatio ?? 1,
                      flipY: selectedArtwork.previewFlipY ?? true,
                    }),
                  }}
                />
              </div>
            </div>
            <div className="flex max-h-[92vh] flex-col overflow-y-auto p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/45">Fiche oeuvre</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">{selectedArtwork.title}</h2>
                  <p className="mt-2 text-base text-stone-300">{selectedArtwork.artist}</p>
                </div>
                <button
                  className="rounded-full border border-white/10 px-3 py-2 text-sm text-stone-300 hover:bg-white/5"
                  onClick={() => setSelectedArtwork(null)}
                >
                  Fermer
                </button>
              </div>

              <p className="mt-6 text-sm leading-7 text-stone-300">
                {selectedArtwork.description ?? 'Cette oeuvre n a pas encore de description detaillee.'}
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Prix</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatCurrencyFromEuros(selectedArtwork.price)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Stock disponible</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{availableStock}</p>
                </div>
              </div>

              {selectedArtwork.artistProfile?.bio ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Artiste</p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{selectedArtwork.artistProfile.bio}</p>
                </div>
              ) : null}

              {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}

              <div className="mt-auto flex flex-wrap gap-3 pt-8">
                {authUser ? (
                  <button
                    disabled={busy || availableStock <= 0}
                    className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={async () => {
                      setBusy(true);
                      setError('');

                      try {
                        const cartResponse = await api.addCartItem(selectedArtwork.id, 1);
                        setCart(cartResponse.cart);
                        setSelectedArtwork(null);
                        setCartOpen(true);
                      } catch (caught) {
                        setError(caught instanceof ApiError ? caught.message : 'Impossible d ajouter cette oeuvre.');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {availableStock > 0 ? 'Ajouter au panier' : 'Indisponible'}
                  </button>
                ) : (
                  <button
                    className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950"
                    onClick={() => navigate('/login', { state: { from: '/' } })}
                  >
                    Se connecter pour acheter
                  </button>
                )}
                <button
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/5"
                  onClick={() => setSelectedArtwork(null)}
                >
                  Continuer la visite
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCartOpen ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex justify-end bg-black/55 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-stone-950 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/45">Panier</p>
                <h2 className="mt-2 text-2xl font-semibold">Finalisation de l achat</h2>
              </div>
              <button
                className="rounded-full border border-white/10 px-3 py-2 text-sm text-stone-300 hover:bg-white/5"
                onClick={closeCart}
              >
                Fermer
              </button>
            </div>

            <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
              {cart?.items.length ? (
                cart.items.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex gap-4">
                      <div className="relative h-24 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        <img
                          src={item.artwork.imageUrl}
                          alt={item.artwork.title}
                          className="absolute inset-0 h-full w-full object-contain"
                          style={{
                            objectPosition: item.artwork.previewObjectPosition ?? '50% 50%',
                            transform: previewStretchTransform({
                              zoom: item.artwork.previewZoom ?? 1,
                              sourceRatio: item.artwork.previewSourceRatio ?? 1,
                              flipY: item.artwork.previewFlipY ?? true,
                            }),
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-base font-semibold">{item.artwork.title}</h3>
                        <p className="mt-1 text-sm text-stone-400">{item.artwork.artist}</p>
                        <p className="mt-2 text-sm text-stone-200">{formatCurrencyFromCents(item.unitPriceCents)}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-stone-300">
                            Quantite: 1
                          </span>
                          <button
                            className="ml-auto rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-sm text-rose-200 hover:bg-rose-500/20"
                            onClick={async () => {
                              const cartResponse = await api.removeCartItem(item.id);
                              setCart(cartResponse.cart);
                            }}
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-stone-400">
                  Aucun article dans le panier.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between text-sm text-stone-400">
                <span>Total</span>
                <span className="text-xl font-semibold text-white">
                  {formatCurrencyFromCents(cart?.totalCents ?? 0)}
                </span>
              </div>
              {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
              <button
                disabled={busy || !cart?.items.length}
                className="mt-4 w-full rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  setBusy(true);
                  setError('');

                  try {
                    const response = await api.createCheckoutSession();
                    window.location.href = response.checkoutUrl;
                  } catch (caught) {
                    setError(caught instanceof ApiError ? caught.message : 'Impossible de finaliser l achat.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Finaliser l achat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
