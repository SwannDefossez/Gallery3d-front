import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { api, ApiError } from '../lib/api';
import { useGalleryStore } from '../store';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuthUser = useGalleryStore((state) => state.setAuthUser);
  const setCart = useGalleryStore((state) => state.setCart);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <PageShell title="Inscription" subtitle="Cree un compte client puis demande un profil artiste si besoin.">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError('');
            const formData = new FormData(event.currentTarget);

            try {
              const session = await api.register({
                name: String(formData.get('name') ?? ''),
                email: String(formData.get('email') ?? ''),
                password: String(formData.get('password') ?? ''),
              });
              setAuthUser(session.user);
              const cartResponse = await api.getCart();
              setCart(cartResponse.cart);
              navigate('/account');
            } catch (caught) {
              setError(caught instanceof ApiError ? caught.message : 'Inscription impossible.');
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <label className="text-sm text-stone-300">Nom</label>
            <input
              name="name"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-300">Email</label>
            <input
              name="email"
              type="email"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-300">Mot de passe</label>
            <input
              name="password"
              type="password"
              minLength={6}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
              required
            />
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 disabled:opacity-50"
          >
            {loading ? 'Creation...' : 'Creer le compte'}
          </button>
        </form>
        <p className="mt-4 text-sm text-stone-400">
          Deja inscrit ? <Link to="/login" className="text-amber-300">Connexion</Link>
        </p>
      </div>
    </PageShell>
  );
}
