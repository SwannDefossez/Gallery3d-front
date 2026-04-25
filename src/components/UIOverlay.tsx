import { Bounds, Clone, Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, ShoppingCart, X } from 'lucide-react';
import * as THREE from 'three';
import { useGalleryStore, type ArtworkData } from '../store';
import { MAIN_GALLERY_SAVED_TABLE_PLACEMENTS } from '../data/mainGalleryReplacementArtworks';

const MAIN_GALLERY_PREVIEW_URL = '/assets/previews/main-gallery-preview.png';

type NumericFieldProps = {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
};

function NumericField({ label, value, step = 0.01, onChange }: NumericFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-[0.2em] text-white/55">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        className="pointer-events-auto w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-right text-sm text-white outline-none transition-colors focus:border-amber-400/60"
        onChange={(event) => {
          const nextValue = event.currentTarget.valueAsNumber;
          onChange(Number.isFinite(nextValue) ? nextValue : 0);
        }}
      />
    </label>
  );
}

function formatPresetNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toString();
}

function formatPresetVector(values: [number, number, number]) {
  return `[${values.map(formatPresetNumber).join(', ')}]`;
}

function ModalArtworkModel({ artwork }: { artwork: ArtworkData }) {
  const { scene } = useGLTF(artwork.modelUrl);

  const normalized = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const safeSize = new THREE.Vector3(
      Math.max(size.x, 0.001),
      Math.max(size.y, 0.001),
      Math.max(size.z, 0.001),
    );

    let scale = 1;

    if (artwork.isEnvironment) {
      if (artwork.environmentScaleMode === 'real') {
        scale = 1;
      } else {
        const fitX = 20 / safeSize.x;
        const fitY = 10 / safeSize.y;
        const fitZ = 20 / safeSize.z;
        scale = Math.min(fitX, fitY, fitZ);
      }
    } else {
      const maxDimension = Math.max(safeSize.x, safeSize.y, safeSize.z);
      scale = 3 / maxDimension;
    }

    return {
      center,
      scale: scale * (artwork.environmentScaleMultiplier ?? 1),
    };
  }, [artwork.environmentScaleMode, artwork.environmentScaleMultiplier, artwork.isEnvironment, scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if ('castShadow' in child) {
        child.castShadow = false;
      }

      if ('receiveShadow' in child) {
        child.receiveShadow = false;
      }
    });
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.75} color="#ffffff" />
      <directionalLight position={[6, 8, 4]} intensity={1.1} color="#fff7ea" />
      <Environment preset="city" resolution={64} frames={1} />

      <Bounds fit clip observe margin={1.15}>
        <group>
          <group rotation={artwork.modelRotation ?? [0, 0, 0]}>
            <group scale={normalized.scale}>
              <group
                position={[
                  -(normalized.center.x - (artwork.environmentOffset?.[0] ?? 0)),
                  -(normalized.center.y - (artwork.environmentOffset?.[1] ?? 0)),
                  -(normalized.center.z - (artwork.environmentOffset?.[2] ?? 0)),
                ]}
              >
                <Clone object={scene} />
              </group>
            </group>
          </group>
        </group>
      </Bounds>
    </>
  );
}

