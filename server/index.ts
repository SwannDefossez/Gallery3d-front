import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import {
  ArtistRequestStatus,
  ArtworkStatus,
  Prisma,
  Role,
  OrderStatus,
} from '@prisma/client';
import { prisma } from './db';
import { clearAuthCookie, getAuthCookieName, setAuthCookie, signAuthToken, verifyAuthToken } from './auth';
import { env } from './env';
import { serializeArtwork, serializeAuthUser, serializeCart, serializeArtistProfile, serializeOrder } from './serializers';

const app = express();

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, env.uploadDir);
  },
  filename: (_req, file, callback) => {
    const safeBaseName = file.originalname
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-');
    callback(null, `${Date.now()}-${randomUUID()}-${safeBaseName}`);
  },
});

const artworkUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Only image uploads are allowed.'));
  },
});

type AsyncHandler = (request: Request, response: Response, next: NextFunction) => Promise<void> | void;

function asyncRoute(handler: AsyncHandler) {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAvailableStock(artwork: {
  stockTotal: number;
  stockReserved: number;
  stockSold: number;
}) {
  return Math.max(artwork.stockTotal - artwork.stockReserved - artwork.stockSold, 0);
}

const MAX_CART_ITEM_QUANTITY = 1;

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

async function getCurrentUser(request: Request) {
  const token = request.cookies?.[getAuthCookieName()];

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { artistProfile: true },
    });
    return user ? serializeAuthUser(user) : null;
  } catch {
    return null;
  }
}

async function requireUser(request: Request, response: Response) {
  const currentUser = request.currentUser;
  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  return currentUser;
}

function requireRole(currentRole: Role, acceptedRoles: Role[]) {
  return acceptedRoles.includes(currentRole);
}

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          artwork: {
            include: {
              artistProfile: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (existing) {
    const hasInvalidQuantities = existing.items.some((item) => item.quantity > MAX_CART_ITEM_QUANTITY);
    if (hasInvalidQuantities) {
      await prisma.cartItem.updateMany({
        where: {
          cartId: existing.id,
          quantity: {
            gt: MAX_CART_ITEM_QUANTITY,
          },
        },
        data: {
          quantity: MAX_CART_ITEM_QUANTITY,
        },
      });

      return prisma.cart.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          items: {
            include: {
              artwork: {
                include: {
                  artistProfile: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    }

    return existing;
  }

  return prisma.cart.create({
    data: {
      userId,
    },
    include: {
      items: {
        include: {
          artwork: {
            include: {
              artistProfile: true,
            },
          },
        },
      },
    },
  });
}

async function buildCartView(userId: string) {
  const cart = await getOrCreateCart(userId);
  return serializeCart(cart);
}

async function buildOrdersView(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          artwork: {
            include: {
              artistProfile: true,
            },
          },
          artistProfile: true,
        },
        orderBy: {
          id: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return orders.map(serializeOrder);
}

function buildArtworkWriteInput(body: Record<string, unknown>, imagePath: string | null, existingImagePath?: string) {
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const price = toNumber(body.price, NaN);
  const stockTotal = toNumber(body.stockTotal, NaN);
  const artistDisplayName = String(body.artistDisplayName ?? '').trim();
  const galleryKey = String(body.galleryKey ?? 'main-gallery').trim() || 'main-gallery';

  if (!title) {
    throw new Error('Title is required.');
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Price must be greater than zero.');
  }

  if (!Number.isFinite(stockTotal) || stockTotal < 1) {
    throw new Error('Stock total must be at least 1.');
  }

  const resolvedImagePath = imagePath ?? existingImagePath ?? null;
  if (!resolvedImagePath) {
    throw new Error('Artwork image is required.');
  }

  return {
    title,
    description: description || null,
    priceCents: Math.round(price * 100),
    stockTotal: Math.floor(stockTotal),
    imagePath: resolvedImagePath,
    sceneTexturePath: String(body.sceneTexturePath ?? resolvedImagePath).trim() || resolvedImagePath,
    modelUrl: String(body.modelUrl ?? '').trim() || null,
    sourceNodeName: String(body.sourceNodeName ?? '').trim() || null,
    previewAspectRatio: toOptionalNumber(body.previewAspectRatio),
    previewSourceRatio: toOptionalNumber(body.previewSourceRatio),
    previewObjectPosition: String(body.previewObjectPosition ?? '').trim() || null,
    previewZoom: toOptionalNumber(body.previewZoom),
    previewFlipY: String(body.previewFlipY ?? 'false') === 'true',
    positionX: toNumber(body.positionX, 0),
    positionY: toNumber(body.positionY, 1.5),
    positionZ: toNumber(body.positionZ, 0),
    rotationX: toNumber(body.rotationX, 0),
    rotationY: toNumber(body.rotationY, 0),
    rotationZ: toNumber(body.rotationZ, 0),
    width: Math.max(toNumber(body.width, 1), 0.1),
    height: Math.max(toNumber(body.height, 1), 0.1),
    hitboxX: Math.max(toNumber(body.hitboxX, 1), 0.01),
    hitboxY: Math.max(toNumber(body.hitboxY, 1), 0.01),
    hitboxZ: Math.max(toNumber(body.hitboxZ, 0.05), 0.01),
    debugNumber: Math.max(Math.floor(toNumber(body.debugNumber, 999)), 0),
    debugLabelOffsetX: toOptionalNumber(body.debugLabelOffsetX),
    debugLabelOffsetY: toOptionalNumber(body.debugLabelOffsetY),
    debugLabelOffsetZ: toOptionalNumber(body.debugLabelOffsetZ),
    sceneTextureScaleX: toOptionalNumber(body.sceneTextureScaleX),
    sceneTextureScaleY: toOptionalNumber(body.sceneTextureScaleY),
    artistNameSnapshot: artistDisplayName || null,
    galleryKey,
  };
}

async function releaseOrderReservation(orderId: string, nextStatus: OrderStatus) {
  await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.status === OrderStatus.PAID || order.status === nextStatus) {
      return;
    }

    for (const item of order.items) {
      await transaction.artwork.update({
        where: { id: item.artworkId },
        data: {
          stockReserved: {
            decrement: item.quantity,
          },
        },
      });
    }

    await transaction.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
      },
    });
  });
}

