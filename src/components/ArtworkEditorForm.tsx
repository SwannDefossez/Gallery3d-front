import { useEffect, useState } from 'react';
import type { ArtistDashboardArtwork } from '../../shared/gallery';

type ArtworkEditorFormProps = {
  initialArtwork?: ArtistDashboardArtwork | null;
  onSubmit: (formData: FormData) => Promise<void>;
  submitting: boolean;
};

type ArtworkFormState = {
  title: string;
  description: string;
  price: string;
  stockTotal: string;
  galleryKey: string;
  debugNumber: string;
  positionX: string;
  positionY: string;
  positionZ: string;
  rotationX: string;
  rotationY: string;
  rotationZ: string;
  width: string;
  height: string;
  hitboxX: string;
  hitboxY: string;
  hitboxZ: string;
  previewAspectRatio: string;
  previewSourceRatio: string;
  previewObjectPosition: string;
  previewZoom: string;
  previewFlipY: boolean;
  sceneTexturePath: string;
  sourceNodeName: string;
};

function createState(artwork?: ArtistDashboardArtwork | null): ArtworkFormState {
  return {
    title: artwork?.title ?? '',
    description: artwork?.description ?? '',
    price: artwork ? String(artwork.price) : '',
    stockTotal: artwork ? String(artwork.stockTotal) : '1',
    galleryKey: artwork?.galleryKey ?? 'main-gallery',
    debugNumber: artwork ? String(artwork.debugNumber) : '999',
    positionX: artwork ? String(artwork.position[0]) : '0',
    positionY: artwork ? String(artwork.position[1]) : '1.5',
    positionZ: artwork ? String(artwork.position[2]) : '0',
    rotationX: artwork ? String(artwork.rotation[0]) : '0',
    rotationY: artwork ? String(artwork.rotation[1]) : '0',
    rotationZ: artwork ? String(artwork.rotation[2]) : '0',
    width: artwork ? String(artwork.width) : '1',
    height: artwork ? String(artwork.height) : '1',
    hitboxX: artwork ? String(artwork.hitboxSize[0]) : '1',
    hitboxY: artwork ? String(artwork.hitboxSize[1]) : '1',
    hitboxZ: artwork ? String(artwork.hitboxSize[2]) : '0.05',
    previewAspectRatio: artwork?.previewAspectRatio ? String(artwork.previewAspectRatio) : '',
    previewSourceRatio: artwork?.previewSourceRatio ? String(artwork.previewSourceRatio) : '',
    previewObjectPosition: artwork?.previewObjectPosition ?? '',
    previewZoom: artwork?.previewZoom ? String(artwork.previewZoom) : '',
    previewFlipY: artwork?.previewFlipY ?? true,
    sceneTexturePath: artwork?.sceneTextureUrl ?? '',
    sourceNodeName: artwork?.sourceNodeName ?? '',
  };
}

export function ArtworkEditorForm({ initialArtwork, onSubmit, submitting }: ArtworkEditorFormProps) {
  const [form, setForm] = useState<ArtworkFormState>(() => createState(initialArtwork));
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setForm(createState(initialArtwork));
    setImageFile(null);
  }, [initialArtwork]);

  return (
    <form
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData();

        Object.entries(form).forEach(([key, value]) => {
          formData.set(key, typeof value === 'boolean' ? String(value) : value);
        });

        if (imageFile) {
          formData.set('image', imageFile);
        }

        await onSubmit(formData);
        if (!initialArtwork) {
          setForm(createState(null));
          setImageFile(null);
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-stone-300">Titre</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-stone-300">Image</span>
          <input
            type="file"
            accept="image/*"
            className="block w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-stone-300"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm text-stone-300">Description</span>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['price', 'Prix EUR'],
          ['stockTotal', 'Stock total'],
          ['debugNumber', 'Numero debug'],
          ['galleryKey', 'Cle de galerie'],
          ['positionX', 'Position X'],
          ['positionY', 'Position Y'],
          ['positionZ', 'Position Z'],
          ['rotationX', 'Rotation X'],
          ['rotationY', 'Rotation Y'],
          ['rotationZ', 'Rotation Z'],
          ['width', 'Largeur'],
          ['height', 'Hauteur'],
          ['hitboxX', 'Zone de collision X'],
          ['hitboxY', 'Zone de collision Y'],
          ['hitboxZ', 'Zone de collision Z'],
          ['previewAspectRatio', 'Ratio d apercu'],
          ['previewSourceRatio', 'Ratio source de l apercu'],
          ['previewObjectPosition', 'Position de l apercu'],
          ['previewZoom', 'Zoom de l apercu'],
          ['sceneTexturePath', 'Chemin de texture de scene'],
          ['sourceNodeName', 'Nom du noeud source'],
        ].map(([key, label]) => (
          <label key={key} className="space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-stone-500">{label}</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-400/60"
              value={form[key as keyof ArtworkFormState] as string}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </label>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-stone-200">
        <input
          type="checkbox"
          checked={form.previewFlipY}
          onChange={(event) => setForm((current) => ({ ...current, previewFlipY: event.target.checked }))}
        />
        Retourner l image en preview
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Enregistrement...' : initialArtwork ? 'Mettre a jour l oeuvre' : 'Creer une oeuvre'}
      </button>
    </form>
  );
}
