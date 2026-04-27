import { useEffect, useState } from 'react';
import type { ArtistRequestView, GalleryArtwork } from '../../shared/gallery';
import { PageShell } from '../components/PageShell';
import { api, ApiError } from '../lib/api';
import { formatArtworkStatus } from '../lib/displayLabels';

export function ModerationPage() {
  const [requests, setRequests] = useState<ArtistRequestView[]>([]);
  const [artworks, setArtworks] = useState<GalleryArtwork[]>([]);
  const [error, setError] = useState('');

  const refresh = async () => {
    const [requestsResponse, artworksResponse] = await Promise.all([
      api.getModerationRequests(),
      api.getModerationArtworks(),
    ]);
    setRequests(requestsResponse.requests);
    setArtworks(artworksResponse.artworks);
  };

  useEffect(() => {
    refresh().catch((caught) => {
      setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
    });
  }, []);

  return (
    <PageShell title="Moderation" subtitle="Valide les demandes d artistes et controle la publication des oeuvres.">
      {error ? <p className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Demandes artiste</h2>
          <div className="mt-4 space-y-4">
            {requests.map((request) => (
              <article key={request.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <p className="text-sm text-stone-400">{request.user.name} · {request.user.email}</p>
                <p className="mt-3 text-sm leading-6 text-stone-200">{request.motivation}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-stone-950"
                    onClick={async () => {
                      await api.approveArtistRequest(request.id);
                      await refresh();
                    }}
                  >
                    Approuver
                  </button>
                  <button
                    className="rounded-full bg-rose-400 px-4 py-2 text-sm font-semibold text-stone-950"
                    onClick={async () => {
                      await api.rejectArtistRequest(request.id);
                      await refresh();
                    }}
                  >
                    Refuser
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Oeuvres</h2>
          <div className="mt-4 space-y-4">
            {artworks.map((artwork) => (
              <article key={artwork.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="flex gap-4">
                  <img src={artwork.imageUrl} alt={artwork.title} className="h-28 w-24 rounded-2xl object-cover" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-white">{artwork.title}</h3>
                    <p className="text-sm text-stone-400">{artwork.artist}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{artwork.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-stone-300">
                        Statut: {formatArtworkStatus(artwork.status)}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-stone-300">
                        Stock dispo: {artwork.stockTotal - artwork.stockReserved - artwork.stockSold}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-stone-950"
                    onClick={async () => {
                      await api.publishArtwork(artwork.id);
                      await refresh();
                    }}
                  >
                    Publier
                  </button>
                  <button
                    className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950"
                    onClick={async () => {
                      await api.hideArtwork(artwork.id);
                      await refresh();
                    }}
                  >
                    Masquer
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