async function markOrderPaidByOrderId(orderId: string) {
  await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order || order.status === OrderStatus.PAID) {
      return;
    }

    for (const item of order.items) {
      await transaction.artwork.update({
        where: { id: item.artworkId },
        data: {
          stockReserved: {
            decrement: item.quantity,
          },
          stockSold: {
            increment: item.quantity,
          },
        },
      });
    }

    await transaction.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        stripePaymentIntentId: null,
      },
    });

    const cart = await transaction.cart.findUnique({
      where: { userId: order.userId },
      include: { items: true },
    });

    if (cart) {
      await transaction.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          artworkId: {
            in: order.items.map((item) => item.artworkId),
          },
        },
      });
    }
  });
}

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(env.uploadDir));

app.use(
  asyncRoute(async (request, _response, next) => {
    request.currentUser = await getCurrentUser(request);
    next();
  }),
);

app.get(
  '/api/health',
  asyncRoute(async (_request, response) => {
    response.json({ ok: true });
  }),
);

app.get(
  '/api/payment/status',
  asyncRoute(async (_request, response) => {
    response.json({
      payment: {
        mode: 'simulation',
        checkoutEnabled: true,
        provider: 'local',
      },
    });
  }),
);

app.post(
  '/api/auth/register',
  asyncRoute(async (request, response) => {
    const name = String(request.body.name ?? '').trim();
    const email = String(request.body.email ?? '').trim().toLowerCase();
    const password = String(request.body.password ?? '');

    if (!name || !email || password.length < 6) {
      response.status(400).json({ error: 'Name, email, and a 6-character password are required.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      response.status(409).json({ error: 'An account already exists for this email.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        cart: { create: {} },
      },
      include: {
        artistProfile: true,
      },
    });

    const token = signAuthToken(user.id);
    setAuthCookie(response, token);
    response.status(201).json({ user: serializeAuthUser(user) });
  }),
);

