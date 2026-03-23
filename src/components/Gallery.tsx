import { Environment } from '@react-three/drei';
import { Player } from './Player';
import { MainFloor } from './MainFloor';
import { Artwork } from './Artwork';
import { ArtworkData } from '../store';

const PLATFORM_CENTER_Z = 15;
const EXTENSION_Z_OFFSETS = [-18, -6, 6, 18];
const EXTENSION_FRAME_X = 20.1;
const EXTENSION_FRAME_Y = 2.4;
const EXTENSION_FRAME_WIDTH = 4;
const EXTENSION_FRAME_HEIGHT = 2.6;

const extensionModelSet: Array<{
  title: string;
  artist: string;
  modelUrl: string;
  imageUrl: string;
  isEnvironment: boolean;
  environmentScaleMode?: 'fit' | 'real';
  environmentScaleMultiplier: number;
  environmentOffset: [number, number, number];
  modelRotation: [number, number, number];
}> = [
  {
    title: 'Ville Cyberpunk',
    artist: 'Style Cyberpunk',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/VirtualCity/glTF-Binary/VirtualCity.glb',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/VirtualCity/screenshot/screenshot.gif',
    isEnvironment: true,
    environmentScaleMode: 'real',
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 45, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Cite Historique',
    artist: 'Style Renaissance',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/glTF/Sponza.gltf',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/screenshot/large.jpg',
    isEnvironment: true,
    environmentScaleMultiplier: 0.8,
    environmentOffset: [0, 0, 8],
    modelRotation: [0, 7.85, 0],
  },
  {
    title: 'District Metropolitain',
    artist: 'Style Sportif',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ABeautifulGame/glTF-Binary/ABeautifulGame.glb',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ABeautifulGame/screenshot/screenshot.jpg',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Avenue Concept Car',
    artist: 'Style Urbain Moderne',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/screenshot/screenshot.jpg',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Route Suburbaine',
    artist: 'Style Cartoon Urbain',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMilkTruck/screenshot/screenshot.gif',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Ville Miniature',
    artist: 'Style Jouet',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/screenshot/screenshot.jpg',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Ville Procedurale',
    artist: 'Style Minimaliste',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SimpleInstancing/glTF-Binary/SimpleInstancing.glb',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SimpleInstancing/screenshot/screenshot.png',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Centre Commercial Urbain',
    artist: 'Style Industriel',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CommercialRefrigerator/glTF-Binary/CommercialRefrigerator.glb',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CommercialRefrigerator/screenshot/screenshot.jpg',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
];

const artworks: ArtworkData[] = [
  ...EXTENSION_Z_OFFSETS.flatMap((offset, offsetIndex) => {
    const rightModel = extensionModelSet[offsetIndex * 2];
    const leftModel = extensionModelSet[offsetIndex * 2 + 1];

    return [
      {
        id: `ext-right-${offsetIndex + 1}`,
        title: rightModel.title,
        artist: rightModel.artist,
        price: 0,
        imageUrl: rightModel.imageUrl,
        modelUrl: rightModel.modelUrl,
        isEnvironment: rightModel.isEnvironment,
        environmentScaleMode: rightModel.environmentScaleMode,
        environmentScaleMultiplier: rightModel.environmentScaleMultiplier,
        environmentOffset: rightModel.environmentOffset,
        modelRotation: rightModel.modelRotation,
        position: [EXTENSION_FRAME_X, EXTENSION_FRAME_Y, PLATFORM_CENTER_Z + offset] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        width: EXTENSION_FRAME_WIDTH,
        height: EXTENSION_FRAME_HEIGHT,
      },
      {
        id: `ext-left-${offsetIndex + 1}`,
        title: leftModel.title,
        artist: leftModel.artist,
        price: 0,
        imageUrl: leftModel.imageUrl,
        modelUrl: leftModel.modelUrl,
        isEnvironment: leftModel.isEnvironment,
        environmentScaleMode: leftModel.environmentScaleMode,
        environmentScaleMultiplier: leftModel.environmentScaleMultiplier,
        environmentOffset: leftModel.environmentOffset,
        modelRotation: leftModel.modelRotation,
        position: [-EXTENSION_FRAME_X, EXTENSION_FRAME_Y, PLATFORM_CENTER_Z + offset] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        width: EXTENSION_FRAME_WIDTH,
        height: EXTENSION_FRAME_HEIGHT,
      },
    ];
  }),
];

export function Gallery() {
  return (
    <>
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 25, 260]} />
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

      {/* Artworks */}
      {artworks.map((artwork) => (
        <Artwork key={artwork.id} data={artwork} />
      ))}
    </>
  );
}
