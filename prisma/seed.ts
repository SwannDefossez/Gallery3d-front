import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { MAIN_GALLERY_ARTWORKS } from '../src/data/mainGalleryArtworks';

dotenv.config();

const prisma = new PrismaClient();

const SEEDED_ARTISTS = [
  {
    key: 'atelier-horizon',
    email: 'atelier.horizon@artists.gallery3d.local',
    name: 'Atelier Horizon',
    password: 'artist123',
    bio: 'Collectif seed de paysages lumineux et scenes ouvertes pour la galerie principale.',
    portfolioUrl: 'https://portfolio.example/atelier-horizon',
    artworkIds: ['artwork-1', 'artwork-2', 'artwork-19', 'artwork-30'],
  },
  {
    key: 'studio-oblique',
    email: 'studio.oblique@artists.gallery3d.local',
    name: 'Studio Oblique',
    password: 'artist123',
    bio: 'Profil seed oriente compositions construites, geometries et regards architecturaux.',
    portfolioUrl: 'https://portfolio.example/studio-oblique',
    artworkIds: ['artwork-3', 'artwork-10', 'artwork-20', 'artwork-28'],
  },
  {
    key: 'maison-velours',
    email: 'maison.velours@artists.gallery3d.local',
    name: 'Maison Velours',
    password: 'artist123',
    bio: 'Profil seed pour les oeuvres plus intimes, portraits, interieurs et recits courts.',
    portfolioUrl: 'https://portfolio.example/maison-velours',
    artworkIds: ['artwork-5', 'artwork-18', 'artwork-25', 'artwork-27'],
  },
  {
    key: 'echo-nocturne',
    email: 'echo.nocturne@artists.gallery3d.local',
    name: 'Echo Nocturne',
    password: 'artist123',
    bio: 'Profil seed pour les ambiances nocturnes, tensions frontales et contrastes forts.',
    portfolioUrl: 'https://portfolio.example/echo-nocturne',
    artworkIds: ['artwork-7', 'artwork-8', 'artwork-24', 'artwork-29'],
  },
  {
    key: 'cour-antique',
    email: 'cour.antique@artists.gallery3d.local',
    name: 'Cour Antique',
    password: 'artist123',
    bio: 'Profil seed pour les formats plus decoratifs, petites brumes et respirations colorées.',
    portfolioUrl: 'https://portfolio.example/cour-antique',
    artworkIds: ['artwork-6', 'artwork-23', 'artwork-26'],
  },
] as const;

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function upsertUserWithCart(params: {
  email: string;
  name: string;
  password: string;
  role?: Role;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      passwordHash,
      role: params.role ?? Role.USER,
    },
    create: {
      email: params.email,
      name: params.name,
      passwordHash,
      role: params.role ?? Role.USER,
      cart: {
        create: {},
      },
    },
  });

  await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return user;
}