app.post(
  '/api/auth/login',
  asyncRoute(async (request, response) => {
    const email = String(request.body.email ?? '').trim().toLowerCase();
    const password = String(request.body.password ?? '');
    const user = await prisma.user.findUnique({
      where: { email },
      include: { artistProfile: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      response.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const token = signAuthToken(user.id);
    setAuthCookie(response, token);
    response.json({ user: serializeAuthUser(user) });
  }),
);

app.post(
  '/api/auth/logout',
  asyncRoute(async (_request, response) => {
    clearAuthCookie(response);
    response.json({ ok: true });
  }),
);

app.get(
  '/api/auth/me',
  asyncRoute(async (request, response) => {
    response.json({ user: request.currentUser ?? null });
  }),
);

app.get(
  '/api/gallery/main',
  asyncRoute(async (_request, response) => {
    const artworks = await prisma.artwork.findMany({
      where: {
        galleryKey: 'main-gallery',
        status: ArtworkStatus.PUBLISHED,
      },
      include: {
        artistProfile: true,
      },
      orderBy: {
        debugNumber: 'asc',
      },
    });

    response.json({ artworks: artworks.map(serializeArtwork) });
  }),
);

app.get(
  '/api/artworks/:id',
  asyncRoute(async (request, response) => {
    const artwork = await prisma.artwork.findFirst({
      where: {
        OR: [{ id: request.params.id }, { slug: request.params.id }],
      },
      include: {
        artistProfile: true,
      },
    });

    if (!artwork) {
      response.status(404).json({ error: 'Artwork not found.' });
      return;
    }

    const canViewUnpublished =
      request.currentUser?.role === Role.MODERATOR ||
      (request.currentUser?.artistProfileId && artwork.artistProfileId === request.currentUser.artistProfileId);

    if (artwork.status !== ArtworkStatus.PUBLISHED && !canViewUnpublished) {
      response.status(404).json({ error: 'Artwork not found.' });
      return;
    }

    response.json({ artwork: serializeArtwork(artwork) });
  }),
);

app.post(
  '/api/artist-requests',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (currentUser.role !== Role.USER) {
      response.status(400).json({ error: 'Only regular users can submit an artist request.' });
      return;
    }

    const motivation = String(request.body.motivation ?? '').trim();
    if (!motivation) {
      response.status(400).json({ error: 'Motivation is required.' });
      return;
    }

    const pendingRequest = await prisma.artistRequest.findFirst({
      where: {
        userId: currentUser.id,
        status: ArtistRequestStatus.PENDING,
      },
    });

    if (pendingRequest) {
      response.status(409).json({ error: 'A pending artist request already exists.' });
      return;
    }

    const artistRequest = await prisma.artistRequest.create({
      data: {
        userId: currentUser.id,
        motivation,
      },
    });

    response.status(201).json({ artistRequest });
  }),
);

app.get(
  '/api/artist/profile',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.ARTIST])) {
      response.status(403).json({ error: 'Artist access required.' });
      return;
    }

    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: currentUser.artistProfileId ?? '' },
    });

    response.json({ artistProfile: serializeArtistProfile(artistProfile) });
  }),
);

app.put(
  '/api/artist/profile',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.ARTIST])) {
      response.status(403).json({ error: 'Artist access required.' });
      return;
    }

    assert(currentUser.artistProfileId, 'Artist profile missing.');

    const displayName = String(request.body.displayName ?? '').trim();
    const bio = String(request.body.bio ?? '').trim();
    const portfolioUrl = String(request.body.portfolioUrl ?? '').trim();

    const artistProfile = await prisma.artistProfile.update({
      where: { id: currentUser.artistProfileId },
      data: {
        displayName: displayName || undefined,
        bio,
        portfolioUrl: portfolioUrl || null,
      },
    });

    response.json({ artistProfile: serializeArtistProfile(artistProfile) });
  }),
);

