import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { formatCurrencyFromCents } from '../lib/currency';
import { formatOrderStatus, formatUserRole } from '../lib/displayLabels';
import { api, ApiError } from '../lib/api';
import { useGalleryStore } from '../store';
import type { OrderView } from '../../shared/gallery';

export function AccountPage() {
  const authUser = useGalleryStore((state) => state.authUser);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.getOrders()
      .then((ordersResponse) => {
        if (cancelled) {
          return;
        }
        setOrders(ordersResponse.orders);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Chargement du compte impossible.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOrders(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell title="Compte" subtitle="Gere ton acces client, ton role et tes espaces prives.">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Profil</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{authUser?.name}</h2>
          <p className="mt-2 text-stone-400">{authUser?.email}</p>
          <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-2 text-sm text-stone-200">
            Role: {authUser ? formatUserRole(authUser.role) : ''}
          </p>

          {authUser?.role === 'ARTIST' ? (
            <div className="mt-6">
              <Link to="/artist/dashboard" className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-950">
                Ouvrir l espace artiste
              </Link>
            </div>
          ) : null}

          {authUser?.role === 'MODERATOR' ? (
            <div className="mt-6">
              <Link to="/moderation" className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-950">
                Ouvrir la moderation
              </Link>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Demande artiste</p>
          {authUser?.role === 'USER' ? (
            <form
              className="mt-4 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError('');
                setMessage('');
                const formData = new FormData(event.currentTarget);

                try {
                  await api.submitArtistRequest(String(formData.get('motivation') ?? ''));
                  setMessage('Demande envoyee au moderateur.');
                  event.currentTarget.reset();
                } catch (caught) {
                  setError(caught instanceof ApiError ? caught.message : 'Envoi impossible.');
                }
              }}
            >
              <textarea
                name="motivation"
                className="min-h-40 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
                placeholder="Explique ton univers, ton experience et pourquoi tu veux un espace artiste."
                required
              />
              {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <button type="submit" className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950">
                Envoyer la demande
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-stone-400">
              Ce compte a deja un role eleve. Utilise les liens ci-contre pour acceder aux outils prives.
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Commandes</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Historique</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-2 text-sm text-stone-200">{orders.length} commandes</span>
          </div>

          {loadingOrders ? <p className="mt-4 text-sm text-stone-400">Chargement des commandes...</p> : null}

          <div className="mt-4 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-stone-400">{new Date(order.createdAt).toLocaleString('fr-FR')}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{formatCurrencyFromCents(order.totalCents)}</h3>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-stone-200">
                    {formatOrderStatus(order.status)}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <img src={item.imageUrl} alt={item.title} className="h-16 w-14 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-stone-400">
                          {item.quantity} x {formatCurrencyFromCents(item.unitPriceCents)}
                        </p>
                        {item.artistName ? <p className="text-xs text-stone-500">{item.artistName}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!loadingOrders && orders.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-stone-400">
                Aucune commande pour le moment.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Commandes</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Suivi des achats</h2>
          <div className="mt-4 space-y-3 text-sm text-stone-300">
            <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-stone-400">
              Retrouvez ici vos achats confirmes, leur total et les oeuvres associees.
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