async function main() {
  const moderator = await upsertUserWithCart({
    email: 'moderator@gallery3d.local',
    name: 'Gallery Moderator',
    password: 'moderator123',
    role: Role.MODERATOR,
  });

  await upsertUserWithCart({
    email: 'collector@gallery3d.local',
    name: 'Gallery Collector',
    password: 'collector123',
    role: Role.USER,
  });

  const seededArtistEmails = SEEDED_ARTISTS.map((artist) => artist.email);
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: '@artists.gallery3d.local',
      },
      NOT: seededArtistEmails.map((email) => ({
        email,
      })),
    },
    });

  const artistProfileIdsByArtworkId = new Map<string, string>();

  for (const seededArtist of SEEDED_ARTISTS) {
    const user = await upsertUserWithCart({
      email: seededArtist.email,
      name: seededArtist.name,
      password: seededArtist.password,
      role: Role.ARTIST,
    });

    const artistProfile = await prisma.artistProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: seededArtist.name,
        bio: seededArtist.bio,
        portfolioUrl: seededArtist.portfolioUrl,
      },
      create: {
        userId: user.id,
        displayName: seededArtist.name,
        bio: seededArtist.bio,
        portfolioUrl: seededArtist.portfolioUrl,
      },
    });

    for (const artworkId of seededArtist.artworkIds) {
      artistProfileIdsByArtworkId.set(artworkId, artistProfile.id);
    }
  }

  for (const artwork of MAIN_GALLERY_ARTWORKS) {
    await prisma.artwork.upsert({
      where: { id: artwork.id },
      update: {
        legacyId: artwork.legacyId,
        slug: artwork.slug,
        galleryKey: artwork.galleryKey,
        debugNumber: artwork.debugNumber,
        title: artwork.title,
        artistNameSnapshot: artwork.artist,
        description: artwork.description,
        priceCents: artwork.price * 100,
        stockTotal: artwork.stockTotal,
        stockReserved: artwork.stockReserved,
        stockSold: artwork.stockSold,
        status: artwork.status,
        imagePath: artwork.imageUrl,
        sceneTexturePath: artwork.sceneTextureUrl ?? artwork.imageUrl,
        modelUrl: artwork.modelUrl ?? '',
        sourceNodeName: artwork.sourceNodeName ?? null,
        sceneTextureScaleX: artwork.sceneTextureScale?.[0] ?? null,
        sceneTextureScaleY: artwork.sceneTextureScale?.[1] ?? null,
        previewAspectRatio: artwork.previewAspectRatio ?? null,
        previewSourceRatio: artwork.previewSourceRatio ?? null,
        previewObjectPosition: artwork.previewObjectPosition ?? null,
        previewZoom: artwork.previewZoom ?? null,
        previewFlipY: artwork.previewFlipY ?? false,
        positionX: artwork.position[0],
        positionY: artwork.position[1],
        positionZ: artwork.position[2],
        rotationX: artwork.rotation[0],
        rotationY: artwork.rotation[1],
        rotationZ: artwork.rotation[2],
        width: artwork.width,
        height: artwork.height,
        hitboxX: artwork.hitboxSize[0],
        hitboxY: artwork.hitboxSize[1],
        hitboxZ: artwork.hitboxSize[2],
        debugLabelOffsetX: artwork.debugLabelOffset?.[0] ?? null,
        debugLabelOffsetY: artwork.debugLabelOffset?.[1] ?? null,
        debugLabelOffsetZ: artwork.debugLabelOffset?.[2] ?? null,
        artistProfileId: artistProfileIdsByArtworkId.get(artwork.id) ?? null,
      },
      create: {
        id: artwork.id,
        legacyId: artwork.legacyId,
        slug: artwork.slug,
        galleryKey: artwork.galleryKey,
        debugNumber: artwork.debugNumber,
        title: artwork.title,
        artistNameSnapshot: artwork.artist,
        description: artwork.description,
        priceCents: artwork.price * 100,
        stockTotal: artwork.stockTotal,
        stockReserved: artwork.stockReserved,
        stockSold: artwork.stockSold,
        status: artwork.status,
        imagePath: artwork.imageUrl,
        sceneTexturePath: artwork.sceneTextureUrl ?? artwork.imageUrl,
        modelUrl: artwork.modelUrl ?? '',
        sourceNodeName: artwork.sourceNodeName ?? null,
        sceneTextureScaleX: artwork.sceneTextureScale?.[0] ?? null,
        sceneTextureScaleY: artwork.sceneTextureScale?.[1] ?? null,
        previewAspectRatio: artwork.previewAspectRatio ?? null,
        previewSourceRatio: artwork.previewSourceRatio ?? null,
        previewObjectPosition: artwork.previewObjectPosition ?? null,
        previewZoom: artwork.previewZoom ?? null,
        previewFlipY: artwork.previewFlipY ?? false,
        positionX: artwork.position[0],
        positionY: artwork.position[1],
        positionZ: artwork.position[2],
        rotationX: artwork.rotation[0],
        rotationY: artwork.rotation[1],
        rotationZ: artwork.rotation[2],
        width: artwork.width,
        height: artwork.height,
        hitboxX: artwork.hitboxSize[0],
        hitboxY: artwork.hitboxSize[1],
        hitboxZ: artwork.hitboxSize[2],
        debugLabelOffsetX: artwork.debugLabelOffset?.[0] ?? null,
        debugLabelOffsetY: artwork.debugLabelOffset?.[1] ?? null,
        debugLabelOffsetZ: artwork.debugLabelOffset?.[2] ?? null,
        artistProfileId: artistProfileIdsByArtworkId.get(artwork.id) ?? null,
      },
    });
  }

  console.log('Seed complete');
  console.log('Moderator login: moderator@gallery3d.local / moderator123');
  console.log('Collector login: collector@gallery3d.local / collector123');
  console.log('Artist seed password: artist123');
  console.log(`Seeded moderator ${moderator.email} and ${SEEDED_ARTISTS.length} grouped artist profiles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
