import { Bounds, Clone, Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, ShoppingCart, X } from 'lucide-react';
import * as THREE from 'three';
import { useGalleryStore, type ArtworkData, type MapId } from '../store';

const MAPS: {
  id: MapId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  accent: string;
  bg: string;
  thumb: string;
}[] = [
  {
    id: 'gallery',
    name: 'Galerie Contemporaine',
    subtitle: 'Style Futuriste',
    description: 'Plateforme suspendue dans le vide cosmique. Portails 3D interactifs, villes virtuelles et mondes fantastiques.',
    badge: 'Original',
    accent: '#a855f7',
    bg: 'linear-gradient(135deg, #0d0018 0%, #1a0730 50%, #0d0018 100%)',
    thumb: 'https://images.unsplash.com/photo-1558865869-c93f6f8482af?w=600&q=80',
  },
  {
    id: 'richards',
    name: 'Richards Art Gallery',
    subtitle: 'Galerie Importee',
    description: 'Salle 3D issue du GLB a la racine du projet, chargee comme environnement complet pour accueillir tes oeuvres ensuite.',
    badge: 'Nouveau',
    accent: '#c8920a',
    bg: 'linear-gradient(135deg, #17120b 0%, #2c2113 50%, #17120b 100%)',
    thumb: '/image.png',
  },
];

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
  const selectedMap = useGalleryStore((s) => s.selectedMap);
  const setSelectedMap = useGalleryStore((s) => s.setSelectedMap);
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
  const richardsHoverHint = useGalleryStore((s) => s.richardsHoverHint);
  const richardsSurfaceTuning = useGalleryStore((s) => s.richardsSurfaceTuning);
  const setRichardsSurfaceTuning = useGalleryStore((s) => s.setRichardsSurfaceTuning);
  const richardsWorldTuning = useGalleryStore((s) => s.richardsWorldTuning);
  const setRichardsWorldTuning = useGalleryStore((s) => s.setRichardsWorldTuning);
  const richardsFloorTuning = useGalleryStore((s) => s.richardsFloorTuning);
  const setRichardsFloorTuning = useGalleryStore((s) => s.setRichardsFloorTuning);
  const richardsInfernoEnabled = useGalleryStore((s) => s.richardsInfernoEnabled);
  const resetRichardsTuning = useGalleryStore((s) => s.resetRichardsTuning);
  const [presetStatus, setPresetStatus] = useState('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const suppressResumeOverlay = selectedMap === 'richards' && isEditorMode;
  const showOverlay = !isLocked && !isCartOpen && !selectedArtwork && !suppressResumeOverlay;
  const isMapSelection = showOverlay && !selectedMap;
  const isEnterOverlay = showOverlay && !!selectedMap && !hasStarted;
  const isResumeOverlay = showOverlay && !!selectedMap && hasStarted;

  const description = selectedArtwork
    ? selectedArtwork.description ??
      `Cette oeuvre remarquable de ${selectedArtwork.artist} capture une presence immersive adaptee a la galerie contemporaine.`
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

  useEffect(() => {
    if (selectedMap !== 'richards' && isEditorMode) {
      setEditorMode(false);
    }
  }, [selectedMap, isEditorMode, setEditorMode]);

  const handleSelectMap = (id: MapId) => {
    setSelectedMap(id);
    setHasStarted(true);
    setEditorMode(false);
  };

  const updateSurfaceVector = (key: 'scale' | 'offsetLocal' | 'rotationOffsetDeg', index: number, value: number) => {
    setRichardsSurfaceTuning((prev) => {
      const next = [...prev[key]] as [number, number, number];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateWorldVector = (key: 'position' | 'rotation', index: number, value: number) => {
    setRichardsWorldTuning((prev) => {
      const next = [...prev[key]] as [number, number, number];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateFloorVector = (key: 'repeat' | 'offset', index: number, value: number) => {
    setRichardsFloorTuning((prev) => {
      const next = [...prev[key]] as [number, number];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const richardsPresetSnippet = `export const DEFAULT_RICHARDS_SURFACE_TUNING = {
  scale: ${formatPresetVector(richardsSurfaceTuning.scale)},
  offsetLocal: ${formatPresetVector(richardsSurfaceTuning.offsetLocal)},
  rotationOffsetDeg: ${formatPresetVector(richardsSurfaceTuning.rotationOffsetDeg)},
};

export const DEFAULT_RICHARDS_WORLD_TUNING = {
  scaleMultiplier: ${formatPresetNumber(richardsWorldTuning.scaleMultiplier)},
  position: ${formatPresetVector(richardsWorldTuning.position)},
  rotation: ${formatPresetVector(richardsWorldTuning.rotation)},
};

export const DEFAULT_RICHARDS_FLOOR_TUNING = {
  repeat: [${formatPresetNumber(richardsFloorTuning.repeat[0])}, ${formatPresetNumber(richardsFloorTuning.repeat[1])}],
  offset: [${formatPresetNumber(richardsFloorTuning.offset[0])}, ${formatPresetNumber(richardsFloorTuning.offset[1])}],
  rotationDeg: ${formatPresetNumber(richardsFloorTuning.rotationDeg)},
  normalScale: ${formatPresetNumber(richardsFloorTuning.normalScale)},
};

export const DEFAULT_RICHARDS_INFERNO_ENABLED = ${richardsInfernoEnabled};`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6">
      <div className="relative z-10 flex items-start justify-between">
        <div className="text-white">
          <h1 className="text-2xl font-bold tracking-tighter">Gallerie3d</h1>
          {selectedMap && (
            <p className="text-sm text-gray-400">
              {selectedMap === 'richards' && isEditorMode
                ? 'Mode edition: ZQSD avancer, Espace monter, Shift descendre, Tab pour liberer la souris, cliquez pour regarder'
                : 'ZQSD pour se deplacer · Espace pour sauter · Cliquez pour regarder'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {selectedMap && (
            <button
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              onClick={() => {
                setSelectedMap(null);
                setHasStarted(false);
                setEditorMode(false);
              }}
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Menu</span>
            </button>
          )}

          {selectedMap === 'richards' && (
            <button
              className={`pointer-events-auto rounded-full px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors ${
                isEditorMode ? 'bg-amber-600/80 hover:bg-amber-500/80' : 'bg-white/10 hover:bg-white/20'
              }`}
              onClick={() => setEditorMode(!isEditorMode)}
            >
              {isEditorMode ? 'Quitter edition' : 'Mode edition'}
            </button>
          )}

          {selectedMap && (
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

      {selectedMap === 'richards' && isEditorMode && (
        <div className="pointer-events-none absolute left-6 top-24 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Mode Edition</p>
          <p className="mt-2 text-sm">Position: X {editorCamera.x} | Y {editorCamera.y} | Z {editorCamera.z}</p>
          <p className="text-sm">Rotation: Pitch {editorCamera.pitch} | Yaw {editorCamera.yaw} | Roll {editorCamera.roll}</p>
        </div>
      )}

      {selectedMap === 'richards' && isEditorMode && (
        <div className="pointer-events-auto absolute right-6 top-24 max-h-[calc(100vh-7rem)] w-[22rem] overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-4 text-white backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300/80">Editeur Richards</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">Sauvegarde automatique locale. Les changements s’appliquent en temps reel.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
                onClick={resetRichardsTuning}
              >
                Reset
              </button>
              <button
                className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(richardsPresetSnippet);
                    console.log('[Richards preset snippet]\n' + richardsPresetSnippet);
                    setPresetStatus('Preset copie dans le presse-papiers.');
                  } catch {
                    console.log('[Richards preset snippet]\n' + richardsPresetSnippet);
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
              L'editeur sert au reglage rapide. Quand c'est bon, utilise <span className="font-semibold text-white">Copier preset</span> pour figer les valeurs ensuite dans le code.
            </p>
            {presetStatus && <p className="mt-2 text-xs text-amber-200">{presetStatus}</p>}
          </div>

          <div className="mt-4 space-y-4">
            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Surface</p>
              <div className="space-y-2">
                <NumericField label="Scale X" value={richardsSurfaceTuning.scale[0]} step={0.25} onChange={(value) => updateSurfaceVector('scale', 0, value)} />
                <NumericField label="Scale Y" value={richardsSurfaceTuning.scale[1]} step={0.25} onChange={(value) => updateSurfaceVector('scale', 1, value)} />
                <NumericField label="Scale Z" value={richardsSurfaceTuning.scale[2]} step={0.25} onChange={(value) => updateSurfaceVector('scale', 2, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Offset X" value={richardsSurfaceTuning.offsetLocal[0]} step={0.25} onChange={(value) => updateSurfaceVector('offsetLocal', 0, value)} />
                <NumericField label="Offset Y" value={richardsSurfaceTuning.offsetLocal[1]} step={0.25} onChange={(value) => updateSurfaceVector('offsetLocal', 1, value)} />
                <NumericField label="Offset Z" value={richardsSurfaceTuning.offsetLocal[2]} step={0.25} onChange={(value) => updateSurfaceVector('offsetLocal', 2, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Pitch Deg" value={richardsSurfaceTuning.rotationOffsetDeg[0]} step={0.25} onChange={(value) => updateSurfaceVector('rotationOffsetDeg', 0, value)} />
                <NumericField label="Yaw Deg" value={richardsSurfaceTuning.rotationOffsetDeg[1]} step={0.25} onChange={(value) => updateSurfaceVector('rotationOffsetDeg', 1, value)} />
                <NumericField label="Roll Deg" value={richardsSurfaceTuning.rotationOffsetDeg[2]} step={0.25} onChange={(value) => updateSurfaceVector('rotationOffsetDeg', 2, value)} />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Monde Inferno</p>
              <div className="space-y-2">
                <NumericField label="Scale Mul" value={richardsWorldTuning.scaleMultiplier} step={0.25} onChange={(value) => setRichardsWorldTuning((prev) => ({ ...prev, scaleMultiplier: value }))} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Pos X" value={richardsWorldTuning.position[0]} step={0.25} onChange={(value) => updateWorldVector('position', 0, value)} />
                <NumericField label="Pos Y" value={richardsWorldTuning.position[1]} step={0.25} onChange={(value) => updateWorldVector('position', 1, value)} />
                <NumericField label="Pos Z" value={richardsWorldTuning.position[2]} step={0.25} onChange={(value) => updateWorldVector('position', 2, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Rot X" value={richardsWorldTuning.rotation[0]} step={0.25} onChange={(value) => updateWorldVector('rotation', 0, value)} />
                <NumericField label="Rot Y" value={richardsWorldTuning.rotation[1]} step={0.25} onChange={(value) => updateWorldVector('rotation', 1, value)} />
                <NumericField label="Rot Z" value={richardsWorldTuning.rotation[2]} step={0.25} onChange={(value) => updateWorldVector('rotation', 2, value)} />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/65">Sol Richards</p>
              <div className="space-y-2">
                <NumericField label="Repeat X" value={richardsFloorTuning.repeat[0]} step={0.25} onChange={(value) => updateFloorVector('repeat', 0, value)} />
                <NumericField label="Repeat Y" value={richardsFloorTuning.repeat[1]} step={0.25} onChange={(value) => updateFloorVector('repeat', 1, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Offset X" value={richardsFloorTuning.offset[0]} step={0.25} onChange={(value) => updateFloorVector('offset', 0, value)} />
                <NumericField label="Offset Y" value={richardsFloorTuning.offset[1]} step={0.25} onChange={(value) => updateFloorVector('offset', 1, value)} />
              </div>
              <div className="mt-3 space-y-2">
                <NumericField label="Rotation" value={richardsFloorTuning.rotationDeg} step={0.25} onChange={(value) => setRichardsFloorTuning((prev) => ({ ...prev, rotationDeg: value }))} />
                <NumericField label="Normal" value={richardsFloorTuning.normalScale} step={0.25} onChange={(value) => setRichardsFloorTuning((prev) => ({ ...prev, normalScale: value }))} />
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

      {isMapSelection && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-10 bg-black/80 backdrop-blur-sm">
          <div className="text-center text-white">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.4em] text-white/50">Galerie3d</p>
            <h2 className="mb-3 text-5xl font-bold tracking-tight">Choisissez votre salle</h2>
            <p className="text-base text-gray-400">Deux galeries, deux approches. La seconde utilise ton GLB importe.</p>
          </div>

          <div className="flex gap-6 px-4">
            {MAPS.map((map) => (
              <button
                key={map.id}
                onClick={() => handleSelectMap(map.id)}
                className="group relative w-80 overflow-hidden rounded-2xl border border-white/10 text-left transition-all duration-300 hover:scale-[1.03] hover:border-white/30"
                style={{ background: map.bg }}
              >
                <div
                  className="absolute right-4 top-4 z-10 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
                  style={{ background: map.accent, color: '#fff' }}
                >
                  {map.badge}
                </div>

                <div className="relative h-48 overflow-hidden">
                  <img
                    src={map.thumb}
                    alt={map.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
                </div>

                <div className="p-5 pt-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.25em]" style={{ color: map.accent }}>
                    {map.subtitle}
                  </p>
                  <h3 className="mb-2 text-xl font-bold text-white">{map.name}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{map.description}</p>

                  <div
                    className="mt-5 flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition-opacity group-hover:opacity-100"
                    style={{ background: `${map.accent}33`, border: `1px solid ${map.accent}66` }}
                  >
                    Entrer dans la galerie →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        id="resume-overlay"
        className={`absolute inset-0 z-0 flex cursor-pointer items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isEnterOverlay || isResumeOverlay ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => {
          if (!hasStarted) {
            setHasStarted(true);
          }
        }}
      >
        {isEnterOverlay && (
          <div className="max-w-sm rounded-2xl border border-white/10 bg-black/40 px-8 py-6 text-white backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-white/50">Galerie3d</p>
            <h2 className="mb-3 text-3xl font-bold tracking-tight">Pret a explorer ?</h2>
            <p className="mb-5 text-sm leading-relaxed text-gray-300">
              Cliquez pour capturer la souris et commencer a vous deplacer.
            </p>
            <div className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black">
              Cliquer pour commencer
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
            {selectedMap === 'richards' && richardsHoverHint ? richardsHoverHint : 'Cliquez pour voir les details'}
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