app.get(
  '/api/artist/artworks',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.ARTIST])) {
      response.status(403).json({ error: 'Artist access required.' });
      return;
    }

    assert(currentUser.artistProfileId, 'Artist profile missing.');

    const artworks = await prisma.artwork.findMany({
      where: {
        artistProfileId: currentUser.artistProfileId,
      },
      include: {
        artistProfile: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    response.json({
      artworks: artworks.map((artwork) => ({
        ...serializeArtwork(artwork),
        createdAt: artwork.createdAt.toISOString(),
        updatedAt: artwork.updatedAt.toISOString(),
      })),
    });
  }),
);

app.post(
  '/api/artist/artworks',
  artworkUpload.single('image'),
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.ARTIST])) {
      response.status(403).json({ error: 'Artist access required.' });
      return;
    }

    assert(currentUser.artistProfileId, 'Artist profile missing.');

    const input = buildArtworkWriteInput(
      request.body as Record<string, unknown>,
      request.file ? `/uploads/${request.file.filename}` : null,
    );

    const profile = await prisma.artistProfile.findUnique({
      where: { id: currentUser.artistProfileId },
    });
    assert(profile, 'Artist profile missing.');

    const artwork = await prisma.artwork.create({
      data: {
        id: `artwork-${randomUUID()}`,
        legacyId: `custom-${randomUUID()}`,
        slug: `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 6)}`,
        galleryKey: input.galleryKey,
        debugNumber: input.debugNumber,
        title: input.title,
        artistNameSnapshot: profile.displayName,
        description: input.description,
        priceCents: input.priceCents,
        stockTotal: input.stockTotal,
        imagePath: input.imagePath,
        sceneTexturePath: input.sceneTexturePath,
        modelUrl: input.modelUrl,
        sourceNodeName: input.sourceNodeName,
        sceneTextureScaleX: input.sceneTextureScaleX,
        sceneTextureScaleY: input.sceneTextureScaleY,
        previewAspectRatio: input.previewAspectRatio,
        previewSourceRatio: input.previewSourceRatio,
        previewObjectPosition: input.previewObjectPosition,
        previewZoom: input.previewZoom,
        previewFlipY: input.previewFlipY,
        positionX: input.positionX,
        positionY: input.positionY,
        positionZ: input.positionZ,
        rotationX: input.rotationX,
        rotationY: input.rotationY,
        rotationZ: input.rotationZ,
        width: input.width,
        height: input.height,
        hitboxX: input.hitboxX,
        hitboxY: input.hitboxY,
        hitboxZ: input.hitboxZ,
        debugLabelOffsetX: input.debugLabelOffsetX,
        debugLabelOffsetY: input.debugLabelOffsetY,
        debugLabelOffsetZ: input.debugLabelOffsetZ,
        status: ArtworkStatus.DRAFT,
        artistProfileId: currentUser.artistProfileId,
      },
      include: {
        artistProfile: true,
      },
    });

    response.status(201).json({ artwork: serializeArtwork(artwork) });
  }),
);

