import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { api } from '../lib/api';

export function CheckoutCancelPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Annulation en cours...');

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      setMessage('Paiement annule. La reservation expirera automatiquement si besoin.');
      return;
    }

    api.cancelOrder(orderId)
      .then(() => setMessage('Paiement annule. La reservation de stock a ete relachee.'))
      .catch(() => setMessage('Paiement annule. La reservation expirera automatiquement si besoin.'));
  }, [searchParams]);

  return (
    <PageShell title="Paiement annule" subtitle="La commande n a pas ete finalisee.">
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-amber-100">
        <p className="text-lg font-semibold">{message}</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-950">
          Retour a la galerie
        </Link>
      </div>
    </PageShell>
  );
}
