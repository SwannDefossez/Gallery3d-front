import type { PropsWithChildren } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useGalleryStore } from '../store';

type PageShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function PageShell({ title, subtitle, children }: PageShellProps) {
  const navigate = useNavigate();
  const authUser = useGalleryStore((state) => state.authUser);
  const setAuthUser = useGalleryStore((state) => state.setAuthUser);
  const setCart = useGalleryStore((state) => state.setCart);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link to="/" className="text-lg font-semibold tracking-tight text-white">
              Galerie3d
            </Link>
            {subtitle ? <p className="mt-1 text-sm text-stone-400">{subtitle}</p> : null}
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-stone-300">
            <Link to="/" className="rounded-full border border-white/10 px-3 py-2 hover:bg-white/5">
              Galerie
            </Link>
            {authUser ? (
              <>
                <Link to="/account" className="rounded-full border border-white/10 px-3 py-2 hover:bg-white/5">
                  Compte
                </Link>
                {authUser.role === 'ARTIST' ? (
                  <Link
                    to="/artist/dashboard"
                    className="rounded-full border border-white/10 px-3 py-2 hover:bg-white/5"
                  >
                    Espace artiste
                  </Link>
                ) : null}
                {authUser.role === 'MODERATOR' ? (
                  <Link to="/moderation" className="rounded-full border border-white/10 px-3 py-2 hover:bg-white/5">
                    Moderation
                  </Link>
                ) : null}
                <button
                  className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-100 hover:bg-amber-400/20"
                  onClick={async () => {
                    await api.logout();
                    setAuthUser(null);
                    setCart(null);
                    navigate('/');
                  }}
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full border border-white/10 px-3 py-2 hover:bg-white/5">
                  Connexion
                </Link>
                <Link to="/register" className="rounded-full border border-white/10 px-3 py-2 hover:bg-white/5">
                  Inscription
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
