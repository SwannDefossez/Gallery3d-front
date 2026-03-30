import { Environment } from '@react-three/drei';
import { Artwork } from './Artwork';
import { MainFloor } from './MainFloor';
import { Player } from './Player';
import type { ArtworkData } from '../store';

const PLATFORM_CENTER_Z = 15;
const EXTENSION_FRAME_X = 20.1;
const EXTENSION_FRAME_Y = 2.4;
const EXTENSION_FRAME_WIDTH = 4;
const EXTENSION_FRAME_HEIGHT = 2.6;

type WallArtwork = {
  title: string;
  artist: string;
  description?: string;
  modelUrl: string;
  imageUrl: string;
  isEnvironment: boolean;
  environmentScaleMode?: 'fit' | 'real';
  environmentScaleMultiplier: number;
  environmentOffset: [number, number, number];
  modelRotation: [number, number, number];
};

type ExtensionSlot = {
  zOffset: number;
  right: WallArtwork;
  left: WallArtwork;
};

const extensionSlots: ExtensionSlot[] = [
  {
    zOffset: -18,
    right: {
      title: 'Ville Cyberpunk',
      artist: 'Style Cyberpunk',
      modelUrl:
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/VirtualCity/glTF-Binary/VirtualCity.glb',
      imageUrl:
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/VirtualCity/screenshot/screenshot.gif',
      isEnvironment: true,
      environmentScaleMode: 'real',
      environmentScaleMultiplier: 1,
      environmentOffset: [10, 48, 5],
      modelRotation: [0, 5, 0],
    },
    left: {
      title: 'Cite Historique',
      artist: 'Style Renaissance',
      modelUrl:
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/glTF/Sponza.gltf',
      imageUrl:
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/screenshot/large.jpg',
      isEnvironment: true,
      environmentScaleMultiplier: 3,
      environmentOffset: [-30, 10, 5],
      modelRotation: [0, 0, 0],
    },
  },
  {
    zOffset: -6,
    right: {
      title: 'Rue Japonaise',
      artist: 'Style Tokyo Dense',
      modelUrl:
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LittlestTokyo.glb',
      imageUrl:
        'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
      isEnvironment: true,
      environmentScaleMultiplier: 2,
      environmentOffset: [50, 10, 20],
      modelRotation: [0, 0, 0],
    },
    left: {
      title: 'Londres AccuCities L3',
      artist: 'AccuCities - Replique urbaine de haute precision',
      description:
        "Replica virtuelle tres precise de Londres sur 1 km2, ce modele de niveau 3 separe chaque batiment, detaille les toitures et applique un UV complet sur toute la scene. Il est pense pour le jeu, la ville intelligente, l'architecture, la construction, l'ingenierie et les experiences AR, avec une base ideale pour des materiaux personnalises.",
      modelUrl: '/assets/models/ville-importee-01.glb',
      imageUrl: '/assets/previews/ville-importee-01-preview.png',
      isEnvironment: true,
      environmentScaleMultiplier: 50,
      environmentOffset: [-500, 100, 0],
      modelRotation: [-1.55, 0.2, 1],
    },
  },
  {
    zOffset: 6,
    right: {
      title: 'Inferno World',
      artist: 'Modele importe',
      description:
        'Environnement fantastique en ruines, charge comme scene complete et presente ici comme une salle immersive sombre et dramatique.',
      modelUrl: '/assets/models/inferno-world-free.glb',
      imageUrl: '/assets/previews/inferno-world-preview.png',
      isEnvironment: true,
      environmentScaleMultiplier: 3,
      environmentOffset: [40, 8, 35],
      modelRotation: [0, 2.75, 0],
    },
    left: {
      title: 'Terminal Aerien Moderne',
      artist: 'Modele importe',
      description:
        'Terminal aerien moderne importe comme environnement complet, avec textures integrees et une lecture architecturale plus nette que la version precedente.',
      modelUrl: '/assets/models/terminal-aerien-moderne.glb',
      imageUrl: '/assets/previews/terminal-aerien-moderne-preview.jpg',
      isEnvironment: true,
      environmentScaleMultiplier: 3,
      environmentOffset: [-120, -20, 30],
      modelRotation: [0, 0, 0],
    },
  },
  {
    zOffset: 18,
    right: {
      title: 'Cartoon City',
      artist: 'Modele importe',
      description:
        'Ville stylisee et dense au rendu cartoon, chargee comme environnement complet avec ses textures integrees.',
      modelUrl: '/assets/models/cartoon-city-free.glb',
      imageUrl: '/assets/previews/cartoon-city-preview.webp',
      isEnvironment: true,
      environmentScaleMultiplier: 4,
      environmentOffset: [120, 10, 35],
      modelRotation: [0, 0, 0],
    },
    left: {
      title: 'LA Night City',
      artist: 'Modele importe',
      description:
        'Scene urbaine nocturne plus compacte, avec un cadrage pense pour faire ressentir une ville illuminee et plus resserree.',
      modelUrl: '/assets/models/la-night-city.glb',
      imageUrl: '/assets/previews/la-night-city-preview.jpeg',
      isEnvironment: true,
      environmentScaleMultiplier: 3,
      environmentOffset: [-20, 8, 25],
      modelRotation: [0, 0.2, 0],
    },
  },
];

function createArtwork(
  id: string,
  artwork: WallArtwork,
  x: number,
  zOffset: number,
  rotation: [number, number, number],
): ArtworkData {
  return {
    id,
    title: artwork.title,
    artist: artwork.artist,
    description: artwork.description,
    price: 0,
    imageUrl: artwork.imageUrl,
    modelUrl: artwork.modelUrl,
    isEnvironment: artwork.isEnvironment,
    environmentScaleMode: artwork.environmentScaleMode,
    environmentScaleMultiplier: artwork.environmentScaleMultiplier,
    environmentOffset: artwork.environmentOffset,
    modelRotation: artwork.modelRotation,
    position: [x, EXTENSION_FRAME_Y, PLATFORM_CENTER_Z + zOffset],
    rotation,
    width: EXTENSION_FRAME_WIDTH,
    height: EXTENSION_FRAME_HEIGHT,
  };
}

const artworks: ArtworkData[] = extensionSlots.flatMap(({ zOffset, right, left }, index) => [
  createArtwork(`ext-right-${index + 1}`, right, EXTENSION_FRAME_X, zOffset, [0, -Math.PI / 2, 0]),
  createArtwork(`ext-left-${index + 1}`, left, -EXTENSION_FRAME_X, zOffset, [0, Math.PI / 2, 0]),
]);

export function Gallery() {
  return (
    <>
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#17091f', 25, 400]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 12, 5]}
        intensity={0.85}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <Environment preset="night" />
      <Player />
      <MainFloor />

      {artworks.map((artwork) => (
        <Artwork key={artwork.id} data={artwork} />
      ))}

    </>
  );
}