app.put(
  '/api/artist/artworks/:id',
  artworkUpload.single('image'),
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.ARTIST])) {
      response.status(403).json({ error: 'Artist access required.' });
      return;
    }

    assert(currentUser.artistProfileId, 'Artist profile missing.');

    const existingArtwork = await prisma.artwork.findFirst({
      where: {
        id: request.params.id,
        artistProfileId: currentUser.artistProfileId,
      },
      include: {
        artistProfile: true,
      },
    });

    if (!existingArtwork) {
      response.status(404).json({ error: 'Artwork not found.' });
      return;
    }

    const input = buildArtworkWriteInput(
      request.body as Record<string, unknown>,
      request.file ? `/uploads/${request.file.filename}` : null,
      existingArtwork.imagePath,
    );

    const nextStatus =
      existingArtwork.status === ArtworkStatus.PUBLISHED ? ArtworkStatus.PENDING : existingArtwork.status;

    const artwork = await prisma.artwork.update({
      where: { id: existingArtwork.id },
      data: {
        galleryKey: input.galleryKey,
        title: input.title,
        artistNameSnapshot: existingArtwork.artistProfile?.displayName ?? existingArtwork.artistNameSnapshot,
        description: input.description,
        priceCents: input.priceCents,
        stockTotal: input.stockTotal,
        imagePath: input.imagePath,
        sceneTexturePath: input.sceneTexturePath,
        modelUrl: input.modelUrl,
        sourceNodeName: input.sourceNodeName,
        sceneTextureScaleX: input.sceneTextureScaleX,
        sceneTextureScaleY: input.sceneTextureScaleY,
        previewAspectRatio: input.previewAspectRatio,
        previewSourceRatio: input.previewSourceRatio,
        previewObjectPosition: input.previewObjectPosition,
        previewZoom: input.previewZoom,
        previewFlipY: input.previewFlipY,
        positionX: input.positionX,
        positionY: input.positionY,
        positionZ: input.positionZ,
        rotationX: input.rotationX,
        rotationY: input.rotationY,
        rotationZ: input.rotationZ,
        width: input.width,
        height: input.height,
        hitboxX: input.hitboxX,
        hitboxY: input.hitboxY,
        hitboxZ: input.hitboxZ,
        debugNumber: input.debugNumber,
        debugLabelOffsetX: input.debugLabelOffsetX,
        debugLabelOffsetY: input.debugLabelOffsetY,
        debugLabelOffsetZ: input.debugLabelOffsetZ,
        status: nextStatus,
      },
      include: {
        artistProfile: true,
      },
    });

    response.json({ artwork: serializeArtwork(artwork) });
  }),
);

app.delete(
  '/api/artist/artworks/:id',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.ARTIST])) {
      response.status(403).json({ error: 'Artist access required.' });
      return;
    }

    assert(currentUser.artistProfileId, 'Artist profile missing.');

    const artwork = await prisma.artwork.findFirst({
      where: {
        id: request.params.id,
        artistProfileId: currentUser.artistProfileId,
      },
      include: {
        orderItems: true,
      },
    });

    if (!artwork) {
      response.status(404).json({ error: 'Artwork not found.' });
      return;
    }

    if (artwork.status !== ArtworkStatus.DRAFT || artwork.orderItems.length > 0) {
      response.status(400).json({ error: 'Only unsold draft artworks can be deleted.' });
      return;
    }

    await prisma.artwork.delete({
      where: { id: artwork.id },
    });

    response.json({ ok: true });
  }),
);

app.post(
  '/api/artist/artworks/:id/submit',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.ARTIST])) {
      response.status(403).json({ error: 'Artist access required.' });
      return;
    }

    assert(currentUser.artistProfileId, 'Artist profile missing.');

    const artwork = await prisma.artwork.findFirst({
      where: {
        id: request.params.id,
        artistProfileId: currentUser.artistProfileId,
      },
      include: {
        artistProfile: true,
      },
    });

    if (!artwork) {
      response.status(404).json({ error: 'Artwork not found.' });
      return;
    }

    const updatedArtwork = await prisma.artwork.update({
      where: { id: artwork.id },
      data: { status: ArtworkStatus.PENDING },
      include: { artistProfile: true },
    });

    response.json({ artwork: serializeArtwork(updatedArtwork) });
  }),
);

app.get(
  '/api/moderation/artist-requests',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.MODERATOR])) {
      response.status(403).json({ error: 'Moderator access required.' });
      return;
    }

    const requests = await prisma.artistRequest.findMany({
      include: {
        user: {
          include: {
            artistProfile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    response.json({
      requests: requests.map((artistRequest) => ({
        id: artistRequest.id,
        status: artistRequest.status,
        motivation: artistRequest.motivation,
        createdAt: artistRequest.createdAt.toISOString(),
        user: serializeAuthUser(artistRequest.user),
      })),
    });
  }),
);

app.post(
  '/api/moderation/artist-requests/:id/approve',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.MODERATOR])) {
      response.status(403).json({ error: 'Moderator access required.' });
      return;
    }

    const artistRequest = await prisma.artistRequest.findUnique({
      where: { id: request.params.id },
      include: {
        user: true,
      },
    });

    if (!artistRequest) {
      response.status(404).json({ error: 'Artist request not found.' });
      return;
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: artistRequest.userId },
        data: {
          role: Role.ARTIST,
        },
      });

      await transaction.artistProfile.upsert({
        where: { userId: artistRequest.userId },
        update: {
          displayName: artistRequest.user.name,
        },
        create: {
          userId: artistRequest.userId,
          displayName: artistRequest.user.name,
          bio: '',
        },
      });

      await transaction.artistRequest.update({
        where: { id: artistRequest.id },
        data: {
          status: ArtistRequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedByUserId: currentUser.id,
        },
      });
    });

    response.json({ ok: true });
  }),
);

