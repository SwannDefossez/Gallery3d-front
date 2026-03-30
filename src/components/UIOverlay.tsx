import { useEffect } from 'react';
import { Plus, ShoppingCart, X } from 'lucide-react';
import { useGalleryStore } from '../store';

export function UIOverlay() {
  const hasStarted = useGalleryStore((state) => state.hasStarted);
  const setHasStarted = useGalleryStore((state) => state.setHasStarted);
  const isLocked = useGalleryStore((state) => state.isLocked);
  const hoveredArtwork = useGalleryStore((state) => state.hoveredArtwork);
  const selectedArtwork = useGalleryStore((state) => state.selectedArtwork);
  const setSelectedArtwork = useGalleryStore((state) => state.setSelectedArtwork);
  const cart = useGalleryStore((state) => state.cart);
  const addToCart = useGalleryStore((state) => state.addToCart);
  const removeFromCart = useGalleryStore((state) => state.removeFromCart);
  const isCartOpen = useGalleryStore((state) => state.isCartOpen);
  const setCartOpen = useGalleryStore((state) => state.setCartOpen);

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const showOverlay = !isLocked && !isCartOpen && !selectedArtwork;
  const isStartupOverlay = showOverlay && !hasStarted;
  const isResumeOverlay = showOverlay && hasStarted;
  const description = selectedArtwork
    ? selectedArtwork.description ??
      `Cette oeuvre remarquable de ${selectedArtwork.artist} capture l'essence de la fluidite moderne. Parfaite pour un espace contemporain qui cherche une touche d'elegance et de profondeur.`
    : '';

  const closeCart = () => {
    setCartOpen(false);
  };

  const toggleCart = () => {
    setCartOpen(!isCartOpen);
  };

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCart();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isCartOpen]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6">
      <div className="relative z-10 flex items-start justify-between">
        <div className="text-white">
          <h1 className="text-2xl font-bold tracking-tighter">Gallerie3d</h1>
          <p className="text-sm text-gray-400">
            ZQSD pour se deplacer, Espace pour sauter, cliquez pour regarder autour
          </p>
        </div>

        <button
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          onClick={toggleCart}
        >
          <ShoppingCart size={20} />
          <span className="font-medium">{cart.length}</span>
        </button>
      </div>

      {isLocked && !selectedArtwork && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1 w-1 rounded-full bg-white/80" />
        </div>
      )}

      <div
        id="resume-overlay"
        className={`absolute inset-0 z-0 flex cursor-pointer items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          showOverlay ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => {
          if (!hasStarted) {
            setHasStarted(true);
          }
        }}
      >
        {isStartupOverlay ? (
          <div className="max-w-xl rounded-3xl border border-white/10 bg-black/35 px-10 py-8 text-white shadow-2xl backdrop-blur-md">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-white/60">Galerie3d</p>
            <h2 className="mb-4 text-4xl font-bold tracking-tight">Entrez dans la galerie</h2>
            <p className="mb-6 text-sm leading-relaxed text-gray-300">
              Deplacez-vous avec ZQSD, sautez avec Espace, regardez autour avec la souris et approchez-vous des
              oeuvres pour reveler leurs scenes 3D.
            </p>
            <div className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black">
              Cliquer pour commencer
            </div>
          </div>
        ) : null}

        {isResumeOverlay ? (
          <div className="rounded-2xl bg-white/10 px-8 py-4 text-white backdrop-blur-md">
            <p className="text-xl font-bold tracking-widest">CLIQUEZ POUR REPRENDRE</p>
          </div>
        ) : null}
      </div>

      {isLocked && hoveredArtwork && !selectedArtwork && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center text-white">
          <p className="text-lg font-medium">{hoveredArtwork.title}</p>
          <p className="text-sm text-gray-400">Cliquez pour voir les details</p>
        </div>
      )}

      {selectedArtwork && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative flex w-full max-w-4xl flex-col gap-8 rounded-2xl bg-[#111] p-8 md:flex-row">
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
              onClick={() => setSelectedArtwork(null)}
            >
              <X size={24} />
            </button>

            <div className="flex-1">
              <img
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                className="h-full w-full rounded-lg object-cover shadow-2xl"
              />
            </div>

            <div className="flex flex-1 flex-col justify-center gap-6 text-white">
              <div>
                <h2 className="text-4xl font-bold tracking-tight">{selectedArtwork.title}</h2>
                <p className="text-xl text-gray-400">{selectedArtwork.artist}</p>
              </div>

              <p className="text-3xl font-light">${selectedArtwork.price}</p>
              <p className="leading-relaxed text-gray-400">{description}</p>

              <button
                className="flex items-center justify-center gap-2 rounded-xl bg-white py-4 text-lg font-bold text-black transition-transform hover:scale-105 active:scale-95"
                onClick={() => {
                  addToCart(selectedArtwork);
                  setSelectedArtwork(null);
                }}
              >
                <Plus size={24} />
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="pointer-events-auto absolute inset-0 bg-black/30" onClick={closeCart}>
          <div
            className="absolute inset-y-0 right-0 w-full max-w-md bg-[#111] p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Votre panier</h2>
              <button onClick={closeCart} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-400">Votre panier est vide.</p>
            ) : (
              <div className="flex h-[calc(100%-150px)] flex-col gap-4 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 rounded-xl bg-white/5 p-4">
                    <img src={item.imageUrl} alt={item.title} className="h-20 w-20 rounded-lg object-cover" />

                    <div className="flex-1">
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-sm text-gray-400">{item.artist}</p>
                      <p className="font-medium">${item.price}</p>
                    </div>

                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300">
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[#111] p-6">
                <div className="mb-4 flex items-center justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>${total}</span>
                </div>

                <button className="w-full rounded-xl bg-white py-4 text-lg font-bold text-black transition-transform hover:scale-105 active:scale-95">
                  Passer a la caisse
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
