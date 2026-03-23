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
    environmentOffset: [10, 48, 5],
    modelRotation: [0, 5, 0],
  },
  {
    title: 'Cite Historique',
    artist: 'Style Renaissance',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/glTF/Sponza.gltf',
    imageUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/screenshot/large.jpg',
    isEnvironment: true,
    environmentScaleMultiplier: 3,
    environmentOffset: [-30, 10, 5],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Village Central',
    artist: 'Style Bourg Ancien',
    modelUrl: 'https://assets.babylonjs.com/meshes/village.glb',
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
    isEnvironment: true,
    environmentScaleMultiplier: 5,
    environmentOffset: [150, , 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Ville de Vallee',
    artist: 'Style Urbain Naturel',
    modelUrl: 'https://assets.babylonjs.com/meshes/valleyvillage.glb',
    imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
    isEnvironment: true,
    environmentScaleMultiplier: 2,
    environmentOffset: [-30, 2, 17],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Quartier Residentiel',
    artist: 'Style Habitat Urbain',
    modelUrl: 'https://assets.babylonjs.com/meshes/both_houses_scene.glb',
    imageUrl: 'https://images.unsplash.com/photo-1465447142348-e9952c393450?auto=format&fit=crop&w=1200&q=80',
    isEnvironment: true,
    environmentScaleMultiplier:3,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Cite Pavillonnaire',
    artist: 'Style Suburbain',
    modelUrl: 'https://assets.babylonjs.com/meshes/house_scene.glb',
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Bourg Vertical',
    artist: 'Style Urbain Dense',
    modelUrl: 'https://assets.babylonjs.com/meshes/village.glb',
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
    isEnvironment: true,
    environmentScaleMultiplier: 1,
    environmentOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },
  {
    title: 'Faubourg Moderne',
    artist: 'Style Metropole Calme',
    modelUrl: 'https://assets.babylonjs.com/meshes/valleyvillage.glb',
    imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
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