app.post(
  '/api/moderation/artist-requests/:id/reject',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.MODERATOR])) {
      response.status(403).json({ error: 'Moderator access required.' });
      return;
    }

    await prisma.artistRequest.update({
      where: { id: request.params.id },
      data: {
        status: ArtistRequestStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedByUserId: currentUser.id,
      },
    });

    response.json({ ok: true });
  }),
);

app.get(
  '/api/moderation/artworks',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.MODERATOR])) {
      response.status(403).json({ error: 'Moderator access required.' });
      return;
    }

    const artworks = await prisma.artwork.findMany({
      include: {
        artistProfile: true,
      },
      where: {
        status: {
          in: [ArtworkStatus.PENDING, ArtworkStatus.PUBLISHED, ArtworkStatus.HIDDEN],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    response.json({ artworks: artworks.map(serializeArtwork) });
  }),
);

app.post(
  '/api/moderation/artworks/:id/publish',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.MODERATOR])) {
      response.status(403).json({ error: 'Moderator access required.' });
      return;
    }

    const artwork = await prisma.artwork.update({
      where: { id: request.params.id },
      data: {
        status: ArtworkStatus.PUBLISHED,
      },
      include: {
        artistProfile: true,
      },
    });

    response.json({ artwork: serializeArtwork(artwork) });
  }),
);

app.post(
  '/api/moderation/artworks/:id/hide',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    if (!requireRole(currentUser.role, [Role.MODERATOR])) {
      response.status(403).json({ error: 'Moderator access required.' });
      return;
    }

    const artwork = await prisma.artwork.update({
      where: { id: request.params.id },
      data: {
        status: ArtworkStatus.HIDDEN,
      },
      include: {
        artistProfile: true,
      },
    });

    response.json({ artwork: serializeArtwork(artwork) });
  }),
);

app.get(
  '/api/cart',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    response.json({ cart: await buildCartView(currentUser.id) });
  }),
);

app.get(
  '/api/orders',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    response.json({ orders: await buildOrdersView(currentUser.id) });
  }),
);

app.get(
  '/api/orders/:orderId',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        id: request.params.orderId,
        userId: currentUser.id,
      },
      include: {
        items: {
          include: {
            artwork: {
              include: {
                artistProfile: true,
              },
            },
            artistProfile: true,
          },
        },
      },
    });

    if (!order) {
      response.status(404).json({ error: 'Order not found.' });
      return;
    }

    response.json({ order: serializeOrder(order) });
  }),
);

app.post(
  '/api/cart/items',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    const artworkId = String(request.body.artworkId ?? '').trim();
    const requestedQuantity = Math.max(Math.floor(toNumber(request.body.quantity, 1)), 1);
    const quantity = Math.min(requestedQuantity, MAX_CART_ITEM_QUANTITY);

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
    });

    if (!artwork || artwork.status !== ArtworkStatus.PUBLISHED) {
      response.status(404).json({ error: 'Artwork not available.' });
      return;
    }

    if (quantity > getAvailableStock(artwork)) {
      response.status(400).json({ error: 'Requested quantity exceeds available stock.' });
      return;
    }

    const cart = await getOrCreateCart(currentUser.id);

    await prisma.cartItem.upsert({
      where: {
        cartId_artworkId: {
          cartId: cart.id,
          artworkId,
        },
      },
      update: {
        quantity,
        unitPriceCents: artwork.priceCents,
      },
      create: {
        cartId: cart.id,
        artworkId,
        quantity,
        unitPriceCents: artwork.priceCents,
      },
    });

    response.status(201).json({ cart: await buildCartView(currentUser.id) });
  }),
);

