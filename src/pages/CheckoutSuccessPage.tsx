import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { api, ApiError } from '../lib/api';
import type { OrderView } from '../../shared/gallery';
import { formatCurrencyFromCents } from '../lib/currency';
import { formatOrderStatus } from '../lib/displayLabels';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [message, setMessage] = useState('Verification de la commande...');
  const [error, setError] = useState('');

  useEffect(() => {
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      setMessage('Achat confirme.');
      return;
    }

    api.getOrderById(orderId)
      .then((response) => {
        setOrder(response.order);
        setMessage(
          response.order.status === 'PAID'
            ? 'Achat confirme et inventaire mis a jour.'
            : `Commande creee. Etat actuel: ${formatOrderStatus(response.order.status)}.`,
        );
      })
      .catch((caught) => {
        setError(caught instanceof ApiError ? caught.message : 'Impossible de verifier la commande.');
      });
  }, [searchParams]);

  return (
    <PageShell title="Achat confirme" subtitle="La commande a ete finalisee avec succes.">
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-emerald-100">
        <p className="text-lg font-semibold">{message}</p>
        <p className="mt-3 text-sm text-emerald-50/80">
          L inventaire et l historique de commande ont ete mis a jour.
        </p>
        {error ? <p className="mt-4 text-sm text-rose-100">{error}</p> : null}
        {order ? (
          <div className="mt-6 rounded-2xl border border-white/15 bg-black/15 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white">{formatOrderStatus(order.status)}</span>
              <span className="text-lg font-semibold text-white">{formatCurrencyFromCents(order.totalCents)}</span>
            </div>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <img src={item.imageUrl} alt={item.title} className="h-16 w-14 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-emerald-50/80">
                      {item.quantity} x {formatCurrencyFromCents(item.unitPriceCents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <Link to="/" className="mt-6 inline-flex rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-950">
          Retour a la galerie
        </Link>
        <Link to="/account" className="mt-6 ml-3 inline-flex rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white">
          Voir le compte
        </Link>
      </div>
    </PageShell>
  );
}