function ArtworkModalViewer({ artwork }: { artwork: ArtworkData }) {
  if (!artwork.modelUrl) {
    return (
      <img
        src={artwork.imageUrl}
        alt={artwork.title}
        className="h-full w-full rounded-lg object-cover shadow-2xl"
      />
    );
  }

  return (
    <div className="relative h-[24rem] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_top,#20222a_0%,#09090b_60%,#050505_100%)] shadow-2xl">
      <Canvas camera={{ position: [0, 0, 6], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={['#070709']} />
        <fog attach="fog" args={['#070709', 12, 28]} />
        <Suspense fallback={null}>
          <ModalArtworkModel artwork={artwork} />
        </Suspense>
        <OrbitControls enablePan={false} enableDamping minDistance={1.5} maxDistance={24} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-xs text-white/65">
        Cliquez-glissez pour tourner. Molette pour zoomer.
      </div>
    </div>
  );
}

export function UIOverlay() {
  const hasStarted = useGalleryStore((s) => s.hasStarted);
  const setHasStarted = useGalleryStore((s) => s.setHasStarted);
  const isLocked = useGalleryStore((s) => s.isLocked);
  const hoveredArtwork = useGalleryStore((s) => s.hoveredArtwork);
  const selectedArtwork = useGalleryStore((s) => s.selectedArtwork);
  const setSelectedArtwork = useGalleryStore((s) => s.setSelectedArtwork);
  const cart = useGalleryStore((s) => s.cart);
  const addToCart = useGalleryStore((s) => s.addToCart);
  const removeFromCart = useGalleryStore((s) => s.removeFromCart);
  const isCartOpen = useGalleryStore((s) => s.isCartOpen);
  const setCartOpen = useGalleryStore((s) => s.setCartOpen);
  const isEditorMode = useGalleryStore((s) => s.isEditorMode);
  const setEditorMode = useGalleryStore((s) => s.setEditorMode);
  const editorCamera = useGalleryStore((s) => s.editorCamera);
  const galleryHoverHint = useGalleryStore((s) => s.galleryHoverHint);
  const portalSurfaceTuning = useGalleryStore((s) => s.portalSurfaceTuning);
  const setPortalSurfaceTuning = useGalleryStore((s) => s.setPortalSurfaceTuning);
  const portalWorldTuning = useGalleryStore((s) => s.portalWorldTuning);
  const setPortalWorldTuning = useGalleryStore((s) => s.setPortalWorldTuning);
  const tableau9WorldTuning = useGalleryStore((s) => s.tableau9WorldTuning);
  const setTableau9WorldTuning = useGalleryStore((s) => s.setTableau9WorldTuning);
  const galleryFloorTuning = useGalleryStore((s) => s.galleryFloorTuning);
  const setGalleryFloorTuning = useGalleryStore((s) => s.setGalleryFloorTuning);
  const infernoPortalEnabled = useGalleryStore((s) => s.infernoPortalEnabled);
  const tableau9PortalEnabled = useGalleryStore((s) => s.tableau9PortalEnabled);
  const resetGalleryTuning = useGalleryStore((s) => s.resetGalleryTuning);
  const [presetStatus, setPresetStatus] = useState('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const suppressResumeOverlay = isEditorMode;
  const showOverlay = !isLocked && !isCartOpen && !selectedArtwork && !suppressResumeOverlay;
  const isEnterOverlay = showOverlay && !hasStarted;
  const isResumeOverlay = showOverlay && hasStarted;

  const description = selectedArtwork
    ? selectedArtwork.description ??
      `Cette oeuvre remarquable de ${selectedArtwork.artist} capture une presence immersive adaptee a la galerie principale.`
    : '';

  const closeCart = () => setCartOpen(false);
  const toggleCart = () => setCartOpen(!isCartOpen);

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
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCartOpen]);

  const updateSurfaceVector = (key: 'scale' | 'offsetLocal' | 'rotationOffsetDeg', index: number, value: number) => {
    setPortalSurfaceTuning((prev) => {
      const next = [...prev[key]] as [number, number, number];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateWorldVector = (key: 'position' | 'rotation', index: number, value: number) => {
    setPortalWorldTuning((prev) => {
      const next = [...prev[key]] as [number, number, number];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateTableau9WorldVector = (key: 'position' | 'rotation', index: number, value: number) => {
    setTableau9WorldTuning((prev) => {
      const next = [...prev[key]] as [number, number, number];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateFloorVector = (key: 'repeat' | 'offset', index: number, value: number) => {
    setGalleryFloorTuning((prev) => {
      const next = [...prev[key]] as [number, number];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const galleryPresetSnippet = `export const DEFAULT_PORTAL_SURFACE_TUNING = {
  scale: ${formatPresetVector(portalSurfaceTuning.scale)},
  offsetLocal: ${formatPresetVector(portalSurfaceTuning.offsetLocal)},
  rotationOffsetDeg: ${formatPresetVector(portalSurfaceTuning.rotationOffsetDeg)},
};

export const DEFAULT_PORTAL_WORLD_TUNING = {
  scaleMultiplier: ${formatPresetNumber(portalWorldTuning.scaleMultiplier)},
  position: ${formatPresetVector(portalWorldTuning.position)},
  rotation: ${formatPresetVector(portalWorldTuning.rotation)},
};

export const DEFAULT_TABLEAU_9_WORLD_TUNING = {
  scaleMultiplier: ${formatPresetNumber(tableau9WorldTuning.scaleMultiplier)},
  position: ${formatPresetVector(tableau9WorldTuning.position)},
  rotation: ${formatPresetVector(tableau9WorldTuning.rotation)},
};

export const DEFAULT_GALLERY_FLOOR_TUNING = {
  repeat: [${formatPresetNumber(galleryFloorTuning.repeat[0])}, ${formatPresetNumber(galleryFloorTuning.repeat[1])}],
  offset: [${formatPresetNumber(galleryFloorTuning.offset[0])}, ${formatPresetNumber(galleryFloorTuning.offset[1])}],
  rotationDeg: ${formatPresetNumber(galleryFloorTuning.rotationDeg)},
  normalScale: ${formatPresetNumber(galleryFloorTuning.normalScale)},
};

export const DEFAULT_INFERNO_PORTAL_ENABLED = ${infernoPortalEnabled};
export const DEFAULT_TABLEAU_9_PORTAL_ENABLED = ${tableau9PortalEnabled};`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6">
      <div className="relative z-10 flex items-start justify-between">
        <div className="text-white">
          <h1 className="text-2xl font-bold tracking-tighter">Galerie3d</h1>
          <p className="text-sm text-gray-400">
            {isEditorMode
              ? 'Mode edition: ZQSD avancer, Espace monter, Shift descendre, Tab pour liberer la souris, cliquez pour regarder'
              : 'ZQSD pour se deplacer - Espace pour sauter - Cliquez pour regarder'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasStarted && (
            <button
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              onClick={() => {
                setHasStarted(false);
                setEditorMode(false);
              }}
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Accueil</span>
            </button>
          )}

          {hasStarted && (
            <button
              className={`pointer-events-auto rounded-full px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors ${
                isEditorMode ? 'bg-amber-600/80 hover:bg-amber-500/80' : 'bg-white/10 hover:bg-white/20'
              }`}
              onClick={() => setEditorMode(!isEditorMode)}
            >
              {isEditorMode ? 'Quitter edition' : 'Mode edition'}
            </button>
          )}

          {hasStarted && (
            <button
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              onClick={toggleCart}
            >
              <ShoppingCart size={20} />
              <span className="font-medium">{cart.length}</span>
            </button>
          )}
        </div>
      </div>

      {isEditorMode && (
        <div className="pointer-events-none absolute left-6 top-24 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Mode Edition</p>
          <p className="mt-2 text-sm">Position: X {editorCamera.x} | Y {editorCamera.y} | Z {editorCamera.z}</p>
          <p className="text-sm">Rotation: Pitch {editorCamera.pitch} | Yaw {editorCamera.yaw} | Roll {editorCamera.roll}</p>
        </div>
      )}

      {isEditorMode && (
        <div className="pointer-events-auto absolute right-6 top-24 max-h-[calc(100vh-7rem)] w-[22rem] overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-4 text-white backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300/80">Editeur Galerie</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">Sauvegarde automatique locale. Les changements s&apos;appliquent en temps reel.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
                onClick={resetGalleryTuning}
              >
                Reset
              </button>
              <button
                className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(galleryPresetSnippet);
                    console.log('[Gallery preset snippet]\n' + galleryPresetSnippet);
                    setPresetStatus('Preset copie dans le presse-papiers.');
                  } catch {
                    console.log('[Gallery preset snippet]\n' + galleryPresetSnippet);
                    setPresetStatus('Impossible de copier automatiquement. Snippet envoye dans la console.');
                  }
                }}
              >
                Copier preset
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/55">Preset code</p>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              L&apos;editeur sert au reglage rapide. Quand c&apos;est bon, utilise <span className="font-semibold text-white">Copier preset</span> pour figer les valeurs ensuite dans le code.
            </p>
            {presetStatus && <p className="mt-2 text-xs text-amber-200">{presetStatus}</p>}
          </div>

          <div className="mt-4 space-y-4">
            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Tableaux actifs</p>
                <div className="space-y-2 text-xs text-white/70">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="font-medium text-white">Inferno World</p>
                    <p className="mt-1 text-white/55">Objet: jake_and_london_eye_london_eye_manual_bake_0</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="font-medium text-white">Hornet</p>
                    <p className="mt-1 text-white/55">Objet: jakeframe_jake_manua_bake_0</p>
                  </div>
                </div>
              </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Emplacements Memorises</p>
              <div className="space-y-2 text-xs text-white/70">
                {MAIN_GALLERY_SAVED_TABLE_PLACEMENTS.map(({ anchorName, note }) => (
                  <div key={anchorName} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="font-medium text-white">{anchorName}</p>
                    <p className="mt-1 text-white/55">{note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Surface portail</p>
              <div className="space-y-2">
                <NumericField label="Scale X" value={portalSurfaceTuning.scale[0]} step={0.25} onChange={(value) => updateSurfaceVector('scale', 0, value)} />
                <NumericField label="Scale Y" value={portalSurfaceTuning.scale[1]} step={0.25} onChange={(value) => updateSurfaceVector('scale', 1, value)} />
                <NumericField label="Scale Z" value={portalSurfaceTuning.scale[2]} step={0.25} onChange={(value) => updateSurfaceVector('scale', 2, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Offset X" value={portalSurfaceTuning.offsetLocal[0]} step={0.25} onChange={(value) => updateSurfaceVector('offsetLocal', 0, value)} />
                <NumericField label="Offset Y" value={portalSurfaceTuning.offsetLocal[1]} step={0.25} onChange={(value) => updateSurfaceVector('offsetLocal', 1, value)} />
                <NumericField label="Offset Z" value={portalSurfaceTuning.offsetLocal[2]} step={0.25} onChange={(value) => updateSurfaceVector('offsetLocal', 2, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Pitch Deg" value={portalSurfaceTuning.rotationOffsetDeg[0]} step={0.25} onChange={(value) => updateSurfaceVector('rotationOffsetDeg', 0, value)} />
                <NumericField label="Yaw Deg" value={portalSurfaceTuning.rotationOffsetDeg[1]} step={0.25} onChange={(value) => updateSurfaceVector('rotationOffsetDeg', 1, value)} />
                <NumericField label="Roll Deg" value={portalSurfaceTuning.rotationOffsetDeg[2]} step={0.25} onChange={(value) => updateSurfaceVector('rotationOffsetDeg', 2, value)} />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Monde inferno</p>
              <div className="space-y-2">
                <NumericField label="Scale Mul" value={portalWorldTuning.scaleMultiplier} step={0.25} onChange={(value) => setPortalWorldTuning((prev) => ({ ...prev, scaleMultiplier: value }))} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Pos X" value={portalWorldTuning.position[0]} step={0.25} onChange={(value) => updateWorldVector('position', 0, value)} />
                <NumericField label="Pos Y" value={portalWorldTuning.position[1]} step={0.25} onChange={(value) => updateWorldVector('position', 1, value)} />
                <NumericField label="Pos Z" value={portalWorldTuning.position[2]} step={0.25} onChange={(value) => updateWorldVector('position', 2, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Rot X" value={portalWorldTuning.rotation[0]} step={0.25} onChange={(value) => updateWorldVector('rotation', 0, value)} />
                <NumericField label="Rot Y" value={portalWorldTuning.rotation[1]} step={0.25} onChange={(value) => updateWorldVector('rotation', 1, value)} />
                <NumericField label="Rot Z" value={portalWorldTuning.rotation[2]} step={0.25} onChange={(value) => updateWorldVector('rotation', 2, value)} />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Modèle hornet</p>
              <p className="mb-3 text-[11px] leading-4 text-white/45">Ajuste seulement le personnage, la salle reste fixe.</p>
              <div className="space-y-2">
                <NumericField
                  label="Scale Mul"
                  value={tableau9WorldTuning.scaleMultiplier}
                  step={0.25}
                  onChange={(value) => setTableau9WorldTuning((prev) => ({ ...prev, scaleMultiplier: value }))}
                />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField
                  label="Pos X"
                  value={tableau9WorldTuning.position[0]}
                  step={0.25}
                  onChange={(value) => updateTableau9WorldVector('position', 0, value)}
                />
                <NumericField
                  label="Pos Y"
                  value={tableau9WorldTuning.position[1]}
                  step={0.25}
                  onChange={(value) => updateTableau9WorldVector('position', 1, value)}
                />
                <NumericField
                  label="Pos Z"
                  value={tableau9WorldTuning.position[2]}
                  step={0.25}
                  onChange={(value) => updateTableau9WorldVector('position', 2, value)}
                />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField
                  label="Rot X"
                  value={tableau9WorldTuning.rotation[0]}
                  step={0.25}
                  onChange={(value) => updateTableau9WorldVector('rotation', 0, value)}
                />
                <NumericField
                  label="Rot Y"
                  value={tableau9WorldTuning.rotation[1]}
                  step={0.25}
                  onChange={(value) => updateTableau9WorldVector('rotation', 1, value)}
                />
                <NumericField
                  label="Rot Z"
                  value={tableau9WorldTuning.rotation[2]}
                  step={0.25}
                  onChange={(value) => updateTableau9WorldVector('rotation', 2, value)}
                />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Sol principal</p>
              <div className="space-y-2">
                <NumericField label="Repeat X" value={galleryFloorTuning.repeat[0]} step={0.25} onChange={(value) => updateFloorVector('repeat', 0, value)} />
                <NumericField label="Repeat Y" value={galleryFloorTuning.repeat[1]} step={0.25} onChange={(value) => updateFloorVector('repeat', 1, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Offset X" value={galleryFloorTuning.offset[0]} step={0.25} onChange={(value) => updateFloorVector('offset', 0, value)} />
                <NumericField label="Offset Y" value={galleryFloorTuning.offset[1]} step={0.25} onChange={(value) => updateFloorVector('offset', 1, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Rotation" value={galleryFloorTuning.rotationDeg} step={0.25} onChange={(value) => setGalleryFloorTuning((prev) => ({ ...prev, rotationDeg: value }))} />
                <NumericField label="Normal" value={galleryFloorTuning.normalScale} step={0.25} onChange={(value) => setGalleryFloorTuning((prev) => ({ ...prev, normalScale: value }))} />
              </div>
            </section>
          </div>
        </div>
      )}

      {isLocked && !selectedArtwork && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1 w-1 rounded-full bg-white/80" />
        </div>
      )}

      <div
        id="resume-overlay"
        className={`absolute inset-0 z-0 flex cursor-pointer items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isEnterOverlay || isResumeOverlay ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => {
          setHasStarted(true);
        }}
      >
        {isEnterOverlay && (
          <div className="flex max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/55 text-white shadow-2xl backdrop-blur-md md:flex-row">
            <div className="relative h-64 md:h-auto md:w-[28rem]">
              <img src={MAIN_GALLERY_PREVIEW_URL} alt="Apercu de la galerie principale" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/35" />
            </div>
            <div className="flex max-w-xl flex-col justify-center px-8 py-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-white/50">Galerie3d</p>
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Salle principale</h2>
              <p className="mb-5 text-sm leading-relaxed text-gray-300">
                Cette version du site charge une seule map jouable, issue du GLB principal du projet. L&apos;ancienne logique multi-salles a ete retiree pour garder une structure plus claire.
              </p>
              <div className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black">
                Cliquer pour commencer
              </div>
            </div>
          </div>
        )}

        {isResumeOverlay && (
          <div className="rounded-2xl bg-white/10 px-8 py-4 text-white backdrop-blur-md">
            <p className="text-xl font-bold tracking-widest">CLIQUEZ POUR REPRENDRE</p>
          </div>
        )}
      </div>

      {isLocked && hoveredArtwork && !selectedArtwork && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center text-white">
          <p className="text-lg font-medium">{hoveredArtwork.title}</p>
          <p className="text-sm text-gray-400">
            {galleryHoverHint || 'Cliquez pour voir les details'}
          </p>
        </div>
      )}

      {selectedArtwork && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative flex w-full max-w-4xl flex-col gap-8 rounded-2xl bg-[#111] p-8 md:flex-row">
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
              onClick={() => setSelectedArtwork(null)}
            >
              <X size={24} />
            </button>

            <div className="flex-1">
              <ArtworkModalViewer artwork={selectedArtwork} />
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
        <div className="pointer-events-auto absolute inset-0 z-20 bg-black/30" onClick={closeCart}>
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
