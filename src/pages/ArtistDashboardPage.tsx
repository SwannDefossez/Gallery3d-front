import { useEffect, useState } from 'react';
import type { ArtistDashboardArtwork } from '../../shared/gallery';
import { ArtworkEditorForm } from '../components/ArtworkEditorForm';
import { PageShell } from '../components/PageShell';
import { api, ApiError } from '../lib/api';
import { formatCurrencyFromEuros } from '../lib/currency';
import { formatArtworkStatus } from '../lib/displayLabels';

export function ArtistDashboardPage() {
  const [artworks, setArtworks] = useState<ArtistDashboardArtwork[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [editingArtwork, setEditingArtwork] = useState<ArtistDashboardArtwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [submittingArtwork, setSubmittingArtwork] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    const [profileResponse, artworksResponse] = await Promise.all([api.getArtistProfile(), api.getArtistArtworks()]);
    setDisplayName(profileResponse.artistProfile?.displayName ?? '');
    setBio(profileResponse.artistProfile?.bio ?? '');
    setPortfolioUrl(profileResponse.artistProfile?.portfolioUrl ?? '');
    setArtworks(artworksResponse.artworks);
  };

  useEffect(() => {
    refresh()
      .catch((caught) => {
        setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="Espace artiste" subtitle="Gestion du profil, de l inventaire et des soumissions a moderation.">
      {error ? <p className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Profil artiste</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setSavingProfile(true);
                setError('');

                try {
                  await api.updateArtistProfile({ displayName, bio, portfolioUrl });
                } catch (caught) {
                  setError(caught instanceof ApiError ? caught.message : 'Mise a jour impossible.');
                } finally {
                  setSavingProfile(false);
                }
              }}
            >
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
                placeholder="Nom public"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <textarea
                className="min-h-32 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
                placeholder="Bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
                placeholder="Lien du portfolio"
                value={portfolioUrl}
                onChange={(event) => setPortfolioUrl(event.target.value)}
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 disabled:opacity-50"
              >
                {savingProfile ? 'Enregistrement...' : 'Sauvegarder le profil'}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">
                {editingArtwork ? `Modifier: ${editingArtwork.title}` : 'Nouvelle oeuvre'}
              </h2>
              {editingArtwork ? (
                <button
                  className="rounded-full border border-white/10 px-3 py-2 text-sm text-stone-300 hover:bg-white/5"
                  onClick={() => setEditingArtwork(null)}
                >
                  Revenir a la creation
                </button>
              ) : null}
            </div>
            <ArtworkEditorForm
              initialArtwork={editingArtwork}
              submitting={submittingArtwork}
              onSubmit={async (formData) => {
                setSubmittingArtwork(true);
                setError('');

                try {
                  if (editingArtwork) {
                    await api.updateArtistArtwork(editingArtwork.id, formData);
                  } else {
                    await api.createArtistArtwork(formData);
                  }
                  await refresh();
                  setEditingArtwork(null);
                } catch (caught) {
                  setError(caught instanceof ApiError ? caught.message : 'Enregistrement impossible.');
                } finally {
                  setSubmittingArtwork(false);
                }
              }}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Inventaire</h2>
          {loading ? <p className="mt-4 text-stone-400">Chargement...</p> : null}
          <div className="mt-4 space-y-4">
            {artworks.map((artwork) => (
              <article key={artwork.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      className="h-28 w-24 rounded-2xl border border-white/10 object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{artwork.title}</h3>
                      <p className="mt-1 text-sm text-stone-400">{artwork.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-300">
                        <span className="rounded-full bg-white/10 px-3 py-1">Statut: {formatArtworkStatus(artwork.status)}</span>
                        <span className="rounded-full bg-white/10 px-3 py-1">
                          Prix: {formatCurrencyFromEuros(artwork.price)}
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1">
                          Stock: {artwork.stockTotal} total / {artwork.stockReserved} reserve / {artwork.stockSold} vendu
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full border border-white/10 px-3 py-2 text-sm text-stone-200 hover:bg-white/5"
                      onClick={() => setEditingArtwork(artwork)}
                    >
                      Modifier
                    </button>
                    <button
                      className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-400/20"
                      onClick={async () => {
                        try {
                          await api.submitArtistArtwork(artwork.id);
                          await refresh();
                        } catch (caught) {
                          setError(caught instanceof ApiError ? caught.message : 'Soumission impossible.');
                        }
                      }}
                    >
                      Soumettre
                    </button>
                    <button
                      className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/20"
                      onClick={async () => {
                        try {
                          await api.deleteArtistArtwork(artwork.id);
                          await refresh();
                        } catch (caught) {
                          setError(caught instanceof ApiError ? caught.message : 'Suppression impossible.');
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