app.patch(
  '/api/cart/items/:id',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    const requestedQuantity = Math.max(Math.floor(toNumber(request.body.quantity, 1)), 1);
    const quantity = Math.min(requestedQuantity, MAX_CART_ITEM_QUANTITY);
    const cart = await getOrCreateCart(currentUser.id);

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: request.params.id,
        cartId: cart.id,
      },
      include: {
        artwork: true,
      },
    });

    if (!cartItem) {
      response.status(404).json({ error: 'Cart item not found.' });
      return;
    }

    if (quantity > getAvailableStock(cartItem.artwork)) {
      response.status(400).json({ error: 'Requested quantity exceeds available stock.' });
      return;
    }

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });

    response.json({ cart: await buildCartView(currentUser.id) });
  }),
);

app.delete(
  '/api/cart/items/:id',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    const cart = await getOrCreateCart(currentUser.id);

    await prisma.cartItem.deleteMany({
      where: {
        id: request.params.id,
        cartId: cart.id,
      },
    });

    response.json({ cart: await buildCartView(currentUser.id) });
  }),
);

app.post(
  '/api/checkout/session',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    const cart = await getOrCreateCart(currentUser.id);
    if (cart.items.length === 0) {
      response.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const hydratedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            artwork: {
              include: {
                artistProfile: true,
              },
            },
          },
        },
      },
    });
    assert(hydratedCart, 'Cart not found.');

    const reservationExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    let orderId: string | null = null;

    try {
      const order = await prisma.$transaction(async (transaction) => {
        let totalCents = 0;

        for (const item of hydratedCart.items) {
          if (item.artwork.status !== ArtworkStatus.PUBLISHED) {
            throw new Error(`Artwork "${item.artwork.title}" is no longer available.`);
          }

          if (item.quantity > getAvailableStock(item.artwork)) {
            throw new Error(`Not enough stock for "${item.artwork.title}".`);
          }

          totalCents += item.quantity * item.artwork.priceCents;
        }

        const createdOrder = await transaction.order.create({
          data: {
            userId: currentUser.id,
            status: OrderStatus.CHECKOUT_PENDING,
            totalCents,
            reservationExpiresAt,
            items: {
              create: hydratedCart.items.map((item) => ({
                artworkId: item.artworkId,
                artistProfileId: item.artwork.artistProfileId,
                titleSnapshot: item.artwork.title,
                imagePathSnapshot: item.artwork.imagePath,
                quantity: item.quantity,
                unitPriceCents: item.artwork.priceCents,
              })),
            },
          },
        });

        for (const item of hydratedCart.items) {
          await transaction.artwork.update({
            where: { id: item.artworkId },
            data: {
              stockReserved: {
                increment: item.quantity,
              },
            },
          });
        }

        return createdOrder;
      });

      orderId = order.id;
      await markOrderPaidByOrderId(order.id);

      response.json({
        checkoutUrl: `${env.clientUrl}/checkout/success?orderId=${order.id}`,
        orderId: order.id,
      });
    } catch (error) {
      if (orderId) {
        await releaseOrderReservation(orderId, OrderStatus.FAILED);
      }
      throw error;
    }
  }),
);

app.post(
  '/api/checkout/orders/:orderId/cancel',
  asyncRoute(async (request, response) => {
    const currentUser = await requireUser(request, response);
    if (!currentUser) {
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        id: request.params.orderId,
        userId: currentUser.id,
      },
    });

    if (!order) {
      response.status(404).json({ error: 'Order not found.' });
      return;
    }

    await releaseOrderReservation(order.id, OrderStatus.CANCELLED);
    response.json({ ok: true });
  }),
);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    response.status(400).json({ error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  console.error(error);
  response.status(500).json({ error: message });
});

app.listen(env.apiPort, () => {
  console.log(`Gallery3d API listening on http://localhost:${env.apiPort}`);
});
